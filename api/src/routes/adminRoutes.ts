import { Request, Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { getAuthUserFromRequest } from '../lib/auth';
import { AppError } from '../lib/errors';
import { getReports, setTripStatus } from '../services/adminService';
import { listRecentBookings } from '../services/adminService';
import {
  createBookingAdmin,
  createCarriageAdmin,
  createSeatAdmin,
  createStationAdmin,
  createTicketAdmin,
  createTrainAdmin,
  createTripAdmin,
  createUserAdmin,
  deleteBookingAdmin,
  deleteCarriageAdmin,
  deleteSeatAdmin,
  deleteStationAdmin,
  deleteTicketAdmin,
  deleteTrainAdmin,
  deleteTripAdmin,
  deleteUserAdmin,
  getBookingByIdAdmin,
  getCarriageByIdAdmin,
  getSeatByIdAdmin,
  getStationByIdAdmin,
  getTicketByIdAdmin,
  getTrainByIdAdmin,
  getTripByIdAdmin,
  getUserByIdAdmin,
  listBookingsAdmin,
  listCarriagesAdmin,
  listSeatsAdmin,
  listStationsAdmin,
  listTicketsAdmin,
  listTrainsAdmin,
  listTripsAdmin,
  listUsersAdmin,
  updateBookingAdmin,
  updateCarriageAdmin,
  updateSeatAdmin,
  updateStationAdmin,
  updateTicketAdmin,
  updateTrainAdmin,
  updateTripAdmin,
  updateUserAdmin
} from '../services/adminCrudService';
import {
  bulkSyncCarriageSeatsAdmin,
  duplicateCarriageAdmin,
  normalizeLayoutJson,
  saveCarriageLayoutAdmin,
  syncCarriageSeatsAdmin
} from '../services/trainBuilderService';
import {
  createCarriageTemplateRailwayAdmin,
  createTrainRailwayAdmin,
  createTripWithCarriagesRailwayAdmin,
  deleteCarriageTemplateRailwayAdmin,
  deleteTrainRailwayAdmin,
  listCarriageTemplatesRailwayAdmin,
  listTrainsRailwayAdmin,
  updateTripWithCarriagesRailwayAdmin,
  updateCarriageTemplateRailwayAdmin,
  updateTrainRailwayAdmin
} from '../services/railwayAdminService';

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

function getPaginationQuery(request: Request) {
  const page = typeof request.query.page === 'string' ? Number.parseInt(request.query.page, 10) : undefined;
  const pageSize = typeof request.query.pageSize === 'string' ? Number.parseInt(request.query.pageSize, 10) : undefined;
  return { page, pageSize };
}

function getIdParam(request: { params: Record<string, string | string[] | undefined> }, key: string) {
  const value = request.params[key];
  if (typeof value !== 'string') {
    throw new AppError(`Thiếu ${key}.`, 400);
  }
  return value;
}

const stationPayloadSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  city: z.string().min(1)
});

adminRoutes.get('/stations', asyncHandler(async (request, response) => {
  response.json(await listStationsAdmin(getPaginationQuery(request)));
}));

adminRoutes.get('/stations/:id', asyncHandler(async (request, response) => {
  response.json(await getStationByIdAdmin(getIdParam(request, 'id')));
}));

adminRoutes.post('/stations', asyncHandler(async (request, response) => {
  const payload = stationPayloadSchema.parse(request.body);
  response.status(201).json(await createStationAdmin(payload));
}));

adminRoutes.put('/stations/:id', asyncHandler(async (request, response) => {
  const payload = stationPayloadSchema.partial().parse(request.body);
  response.json(await updateStationAdmin(getIdParam(request, 'id'), payload));
}));

adminRoutes.delete('/stations/:id', asyncHandler(async (request, response) => {
  response.json(await deleteStationAdmin(getIdParam(request, 'id')));
}));

const trainPayloadSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1)
});

