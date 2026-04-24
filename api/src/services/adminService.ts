import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { recordEmail } from '../lib/communications';
import { sendNotification } from './notificationService';

type ReportRangeInput = {
  from?: string | undefined;
  to?: string | undefined;
};

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseReportBoundary(value: string | undefined, boundary: 'start' | 'end') {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const iso = boundary === 'start'
      ? `${trimmed}T00:00:00.000Z`
      : `${trimmed}T23:59:59.999Z`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildDateTimeFilter(input?: ReportRangeInput) {
  const from = parseReportBoundary(input?.from, 'start');
  const to = parseReportBoundary(input?.to, 'end');

  if (from && to && from.getTime() > to.getTime()) {
    throw new AppError('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.', 400);
  }

  const filter: Prisma.DateTimeFilter = {};
  if (from) {
    filter.gte = from;
  }
  if (to) {
    filter.lte = to;
  }

  return {
    filter: Object.keys(filter).length > 0 ? filter : null,
    from,
    to
  };
}

export async function createTrip(input: {
  trainId: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
}) {
  return prisma.trip.create({
    data: {
      trainId: input.trainId,
      origin: input.origin,
      destination: input.destination,
      departureTime: new Date(input.departureTime),
      arrivalTime: new Date(input.arrivalTime),
      price: new Decimal(input.price),
      status: 'ON_TIME'
    },
    include: { train: true }
  });
}

export async function updateTrip(tripId: string, input: Partial<{
  trainId: string | undefined;
  origin: string | undefined;
  destination: string | undefined;
  departureTime: string | undefined;
  arrivalTime: string | undefined;
  price: number | undefined;
  status: 'ON_TIME' | 'DELAYED' | 'CANCELLED' | undefined;
  delayMinutes: number | undefined;
  note: string | null | undefined;
}>) {
  return prisma.trip.update({
    where: { id: tripId },
    data: {
      ...(input.trainId !== undefined ? { trainId: input.trainId } : {}),
      ...(input.origin !== undefined ? { origin: input.origin } : {}),
      ...(input.destination !== undefined ? { destination: input.destination } : {}),
      ...(input.departureTime !== undefined ? { departureTime: new Date(input.departureTime) } : {}),
      ...(input.arrivalTime !== undefined ? { arrivalTime: new Date(input.arrivalTime) } : {}),
      ...(typeof input.price === 'number' ? { price: new Decimal(input.price) } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(typeof input.delayMinutes === 'number' ? { delayMinutes: input.delayMinutes } : {}),
      ...(input.note !== undefined ? { note: input.note } : {})
    },
    include: { train: true }
  });
}

export async function removeTrip(tripId: string) {
  await prisma.trip.delete({ where: { id: tripId } });
  return { success: true };
}

export async function setTripStatus(tripId: string, input: { status: 'ON_TIME' | 'DELAYED' | 'CANCELLED'; delayMinutes?: number | undefined; note?: string | undefined }) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      bookings: {
        include: {
          user: true,
          bookingSeats: { include: { seat: true } },
          payment: true,
          ticket: true
        }
      },
      train: true
    }
  });

  if (!trip) {
    throw new AppError('Không tìm thấy chuyến tàu.', 404);
  }

  if (input.status === 'DELAYED' && typeof input.delayMinutes !== 'number') {
    throw new AppError('Delay phải có số phút delay.', 400);
  }

  const updatedTrip = await prisma.trip.update({
    where: { id: tripId },
    data: {
      status: input.status,
      delayMinutes: input.status === 'DELAYED' ? (input.delayMinutes ?? trip.delayMinutes) : 0,
      delayedDepartureTime: input.status === 'DELAYED'
        ? new Date(trip.departureTime.getTime() + (input.delayMinutes ?? trip.delayMinutes) * 60_000)
        : null,
      note: input.note ?? trip.note
    },
    include: { train: true }
  });

  if (input.status === 'DELAYED') {
    for (const booking of trip.bookings) {
      if (booking.status === 'PAID' || booking.status === 'HOLDING') {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { isAffected: true }
        });

        await sendNotification(prisma, {
          userId: booking.userId,
          bookingId: booking.id,
          type: 'DELAY',
          message: `Chuyến ${trip.origin} - ${trip.destination} bị delay ${updatedTrip.delayMinutes} phút.`
        });

        await recordEmail({
          userId: booking.userId,
          bookingId: booking.id,
          toEmail: booking.contactEmail,
          subject: 'Thông báo delay chuyến tàu',
          kind: 'DELAY',
          html: `<p>Chuyến ${trip.origin} - ${trip.destination} bị delay ${updatedTrip.delayMinutes} phút.</p>`
        });
      }
    }
  }

  if (input.status === 'CANCELLED') {
    for (const booking of trip.bookings) {
      if (booking.status === 'PAID') {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: 'CANCELLED',
            isAffected: true,
            expiredAt: new Date()
          }
        });

        await prisma.payment.update({
          where: { bookingId: booking.id },
          data: {
            status: 'REFUNDED',
            refundedAt: new Date(),
            transactionRef: `AUTO-REFUND-${randomUUID().slice(0, 10).toUpperCase()}`
          }
        });

        await prisma.refund.create({
          data: {
            bookingId: booking.id,
            amount: booking.totalAmount,
            status: 'COMPLETED',
            reason: `Chuyến ${trip.origin} - ${trip.destination} bị hủy bởi admin`
          }
        });

        await sendNotification(prisma, {
          userId: booking.userId,
          bookingId: booking.id,
          type: 'CANCEL',
          message: `Chuyến ${trip.origin} - ${trip.destination} bị hủy. Vé đã được hoàn tiền.`
        });

        await recordEmail({
          userId: booking.userId,
          bookingId: booking.id,
          toEmail: booking.contactEmail,
          subject: 'Hoàn tiền do hủy chuyến',
          kind: 'CANCEL',
          html: `<p>Chuyến ${trip.origin} - ${trip.destination} bị hủy. Vé đã được hoàn tiền.</p>`
        });
      }

      if (booking.status === 'HOLDING') {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: 'CANCELLED',
            isAffected: true,
            expiredAt: new Date()
          }
        });

        await sendNotification(prisma, {
          userId: booking.userId,
          bookingId: booking.id,
          type: 'CANCEL',
          message: `Chuyến ${trip.origin} - ${trip.destination} đã bị hủy.`
        });
      }
    }
  }

  return updatedTrip;
}

