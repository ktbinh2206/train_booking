import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { getAuthUserFromRequest } from '../lib/auth';
import { AppError } from '../lib/errors';
import {
  bulkCreateSeats,
  createCarriage,
  createTrain,
  createTrip,
  deleteCarriage,
  deleteSeat,
  deleteTrain,
  getReports,
  listAdminTickets,
  listRecentBookings,
  listTrains,
  removeTrip,
  setTripStatus,
  updateCarriage,
  updateSeat,
  updateTrain,
  updateTrip
} from '../services/adminService';

export const adminRoutes = Router();

adminRoutes.use((request, _response, next) => {
  const authUser = getAuthUserFromRequest(request);
  if (!authUser) {
    throw new AppError('Chưa đăng nhập.', 401);
  }

  if (authUser.role !== 'ADMIN') {
    throw new AppError('Bạn không có quyền truy cập trang quản trị.', 403);
  }

  next();
});

adminRoutes.get('/reports', asyncHandler(async (_request, response) => {
  response.json(await getReports());
}));

adminRoutes.get('/trains', asyncHandler(async (_request, response) => {
  response.json(await listTrains());
}));

adminRoutes.get('/tickets', asyncHandler(async (_request, response) => {
  response.json(await listAdminTickets());
}));

adminRoutes.get('/recent-bookings', asyncHandler(async (request, response) => {
  const limit = typeof request.query.limit === 'string' ? Number.parseInt(request.query.limit, 10) : undefined;
  response.json(await listRecentBookings(Number.isFinite(limit) ? Number(limit) : 8));
}));

adminRoutes.post('/trains', asyncHandler(async (request, response) => {
  const payload = z.object({ code: z.string().min(2), name: z.string().min(2) }).parse(request.body);
  response.status(201).json(await createTrain(payload));
}));

adminRoutes.put('/trains/:id', asyncHandler(async (request, response) => {
  const payload = z.object({ code: z.string().min(2).optional(), name: z.string().min(2).optional() }).parse(request.body);
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Thiếu id train.', 400);
  response.json(await updateTrain(id, payload));
}));

adminRoutes.delete('/trains/:id', asyncHandler(async (request, response) => {
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Thiếu id train.', 400);
  response.json(await deleteTrain(id));
}));

adminRoutes.post('/trains/:trainId/carriages', asyncHandler(async (request, response) => {
  const payload = z.object({ code: z.string().min(1), orderIndex: z.number().int().positive() }).parse(request.body);
  const trainId = typeof request.params.trainId === 'string' ? request.params.trainId : undefined;
  if (!trainId) throw new AppError('Thiếu trainId.', 400);
  response.status(201).json(await createCarriage({ trainId, ...payload }));
}));

adminRoutes.put('/carriages/:id', asyncHandler(async (request, response) => {
  const payload = z.object({ code: z.string().min(1).optional(), orderIndex: z.number().int().positive().optional() }).parse(request.body);
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Thiếu id carriage.', 400);
  response.json(await updateCarriage(id, payload));
}));

adminRoutes.delete('/carriages/:id', asyncHandler(async (request, response) => {
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Thiếu id carriage.', 400);
  response.json(await deleteCarriage(id));
}));

adminRoutes.post('/carriages/:carriageId/seats', asyncHandler(async (request, response) => {
  const payload = z.object({ prefix: z.string().min(1).optional(), count: z.number().int().positive().max(100) }).parse(request.body);
  const carriageId = typeof request.params.carriageId === 'string' ? request.params.carriageId : undefined;
  if (!carriageId) throw new AppError('Thiếu carriageId.', 400);
  response.status(201).json(await bulkCreateSeats({ carriageId, ...payload }));
}));

adminRoutes.put('/seats/:id', asyncHandler(async (request, response) => {
  const payload = z.object({ code: z.string().min(1).optional(), status: z.enum(['ACTIVE', 'INACTIVE']).optional() }).parse(request.body);
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Thiếu id seat.', 400);
  response.json(await updateSeat(id, payload));
}));

adminRoutes.delete('/seats/:id', asyncHandler(async (request, response) => {
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Thiếu id seat.', 400);
  response.json(await deleteSeat(id));
}));

adminRoutes.post('/trips', asyncHandler(async (request, response) => {
  const payload = z.object({
    trainId: z.string().min(1),
    origin: z.string().min(1),
    destination: z.string().min(1),
    departureTime: z.string().datetime(),
    arrivalTime: z.string().datetime(),
    price: z.number().positive()
  }).parse(request.body);

  response.status(201).json(await createTrip(payload));
}));

adminRoutes.put('/trips/:id', asyncHandler(async (request, response) => {
  const payload = z.object({
    trainId: z.string().optional(),
    origin: z.string().optional(),
    destination: z.string().optional(),
    departureTime: z.string().datetime().optional(),
    arrivalTime: z.string().datetime().optional(),
    price: z.number().positive().optional(),
    status: z.enum(['ON_TIME', 'DELAYED', 'CANCELLED']).optional(),
    delayMinutes: z.number().int().nonnegative().optional(),
    note: z.string().nullable().optional()
  }).parse(request.body);

  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Thiếu id trip.', 400);
  response.json(await updateTrip(id, payload));
}));

adminRoutes.delete('/trips/:id', asyncHandler(async (request, response) => {
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Thiếu id trip.', 400);
  response.json(await removeTrip(id));
}));

adminRoutes.post('/trips/:id/status', asyncHandler(async (request, response) => {
  const payload = z.object({
    status: z.enum(['ON_TIME', 'DELAYED', 'CANCELLED']),
    delayMinutes: z.number().int().nonnegative().optional(),
    note: z.string().optional()
  }).parse(request.body);

  if (payload.status === 'DELAYED' && typeof payload.delayMinutes !== 'number') {
    throw new AppError('Delay phải có số phút delay.', 400);
  }

  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Thiếu id trip.', 400);
  response.json(await setTripStatus(id, payload));
}));