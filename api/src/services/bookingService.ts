import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';
import { BookingStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { addMinutes, parseVnDateInputToUtcRange } from '../lib/dates';
import { buildInvoiceHtml } from '../lib/communications';
import { createQrDataUrl } from '../lib/qr';
import { isBookingUsable, isTripActive } from '../lib/bookingHelpers';
import { sendNotification } from './notificationService';

function getEffectiveDepartureTime(trip: { departureTime: Date; delayedDepartureTime: Date | null }) {
  return trip.delayedDepartureTime ?? trip.departureTime;
}

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
      tripCarriages: {
        include: {
          seats: true
        }
      }
    }
  });

  if (!trip) {
    throw new AppError('Chuyến tàu không tồn tại.', 404);
  }

  if (!isTripActive(trip.status)) {
    throw new AppError('Chuyến đã bị hủy.', 400);
  }

  // 🔥 flatten seats
  const allSeats = trip.tripCarriages.flatMap(c => c.seats);

  const seatById = new Map(allSeats.map(s => [s.id, s]));

  // 🔥 validate seat belongs to trip
  const selectedSeats = input.seatIds.map(id => {
    const seat = seatById.get(id);
    if (!seat) {
      throw new AppError('Có ghế không thuộc chuyến tàu.', 400);
    }
    return seat;
  });

  // 🔥 check reserved
  const reservedSeatIds = await getReservedSeatIds(trip.id, now);

  for (const seat of selectedSeats) {
    if (reservedSeatIds.has(seat.id)) {
      throw new AppError(`Ghế ${seat.seatNumber} đã được giữ hoặc đã bán.`, 409);
    }
  }

  // 🔥 build carriage map để lấy basePrice
  const carriageMap = new Map(
    trip.tripCarriages.map(c => [c.id, c])
  );

  // 🔥 tính giá đúng từng ghế
  const seatPrices = selectedSeats.map(seat => {
    const carriage = carriageMap.get(seat.carriageId)!;

    const finalPrice =
      seat.price ??
      carriage.basePrice ??
      trip.price;

    return new Decimal(finalPrice.toString());
  });

  const totalAmount = seatPrices.reduce(
    (sum, p) => sum.plus(p),
    new Decimal(0)
  );

  const holdExpiresAt = addMinutes(now, 5);

  const bookingCode = `BK-${now
    .getTime()
    .toString(36)
    .toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;

  const booking = await prisma.booking.create({
    data: {
      code: bookingCode,
      userId: input.userId,
      tripId: trip.id,
      status: BookingStatus.HOLDING,
      holdExpiresAt,
      expiredAt: holdExpiresAt,
      totalAmount,
      contactEmail: input.contactEmail,
      seatCount: selectedSeats.length,

      bookingSeats: {
        create: selectedSeats.map((seat, index) => ({
          seatId: seat.id,
          priceSnapshot: seatPrices[index]
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

  await sendNotification({
    userId: input.userId,
    bookingId: booking.id,
    type: 'HOLD_EXPIRE',
    message: `Đặt chỗ thành công ${booking.code}. Hết hạn lúc ${holdExpiresAt.toISOString()}.`,
    toEmail: input.contactEmail
  });

  return booking;
}

export async function holdOrGetBooking(input: {
  userId: string;
  tripId: string;
  seatIds: string[];
  contactEmail: string;
}) {
  if (input.seatIds.length === 0) {
    throw new AppError('Phải chọn ít nhất 1 ghế.', 400);
  }

  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    // 1. Tìm booking HOLDING còn hạn của user + trip
    const existing = await tx.booking.findFirst({
      where: {
        userId: input.userId,
        tripId: input.tripId,
        status: BookingStatus.HOLDING,
        holdExpiresAt: { gt: now }
      },
      include: {
        bookingSeats: true
      }
    });

    // 2. Nếu có → check ghế có match không
    if (existing) {
      const existingSeatIds = existing.bookingSeats.map(s => s.seatId);

      const isSameSeats =
        existingSeatIds.length === input.seatIds.length &&
        existingSeatIds.every(id => input.seatIds.includes(id));

      if (isSameSeats) {
        // 👉 reuse booking cũ
        return existing;
      }

      // ⚠️ nếu khác ghế → expire booking cũ
      await tx.booking.update({
        where: { id: existing.id },
        data: {
          status: BookingStatus.CANCELLED,
          expiredAt: now
        }
      });
    }

    // 3. Check ghế đã bị giữ chưa
    const reservedSeatIds = await getReservedSeatIds(input.tripId, now);

    for (const seatId of input.seatIds) {
      if (reservedSeatIds.has(seatId)) {
        throw new AppError('Ghế đã được giữ hoặc đã bán.', 409);
      }
    }

    // 4. Tạo booking mới (reuse createBooking logic nhưng dùng tx)
    const trip = await tx.trip.findUnique({
      where: { id: input.tripId },
      include: {
        tripCarriages: {
          include: { seats: true }
        }
      }
    });

    if (!trip) {
      throw new AppError('Chuyến tàu không tồn tại.', 404);
    }

    if (!isTripActive(trip.status)) {
      throw new AppError('Chuyến đã bị hủy.', 400);
    }

    const allSeats = trip.tripCarriages.flatMap(c => c.seats);
    const seatById = new Map(allSeats.map(s => [s.id, s]));

    const selectedSeats = input.seatIds.map(id => {
      const seat = seatById.get(id);
      if (!seat) {
        throw new AppError('Có ghế không thuộc chuyến tàu.', 400);
      }
      return seat;
    });

    const carriageMap = new Map(
      trip.tripCarriages.map(c => [c.id, c])
    );

    const seatPrices = selectedSeats.map(seat => {
      const carriage = carriageMap.get(seat.carriageId)!;
      const finalPrice =
        seat.price ??
        carriage.basePrice ??
        trip.price;

      return new Decimal(finalPrice.toString());
    });

    const totalAmount = seatPrices.reduce(
      (sum, p) => sum.plus(p),
      new Decimal(0)
    );

    const holdExpiresAt = addMinutes(now, 5);

    const bookingCode = `BK-${now
      .getTime()
      .toString(36)
      .toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;

    const booking = await tx.booking.create({
      data: {
        code: bookingCode,
        userId: input.userId,
        tripId: trip.id,
        status: BookingStatus.HOLDING,
        holdExpiresAt,
        expiredAt: holdExpiresAt,
        totalAmount,
        contactEmail: input.contactEmail,
        seatCount: selectedSeats.length,

        bookingSeats: {
          create: selectedSeats.map((seat, index) => ({
            seatId: seat.id,
            priceSnapshot: seatPrices[index]
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

    await sendNotification({
      userId: input.userId,
      bookingId: booking.id,
      type: 'HOLD_EXPIRE',
      message: `Đặt chỗ thành công ${booking.code}. Hết hạn lúc ${holdExpiresAt.toISOString()}.`,
      toEmail: input.contactEmail
    });

    return booking;
  });
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

  if (booking.status !== BookingStatus.HOLDING) {
    throw new AppError('Booking không ở trạng thái chờ thanh toán.', 400);
  }

  if (!booking.holdExpiresAt || booking.holdExpiresAt.getTime() <= now.getTime()) {
    await expireBooking(booking.id, 'Hết 5 phút giữ chỗ trước thanh toán.');
    throw new AppError('Booking đã hết hạn giữ chỗ.', 400);
  }

  const seatLabels = booking.bookingSeats.map((item) => item.seat.code);
  const ticketPayload = `train-booking:${booking.code}:${booking.trip.id}:${seatLabels.join('|')}`;
  const qrDataUrl = await createQrDataUrl(ticketPayload);
  const ticketNumber = `TK-${now.getTime().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const invoiceNumber = `INV-${now.getTime().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;

  const updatedBooking = await prisma.$transaction(async (transaction) => {
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
      data: {
        status: BookingStatus.PAID,
        expiredAt: null
      }
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

    await transaction.emailLog.create({
      data: {
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
      }
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

  await sendNotification({
    userId: booking.userId,
    bookingId: booking.id,
    type: 'REMINDER',
    message: `Thanh toán thành công cho booking ${booking.code}.`,
    toEmail: booking.contactEmail
  });

  return updatedBooking;
}

export async function expireBooking(bookingId: string, reason = 'Hết hạn giữ chỗ.') {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== BookingStatus.HOLDING) {
    return null;
  }

  const cancelledBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.CANCELLED,
      expiredAt: new Date()
    }
  });

  await sendNotification({
    userId: booking.userId,
    bookingId: booking.id,
    type: 'HOLD_EXPIRE',
    message: reason,
    toEmail: booking.contactEmail
  });

  return cancelledBooking;
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
      ticket: true,
      refunds: true
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
      ticket: true,
      refunds: true
    }
  });
}

export async function cancelBooking(input: { bookingId: string; reason?: string }) {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: {
      trip: true,
      user: true,
      bookingSeats: { include: { seat: true } },
      payment: true,
      ticket: true,
      refunds: true
    }
  });

  if (!booking) {
    throw new AppError('Không tìm thấy booking.', 404);
  }

  if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REFUNDED || booking.status === BookingStatus.EXPIRED) {
    throw new AppError('Booking đã được hủy trước đó.', 400);
  }

  const departureTime = getEffectiveDepartureTime(booking.trip);
  if (departureTime.getTime() <= Date.now()) {
    throw new AppError('Không thể hủy vé sau giờ tàu chạy.', 400);
  }

  const reason = input.reason ?? 'Bạn đã hủy vé thành công';

  const updatedBooking = await prisma.$transaction(async (transaction) => {
    const nextStatus = booking.status === BookingStatus.PAID ? BookingStatus.CANCELLED : BookingStatus.CANCELLED;

    await transaction.booking.update({
      where: { id: booking.id },
      data: {
        status: nextStatus,
        expiredAt: new Date()
      }
    });

    if (booking.status === BookingStatus.PAID) {
      await transaction.payment.update({
        where: { bookingId: booking.id },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
          transactionRef: `REFUND-${randomUUID().slice(0, 12).toUpperCase()}`
        }
      });

      await transaction.refund.create({
        data: {
          bookingId: booking.id,
          amount: booking.totalAmount,
          status: 'COMPLETED',
          reason
        }
      });
    }

    return transaction.booking.findUniqueOrThrow({
      where: { id: booking.id },
      include: {
        trip: { include: { train: true } },
        user: true,
        bookingSeats: { include: { seat: true } },
        payment: true,
        ticket: true,
        refunds: true
      }
    });
  });

  await sendNotification({
    userId: booking.userId,
    bookingId: booking.id,
    type: 'CANCEL',
    message: reason,
    toEmail: booking.contactEmail
  });

  return updatedBooking;
}

async function getReservedSeatIds(tripId: string, now: Date) {
  const bookings = await prisma.booking.findMany({
    where: {
      tripId,
      OR: [
        { status: BookingStatus.PAID },
        { status: BookingStatus.HOLDING, holdExpiresAt: { gt: now } }
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
