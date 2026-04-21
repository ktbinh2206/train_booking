"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBooking = createBooking;
exports.payBooking = payBooking;
exports.expireBooking = expireBooking;
exports.listBookings = listBookings;
exports.getBookingById = getBookingById;
exports.cancelBooking = cancelBooking;
const crypto_1 = require("crypto");
const decimal_js_1 = __importDefault(require("decimal.js"));
const prisma_1 = require("../lib/prisma");
const errors_1 = require("../lib/errors");
const dates_1 = require("../lib/dates");
const communications_1 = require("../lib/communications");
const qr_1 = require("../lib/qr");
const bookingHelpers_1 = require("../lib/bookingHelpers");
async function createBooking(input) {
    if (input.seatIds.length === 0) {
        throw new errors_1.AppError('Phải chọn ít nhất 1 ghế.', 400);
    }
    const now = new Date();
    const trip = await prisma_1.prisma.trip.findUnique({
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
        throw new errors_1.AppError('Chuyến tàu không tồn tại.', 404);
    }
    if (!(0, bookingHelpers_1.isTripActive)(trip.status)) {
        throw new errors_1.AppError('Chuyến đã bị hủy, không thể đặt vé.', 400);
    }
    const allSeats = trip.train.carriages.flatMap((carriage) => carriage.seats);
    const seatById = new Map(allSeats.map((seat) => [seat.id, seat]));
    const selectedSeatCount = input.seatIds.filter((seatId) => seatById.has(seatId)).length;
    if (selectedSeatCount !== input.seatIds.length) {
        throw new errors_1.AppError('Có ghế không thuộc chuyến tàu này.', 400);
    }
    const reservedSeatIds = await getReservedSeatIds(trip.id, now);
    for (const seatId of input.seatIds) {
        if (reservedSeatIds.has(seatId)) {
            throw new errors_1.AppError('Ghế đã được giữ hoặc đã bán.', 409);
        }
    }
    const holdExpiresAt = (0, dates_1.addMinutes)(now, 5);
    const bookingCode = `BK-${now.getTime().toString(36).toUpperCase()}-${(0, crypto_1.randomUUID)().slice(0, 6).toUpperCase()}`;
    const totalAmount = trip.price.mul(input.seatIds.length);
    const booking = await prisma_1.prisma.booking.create({
        data: {
            code: bookingCode,
            userId: input.userId,
            tripId: trip.id,
            status: 'HOLDING',
            holdExpiresAt,
            totalAmount: new decimal_js_1.default(totalAmount.toString()),
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
    await (0, communications_1.createNotification)({
        userId: input.userId,
        bookingId: booking.id,
        type: 'BOOKING_HELD',
        message: `Đặt chỗ thành công cho ${booking.code}. Hết hạn giữ chỗ lúc ${holdExpiresAt.toISOString()}.`
    });
    await (0, communications_1.recordEmail)({
        userId: input.userId,
        bookingId: booking.id,
        toEmail: input.contactEmail,
        subject: 'Giữ chỗ vé tàu thành công',
        kind: 'BOOKING_HELD',
        html: `<p>Booking ${booking.code} đã được giữ chỗ đến ${holdExpiresAt.toLocaleString('vi-VN')}.</p>`
    });
    return booking;
}
async function payBooking(bookingId) {
    const now = new Date();
    const booking = await prisma_1.prisma.booking.findUnique({
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
        throw new errors_1.AppError('Không tìm thấy booking.', 404);
    }
    if (booking.status !== 'HOLDING') {
        throw new errors_1.AppError('Booking không ở trạng thái chờ thanh toán.', 400);
    }
    if (!booking.holdExpiresAt || booking.holdExpiresAt.getTime() <= now.getTime()) {
        await expireBooking(booking.id, 'Hết 5 phút giữ chỗ trước thanh toán.');
        throw new errors_1.AppError('Booking đã hết hạn giữ chỗ.', 400);
    }
    const seatLabels = booking.bookingSeats.map((item) => item.seat.code);
    const ticketPayload = `train-booking:${booking.code}:${booking.trip.id}:${seatLabels.join('|')}`;
    const qrDataUrl = await (0, qr_1.createQrDataUrl)(ticketPayload);
    const ticketNumber = `TK-${now.getTime().toString(36).toUpperCase()}-${(0, crypto_1.randomUUID)().slice(0, 6).toUpperCase()}`;
    const invoiceNumber = `INV-${now.getTime().toString(36).toUpperCase()}-${(0, crypto_1.randomUUID)().slice(0, 6).toUpperCase()}`;
    const updatedBooking = await prisma_1.prisma.$transaction(async (transaction) => {
        await transaction.payment.update({
            where: { bookingId: booking.id },
            data: {
                status: 'PAID',
                transactionRef: `PAY-${(0, crypto_1.randomUUID)().slice(0, 12).toUpperCase()}`,
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
                qrToken: (0, crypto_1.randomUUID)(),
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
                    html: (0, communications_1.buildInvoiceHtml)({
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
async function expireBooking(bookingId, reason = 'Hết hạn giữ chỗ.') {
    const booking = await prisma_1.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.status !== 'HOLDING') {
        return null;
    }
    const expiredBooking = await prisma_1.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'EXPIRED' }
    });
    await prisma_1.prisma.notification.create({
        data: {
            userId: booking.userId,
            bookingId: booking.id,
            type: 'BOOKING_EXPIRED',
            message: reason
        }
    });
    return expiredBooking;
}
async function listBookings(input) {
    const where = {};
    if (input.userId) {
        where.userId = input.userId;
    }
    if (input.status) {
        where.status = input.status;
    }
    if (input.from || input.to) {
        const fromRange = input.from ? (0, dates_1.parseVnDateInputToUtcRange)(input.from) : null;
        const toRange = input.to ? (0, dates_1.parseVnDateInputToUtcRange)(input.to) : null;
        where.trip = {
            departureTime: {
                gte: fromRange?.start,
                lte: toRange?.end
            }
        };
    }
    return prisma_1.prisma.booking.findMany({
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
async function getBookingById(bookingId) {
    return prisma_1.prisma.booking.findUnique({
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
async function cancelBooking(input) {
    const booking = await prisma_1.prisma.booking.findUnique({
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
        throw new errors_1.AppError('Không tìm thấy booking.', 404);
    }
    if (booking.status === 'HOLDING') {
        await prisma_1.prisma.booking.update({
            where: { id: booking.id },
            data: { status: 'CANCELLED' }
        });
        await (0, communications_1.createNotification)({
            userId: booking.userId,
            bookingId: booking.id,
            type: 'TRIP_CANCELLED',
            message: input.reason
        });
        return prisma_1.prisma.booking.findUniqueOrThrow({
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
        throw new errors_1.AppError('Chỉ booking chờ thanh toán hoặc đã thanh toán mới có thể hủy.', 400);
    }
    if (!input.refund) {
        throw new errors_1.AppError('Booking đã thanh toán cần xác nhận hoàn tiền khi hủy.', 400);
    }
    await prisma_1.prisma.$transaction(async (transaction) => {
        await transaction.booking.update({
            where: { id: booking.id },
            data: { status: 'REFUNDED' }
        });
        await transaction.payment.update({
            where: { bookingId: booking.id },
            data: {
                status: 'REFUNDED',
                refundedAt: new Date(),
                transactionRef: `REFUND-${(0, crypto_1.randomUUID)().slice(0, 12).toUpperCase()}`
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
    return prisma_1.prisma.booking.findUniqueOrThrow({
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
async function getReservedSeatIds(tripId, now) {
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