export async function listTrains() {
  return prisma.train.findMany({
    include: {
      carriages: {
        include: {
          seats: true
        }
      }
    },
    orderBy: { code: 'asc' }
  });
}

export async function createTrain(input: { code: string; name: string }) {
  return prisma.train.create({ data: input });
}

export async function updateTrain(trainId: string, input: { code?: string | undefined; name?: string | undefined }) {
  const data: any = {};
  if (input.code !== undefined) data.code = input.code;
  if (input.name !== undefined) data.name = input.name;

  return prisma.train.update({
    where: { id: trainId },
    data
  });
}

export async function deleteTrain(trainId: string) {
  await prisma.train.delete({ where: { id: trainId } });
  return { success: true };
}

export async function createCarriage(input: { trainId: string; code: string; orderIndex: number; type?: 'SOFT_SEAT' | 'HARD_SEAT' | 'SLEEPER' }) {
  return prisma.carriage.create({
    data: {
      trainId: input.trainId,
      code: input.code,
      orderIndex: input.orderIndex,
      type: input.type ?? 'SOFT_SEAT'
    }
  });
}

export async function updateCarriage(carriageId: string, input: { code?: string | undefined; orderIndex?: number | undefined }) {
  const data: any = {};
  if (input.code !== undefined) data.code = input.code;
  if (input.orderIndex !== undefined) data.orderIndex = input.orderIndex;

  return prisma.carriage.update({ where: { id: carriageId }, data });
}

export async function deleteCarriage(carriageId: string) {
  await prisma.carriage.delete({ where: { id: carriageId } });
  return { success: true };
}

