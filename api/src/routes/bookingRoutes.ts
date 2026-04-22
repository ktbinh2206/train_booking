import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { getAuthUserFromRequest } from '../lib/auth';
import { AppError } from '../lib/errors';
import { serializeBooking } from '../lib/serializers';
import { cancelBooking, createBooking, expireBooking, getBookingById, listBookings, payBooking, holdOrGetBooking } from '../services/bookingService';

export const bookingRoutes = Router();

const createBookingSchema = z.object({
  userId: z.string().min(1).optional(),
  tripId: z.string().min(1),
  seatIds: z.array(z.string().min(1)).min(1),
  contactEmail: z.string().email()
});

bookingRoutes.get('/', asyncHandler(async (request, response) => {
  const authUser = getAuthUserFromRequest(request);
  const statusQuery = typeof request.query.status === 'string' ? request.query.status : undefined;
  const allowedStatuses = ['HOLDING', 'PAID', 'EXPIRED', 'CANCELLED', 'REFUNDED'] as const;
  const status = statusQuery && allowedStatuses.includes(statusQuery as (typeof allowedStatuses)[number])
    ? (statusQuery as (typeof allowedStatuses)[number])
    : undefined;
  const filter: { userId?: string; status?: 'HOLDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED'; from?: string; to?: string } = {};
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

bookingRoutes.post('/:id/pay', asyncHandler(async (request, response) => {
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Thiếu id booking.', 400);

  const booking = await payBooking(id);
  response.json(serializeBooking(booking));
}));

bookingRoutes.post('/:id/cancel', asyncHandler(async (request, response) => {
  const authUser = getAuthUserFromRequest(request);
  const payload = z.object({
    reason: z.string().min(1).optional()
  }).parse(request.body ?? {});
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Thiếu id booking.', 400);

  const targetBooking = await getBookingById(id);
  if (!targetBooking) {
    throw new AppError('Không tìm thấy booking.', 404);
  }

  if (authUser && authUser.role !== 'ADMIN' && targetBooking.userId !== authUser.id) {
    throw new AppError('Bạn không có quyền hủy booking này.', 403);
  }

  const booking = await cancelBooking({ bookingId: id, reason: payload.reason });
  response.json(serializeBooking(booking));
}));

bookingRoutes.post('/:id/expire', asyncHandler(async (request, response) => {
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) throw new AppError('Thiếu id booking.', 400);

  const booking = await expireBooking(id, 'Booking đã hết hạn giữ chỗ.');
  response.json({ success: true, bookingId: booking?.id ?? id });
}));