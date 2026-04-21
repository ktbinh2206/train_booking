import { TripStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { isBookingUsable } from '../lib/bookingHelpers';
import { parseVnDateInputToUtcRange, startOfDay } from '../lib/dates';
import { getEndOfDayUTC7, getStartOfDayUTC7, getTodayInVN, isValidDateString, toVNTimeString } from '../lib/timezone';

type TripSearchInput = {
  departureStationId?: string | undefined;
  arrivalStationId?: string | undefined;
  date?: string | undefined;
  fromDate?: string | undefined;
  toDate?: string | undefined;
  tripType?: 'one-way' | 'round-trip' | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
};

function normalizePage(page?: number, pageSize?: number) {
  const safePage = Number.isFinite(page) && (page ?? 0) > 0 ? Number(page) : 1;
  const safePageSize = Number.isFinite(pageSize) && (pageSize ?? 0) > 0
    ? Math.min(Number(pageSize), 100)
    : 10;

  return {
    page: safePage,
    pageSize: safePageSize,
    skip: (safePage - 1) * safePageSize
  };
}

async function buildTripListResponse(
  trips: Array<{
    id: string;
    trainId: string;
    train: { code: string; name: string };
    origin: string;
    destination: string;
    originStationId: string | null;
    destinationStationId: string | null;
    departureTime: Date;
    arrivalTime: Date;
    price: { toNumber: () => number };
    status: TripStatus;
    delayMinutes: number;
    delayedDepartureTime: Date | null;
    note: string | null;
  }>,
  page: number,
  pageSize: number,
  total: number
) {
  const data = await Promise.all(trips.map(async (trip) => {
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
      originStationId: trip.originStationId,
      destinationStationId: trip.destinationStationId,
      departureTime: trip.departureTime.toISOString(),
      arrivalTime: trip.arrivalTime.toISOString(),
      price: trip.price.toNumber(),
      status: trip.status,
      delayMinutes: trip.delayMinutes,
      delayedDepartureTime: trip.delayedDepartureTime?.toISOString() ?? null,
      note: trip.note,
      capacity: seatCapacity,
      reservedSeatCount: reservedSeatIds.size,
      availableSeatCount: Math.max(seatCapacity - reservedSeatIds.size, 0)
    };
  }));

  return {
    data: data,
    page,
    pageSize,
    total,
    totalPages: Math.max(Math.ceil(total / pageSize), 1)
  };
}

export async function searchTrips(input: TripSearchInput) {
  const { page, pageSize, skip } = normalizePage(input.page, input.pageSize);
  const where: any = { status: { not: TripStatus.CANCELLED } };

  if (input.departureStationId?.trim()) {
    where.originStationId = input.departureStationId.trim();
  }

  if (input.arrivalStationId?.trim()) {
    where.destinationStationId = input.arrivalStationId.trim();
  }

  const fromDate = input.fromDate?.trim() || input.date?.trim();
  const toDate = input.toDate?.trim() || input.date?.trim();

  if (fromDate || toDate) {
    const fromRange = fromDate ? parseVnDateInputToUtcRange(fromDate) : null;
    const toRange = toDate ? parseVnDateInputToUtcRange(toDate) : null;

    where.departureTime = {
      gte: fromRange?.start,
      lte: toRange?.end
    };
  }

  if (!where.departureTime) {
    where.departureTime = { gte: startOfDay(new Date()) };
  }

  console.log("where:", where);

  const total = await prisma.trip.count({ where });

  console.log("total:", total);

  const trips = await prisma.trip.findMany({
    where,
    include: { train: true },
    orderBy: { departureTime: 'asc' },
    skip,
    take: pageSize
  });

  console.log("trips:", trips);
  

  return buildTripListResponse(trips, page, pageSize, total);
}

export async function getTodayTrips(input: { page?: number | undefined; pageSize?: number | undefined }) {
  const { page, pageSize, skip } = normalizePage(input.page, input.pageSize);
  const todayStart = getTodayInVN();
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60_000 - 1);

  const where = {
    departureTime: {
      gte: todayStart,
      lte: todayEnd
    },
    status: { not: TripStatus.CANCELLED }
  };

  const [total, trips] = await Promise.all([
    prisma.trip.count({ where }),
    prisma.trip.findMany({
      where,
      include: {
        train: true,
        originStation: true,
        destinationStation: true
      },
      orderBy: { departureTime: 'asc' },
      skip,
      take: pageSize
    })
  ]);

  const items = await Promise.all(trips.map(async (trip) => {
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
      originStationId: trip.originStationId,
      destinationStationId: trip.destinationStationId,
      departureTime: trip.departureTime.toISOString(),
      departureTimeVN: toVNTimeString(trip.departureTime),
      arrivalTime: trip.arrivalTime.toISOString(),
      arrivalTimeVN: toVNTimeString(trip.arrivalTime),
      price: trip.price.toNumber(),
      capacity: seatCapacity,
      reservedSeatCount: reservedSeatIds.size,
      availableSeatCount: Math.max(seatCapacity - reservedSeatIds.size, 0)
    };
  }));

  return {
    data: items,
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}