export async function bulkCreateSeats(input: { carriageId: string; prefix?: string | undefined; count: number }) {
  const carriage = await prisma.carriage.findUnique({ where: { id: input.carriageId }, include: { train: true } });
  if (!carriage) {
    throw new AppError('Không tìm thấy toa.', 404);
  }

  const existingSeats = await prisma.seat.count({ where: { carriageId: input.carriageId } });
  const seats = await prisma.seat.createMany({
    data: Array.from({ length: input.count }, (_, index) => {
      const seatNumber = existingSeats + index + 1;
      const seatCode = `${input.prefix ?? carriage.code}-${seatNumber.toString().padStart(2, '0')}`;
      return {
        id: `${carriage.train.code}_${carriage.code}_${seatCode.toUpperCase()}`,
        carriageId: input.carriageId,
        code: seatCode
      };
    }),
    skipDuplicates: true
  });

  return { created: seats.count };
}

export async function updateSeat(seatId: string, input: { code?: string | undefined; status?: 'ACTIVE' | 'INACTIVE' | undefined }) {
  const data: any = {};
  if (input.code !== undefined) data.code = input.code;
  if (input.status !== undefined) data.status = input.status;

  return prisma.seat.update({ where: { id: seatId }, data });
}

export async function deleteSeat(seatId: string) {
  await prisma.seat.delete({ where: { id: seatId } });
  return { success: true };
}

export async function getReports(input?: ReportRangeInput) {
  const { filter } = buildDateTimeFilter(input);

  const [trips, bookings, payments, tripCarriages] = await Promise.all([
    prisma.trip.findMany({ where: filter ? { departureTime: filter } : undefined, include: { bookings: { include: { payment: true } } } }),
    prisma.booking.findMany({ where: filter ? { trip: { departureTime: filter } } : undefined, include: { payment: true } }),
    prisma.payment.findMany({ where: filter ? { status: 'PAID', booking: { trip: { departureTime: filter } } } : { status: 'PAID' } }),
    prisma.tripCarriage.findMany({ where: filter ? { trip: { departureTime: filter } } : undefined, select: { id: true } })
  ]);

  const activeBookings = bookings.filter((booking: { status: string; seatCount: number }) => booking.status === 'PAID' || booking.status === 'HOLDING');
  const revenue = payments.reduce((sum: number, payment: { amount: { toNumber: () => number } }) => sum + payment.amount.toNumber(), 0);
  const totalSeats = tripCarriages.length === 0
    ? 0
    : await prisma.tripSeat.count({ where: { carriageId: { in: tripCarriages.map((carriage) => carriage.id) } } });

  const revenueByDateMap = new Map<string, number>();
  for (const payment of payments) {
    const sourceDate = payment.paidAt ?? payment.createdAt;
    const key = toDateKey(sourceDate);
    revenueByDateMap.set(key, (revenueByDateMap.get(key) ?? 0) + payment.amount.toNumber());
  }

  const revenueByDate = filter && (filter.gte || filter.lte)
    ? (() => {
        const start = filter.gte ? new Date(`${toDateKey(filter.gte)}T00:00:00.000Z`) : null;
        const end = filter.lte ? new Date(`${toDateKey(filter.lte)}T00:00:00.000Z`) : null;

        if (start && end) {
          const days: Array<{ date: string; revenue: number }> = [];
          const cursor = new Date(start);
          while (cursor.getTime() <= end.getTime()) {
            const key = toDateKey(cursor);
            days.push({ date: key, revenue: revenueByDateMap.get(key) ?? 0 });
            cursor.setUTCDate(cursor.getUTCDate() + 1);
          }
          return days;
        }

        return Array.from(revenueByDateMap.entries())
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([date, amount]) => ({ date, revenue: amount }));
      })()
    : Array.from(revenueByDateMap.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, amount]) => ({ date, revenue: amount }));

  return {
    totalTrips: trips.length,
    totalBookings: bookings.length,
    activeBookings: activeBookings.length,
    paidBookings: bookings.filter((booking: { status: string }) => booking.status === 'PAID').length,
    cancelledBookings: bookings.filter((booking: { status: string }) => booking.status === 'CANCELLED').length,
    refundedBookings: bookings.filter((booking: { status: string }) => booking.status === 'REFUNDED').length,
    delayedTrips: trips.filter((trip: { status: string }) => trip.status === 'DELAYED').length,
    cancelledTrips: trips.filter((trip: { status: string }) => trip.status === 'CANCELLED').length,
    revenue,
    occupancyRate: totalSeats === 0 ? 0 : Math.round((activeBookings.reduce((sum: number, booking: { seatCount: number }) => sum + booking.seatCount, 0) / totalSeats) * 1000) / 10,
    revenueByDate
  };
}

