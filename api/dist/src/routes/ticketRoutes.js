"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketRoutes = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../lib/asyncHandler");
const errors_1 = require("../lib/errors");
const prisma_1 = require("../lib/prisma");
exports.ticketRoutes = (0, express_1.Router)();
exports.ticketRoutes.get('/:bookingId', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const bookingId = typeof request.params.bookingId === 'string' ? request.params.bookingId : undefined;
    if (!bookingId) {
        throw new errors_1.AppError('Không tìm thấy vé.', 404);
    }
    const ticket = await prisma_1.prisma.ticket.findUnique({
        where: { bookingId },
        include: {
            booking: {
                include: {
                    trip: { include: { train: true } },
                    user: true,
                    bookingSeats: { include: { seat: true } },
                    payment: true
                }
            }
        }
    });
    if (!ticket) {
        throw new errors_1.AppError('Không tìm thấy vé.', 404);
    }
    const ticketRecord = ticket;
    response.json({
        id: ticketRecord.id,
        ticketNumber: ticketRecord.ticketNumber,
        qrToken: ticketRecord.qrToken,
        qrDataUrl: ticketRecord.qrDataUrl,
        eTicketUrl: ticketRecord.eTicketUrl,
        issuedAt: ticketRecord.issuedAt.toISOString(),
        invoiceNumber: ticketRecord.invoiceNumber,
        booking: {
            id: ticketRecord.booking.id,
            code: ticketRecord.booking.code,
            status: ticketRecord.booking.status,
            totalAmount: ticketRecord.booking.totalAmount.toNumber(),
            seats: ticketRecord.booking.bookingSeats.map((bookingSeat) => bookingSeat.seat.code),
            trip: {
                origin: ticketRecord.booking.trip.origin,
                destination: ticketRecord.booking.trip.destination,
                departureTime: ticketRecord.booking.trip.departureTime.toISOString(),
                arrivalTime: ticketRecord.booking.trip.arrivalTime.toISOString(),
                trainCode: ticketRecord.booking.trip.train.code
            }
        }
    });
}));
