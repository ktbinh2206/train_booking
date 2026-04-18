import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { isBookingUsable } from '../lib/bookingHelpers';
import { parseVnDateInputToUtcRange, startOfDay } from '../lib/dates';

export async function searchTrips(input: {
  origin?: string | undefined;
  destination?: string | undefined;
  date?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}) {
  const where: any = {};
  const now = new Date();
  const page = Number.isFinite(input.page) && (input.page ?? 0) > 0 ? Number(input.page) : 1;
  const pageSize = Number.isFinite(input.pageSize) && (input.pageSize ?? 0) > 0
    ? Math.min(Number(input.pageSize), 100)
    : 10;

  if (input.origin?.trim()) {
    where.origin = { contains: input.origin.trim(), mode: 'insensitive' };
  }

  if (input.destination?.trim()) {
    where.destination = { contains: input.destination.trim(), mode: 'insensitive' };
  }

  if (input.date?.trim()) {
    const range = parseVnDateInputToUtcRange(input.date);
    if (range) {
      where.departureTime = { gte: range.start, lte: range.end };
    }
  }

  if (!where.departureTime) {
    where.departureTime = { gte: startOfDay(now) };
  }

  const total = await prisma.trip.count({ where });
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * pageSize;

  const trips = await prisma.trip.findMany({
    where,
    include: { train: true },
    orderBy: { departureTime: 'asc' },
    skip,
    take: pageSize
  });

  const items = await Promise.all(
    trips.map(async (trip: {
      id: string;
      trainId: string;
      origin: string;
      destination: string;
      departureTime: Date;
      arrivalTime: Date;
      price: { toNumber: () => number };
      status: string;
      delayMinutes: number;
      note: string | null;
      train: { code: string; name: string };
    }) => {
      const reservedSeatIds = await getReservedSeatIds(trip.id);
      const seatCapacity = await prisma.seat.count({
        where: { carriage: { trainId: trip.trainId } }
      });

      return {
        id: trip.id,
        trainId: trip.trainId,
        trainCode: trip.train.code,
        trainName: trip.train.name,
        origin: trip.origin,
        destination: trip.destination,
        departureTime: trip.departureTime.toISOString(),
        arrivalTime: trip.arrivalTime.toISOString(),
        price: trip.price.toNumber(),
        status: trip.status,
        delayMinutes: trip.delayMinutes,
        note: trip.note,
        capacity: seatCapacity,
        reservedSeatCount: reservedSeatIds.size,
        availableSeatCount: Math.max(seatCapacity - reservedSeatIds.size, 0)
      };
    })
  );

  return {
    items,
    page: safePage,
    pageSize,
    total,
    totalPages
  };
}

export async function getTripDetail(tripId: string, now = new Date()) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      train: {
        include: {
          carriages: {
            orderBy: { orderIndex: 'asc' },
            include: {
              seats: {
                orderBy: { orderIndex: 'asc' }
              }
            }
          }
        }
      },
      bookings: {
        where: {
          OR: [
            { status: 'PAID' },
            { status: 'HOLDING', holdExpiresAt: { gt: now } }
          ]
        },
        include: {
          bookingSeats: true,
          user: true,
          payment: true,
          ticket: true
        }
      }
    }
  });

  if (!trip) {
    return null;
  }

  const reservedSeatIds = new Set<string>();
  for (const booking of trip.bookings) {
    if (!isBookingUsable(booking.status, booking.holdExpiresAt, now)) {
      continue;
    }

    for (const bookingSeat of booking.bookingSeats) {
      reservedSeatIds.add(bookingSeat.seatId);
    }
  }

  return {
    trip: {
      id: trip.id,
      trainId: trip.trainId,
      trainCode: trip.train.code,
      trainName: trip.train.name,
      origin: trip.origin,
      destination: trip.destination,
      departureTime: trip.departureTime.toISOString(),
      arrivalTime: trip.arrivalTime.toISOString(),
      price: trip.price.toNumber(),
      status: trip.status,
      delayMinutes: trip.delayMinutes,
      note: trip.note
    },
    carriages: trip.train.carriages.map((carriage: {
      id: string;
      code: string;
      orderIndex: number;
      seats: Array<{ id: string; code: string; orderIndex: number; status: string }>;
    }) => ({
      id: carriage.id,
      code: carriage.code,
      orderIndex: carriage.orderIndex,
      seats: carriage.seats.map((seat: { id: string; code: string; orderIndex: number; status: string }) => ({
        id: seat.id,
        code: seat.code,
        orderIndex: seat.orderIndex,
        status: seat.status,
        available: seat.status === 'ACTIVE' && !reservedSeatIds.has(seat.id)
      }))
    })),
    activeBookings: trip.bookings.length
  };
}

export async function getTripSeatMap(tripId: string) {
  const detail = await getTripDetail(tripId);
  return detail?.carriages ?? null;
}

export async function listTripsForAdmin() {
  const trips = await prisma.trip.findMany({
    include: { train: true },
    orderBy: { departureTime: 'asc' }
  });

  return trips.map((trip: {
    id: string;
    trainId: string;
    origin: string;
    destination: string;
    departureTime: Date;
    arrivalTime: Date;
    price: { toNumber: () => number };
    status: string;
    delayMinutes: number;
    note: string | null;
    train: { code: string };
  }) => ({
    id: trip.id,
    trainId: trip.trainId,
    trainCode: trip.train.code,
    origin: trip.origin,
    destination: trip.destination,
    departureTime: trip.departureTime.toISOString(),
    arrivalTime: trip.arrivalTime.toISOString(),
    price: trip.price.toNumber(),
    status: trip.status,
    delayMinutes: trip.delayMinutes,
    note: trip.note
  }));
}

export async function getReservedSeatIds(tripId: string, now = new Date()) {
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

export async function listStations(keyword?: string | undefined) {
  const normalizedKeyword = keyword?.trim().toLowerCase();
  const [origins, destinations] = await Promise.all([
    prisma.trip.findMany({ select: { origin: true }, distinct: ['origin'] }),
    prisma.trip.findMany({ select: { destination: true }, distinct: ['destination'] })
  ]);

  const merged = new Set<string>();
  for (const item of origins) {
    merged.add(item.origin);
  }
  for (const item of destinations) {
    merged.add(item.destination);
  }

  const stations = Array.from(merged)
    .filter((name) => {
      if (!normalizedKeyword) {
        return true;
      }
      return name.toLowerCase().includes(normalizedKeyword);
    })
    .sort((a, b) => a.localeCompare(b, 'vi'));

  return {
    items: stations
  };
}