adminRoutes.get('/trains', asyncHandler(async (request, response) => {
  response.json(await listTrainsRailwayAdmin(getPaginationQuery(request)));
}));

adminRoutes.get('/trains/:id', asyncHandler(async (request, response) => {
  response.json(await getTrainByIdAdmin(getIdParam(request, 'id')));
}));

adminRoutes.post('/trains', asyncHandler(async (request, response) => {
  const payload = trainPayloadSchema.parse(request.body);
  response.status(201).json(await createTrainRailwayAdmin(payload));
}));

adminRoutes.put('/trains/:id', asyncHandler(async (request, response) => {
  const payload = trainPayloadSchema.partial().parse(request.body);
  response.json(await updateTrainRailwayAdmin(getIdParam(request, 'id'), payload));
}));

adminRoutes.delete('/trains/:id', asyncHandler(async (request, response) => {
  response.json(await deleteTrainRailwayAdmin(getIdParam(request, 'id')));
}));

const carriagePayloadSchema = z.object({
  code: z.string().min(1),
  type: z.enum(['SOFT_SEAT', 'HARD_SEAT', 'SLEEPER']),
  layout: z.unknown()
});

adminRoutes.get('/carriages', asyncHandler(async (request, response) => {
  response.json(await listCarriageTemplatesRailwayAdmin(getPaginationQuery(request)));
}));

adminRoutes.get('/carriages/:id', asyncHandler(async (request, response) => {
  response.json(await getCarriageByIdAdmin(getIdParam(request, 'id')));
}));

adminRoutes.post('/carriages', asyncHandler(async (request, response) => {
  const payload = carriagePayloadSchema.parse(request.body);
  response.status(201).json(await createCarriageTemplateRailwayAdmin(payload));
}));

adminRoutes.put('/carriages/:id', asyncHandler(async (request, response) => {
  const payload = carriagePayloadSchema.partial().parse(request.body);
  response.json(await updateCarriageTemplateRailwayAdmin(getIdParam(request, 'id'), payload));
}));

adminRoutes.delete('/carriages/:id', asyncHandler(async (request, response) => {
  response.json(await deleteCarriageTemplateRailwayAdmin(getIdParam(request, 'id')));
}));

adminRoutes.post('/carriages/:id/duplicate', asyncHandler(async (request, response) => {
  const payload = z.object({
    code: z.string().min(1).optional()
  }).optional().parse(request.body ?? {});

  response.status(201).json(await duplicateCarriageAdmin(getIdParam(request, 'id'), payload?.code));
}));

adminRoutes.patch('/carriages/:id/layout', asyncHandler(async (request, response) => {
  const layout = normalizeLayoutJson((request.body as { layout?: unknown }).layout ?? request.body);
  response.json(await saveCarriageLayoutAdmin(getIdParam(request, 'id'), layout));
}));

const seatPayloadSchema = z.object({
  carriageId: z.string().min(1),
  code: z.string().min(1),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  price: z.number().nonnegative().nullable().optional()
});

adminRoutes.get('/seats', asyncHandler(async (request, response) => {
  const carriageId = typeof request.query.carriageId === 'string' ? request.query.carriageId : undefined;
  response.json(await listSeatsAdmin({ ...getPaginationQuery(request), carriageId }));
}));

adminRoutes.post('/seats/sync', asyncHandler(async (request, response) => {
  const payload = z.object({
    carriageId: z.string().min(1),
    layout: z.unknown()
  }).parse(request.body);

  response.json(await syncCarriageSeatsAdmin(payload.carriageId, payload.layout));
}));

adminRoutes.post('/seats/bulk', asyncHandler(async (request, response) => {
  const payload = z.object({
    carriageId: z.string().min(1),
    seats: z.array(z.object({
      code: z.string().min(1),
      price: z.number().nonnegative().nullable().optional()
    })).min(0),
    layout: z.unknown().optional()
  }).parse(request.body);

  response.json(await bulkSyncCarriageSeatsAdmin(payload.carriageId, payload.seats, payload.layout));
}));

