"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchTrips = searchTrips;
exports.getTodayTrips = getTodayTrips;
exports.searchTripsByStationAndDate = searchTripsByStationAndDate;
exports.getTripDetail = getTripDetail;
exports.getTripSeatsDetail = getTripSeatsDetail;
exports.getTripSeatMap = getTripSeatMap;
exports.listTripsForAdmin = listTripsForAdmin;
exports.getReservedSeatIds = getReservedSeatIds;
exports.listStations = listStations;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const bookingHelpers_1 = require("../lib/bookingHelpers");
const dates_1 = require("../lib/dates");
const timezone_1 = require("../lib/timezone");
function normalizePage(page, pageSize) {
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
async function buildTripListResponse(trips, page, pageSize, total) {
    const items = await Promise.all(trips.map(async (trip) => {
        const reservedSeatIds = await getReservedSeatIds(trip.id);
        const seatCapacity = await prisma_1.prisma.seat.count({
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
            note: trip.note,
            capacity: seatCapacity,
            reservedSeatCount: reservedSeatIds.size,
            availableSeatCount: Math.max(seatCapacity - reservedSeatIds.size, 0)
        };
    }));
    return {
        items,
        page,
        pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / pageSize), 1)
    };
}
async function searchTrips(input) {
    const { page, pageSize, skip } = normalizePage(input.page, input.pageSize);
    const where = { status: { not: client_1.TripStatus.CANCELLED } };
    if (input.departureStationId?.trim()) {
        where.originStationId = input.departureStationId.trim();
    }
    if (input.arrivalStationId?.trim()) {
        where.destinationStationId = input.arrivalStationId.trim();
    }
    const fromDate = input.fromDate?.trim() || input.date?.trim();
    const toDate = input.toDate?.trim() || input.date?.trim();
    if (fromDate || toDate) {
        const fromRange = fromDate ? (0, dates_1.parseVnDateInputToUtcRange)(fromDate) : null;
        const toRange = toDate ? (0, dates_1.parseVnDateInputToUtcRange)(toDate) : null;
        where.departureTime = {
            gte: fromRange?.start,
            lte: toRange?.end
        };
    }
    if (!where.departureTime) {
        where.departureTime = { gte: (0, dates_1.startOfDay)(new Date()) };
    }
    const total = await prisma_1.prisma.trip.count({ where });
    const trips = await prisma_1.prisma.trip.findMany({
        where,
        include: { train: true },
        orderBy: { departureTime: 'asc' },
        skip,
        take: pageSize
    });
    return buildTripListResponse(trips, page, pageSize, total);
}
async function getTodayTrips(input) {
    const { page, pageSize, skip } = normalizePage(input.page, input.pageSize);
    const todayStart = (0, timezone_1.getTodayInVN)();
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60_000 - 1);
    const where = {
        departureTime: {
            gte: todayStart,
            lte: todayEnd
        },
        status: { not: client_1.TripStatus.CANCELLED }
    };
    const [total, trips] = await Promise.all([
        prisma_1.prisma.trip.count({ where }),
        prisma_1.prisma.trip.findMany({
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
        const seatCapacity = await prisma_1.prisma.seat.count({
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
            departureTimeVN: (0, timezone_1.toVNTimeString)(trip.departureTime),
            arrivalTime: trip.arrivalTime.toISOString(),
            arrivalTimeVN: (0, timezone_1.toVNTimeString)(trip.arrivalTime),
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
async function searchTripsByStationAndDate(input) {
    if (input.departureStationId && input.arrivalStationId && input.departureStationId === input.arrivalStationId) {
        throw new Error('Ga đi và ga đến phải khác nhau');
    }
    if (!(0, timezone_1.isValidDateString)(input.fromDate) || !(0, timezone_1.isValidDateString)(input.toDate)) {
        throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }
    const { page, pageSize, skip } = normalizePage(input.page, input.pageSize);
    const where = {
        departureTime: {
            gte: (0, timezone_1.getStartOfDayUTC7)(input.fromDate),
            lte: (0, timezone_1.getEndOfDayUTC7)(input.toDate)
        },
        status: { not: client_1.TripStatus.CANCELLED }
    };
    if (input.departureStationId) {
        where.originStationId = input.departureStationId;
    }
    if (input.arrivalStationId) {
        where.destinationStationId = input.arrivalStationId;
    }
    const [total, trips] = await Promise.all([
        prisma_1.prisma.trip.count({ where }),
        prisma_1.prisma.trip.findMany({
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
        const seatCapacity = await prisma_1.prisma.seat.count({
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
            departureTimeVN: (0, timezone_1.toVNTimeString)(trip.departureTime),
            arrivalTime: trip.arrivalTime.toISOString(),
            arrivalTimeVN: (0, timezone_1.toVNTimeString)(trip.arrivalTime),
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
async function getTripDetail(tripId, now = new Date()) {
    const trip = await prisma_1.prisma.trip.findUnique({
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
    const reservedSeatIds = new Set();
    for (const booking of trip.bookings) {
        if (!(0, bookingHelpers_1.isBookingUsable)(booking.status, booking.holdExpiresAt, now)) {
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
        carriages: trip.train.carriages.map((carriage) => ({
            id: carriage.id,
            code: carriage.code,
            orderIndex: carriage.orderIndex,
            seats: carriage.seats.map((seat) => ({
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
async function getTripSeatsDetail(tripId) {
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
            departureTimeVN: (0, timezone_1.toVNTimeString)(new Date(detail.trip.departureTime)),
            arrivalTime: detail.trip.arrivalTime,
            arrivalTimeVN: (0, timezone_1.toVNTimeString)(new Date(detail.trip.arrivalTime)),
            price: detail.trip.price
        },
        carriages: detail.carriages.map((carriage) => ({
            ...carriage,
            type: carriage.type ?? 'SOFT_SEAT',
            seats: carriage.seats.map((seat) => ({
                ...seat,
                reserved: !seat.available
            }))
        }))
    };
}
async function getTripSeatMap(tripId) {
    const detail = await getTripDetail(tripId);
    return detail?.carriages ?? null;
}
async function listTripsForAdmin() {
    const trips = await prisma_1.prisma.trip.findMany({
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
async function getReservedSeatIds(tripId, now = new Date()) {
    const bookings = await prisma_1.prisma.booking.findMany({
        where: {
            tripId,
            OR: [
                { status: 'PAID' },
                { status: 'HOLDING', holdExpiresAt: { gt: now } }
            ]
        },
        include: { bookingSeats: true }
    });
    const reservedSeatIds = new Set();
    for (const booking of bookings) {
        if (!(0, bookingHelpers_1.isBookingUsable)(booking.status, booking.holdExpiresAt, now)) {
            continue;
        }
        for (const bookingSeat of booking.bookingSeats) {
            reservedSeatIds.add(bookingSeat.seatId);
        }
    }
    return reservedSeatIds;
}
async function listStations(keyword) {
    const normalizedKeyword = keyword?.trim();
    const stations = await prisma_1.prisma.station.findMany({
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
