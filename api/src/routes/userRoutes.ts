import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { getAuthUserFromRequest } from '../lib/auth';
import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';

export const userRoutes = Router();

userRoutes.get('/me', asyncHandler(async (request, response) => {
  const authUser = getAuthUserFromRequest(request);
  const userIdQuery = typeof request.query.userId === 'string' ? request.query.userId : undefined;
  const userIdHeader = typeof request.headers['x-user-id'] === 'string' ? request.headers['x-user-id'] : undefined;
  const userId = authUser?.id ?? userIdQuery ?? userIdHeader;

  if (!userId) {
    throw new AppError('Chưa đăng nhập.', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          bookings: true
        }
      }
    }
  });

  if (!user) {
    throw new AppError('Không tìm thấy user.', 404);
  }

  const paidBookings = await prisma.booking.count({
    where: {
      userId: user.id,
      status: 'PAID'
    }
  });

  response.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    bookingCount: user._count.bookings,
    ticketCount: paidBookings,
    createdAt: user.createdAt.toISOString()
  });
}));
