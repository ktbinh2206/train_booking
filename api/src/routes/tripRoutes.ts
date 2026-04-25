import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import {
  searchTrips,
  getTodayTrips,
  listStations,
  listTripsForAdmin,
  getTripDetail,
  getTripSeatMap,
  getTripSeatsDetail
} from '../services/tripService'

export const tripRoutes = Router();

tripRoutes.get('/', asyncHandler(async (request, response) => {
  const departureStationId = typeof request.query.departureStationId === 'string' ? request.query.departureStationId : undefined;
  const arrivalStationId = typeof request.query.arrivalStationId === 'string' ? request.query.arrivalStationId : undefined;
  const origin = typeof request.query.origin === 'string' ? request.query.origin : undefined;
  const destination = typeof request.query.destination === 'string' ? request.query.destination : undefined;
  const date = typeof request.query.date === 'string' ? request.query.date : undefined;
  const fromDate = typeof request.query.fromDate === 'string' ? request.query.fromDate : undefined;
  const toDate = typeof request.query.toDate === 'string' ? request.query.toDate : undefined;
  const departureTimeRanges = typeof request.query.departureTimeRanges === 'string'
    ? request.query.departureTimeRanges.split(',').map((value) => value.trim()).filter(Boolean)
    : undefined;
  const status = typeof request.query.status === 'string' ? request.query.status : undefined;
  const minPrice = typeof request.query.minPrice === 'string' ? Number.parseFloat(request.query.minPrice) : undefined;
  const maxPrice = typeof request.query.maxPrice === 'string' ? Number.parseFloat(request.query.maxPrice) : undefined;
  const page = typeof request.query.page === 'string' ? Number.parseInt(request.query.page, 10) : undefined;
  const pageSize = typeof request.query.pageSize === 'string' ? Number.parseInt(request.query.pageSize, 10) : undefined;

  response.json(await searchTrips({
    departureStationId,
    arrivalStationId,
    origin,
    destination,
    date,
    fromDate,
    toDate,
    departureTimeRanges,
    status,
    minPrice,
    maxPrice,
    page,
    pageSize
  }));
}));

tripRoutes.get('/search', asyncHandler(async (request, response) => {
  const departureStationId = typeof request.query.departureStationId === 'string' ? request.query.departureStationId : undefined;
  const arrivalStationId = typeof request.query.arrivalStationId === 'string' ? request.query.arrivalStationId : undefined;
  const origin = typeof request.query.origin === 'string' ? request.query.origin : undefined;
  const destination = typeof request.query.destination === 'string' ? request.query.destination : undefined;
  const date = typeof request.query.date === 'string' ? request.query.date : undefined;
  const status = typeof request.query.status === 'string' ? request.query.status : undefined;
  const fromDate = typeof request.query.fromDate === 'string' ? request.query.fromDate : undefined;
  const toDate = typeof request.query.toDate === 'string' ? request.query.toDate : undefined;
  const departureTimeRanges = typeof request.query.departureTimeRanges === 'string'
    ? request.query.departureTimeRanges.split(',').map((value) => value.trim()).filter(Boolean)
    : undefined;
  const minPrice = typeof request.query.minPrice === 'string' ? Number.parseFloat(request.query.minPrice) : undefined;
  const maxPrice = typeof request.query.maxPrice === 'string' ? Number.parseFloat(request.query.maxPrice) : undefined;
  const page = typeof request.query.page === 'string' ? Number.parseInt(request.query.page, 10) : undefined;
  const pageSize = typeof request.query.pageSize === 'string' ? Number.parseInt(request.query.pageSize, 10) : undefined;

  const trips = await searchTrips({ departureStationId, arrivalStationId, origin, destination, status, date, fromDate, toDate, departureTimeRanges, minPrice, maxPrice, page, pageSize });

  response.json(trips);
}));

tripRoutes.get('/today', asyncHandler(async (request, response) => {
  const page = typeof request.query.page === 'string' ? Number.parseInt(request.query.page, 10) : undefined;
  const pageSize = typeof request.query.pageSize === 'string' ? Number.parseInt(request.query.pageSize, 10) : undefined;
  response.json(await getTodayTrips({ page, pageSize }));
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

tripRoutes.get('/:id/seats', asyncHandler(async (request, response) => {
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Không tìm thấy chuyến tàu.', 404);

  const seatsDetail = await getTripSeatsDetail(id);
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