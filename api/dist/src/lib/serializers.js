"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moneyToNumber = moneyToNumber;
exports.serializeTrip = serializeTrip;
exports.serializeBooking = serializeBooking;
exports.serializeNotification = serializeNotification;
exports.serializeTrain = serializeTrain;
exports.resolveSeatCode = resolveSeatCode;
function moneyToNumber(value) {
    return value.toNumber();
}
function serializeTrip(trip) {
    return {
        id: trip.id,
        trainId: trip.trainId,
        trainCode: trip.train?.code ?? null,
        trainName: trip.train?.name ?? null,
        origin: trip.origin,
        destination: trip.destination,
        departureTime: trip.departureTime.toISOString(),
        arrivalTime: trip.arrivalTime.toISOString(),
        price: moneyToNumber(trip.price),
        status: trip.status,
        delayMinutes: trip.delayMinutes,
        delayedDepartureTime: trip.delayedDepartureTime?.toISOString() ?? null,
        note: trip.note
    };
}
function serializeBooking(booking) {
    return {
        id: booking.id,
        code: booking.code,
        status: booking.status,
        holdExpiresAt: booking.holdExpiresAt?.toISOString() ?? null,
        expiredAt: booking.expiredAt?.toISOString() ?? null,
        isAffected: booking.isAffected,
        totalAmount: moneyToNumber(booking.totalAmount),
        contactEmail: booking.contactEmail,
        seatCount: booking.seatCount,
        seatIds: booking.bookingSeats?.map((item) => item.seatId) ?? [],
        seatCodes: booking.bookingSeats?.map((item) => item.seat?.seatNumber).filter((code) => Boolean(code)) ?? [],
        user: {
            id: booking.user.id,
            name: booking.user.name,
            email: booking.user.email,
            role: booking.user.role
        },
        trip: serializeTrip(booking.trip),
        payment: booking.payment
            ? {
                id: booking.payment.id,
                status: booking.payment.status,
                method: booking.payment.method,
                transactionRef: booking.payment.transactionRef,
                amount: moneyToNumber(booking.payment.amount),
                paidAt: booking.payment.paidAt?.toISOString() ?? null,
                refundedAt: booking.payment.refundedAt?.toISOString() ?? null
            }
            : null,
        ticket: booking.ticket
            ? {
                id: booking.ticket.id,
                ticketNumber: booking.ticket.ticketNumber,
                qrToken: booking.ticket.qrToken,
                qrDataUrl: booking.ticket.qrDataUrl,
                eTicketUrl: booking.ticket.eTicketUrl,
                issuedAt: booking.ticket.issuedAt.toISOString(),
                invoiceNumber: booking.ticket.invoiceNumber
            }
            : null,
        refunds: booking.refunds?.map((refund) => ({
            id: refund.id,
            amount: moneyToNumber(refund.amount),
            status: refund.status,
            reason: refund.reason,
            createdAt: refund.createdAt.toISOString()
        })) ?? []
    };
}
function serializeNotification(notification) {
    return {
        id: notification.id,
        userId: notification.userId,
        bookingId: notification.bookingId,
        type: notification.type,
        message: notification.message,
        readAt: notification.readAt?.toISOString() ?? null,
        createdAt: notification.createdAt.toISOString()
    };
}
function serializeTrain(train) {
    return {
        id: train.id,
        code: train.code,
        name: train.name
    };
}
function resolveSeatCode(seat) {
    return seat.seatNumber;
}
