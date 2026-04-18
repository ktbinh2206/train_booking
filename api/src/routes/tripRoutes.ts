import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { getTripDetail, getTripSeatMap, listStations, listTripsForAdmin, searchTrips } from '../services/tripService';

export const tripRoutes = Router();

tripRoutes.get('/search', asyncHandler(async (request, response) => {
  const origin = typeof request.query.origin === 'string' ? request.query.origin : undefined;
  const destination = typeof request.query.destination === 'string' ? request.query.destination : undefined;
  const date = typeof request.query.date === 'string' ? request.query.date : undefined;
  const page = typeof request.query.page === 'string' ? Number.parseInt(request.query.page, 10) : undefined;
  const pageSize = typeof request.query.pageSize === 'string' ? Number.parseInt(request.query.pageSize, 10) : undefined;

  const trips = await searchTrips({ origin, destination, date, page, pageSize });

  response.json(trips);
}));

tripRoutes.get('/stations', asyncHandler(async (request, response) => {
  const q = typeof request.query.q === 'string' ? request.query.q : undefined;
  response.json(await listStations(q));
}));

tripRoutes.get('/admin', asyncHandler(async (_request, response) => {
  response.json(await listTripsForAdmin());
}));

tripRoutes.get('/:id', asyncHandler(async (request, response) => {
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Không tìm thấy chuyến tàu.', 404);

  const detail = await getTripDetail(id);
  if (!detail) {
    throw new AppError('Không tìm thấy chuyến tàu.', 404);
  }

  response.json(detail);
}));

tripRoutes.get('/:id/seat-map', asyncHandler(async (request, response) => {
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Không tìm thấy chuyến tàu.', 404);

  const seatMap = await getTripSeatMap(id);
  if (!seatMap) {
    throw new AppError('Không tìm thấy chuyến tàu.', 404);
  }

  response.json(seatMap);
}));

tripRoutes.get('/:id/availability', asyncHandler(async (request, response) => {
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Không tìm thấy chuyến tàu.', 404);

  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) {
    throw new AppError('Không tìm thấy chuyến tàu.', 404);
  }

  response.json({
    tripId: trip.id,
    status: trip.status,
    delayMinutes: trip.delayMinutes,
    isActive: trip.status !== 'CANCELLED'
  });
}));