import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { downloadTicketPdf } from '../services/pdfService';

export const ticketRoutes = Router();

ticketRoutes.get('/:bookingId', asyncHandler(async (request, response) => {
  const bookingId = typeof request.params.bookingId === 'string' ? request.params.bookingId : undefined;
  if (!bookingId) {
    throw new AppError('Không tìm thấy vé.', 404);
  }

  const ticket = await prisma.ticket.findUnique({
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
    throw new AppError('Không tìm thấy vé.', 404);
  }

  const ticketRecord: any = ticket;

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
      seats: ticketRecord.booking.bookingSeats.map((bookingSeat: { seat: { seatNumber: string } }) => bookingSeat.seat.seatNumber),
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

ticketRoutes.get('/:bookingId/pdf', asyncHandler(async (request, response) => {
  const bookingId = typeof request.params.bookingId === 'string' ? request.params.bookingId : undefined;
  if (!bookingId) {
    throw new AppError('Không tìm thấy vé.', 404);
  }
  await downloadTicketPdf(bookingId, response);
})
);