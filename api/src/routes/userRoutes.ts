import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { getAuthUserFromRequest } from '../lib/auth';
import { AppError } from '../lib/errors';
import { hashPassword, verifyPassword } from '../lib/password';
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

userRoutes.post('/change-password', asyncHandler(async (request, response) => {
  const authUser = getAuthUserFromRequest(request);
  if (!authUser) {
    throw new AppError('Chưa đăng nhập.', 401);
  }

  const payload = z.object({
    oldPassword: z.string().min(1),
    newPassword: z.string().min(6),
    confirmPassword: z.string().min(1)
  }).parse(request.body);

  if (payload.newPassword !== payload.confirmPassword) {
    throw new AppError('Xác nhận mật khẩu mới không khớp.', 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      passwordHash: true
    }
  });

  if (!user) {
    throw new AppError('Không tìm thấy user.', 404);
  }

  const isValid = await verifyPassword(payload.oldPassword, user.passwordHash);
  if (!isValid) {
    throw new AppError('Mật khẩu cũ không chính xác.', 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(payload.newPassword)
    }
  });

  response.json({ success: true });
}));