adminRoutes.get('/seats/:id', asyncHandler(async (request, response) => {
  response.json(await getSeatByIdAdmin(getIdParam(request, 'id')));
}));

adminRoutes.post('/seats', asyncHandler(async (request, response) => {
  const payload = seatPayloadSchema.parse(request.body);
  response.status(201).json(await createSeatAdmin(payload));
}));

adminRoutes.put('/seats/:id', asyncHandler(async (request, response) => {
  const payload = seatPayloadSchema.partial().parse(request.body);
  response.json(await updateSeatAdmin(getIdParam(request, 'id'), payload));
}));

adminRoutes.delete('/seats/:id', asyncHandler(async (request, response) => {
  response.json(await deleteSeatAdmin(getIdParam(request, 'id')));
}));

const tripPayloadSchema = z.object({
  trainId: z.string().min(1),
  originStationId: z.string().min(1),
  destinationStationId: z.string().min(1),
  departureTime: z.string().datetime(),
  arrivalTime: z.string().datetime(),
  price: z.number().positive(),
  status: z.enum(['ON_TIME', 'DELAYED', 'CANCELLED']).optional(),
  delayMinutes: z.number().int().nonnegative().optional(),
  note: z.string().nullable().optional(),
  carriages: z.array(z.object({
    templateId: z.string().min(1),
    code: z.string().min(1),
    orderIndex: z.number().int().nonnegative(),
    basePrice: z.number().nonnegative()
  })).optional()
});

adminRoutes.get('/trips', asyncHandler(async (request, response) => {
  response.json(await listTripsAdmin(getPaginationQuery(request)));
}));

adminRoutes.get('/trips/:id', asyncHandler(async (request, response) => {
  response.json(await getTripByIdAdmin(getIdParam(request, 'id')));
}));

adminRoutes.post('/trips', asyncHandler(async (request, response) => {
  const payload = tripPayloadSchema.parse(request.body);
  if (!payload.carriages) {
    response.status(201).json(await createTripAdmin(payload));
    return;
  }
  response.status(201).json(await createTripWithCarriagesRailwayAdmin({
    trainId: payload.trainId,
    originStationId: payload.originStationId,
    destinationStationId: payload.destinationStationId,
    departureTime: payload.departureTime,
    arrivalTime: payload.arrivalTime,
    price: payload.price,
    carriages: payload.carriages
  }));
}));

adminRoutes.put('/trips/:id', asyncHandler(async (request, response) => {
  const payload = tripPayloadSchema.partial().parse(request.body);
  if (payload.carriages) {
    response.json(await updateTripWithCarriagesRailwayAdmin(getIdParam(request, 'id'), {
      trainId: payload.trainId,
      originStationId: payload.originStationId,
      destinationStationId: payload.destinationStationId,
      departureTime: payload.departureTime,
      arrivalTime: payload.arrivalTime,
      price: payload.price,
      status: payload.status,
      delayMinutes: payload.delayMinutes,
      note: payload.note,
      carriages: payload.carriages
    }));
    return;
  }

  response.json(await updateTripAdmin(getIdParam(request, 'id'), payload));
}));

adminRoutes.delete('/trips/:id', asyncHandler(async (request, response) => {
  response.json(await deleteTripAdmin(getIdParam(request, 'id')));
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

  response.json(await setTripStatus(getIdParam(request, 'id'), payload));
}));

const bookingPayloadSchema = z.object({
  userId: z.string().min(1),
  tripId: z.string().min(1),
  seatIds: z.array(z.string().min(1)).min(1),
  contactEmail: z.string().email(),
  markAsPaid: z.boolean().optional()
});

adminRoutes.get('/bookings', asyncHandler(async (request, response) => {
  response.json(await listBookingsAdmin(getPaginationQuery(request)));
}));

