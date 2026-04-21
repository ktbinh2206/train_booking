import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { createAccessToken, getAuthUserFromRequest } from '../lib/auth';
import { AppError } from '../lib/errors';
import { hashPassword, verifyPassword } from '../lib/password';
import { prisma } from '../lib/prisma';

export const authRoutes = Router();

authRoutes.post('/login', asyncHandler(async (request, response) => {
  const payload = z.object({
    email: z.string().email(),
    password: z.string().min(1)
  }).parse(request.body);

  const user = await prisma.user.findUnique({
    where: { email: payload.email.trim().toLowerCase() }
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const passwordHash = (user as { passwordHash?: string | null }).passwordHash;
  if (!passwordHash) {
    throw new AppError('Invalid credentials', 401);
  }

  const isValidPassword = await verifyPassword(payload.password, passwordHash);
  if (!isValidPassword) {
    throw new AppError('Invalid credentials', 401);
  }

  const accessToken = createAccessToken({
    id: user.id,
    role: user.role,
    email: user.email
  });

  response.json({
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
}));

authRoutes.post('/register', asyncHandler(async (request, response) => {
  const payload = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    password: z.string().min(6)
  }).parse(request.body);

  const email = payload.email.trim().toLowerCase();
  const existed = await prisma.user.findUnique({ where: { email } });
  if (existed) {
    throw new AppError('Email đã được sử dụng.', 409);
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: `${payload.firstName.trim()} ${payload.lastName.trim()}`.trim(),
      passwordHash: await hashPassword(payload.password),
      role: 'USER'
    }
  });

  const accessToken = createAccessToken({
    id: user.id,
    role: user.role,
    email: user.email
  });

  response.status(201).json({
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
}));

authRoutes.get('/me', asyncHandler(async (request, response) => {
  const authUser = getAuthUserFromRequest(request);
  if (!authUser) {
    throw new AppError('Chưa đăng nhập.', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: {
      _count: {
        select: { bookings: true }
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