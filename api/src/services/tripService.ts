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
  trips: any[],
  page: number,
  pageSize: number,
  total: number
) {
  const tripIds = trips.map(t => t.id);

  // 🔥 1. Đếm total seats theo trip
  const seatCounts = await prisma.tripSeat.groupBy({
    by: ['carriageId'],
    _count: true
  });

  // map carriage -> count
  const carriageSeatMap = new Map<string, number>();
  seatCounts.forEach(item => {
    carriageSeatMap.set(item.carriageId, item._count);
  });

  // 🔥 2. Lấy tất cả carriage của trip
  const tripCarriages = await prisma.tripCarriage.findMany({
    where: { tripId: { in: tripIds } },
    select: { id: true, tripId: true }
  });

  // map trip -> capacity
  const tripCapacityMap = new Map<string, number>();

  tripCarriages.forEach(c => {
    const count = carriageSeatMap.get(c.id) || 0;
    tripCapacityMap.set(
      c.tripId,
      (tripCapacityMap.get(c.tripId) || 0) + count
    );
  });

  // 🔥 3. reserved seats
  const reservedCounts = await prisma.bookingSeat.groupBy({
    by: ['seatId'],
    where: {
      booking: {
        tripId: { in: tripIds },
        status: { in: ['HOLDING', 'PAID'] }
      }
    },
    _count: true
  });

  // map trip -> reserved
  const tripReservedMap = new Map<string, number>();

  if (reservedCounts.length > 0) {
    const seatIds = reservedCounts.map(r => r.seatId);

    const seats = await prisma.tripSeat.findMany({
      where: { id: { in: seatIds } },
      select: {
        id: true,
        carriage: { select: { tripId: true } }
      }
    });

    seats.forEach(seat => {
      tripReservedMap.set(
        seat.carriage.tripId,
        (tripReservedMap.get(seat.carriage.tripId) || 0) + 1
      );
    });
  }

  // 🔥 4. build response
  const data = trips.map((trip) => {
    const capacity = tripCapacityMap.get(trip.id) || 0;
    const reserved = tripReservedMap.get(trip.id) || 0;

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

      capacity,
      reservedSeatCount: reserved,
      availableSeatCount: Math.max(capacity - reserved, 0)
    };
  });

  return {
    data,
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
export async function getTodayTrips(input: { page?: number; pageSize?: number }) {
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

  const tripIds = trips.map(t => t.id);

  // 🔥 1. lấy toàn bộ carriage của trip
  const tripCarriages = await prisma.tripCarriage.findMany({
    where: { tripId: { in: tripIds } },
    select: { id: true, tripId: true }
  });

  const carriageIds = tripCarriages.map(c => c.id);

  // 🔥 2. count seats theo carriage
  const seatCounts = await prisma.tripSeat.groupBy({
    by: ['carriageId'],
    where: { carriageId: { in: carriageIds } },
    _count: true
  });

  const carriageSeatMap = new Map<string, number>();
  seatCounts.forEach(s => {
    carriageSeatMap.set(s.carriageId, s._count);
  });

  // 🔥 3. map capacity theo trip
  const tripCapacityMap = new Map<string, number>();

  tripCarriages.forEach(c => {
    const count = carriageSeatMap.get(c.id) || 0;
    tripCapacityMap.set(
      c.tripId,
      (tripCapacityMap.get(c.tripId) || 0) + count
    );
  });

  // 🔥 4. reserved seats (batch)
  const reservedSeats = await prisma.bookingSeat.findMany({
    where: {
      booking: {
        tripId: { in: tripIds },
        status: { in: ['HOLDING', 'PAID'] }
      }
    },
    select: {
      seat: {
        select: {
          carriage: { select: { tripId: true } }
        }
      }
    }
  });

  const tripReservedMap = new Map<string, number>();

  reservedSeats.forEach(r => {
    const tripId = r.seat.carriage.tripId;
    tripReservedMap.set(
      tripId,
      (tripReservedMap.get(tripId) || 0) + 1
    );
  });

  // 🔥 5. build response
  const items = trips.map((trip) => {
    const capacity = tripCapacityMap.get(trip.id) || 0;
    const reserved = tripReservedMap.get(trip.id) || 0;

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

      capacity,
      reservedSeatCount: reserved,
      availableSeatCount: Math.max(capacity - reserved, 0)
    };
  });

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
  departureStationId?: string;
  arrivalStationId?: string;
  fromDate: string;
  toDate: string;
  page?: number;
  pageSize?: number;
}) {
  if (
    input.departureStationId &&
    input.arrivalStationId &&
    input.departureStationId === input.arrivalStationId
  ) {
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

  // =========================
  // 🚀 BATCH PERFORMANCE
  // =========================

  const tripIds = trips.map(t => t.id);

  const allSeats = await prisma.tripSeat.findMany({
    where: {
      carriage: {
        tripId: { in: tripIds }
      }
    },
    select: {
      carriage: {
        select: { tripId: true }
      }
    }
  });

  const capacityMap = new Map<string, number>();

  for (const s of allSeats) {
    const tripId = s.carriage.tripId;
    capacityMap.set(tripId, (capacityMap.get(tripId) || 0) + 1);
  }

  const reserved = await prisma.bookingSeat.findMany({
    where: {
      booking: {
        tripId: { in: tripIds },
        status: { in: ['HOLDING', 'PAID'] }
      }
    },
    select: {
      seat: {
        select: {
          carriage: {
            select: { tripId: true }
          }
        }
      }
    }
  });

  const reservedMap = new Map<string, number>();

  for (const r of reserved) {
    const tripId = r.seat.carriage.tripId;
    reservedMap.set(tripId, (reservedMap.get(tripId) || 0) + 1);
  }

  // =========================
  // RESPONSE
  // =========================

  const items = trips.map((trip) => {
    const capacity = capacityMap.get(trip.id) || 0;
    const reservedCount = reservedMap.get(trip.id) || 0;

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
      capacity,
      reservedSeatCount: reservedCount,
      availableSeatCount: Math.max(capacity - reservedCount, 0)
    };
  });

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
      train: true,
      tripCarriages: {
        orderBy: { orderIndex: 'asc' },
        include: {
          seats: {
            orderBy: { seatNumber: 'asc' }
          }
        }
      }
    }
  });

  if (!trip) return null;

  // =========================
  // 🚀 RESERVED SEATS (BATCH)
  // =========================

  const reserved = await prisma.bookingSeat.findMany({
    where: {
      booking: {
        tripId: tripId,
        OR: [
          { status: 'PAID' },
          { status: 'HOLDING', holdExpiresAt: { gt: now } }
        ]
      }
    },
    select: {
      seatId: true,
      booking: {
        select: {
          status: true
        }
      }
    }
  });

  const reservedSeatIds = new Set(reserved.map(r => r.seatId));
  const reservationStatusBySeatId = new Map<string, 'PAID' | 'HOLDING'>();
  reserved.forEach((item) => {
    const current = reservationStatusBySeatId.get(item.seatId);
    // PAID has higher priority than HOLDING for UI status rendering.
    if (item.booking.status === 'PAID' || !current) {
      reservationStatusBySeatId.set(item.seatId, item.booking.status as 'PAID' | 'HOLDING');
    }
  });

  // =========================
  // RESPONSE
  // =========================

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

    carriages: trip.tripCarriages.map((carriage) => {
      const seatByCode = new Map(carriage.seats.map((seat) => [seat.seatNumber, seat]));
      const rawLayout = carriage.layout as {
        rows?: number;
        cols?: number;
        cells?: Array<Array<{ seatNumber?: string } | null>>;
      } | null;
      const rows = Math.max(1, Number(rawLayout?.rows ?? 1));
      const cols = Math.max(1, Number(rawLayout?.cols ?? 1));

      const emptyCells: Array<Array<{
        id: string;
        seatNumber: string;
        status: 'ACTIVE' | 'INACTIVE' | 'HOLDING' | 'SOLD';
        price: number | null;
        finalPrice: number;
        available: boolean;
      } | null>> = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));

      const rawCells = Array.isArray(rawLayout?.cells) ? rawLayout.cells : [];
      rawCells.forEach((row, rowIndex) => {
        if (!Array.isArray(row) || rowIndex >= rows) return;
        row.forEach((cell, colIndex) => {
          if (!cell || colIndex >= cols) return;
          const seatNumber = typeof cell.seatNumber === 'string' ? cell.seatNumber : null;
          if (!seatNumber) return;
          const seat = seatByCode.get(seatNumber);
          if (!seat) return;
          const reservationStatus = reservationStatusBySeatId.get(seat.id) ?? null;
          const available = seat.status === 'ACTIVE' && !reservedSeatIds.has(seat.id);
          const runtimeStatus = seat.status === 'INACTIVE'
            ? 'INACTIVE'
            : reservationStatus === 'HOLDING'
              ? 'HOLDING'
              : reservationStatus === 'PAID'
                ? 'SOLD'
                : 'ACTIVE';

          emptyCells[rowIndex][colIndex] = {
            id: seat.id,
            seatNumber: seat.seatNumber,
            status: runtimeStatus,
            price: seat.price ? seat.price.toNumber() : null,
            finalPrice: seat.price ? seat.price.toNumber() : carriage.basePrice.toNumber(),
            available
          };
        });
      });

      return {
        id: carriage.id,
        code: carriage.code,
        basePrice: carriage.basePrice.toNumber(),
        layout: {
          rows,
          cols,
          cells: emptyCells
        }
      };
    }),

    activeBookings: reservedSeatIds.size // hoặc count booking nếu cần
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
