import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { addMinutes, parseVnDateInputToUtcRange } from '../lib/dates';
import { buildInvoiceHtml, createNotification, recordEmail } from '../lib/communications';
import { createQrDataUrl } from '../lib/qr';
import { isBookingUsable, isTripActive } from '../lib/bookingHelpers';

export async function createBooking(input: {
  userId: string;
  tripId: string;
  seatIds: string[];
  contactEmail: string;
}) {
  if (input.seatIds.length === 0) {
    throw new AppError('Phải chọn ít nhất 1 ghế.', 400);
  }

  const now = new Date();
  const trip = await prisma.trip.findUnique({
    where: { id: input.tripId },
    include: {
      train: {
        include: {
          carriages: {
            include: {
              seats: true
            }
          }
        }
      }
    }
  });

  if (!trip) {
    throw new AppError('Chuyến tàu không tồn tại.', 404);
  }

  if (!isTripActive(trip.status)) {
    throw new AppError('Chuyến đã bị hủy, không thể đặt vé.', 400);
  }

  const allSeats = trip.train.carriages.flatMap((carriage: { seats: Array<{ id: string }> }) => carriage.seats);
  const seatById = new Map(allSeats.map((seat: { id: string }) => [seat.id, seat]));
  const selectedSeatCount = input.seatIds.filter((seatId) => seatById.has(seatId)).length;

  if (selectedSeatCount !== input.seatIds.length) {
    throw new AppError('Có ghế không thuộc chuyến tàu này.', 400);
  }

  const reservedSeatIds = await getReservedSeatIds(trip.id, now);
  for (const seatId of input.seatIds) {
    if (reservedSeatIds.has(seatId)) {
      throw new AppError('Ghế đã được giữ hoặc đã bán.', 409);
    }
  }

  const holdExpiresAt = addMinutes(now, 5);
  const bookingCode = `BK-${now.getTime().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const totalAmount = trip.price.mul(input.seatIds.length);

  const booking = await prisma.booking.create({
    data: {
      code: bookingCode,
      userId: input.userId,
      tripId: trip.id,
      status: 'HOLDING',
      holdExpiresAt,
      totalAmount: new Decimal(totalAmount.toString()),
      contactEmail: input.contactEmail,
      seatCount: input.seatIds.length,
      bookingSeats: {
        create: input.seatIds.map((seatId) => ({
          seatId,
          priceSnapshot: trip.price
        }))
      },
      payment: {
        create: {
          status: 'PENDING',
          method: 'CARD',
          amount: totalAmount
        }
      }
    },
    include: {
      trip: { include: { train: true } },
      user: true,
      payment: true,
      ticket: true,
      bookingSeats: true
    }
  });

  await createNotification({
    userId: input.userId,
    bookingId: booking.id,
    type: 'BOOKING_HELD',
    message: `Đặt chỗ thành công cho ${booking.code}. Hết hạn giữ chỗ lúc ${holdExpiresAt.toISOString()}.`
  });

  await recordEmail({
    userId: input.userId,
    bookingId: booking.id,
    toEmail: input.contactEmail,
    subject: 'Giữ chỗ vé tàu thành công',
    kind: 'BOOKING_HELD',
    html: `<p>Booking ${booking.code} đã được giữ chỗ đến ${holdExpiresAt.toLocaleString('vi-VN')}.</p>`
  });

  return booking;
}

export async function payBooking(bookingId: string) {
  const now = new Date();
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      trip: { include: { train: true } },
      user: true,
      bookingSeats: { include: { seat: true } },
      payment: true,
      ticket: true
    }
  });

  if (!booking) {
    throw new AppError('Không tìm thấy booking.', 404);
  }

  if (booking.status !== 'HOLDING') {
    throw new AppError('Booking không ở trạng thái chờ thanh toán.', 400);
  }

  if (!booking.holdExpiresAt || booking.holdExpiresAt.getTime() <= now.getTime()) {
    await expireBooking(booking.id, 'Hết 5 phút giữ chỗ trước thanh toán.');
    throw new AppError('Booking đã hết hạn giữ chỗ.', 400);
  }

  const seatLabels = booking.bookingSeats.map((item: { seat: { code: string } }) => item.seat.code);
  const ticketPayload = `train-booking:${booking.code}:${booking.trip.id}:${seatLabels.join('|')}`;
  const qrDataUrl = await createQrDataUrl(ticketPayload);
  const ticketNumber = `TK-${now.getTime().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const invoiceNumber = `INV-${now.getTime().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;

  const updatedBooking = await prisma.$transaction(async (transaction: any) => {
    await transaction.payment.update({
      where: { bookingId: booking.id },
      data: {
        status: 'PAID',
        transactionRef: `PAY-${randomUUID().slice(0, 12).toUpperCase()}`,
        paidAt: now
      }
    });

    await transaction.booking.update({
      where: { id: booking.id },
      data: { status: 'PAID' }
    });

    await transaction.ticket.create({
      data: {
        bookingId: booking.id,
        ticketNumber,
        qrToken: randomUUID(),
        qrDataUrl,
        eTicketUrl: `/tickets/${booking.id}`,
        invoiceNumber
      }
    });

    await transaction.notification.createMany({
      data: [
        {
          userId: booking.userId,
          bookingId: booking.id,
          type: 'BOOKING_PAID',
          message: `Thanh toán thành công cho booking ${booking.code}.`
        },
        {
          userId: booking.userId,
          bookingId: booking.id,
          type: 'INVOICE_SENT',
          message: `Hóa đơn điện tử ${invoiceNumber} đã được gửi qua email.`
        }
      ]
    });

    await transaction.emailLog.createMany({
      data: [
        {
          userId: booking.userId,
          bookingId: booking.id,
          kind: 'BOOKING_PAID',
          subject: 'Vé tàu đã được xác nhận',
          toEmail: booking.contactEmail,
          html: buildInvoiceHtml({
            bookingCode: booking.code,
            ticketNumber,
            tripLabel: `${booking.trip.origin} - ${booking.trip.destination}`,
            seatLabels,
            amount: booking.totalAmount,
            customerName: booking.user.name
          })
        },
        {
          userId: booking.userId,
          bookingId: booking.id,
          kind: 'INVOICE_SENT',
          subject: `Hóa đơn điện tử ${invoiceNumber}`,
          toEmail: booking.contactEmail,
          html: `<p>Hóa đơn ${invoiceNumber} cho booking ${booking.code}.</p>`
        }
      ]
    });

    return transaction.booking.findUniqueOrThrow({
      where: { id: booking.id },
      include: {
        trip: { include: { train: true } },
        user: true,
        bookingSeats: { include: { seat: true } },
        payment: true,
        ticket: true
      }
    });
  });

  return updatedBooking;
}

export async function expireBooking(bookingId: string, reason = 'Hết hạn giữ chỗ.') {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== 'HOLDING') {
    return null;
  }

  const expiredBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'EXPIRED' }
  });

  await prisma.notification.create({
    data: {
      userId: booking.userId,
      bookingId: booking.id,
      type: 'BOOKING_EXPIRED',
      message: reason
    }
  });

  return expiredBooking;
}

export async function listBookings(input: {
  userId?: string;
  status?: 'HOLDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
  from?: string;
  to?: string;
}) {
  const where: any = {};

  if (input.userId) {
    where.userId = input.userId;
  }

  if (input.status) {
    where.status = input.status;
  }

  if (input.from || input.to) {
    const fromRange = input.from ? parseVnDateInputToUtcRange(input.from) : null;
    const toRange = input.to ? parseVnDateInputToUtcRange(input.to) : null;

    where.trip = {
      departureTime: {
        gte: fromRange?.start,
        lte: toRange?.end
      }
    };
  }

  return prisma.booking.findMany({
    where,
    include: {
      trip: { include: { train: true } },
      user: true,
      bookingSeats: { include: { seat: true } },
      payment: true,
      ticket: true
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getBookingById(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      trip: { include: { train: true } },
      user: true,
      bookingSeats: { include: { seat: true } },
      payment: true,
      ticket: true
    }
  });
}

export async function cancelBooking(input: { bookingId: string; refund: boolean; reason: string }) {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: {
      trip: true,
      user: true,
      bookingSeats: { include: { seat: true } },
      payment: true,
      ticket: true
    }
  });

  if (!booking) {
    throw new AppError('Không tìm thấy booking.', 404);
  }

  if (booking.status === 'HOLDING') {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED' }
    });

    await createNotification({
      userId: booking.userId,
      bookingId: booking.id,
      type: 'TRIP_CANCELLED',
      message: input.reason
    });

    return prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
      include: {
        trip: { include: { train: true } },
        user: true,
        bookingSeats: { include: { seat: true } },
        payment: true,
        ticket: true
      }
    });
  }

  if (booking.status !== 'PAID') {
    throw new AppError('Chỉ booking chờ thanh toán hoặc đã thanh toán mới có thể hủy.', 400);
  }

  if (!input.refund) {
    throw new AppError('Booking đã thanh toán cần xác nhận hoàn tiền khi hủy.', 400);
  }

  await prisma.$transaction(async (transaction: any) => {
    await transaction.booking.update({
      where: { id: booking.id },
      data: { status: 'REFUNDED' }
    });

    await transaction.payment.update({
      where: { bookingId: booking.id },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
        transactionRef: `REFUND-${randomUUID().slice(0, 12).toUpperCase()}`
      }
    });

    await transaction.notification.create({
      data: {
        userId: booking.userId,
        bookingId: booking.id,
        type: 'REFUND_ISSUED',
        message: input.reason
      }
    });
  });

  return prisma.booking.findUniqueOrThrow({
    where: { id: booking.id },
    include: {
      trip: { include: { train: true } },
      user: true,
      bookingSeats: { include: { seat: true } },
      payment: true,
      ticket: true
    }
  });
}

async function getReservedSeatIds(tripId: string, now: Date) {
  const bookings = await prisma.booking.findMany({
    where: {
      tripId,
      OR: [
        { status: 'PAID' },
        { status: 'HOLDING', holdExpiresAt: { gt: now } }
      ]
    },
    include: { bookingSeats: true }
  });

  const reservedSeatIds = new Set<string>();
  for (const booking of bookings) {
    if (!isBookingUsable(booking.status, booking.holdExpiresAt, now)) {
      continue;
    }

    for (const bookingSeat of booking.bookingSeats) {
      reservedSeatIds.add(bookingSeat.seatId);
    }
  }

  return reservedSeatIds;
}