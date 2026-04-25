import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { getAuthUserFromRequest } from '../lib/auth';
import { AppError } from '../lib/errors';
import { serializeBooking } from '../lib/serializers';
import { cancelBooking, createBooking, expireBooking, getBookingById, listBookings, payBooking, holdOrGetBooking, updateBookingCheckoutInfo } from '../services/bookingService';

export const bookingRoutes = Router();

const createBookingSchema = z.object({
  userId: z.string().min(1).optional(),
  tripId: z.string().min(1),
  seatIds: z.array(z.string().min(1)).min(1),
  contactEmail: z.string().email()
});

const cancelBookingSchema = z.object({
  bookingId: z.string().min(1)
});

const updateCheckoutSchema = z.object({
  bookingId: z.string().min(1),
  contactEmail: z.string().email(),
  seats: z.array(z.object({
    seatId: z.string().min(1),
    passengerName: z.string().min(1),
    passengerType: z.string().min(1),
    passengerId: z.string().min(1).optional()
  })).min(1)
});

bookingRoutes.get('/', asyncHandler(async (request, response) => {
  const authUser = getAuthUserFromRequest(request);
  const statusQuery = typeof request.query.status === 'string' ? request.query.status : undefined;
  const origin = typeof request.query.origin === 'string' ? request.query.origin.trim() : undefined;
  const destination = typeof request.query.destination === 'string' ? request.query.destination.trim() : undefined;
  const date = typeof request.query.date === 'string' ? request.query.date.trim() : undefined;
  const allowedStatuses = ['HOLDING', 'PAID', 'EXPIRED', 'CANCELLED', 'REFUNDED'] as const;
  const status = statusQuery && allowedStatuses.includes(statusQuery as (typeof allowedStatuses)[number])
    ? (statusQuery as (typeof allowedStatuses)[number])
    : undefined;
  const filter: { userId?: string; status?: 'HOLDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED'; from?: string; to?: string; origin?: string; destination?: string; date?: string } = {};
  const userId = typeof request.query.userId === 'string' ? request.query.userId : undefined;
  const from = typeof request.query.from === 'string' ? request.query.from : undefined;
  const to = typeof request.query.to === 'string' ? request.query.to : undefined;

  const effectiveUserId = userId ?? authUser?.id;
  if (effectiveUserId) {
    if (authUser && authUser.role !== 'ADMIN' && effectiveUserId !== authUser.id) {
      throw new AppError('Bạn không có quyền xem booking của người khác.', 403);
    }
    filter.userId = effectiveUserId;
  }
  if (status) filter.status = status;
  if (from) filter.from = from;
  if (to) filter.to = to;
  if (origin) filter.origin = origin;
  if (destination) filter.destination = destination;
  if (date) filter.date = date;

  const bookings = await listBookings(filter);

  response.json(bookings.map((booking: any) => serializeBooking(booking)));
}));

bookingRoutes.get('/:id', asyncHandler(async (request, response) => {
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Thiếu id booking.', 400);

  const booking = await getBookingById(id);
  if (!booking) {
    throw new AppError('Không tìm thấy booking.', 404);
  }

  response.json(serializeBooking(booking));
}));

bookingRoutes.post('/', asyncHandler(async (request, response) => {
  const authUser = getAuthUserFromRequest(request);
  const payload = createBookingSchema.parse(request.body);
  const effectiveUserId = payload.userId ?? authUser?.id;

  if (!effectiveUserId) {
    throw new AppError('Thiếu userId.', 400);
  }

  if (authUser && authUser.role !== 'ADMIN' && effectiveUserId !== authUser.id) {
    throw new AppError('Bạn không có quyền tạo booking cho user khác.', 403);
  }

  const booking = await createBooking({
    ...payload,
    userId: effectiveUserId
  });
  response.status(201).json(serializeBooking(booking));
}));

bookingRoutes.post('/hold-or-get', asyncHandler(async (request, response) => {
  const authUser = getAuthUserFromRequest(request);
  const payload = createBookingSchema.parse(request.body);

  const effectiveUserId = payload.userId ?? authUser?.id;

  if (!effectiveUserId) {
    throw new AppError('Thiếu userId.', 400);
  }

  if (authUser && authUser.role !== 'ADMIN' && effectiveUserId !== authUser.id) {
    throw new AppError('Bạn không có quyền tạo booking cho user khác.', 403);
  }

  const booking = await holdOrGetBooking({
    ...payload,
    userId: effectiveUserId
  });

  const fullBooking = await getBookingById(booking.id);
  if (!fullBooking) {
    throw new AppError('Không tìm thấy booking.', 404);
  }

  response.json(serializeBooking(fullBooking));
}));

bookingRoutes.post('/update-checkout', asyncHandler(async (request, response) => {
  const authUser = getAuthUserFromRequest(request);
  if (!authUser) {
    throw new AppError('Vui lòng đăng nhập để tiếp tục.', 401);
  }

  const payload = updateCheckoutSchema.parse(request.body);
  const booking = await updateBookingCheckoutInfo({
    bookingId: payload.bookingId,
    userId: authUser.id,
    contactEmail: payload.contactEmail,
    seats: payload.seats
  });

  response.json(serializeBooking(booking));
}));

bookingRoutes.post('/:id/pay', asyncHandler(async (request, response) => {
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Thiếu id booking.', 400);

  const booking = await payBooking(id);
  response.json(serializeBooking(booking));
}));

bookingRoutes.post('/:id/cancel', asyncHandler(async (request, response) => {
  const authUser = getAuthUserFromRequest(request);
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Thiếu id booking.', 400);

  if (!authUser) {
    throw new AppError('Vui lòng đăng nhập để hủy booking.', 401);
  }

  const result = await cancelBooking(id, authUser.id);
  response.status(200).json(result);
}));

bookingRoutes.post('/cancel-booking', asyncHandler(async (request, response) => {
  const authUser = getAuthUserFromRequest(request);
  if (!authUser) {
    throw new AppError('Vui lòng đăng nhập để hủy booking.', 401);
  }

  const payload = cancelBookingSchema.parse(request.body ?? {});
  const result = await cancelBooking(payload.bookingId, authUser.id);
  response.status(200).json(result);
}));

bookingRoutes.post('/:id/expire', asyncHandler(async (request, response) => {
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Thiếu id booking.', 400);

  const booking = await expireBooking(id, 'Booking đã hết hạn giữ chỗ.');
  response.json({ success: true, bookingId: booking?.id ?? id });
}));