export async function getDemoMeta() {
  const [users, trips] = await Promise.all([
    prisma.user.findMany({ orderBy: { role: 'desc' } }),
    prisma.trip.findMany({ include: { train: true }, orderBy: { departureTime: 'asc' } })
  ]);

  return {
    holdMinutes: 5,
    users: users.map((user: { id: string; name: string; email: string; role: string }) => ({ id: user.id, name: user.name, email: user.email, role: user.role })),
    defaultUserId: users.find((user: { role: string }) => user.role === 'USER')?.id ?? null,
    adminUserId: users.find((user: { role: string }) => user.role === 'ADMIN')?.id ?? null,
    trips: trips.map((trip: { id: string; train: { code: string }; origin: string; destination: string; departureTime: Date; status: string }) => ({
      id: trip.id,
      trainCode: trip.train.code,
      origin: trip.origin,
      destination: trip.destination,
      departureTime: trip.departureTime.toISOString(),
      status: trip.status
    }))
  };
}

export async function listAdminTickets() {
  const tickets = await prisma.ticket.findMany({
    include: {
      booking: {
        include: {
          user: true,
          trip: {
            include: {
              train: true
            }
          },
          payment: true,
          bookingSeats: {
            include: {
              seat: true
            }
          }
        }
      }
    },
    orderBy: {
      issuedAt: 'desc'
    }
  });

  return tickets.map((ticket) => ({
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    issuedAt: ticket.issuedAt.toISOString(),
    booking: {
      id: ticket.booking.id,
      code: ticket.booking.code,
      status: ticket.booking.status,
      totalAmount: ticket.booking.totalAmount.toNumber(),
      seatCodes: ticket.booking.bookingSeats.map((item) => item.seat?.code).filter((code): code is string => Boolean(code)),
      user: {
        id: ticket.booking.user.id,
        name: ticket.booking.user.name,
        email: ticket.booking.user.email
      },
      trip: {
        id: ticket.booking.trip.id,
        trainCode: ticket.booking.trip.train.code,
        trainName: ticket.booking.trip.train.name,
        origin: ticket.booking.trip.origin,
        destination: ticket.booking.trip.destination,
        departureTime: ticket.booking.trip.departureTime.toISOString(),
        arrivalTime: ticket.booking.trip.arrivalTime.toISOString(),
        status: ticket.booking.trip.status
      },
      payment: ticket.booking.payment
        ? {
            id: ticket.booking.payment.id,
            status: ticket.booking.payment.status,
            method: ticket.booking.payment.method,
            paidAt: ticket.booking.payment.paidAt?.toISOString() ?? null
          }
        : null
    }
  }));
}

export async function listRecentBookings(limit = 8) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const bookings = await prisma.booking.findMany({
    include: {
      user: true,
      trip: {
        include: {
          train: true
        }
      },
      payment: true,
      ticket: true,
      bookingSeats: {
        include: {
          seat: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: safeLimit
  });

  return bookings.map((booking) => ({
    id: booking.id,
    code: booking.code,
    status: booking.status,
    createdAt: booking.createdAt.toISOString(),
    totalAmount: booking.totalAmount.toNumber(),
    seatCount: booking.seatCount,
    seatCodes: booking.bookingSeats.map((item) => item.seat?.code).filter((code): code is string => Boolean(code)),
    user: {
      id: booking.user.id,
      name: booking.user.name,
      email: booking.user.email
    },
    trip: {
      id: booking.trip.id,
      trainCode: booking.trip.train.code,
      trainName: booking.trip.train.name,
      origin: booking.trip.origin,
      destination: booking.trip.destination,
      departureTime: booking.trip.departureTime.toISOString(),
      arrivalTime: booking.trip.arrivalTime.toISOString(),
      status: booking.trip.status
    },
    payment: booking.payment
      ? {
          id: booking.payment.id,
          status: booking.payment.status,
          method: booking.payment.method,
          paidAt: booking.payment.paidAt?.toISOString() ?? null
        }
      : null,
    ticket: booking.ticket
      ? {
          id: booking.ticket.id,
          ticketNumber: booking.ticket.ticketNumber
        }
      : null
  }));
}