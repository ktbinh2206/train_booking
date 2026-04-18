import type { Booking, Carriage, Notification, Payment, Seat, Ticket, Train, Trip, User } from '@prisma/client';

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
    note: trip.note
  };
}

export function serializeBooking(booking: Booking & {
  trip: Trip & { train: Train };
  user: User;
  bookingSeats?: Array<{ seatId: string; seat?: Seat | null }>;
  payment: Payment | null;
  ticket: Ticket | null;
}) {
  return {
    id: booking.id,
    code: booking.code,
    status: booking.status,
    holdExpiresAt: booking.holdExpiresAt?.toISOString() ?? null,
    totalAmount: moneyToNumber(booking.totalAmount),
    contactEmail: booking.contactEmail,
    seatCount: booking.seatCount,
    seatIds: booking.bookingSeats?.map((item) => item.seatId) ?? [],
    seatCodes: booking.bookingSeats?.map((item) => item.seat?.code).filter((code): code is string => Boolean(code)) ?? [],
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
      : null
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

export function serializeTrain(train: Train & { carriages?: Array<Carriage & { seats?: Seat[] }> }) {
  return {
    id: train.id,
    code: train.code,
    name: train.name,
    carriages: train.carriages?.map((carriage) => ({
      id: carriage.id,
      code: carriage.code,
      orderIndex: carriage.orderIndex,
      seats: carriage.seats?.map((seat) => ({
        id: seat.id,
        code: seat.code,
        orderIndex: seat.orderIndex,
        status: seat.status,
        carriageId: seat.carriageId
      })) ?? []
    })) ?? []
  };
}