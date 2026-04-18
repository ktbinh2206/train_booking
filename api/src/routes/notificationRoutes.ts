import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { getAuthUserFromRequest } from '../lib/auth';
import { AppError } from '../lib/errors';
import { serializeNotification } from '../lib/serializers';
import { prisma } from '../lib/prisma';

export const notificationRoutes = Router();

notificationRoutes.get('/', asyncHandler(async (request, response) => {
  const authUser = getAuthUserFromRequest(request);
  const userIdQuery = typeof request.query.userId === 'string' ? request.query.userId : undefined;
  const userIdHeader = typeof request.headers['x-user-id'] === 'string' ? request.headers['x-user-id'] : undefined;
  const userId = authUser?.id ?? userIdQuery ?? userIdHeader;

  if (!userId) {
    throw new AppError('Chưa đăng nhập.', 401);
  }

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  response.json(notifications.map((notification) => serializeNotification(notification)));
}));

notificationRoutes.post('/:id/read', asyncHandler(async (request, response) => {
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) {
    throw new AppError('Thiếu notification id.', 400);
  }

  const notification = await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() }
  });

  response.json(serializeNotification(notification));
}));

notificationRoutes.delete('/:id', asyncHandler(async (request, response) => {
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) {
    throw new AppError('Thiếu notification id.', 400);
  }

  await prisma.notification.delete({ where: { id } });
  response.json({ success: true });
}));
