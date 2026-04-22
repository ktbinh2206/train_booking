import type { Booking, Notification, Payment, Ticket, Train, Trip, TripSeat, User } from '@prisma/client';

export function moneyToNumber(value: { toNumber: () => number }) {
  return value.toNumber();
}

export function serializeTrip(trip: Trip & { train?: Train | null }) {
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

export function serializeBooking(booking: Booking & {
  trip: Trip & { train: Train };
  user: User;
  bookingSeats?: Array<{ seatId: string; seat?: TripSeat | null }>;
  payment: Payment | null;
  ticket: Ticket | null;
  refunds?: Array<{ id: string; amount: { toNumber: () => number }; status: string; reason: string | null; createdAt: Date }>;
}) {
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
    seatCodes: booking.bookingSeats?.map((item) => item.seat?.seatNumber).filter((code): code is string => Boolean(code)) ?? [],
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

export function serializeNotification(notification: Notification) {
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

export function serializeTrain(train: Train) {
  return {
    id: train.id,
    code: train.code,
    name: train.name
  };
}

export function resolveSeatCode(seat: Pick<TripSeat, 'seatNumber'>) {
  return seat.seatNumber;
}