export async function searchTripsByStationAndDate(input: {
  departureStationId?: string | undefined;
  arrivalStationId?: string | undefined;
  fromDate: string;
  toDate: string;
  page?: number | undefined;
  pageSize?: number | undefined;
}) {
  if (input.departureStationId && input.arrivalStationId && input.departureStationId === input.arrivalStationId) {
    throw new Error('Ga đi và ga đến phải khác nhau');
  }

  if (!isValidDateString(input.fromDate) || !isValidDateString(input.toDate)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }

  const { page, pageSize, skip } = normalizePage(input.page, input.pageSize);
  const where: any = {
    departureTime: {
      gte: getStartOfDayUTC7(input.fromDate),
      lte: getEndOfDayUTC7(input.toDate)
    },
    status: { not: TripStatus.CANCELLED }
  };

  if (input.departureStationId) {
    where.originStationId = input.departureStationId;
  }

  if (input.arrivalStationId) {
    where.destinationStationId = input.arrivalStationId;
  }

  const [total, trips] = await Promise.all([
    prisma.trip.count({ where }),
    prisma.trip.findMany({
      where,
      include: {
        train: true,
        originStation: true,
        destinationStation: true
      },
      orderBy: { departureTime: 'asc' },
      skip,
      take: pageSize
    })
  ]);

  const items = await Promise.all(trips.map(async (trip) => {
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
      originStationId: trip.originStationId,
      destinationStationId: trip.destinationStationId,
      departureTime: trip.departureTime.toISOString(),
      departureTimeVN: toVNTimeString(trip.departureTime),
      arrivalTime: trip.arrivalTime.toISOString(),
      arrivalTimeVN: toVNTimeString(trip.arrivalTime),
      price: trip.price.toNumber(),
      capacity: seatCapacity,
      reservedSeatCount: reservedSeatIds.size,
      availableSeatCount: Math.max(seatCapacity - reservedSeatIds.size, 0)
    };
  }));

  return {
    data: items,
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
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
      delayedDepartureTime: trip.delayedDepartureTime?.toISOString() ?? null,
      note: trip.note
    },
    carriages: trip.train.carriages.map((carriage) => ({
      id: carriage.id,
      code: carriage.code,
      orderIndex: carriage.orderIndex,
      basePrice: carriage.basePrice.toNumber(),
      layoutJson: carriage.layoutJson,
      seats: carriage.seats.map((seat) => ({
        id: seat.id,
        code: seat.code,
        orderIndex: seat.orderIndex,
        status: seat.status,
        price: seat.price?.toNumber() ?? null,
        available: seat.status === 'ACTIVE' && !reservedSeatIds.has(seat.id)
      }))
    })),
    activeBookings: trip.bookings.length
  };
}

export async function getTripSeatsDetail(tripId: string) {
  const detail = await getTripDetail(tripId);
  if (!detail) {
    return null;
  }

  return {
    trip: {
      id: detail.trip.id,
      trainCode: detail.trip.trainCode,
      trainName: detail.trip.trainName,
      origin: detail.trip.origin,
      destination: detail.trip.destination,
      departureTime: detail.trip.departureTime,
      departureTimeVN: toVNTimeString(new Date(detail.trip.departureTime)),
      delayedDepartureTime: detail.trip.delayedDepartureTime,
      arrivalTime: detail.trip.arrivalTime,
      arrivalTimeVN: toVNTimeString(new Date(detail.trip.arrivalTime)),
      price: detail.trip.price
    },
    carriages: detail.carriages.map((carriage: any) => ({
      ...carriage,
      type: carriage.type ?? 'SOFT_SEAT',
      seats: carriage.seats.map((seat: any) => ({
        ...seat,
        reserved: !seat.available
      }))
    }))
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

  return trips.map((trip) => ({
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
  const normalizedKeyword = keyword?.trim();

  const stations = await prisma.station.findMany({
    where: normalizedKeyword
      ? {
          OR: [
            { name: { contains: normalizedKeyword, mode: 'insensitive' } },
            { code: { contains: normalizedKeyword.toUpperCase(), mode: 'insensitive' } },
            { city: { contains: normalizedKeyword, mode: 'insensitive' } }
          ]
        }
      : undefined,
    orderBy: [{ name: 'asc' }]
  });
  return {
    items: stations.map((station) => ({
      id: station.id,
      code: station.code,
      name: station.name,
      city: station.city,
      label: `${station.name} (${station.code})`
    }))
  };
}
