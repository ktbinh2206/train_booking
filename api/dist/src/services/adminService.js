"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTrip = createTrip;
exports.updateTrip = updateTrip;
exports.removeTrip = removeTrip;
exports.setTripStatus = setTripStatus;
exports.listTrains = listTrains;
exports.createTrain = createTrain;
exports.updateTrain = updateTrain;
exports.deleteTrain = deleteTrain;
exports.createCarriage = createCarriage;
exports.updateCarriage = updateCarriage;
exports.deleteCarriage = deleteCarriage;
exports.bulkCreateSeats = bulkCreateSeats;
exports.updateSeat = updateSeat;
exports.deleteSeat = deleteSeat;
exports.getReports = getReports;
exports.getDemoMeta = getDemoMeta;
exports.listAdminTickets = listAdminTickets;
exports.listRecentBookings = listRecentBookings;
const crypto_1 = require("crypto");
const decimal_js_1 = __importDefault(require("decimal.js"));
const prisma_1 = require("../lib/prisma");
const errors_1 = require("../lib/errors");
const communications_1 = require("../lib/communications");
async function createTrip(input) {
    return prisma_1.prisma.trip.create({
        data: {
            trainId: input.trainId,
            origin: input.origin,
            destination: input.destination,
            departureTime: new Date(input.departureTime),
            arrivalTime: new Date(input.arrivalTime),
            price: new decimal_js_1.default(input.price),
            status: 'ON_TIME'
        },
        include: { train: true }
    });
}
async function updateTrip(tripId, input) {
    return prisma_1.prisma.trip.update({
        where: { id: tripId },
        data: {
            ...(input.trainId !== undefined ? { trainId: input.trainId } : {}),
            ...(input.origin !== undefined ? { origin: input.origin } : {}),
            ...(input.destination !== undefined ? { destination: input.destination } : {}),
            ...(input.departureTime !== undefined ? { departureTime: new Date(input.departureTime) } : {}),
            ...(input.arrivalTime !== undefined ? { arrivalTime: new Date(input.arrivalTime) } : {}),
            ...(typeof input.price === 'number' ? { price: new decimal_js_1.default(input.price) } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(typeof input.delayMinutes === 'number' ? { delayMinutes: input.delayMinutes } : {}),
            ...(input.note !== undefined ? { note: input.note } : {})
        },
        include: { train: true }
    });
}
async function removeTrip(tripId) {
    await prisma_1.prisma.trip.delete({ where: { id: tripId } });
    return { success: true };
}
async function setTripStatus(tripId, input) {
    const trip = await prisma_1.prisma.trip.findUnique({
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
        throw new errors_1.AppError('Không tìm thấy chuyến tàu.', 404);
    }
    if (input.status === 'DELAYED' && typeof input.delayMinutes !== 'number') {
        throw new errors_1.AppError('Delay phải có số phút delay.', 400);
    }
    const updatedTrip = await prisma_1.prisma.trip.update({
        where: { id: tripId },
        data: {
            status: input.status,
            delayMinutes: input.delayMinutes ?? trip.delayMinutes,
            note: input.note ?? trip.note
        },
        include: { train: true }
    });
    if (input.status === 'DELAYED') {
        for (const booking of trip.bookings) {
            if (booking.status === 'PAID' || booking.status === 'HOLDING') {
                await (0, communications_1.createNotification)({
                    userId: booking.userId,
                    bookingId: booking.id,
                    type: 'TRIP_DELAYED',
                    message: `Chuyến ${trip.origin} - ${trip.destination} bị delay ${updatedTrip.delayMinutes} phút.`
                });
                await (0, communications_1.recordEmail)({
                    userId: booking.userId,
                    bookingId: booking.id,
                    toEmail: booking.contactEmail,
                    subject: 'Thông báo delay chuyến tàu',
                    kind: 'TRIP_DELAYED',
                    html: `<p>Chuyến ${trip.origin} - ${trip.destination} bị delay ${updatedTrip.delayMinutes} phút.</p>`
                });
            }
        }
    }
    if (input.status === 'CANCELLED') {
        for (const booking of trip.bookings) {
            if (booking.status === 'PAID') {
                await prisma_1.prisma.booking.update({ where: { id: booking.id }, data: { status: 'REFUNDED' } });
                await prisma_1.prisma.payment.update({
                    where: { bookingId: booking.id },
                    data: {
                        status: 'REFUNDED',
                        refundedAt: new Date(),
                        transactionRef: `AUTO-REFUND-${(0, crypto_1.randomUUID)().slice(0, 10).toUpperCase()}`
                    }
                });
                await (0, communications_1.createNotification)({
                    userId: booking.userId,
                    bookingId: booking.id,
                    type: 'REFUND_ISSUED',
                    message: `Chuyến ${trip.origin} - ${trip.destination} bị hủy. Vé đã được hoàn tiền.`
                });
                await (0, communications_1.recordEmail)({
                    userId: booking.userId,
                    bookingId: booking.id,
                    toEmail: booking.contactEmail,
                    subject: 'Hoàn tiền do hủy chuyến',
                    kind: 'REFUND_ISSUED',
                    html: `<p>Chuyến ${trip.origin} - ${trip.destination} bị hủy. Vé đã được hoàn tiền.</p>`
                });
            }
            if (booking.status === 'HOLDING') {
                await prisma_1.prisma.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } });
                await (0, communications_1.createNotification)({
                    userId: booking.userId,
                    bookingId: booking.id,
                    type: 'TRIP_CANCELLED',
                    message: `Chuyến ${trip.origin} - ${trip.destination} đã bị hủy.`
                });
            }
        }
    }
    return updatedTrip;
}
async function listTrains() {
    return prisma_1.prisma.train.findMany({
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
async function createTrain(input) {
    return prisma_1.prisma.train.create({ data: input });
}
async function updateTrain(trainId, input) {
    const data = {};
    if (input.code !== undefined)
        data.code = input.code;
    if (input.name !== undefined)
        data.name = input.name;
    return prisma_1.prisma.train.update({
        where: { id: trainId },
        data
    });
}
async function deleteTrain(trainId) {
    await prisma_1.prisma.train.delete({ where: { id: trainId } });
    return { success: true };
}
async function createCarriage(input) {
    return prisma_1.prisma.carriage.create({
        data: {
            trainId: input.trainId,
            code: input.code,
            orderIndex: input.orderIndex,
            type: input.type ?? 'SOFT_SEAT'
        }
    });
}
async function updateCarriage(carriageId, input) {
    const data = {};
    if (input.code !== undefined)
        data.code = input.code;
    if (input.orderIndex !== undefined)
        data.orderIndex = input.orderIndex;
    return prisma_1.prisma.carriage.update({ where: { id: carriageId }, data });
}
async function deleteCarriage(carriageId) {
    await prisma_1.prisma.carriage.delete({ where: { id: carriageId } });
    return { success: true };
}
async function bulkCreateSeats(input) {
    const carriage = await prisma_1.prisma.carriage.findUnique({ where: { id: input.carriageId } });
    if (!carriage) {
        throw new errors_1.AppError('Không tìm thấy toa.', 404);
    }
    const existingSeats = await prisma_1.prisma.seat.count({ where: { carriageId: input.carriageId } });
    const seats = await prisma_1.prisma.seat.createMany({
        data: Array.from({ length: input.count }, (_, index) => {
            const seatNumber = existingSeats + index + 1;
            return {
                carriageId: input.carriageId,
                code: `${input.prefix ?? carriage.code}-${seatNumber.toString().padStart(2, '0')}`,
                orderIndex: seatNumber
            };
        })
    });
    return { created: seats.count };
}
async function updateSeat(seatId, input) {
    const data = {};
    if (input.code !== undefined)
        data.code = input.code;
    if (input.status !== undefined)
        data.status = input.status;
    return prisma_1.prisma.seat.update({ where: { id: seatId }, data });
}
async function deleteSeat(seatId) {
    await prisma_1.prisma.seat.delete({ where: { id: seatId } });
    return { success: true };
}
async function getReports() {
    const [trips, bookings, payments, totalSeats] = await Promise.all([
        prisma_1.prisma.trip.findMany({ include: { bookings: { include: { payment: true } } } }),
        prisma_1.prisma.booking.findMany({ include: { payment: true } }),
        prisma_1.prisma.payment.findMany({ where: { status: 'PAID' } }),
        prisma_1.prisma.seat.count()
    ]);
    const activeBookings = bookings.filter((booking) => booking.status === 'PAID' || booking.status === 'HOLDING');
    const revenue = payments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0);
    return {
        totalTrips: trips.length,
        totalBookings: bookings.length,
        activeBookings: activeBookings.length,
        paidBookings: bookings.filter((booking) => booking.status === 'PAID').length,
        cancelledBookings: bookings.filter((booking) => booking.status === 'CANCELLED').length,
        refundedBookings: bookings.filter((booking) => booking.status === 'REFUNDED').length,
        delayedTrips: trips.filter((trip) => trip.status === 'DELAYED').length,
        cancelledTrips: trips.filter((trip) => trip.status === 'CANCELLED').length,
        revenue,
        occupancyRate: totalSeats === 0 ? 0 : Math.round((activeBookings.reduce((sum, booking) => sum + booking.seatCount, 0) / totalSeats) * 1000) / 10
    };
}
async function getDemoMeta() {
    const [users, trips] = await Promise.all([
        prisma_1.prisma.user.findMany({ orderBy: { role: 'desc' } }),
        prisma_1.prisma.trip.findMany({ include: { train: true }, orderBy: { departureTime: 'asc' } })
    ]);
    return {
        holdMinutes: 5,
        users: users.map((user) => ({ id: user.id, name: user.name, email: user.email, role: user.role })),
        defaultUserId: users.find((user) => user.role === 'USER')?.id ?? null,
        adminUserId: users.find((user) => user.role === 'ADMIN')?.id ?? null,
        trips: trips.map((trip) => ({
            id: trip.id,
            trainCode: trip.train.code,
            origin: trip.origin,
            destination: trip.destination,
            departureTime: trip.departureTime.toISOString(),
            status: trip.status
        }))
    };
}
async function listAdminTickets() {
    const tickets = await prisma_1.prisma.ticket.findMany({
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
            seatCodes: ticket.booking.bookingSeats.map((item) => item.seat?.code).filter((code) => Boolean(code)),
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
async function listRecentBookings(limit = 8) {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const bookings = await prisma_1.prisma.booking.findMany({
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
        seatCodes: booking.bookingSeats.map((item) => item.seat?.code).filter((code) => Boolean(code)),
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