adminRoutes.get('/bookings/:id', asyncHandler(async (request, response) => {
  response.json(await getBookingByIdAdmin(getIdParam(request, 'id')));
}));

adminRoutes.post('/bookings', asyncHandler(async (request, response) => {
  const payload = bookingPayloadSchema.parse(request.body);
  response.status(201).json(await createBookingAdmin(payload));
}));

adminRoutes.put('/bookings/:id', asyncHandler(async (request, response) => {
  const payload = z.object({
    status: z.enum(['HOLDING', 'PAID', 'EXPIRED', 'CANCELLED', 'REFUNDED']).optional(),
    contactEmail: z.string().email().optional()
  }).parse(request.body);

  response.json(await updateBookingAdmin(getIdParam(request, 'id'), payload));
}));

adminRoutes.delete('/bookings/:id', asyncHandler(async (request, response) => {
  response.json(await deleteBookingAdmin(getIdParam(request, 'id')));
}));

const ticketPayloadSchema = z.object({
  bookingId: z.string().min(1),
  ticketNumber: z.string().min(1).optional(),
  qrDataUrl: z.string().min(1),
  eTicketUrl: z.string().url().optional(),
  invoiceNumber: z.string().min(1).optional()
});

adminRoutes.get('/tickets', asyncHandler(async (request, response) => {
  response.json(await listTicketsAdmin(getPaginationQuery(request)));
}));

adminRoutes.get('/tickets/:id', asyncHandler(async (request, response) => {
  response.json(await getTicketByIdAdmin(getIdParam(request, 'id')));
}));

adminRoutes.post('/tickets', asyncHandler(async (request, response) => {
  const payload = ticketPayloadSchema.parse(request.body);
  response.status(201).json(await createTicketAdmin(payload));
}));

adminRoutes.put('/tickets/:id', asyncHandler(async (request, response) => {
  const payload = z.object({
    eTicketUrl: z.string().url().nullable().optional(),
    invoiceNumber: z.string().nullable().optional(),
    qrDataUrl: z.string().min(1).optional()
  }).parse(request.body);

  response.json(await updateTicketAdmin(getIdParam(request, 'id'), payload));
}));

adminRoutes.delete('/tickets/:id', asyncHandler(async (request, response) => {
  response.json(await deleteTicketAdmin(getIdParam(request, 'id')));
}));

const userPayloadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(['USER', 'ADMIN']).optional()
});

adminRoutes.get('/users', asyncHandler(async (request, response) => {
  response.json(await listUsersAdmin(getPaginationQuery(request)));
}));

adminRoutes.get('/users/:id', asyncHandler(async (request, response) => {
  response.json(await getUserByIdAdmin(getIdParam(request, 'id')));
}));

adminRoutes.post('/users', asyncHandler(async (request, response) => {
  const payload = userPayloadSchema.parse(request.body);
  response.status(201).json(await createUserAdmin(payload));
}));

adminRoutes.put('/users/:id', asyncHandler(async (request, response) => {
  const payload = userPayloadSchema.partial().parse(request.body);
  response.json(await updateUserAdmin(getIdParam(request, 'id'), payload));
}));

adminRoutes.delete('/users/:id', asyncHandler(async (request, response) => {
  response.json(await deleteUserAdmin(getIdParam(request, 'id')));
}));

adminRoutes.get('/reports', asyncHandler(async (request, response) => {
  const querySchema = z.object({
    from: z.string().optional(),
    to: z.string().optional()
  });

  const query = querySchema.parse(request.query);
  response.json(await getReports(query));
}));

adminRoutes.get('/recent-bookings', asyncHandler(async (request, response) => {
  const limit = typeof request.query.limit === 'string' ? Number.parseInt(request.query.limit, 10) : undefined;
  response.json(await listRecentBookings(limit));
}));
