import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';

const tripService = require('../services/tripService');

export const tripRoutes = Router();

tripRoutes.get('/search', asyncHandler(async (request, response) => {
  const departureStationId = typeof request.query.departureStationId === 'string' ? request.query.departureStationId : undefined;
  const arrivalStationId = typeof request.query.arrivalStationId === 'string' ? request.query.arrivalStationId : undefined;
  const date = typeof request.query.date === 'string' ? request.query.date : undefined;
  const fromDate = typeof request.query.fromDate === 'string' ? request.query.fromDate : undefined;
  const toDate = typeof request.query.toDate === 'string' ? request.query.toDate : undefined;
  const tripType = typeof request.query.tripType === 'string' && (request.query.tripType === 'one-way' || request.query.tripType === 'round-trip')
    ? request.query.tripType
    : undefined;
  const page = typeof request.query.page === 'string' ? Number.parseInt(request.query.page, 10) : undefined;
  const pageSize = typeof request.query.pageSize === 'string' ? Number.parseInt(request.query.pageSize, 10) : undefined;

  const trips = await tripService.searchTrips({ departureStationId, arrivalStationId, date, fromDate, toDate, tripType, page, pageSize });

  response.json(trips);
}));

tripRoutes.get('/today', asyncHandler(async (request, response) => {
  const page = typeof request.query.page === 'string' ? Number.parseInt(request.query.page, 10) : undefined;
  const pageSize = typeof request.query.pageSize === 'string' ? Number.parseInt(request.query.pageSize, 10) : undefined;
  response.json(await tripService.getTodayTrips({ page, pageSize }));
}));

tripRoutes.get('/stations', asyncHandler(async (request, response) => {
  const q = typeof request.query.q === 'string' ? request.query.q : undefined;
  response.json(await tripService.listStations(q));
}));

tripRoutes.get('/admin', asyncHandler(async (_request, response) => {
  response.json(await tripService.listTripsForAdmin());
}));

tripRoutes.get('/:id', asyncHandler(async (request, response) => {
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Không tìm thấy chuyến tàu.', 404);

  const detail = await tripService.getTripDetail(id);
  if (!detail) {
    throw new AppError('Không tìm thấy chuyến tàu.', 404);
  }

  response.json(detail);
}));

tripRoutes.get('/:id/seat-map', asyncHandler(async (request, response) => {
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Không tìm thấy chuyến tàu.', 404);

  const seatMap = await tripService.getTripSeatMap(id);
  if (!seatMap) {
    throw new AppError('Không tìm thấy chuyến tàu.', 404);
  }

  response.json(seatMap);
}));

tripRoutes.get('/:id/seats', asyncHandler(async (request, response) => {
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Không tìm thấy chuyến tàu.', 404);

  const seatsDetail = await tripService.getTripSeatsDetail(id);
  if (!seatsDetail) {
    throw new AppError('Không tìm thấy chuyến tàu.', 404);
  }

  response.json(seatsDetail);
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