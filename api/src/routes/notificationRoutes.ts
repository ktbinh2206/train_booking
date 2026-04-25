import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { getAuthUserFromRequest } from '../lib/auth';
import { AppError } from '../lib/errors';
import { serializeNotification } from '../lib/serializers';
import { prisma } from '../lib/prisma';
import { buildNotificationTitle } from '../services/notificationMessage';

export const notificationRoutes = Router();

function resolveUserId(request: Parameters<typeof getAuthUserFromRequest>[0]) {
  const authUser = getAuthUserFromRequest(request);
  const userIdQuery = typeof request.query.userId === 'string' ? request.query.userId : undefined;
  const userIdHeader = typeof request.headers['x-user-id'] === 'string' ? request.headers['x-user-id'] : undefined;
  const userId = authUser?.id ?? userIdQuery ?? userIdHeader;

  if (!userId) {
    throw new AppError('Chưa đăng nhập.', 401);
  }

  return userId;
}

function parsePositiveInt(input: unknown, fallbackValue: number) {
  if (typeof input !== 'string') {
    return fallbackValue;
  }

  const value = Number.parseInt(input, 10);
  if (!Number.isFinite(value) || value <= 0) {
    return fallbackValue;
  }

  return value;
}

notificationRoutes.get('/', asyncHandler(async (request, response) => {
  const userId = resolveUserId(request);
  const page = parsePositiveInt(request.query.page, 1);
  const pageSize = Math.min(parsePositiveInt(request.query.pageSize, 10), 50);
  const skip = (page - 1) * pageSize;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, readAt: null } })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  response.json({
    data: notifications.map((notification) => {
      const serialized = serializeNotification(notification);
      return {
        ...serialized,
        title: buildNotificationTitle(serialized.type),
        read: serialized.readAt !== null
      };
    }),
    page,
    total,
    totalPages,
    unreadCount
  });
}));

notificationRoutes.post('/:id/read', asyncHandler(async (request, response) => {
  const userId = resolveUserId(request);
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) {
    throw new AppError('Thiếu notification id.', 400);
  }

  await prisma.notification.updateMany({
    where: {
      id,
      userId,
      readAt: null
    },
    data: { readAt: new Date() }
  });

  const notification = await prisma.notification.findFirst({
    where: {
      id,
      userId
    }
  });

  if (!notification) {
    throw new AppError('Không tìm thấy thông báo.', 404);
  }

  const unreadCount = await prisma.notification.count({
    where: {
      userId,
      readAt: null
    }
  });

  const serialized = serializeNotification(notification);
  response.json({
    ...serialized,
    title: buildNotificationTitle(serialized.type),
    read: serialized.readAt !== null,
    unreadCount
  });
}));

notificationRoutes.post('/read-all', asyncHandler(async (request, response) => {
  const userId = resolveUserId(request);

  const result = await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });

  response.json({
    success: true,
    updatedCount: result.count,
    unreadCount: 0
  });
}));

notificationRoutes.get('/unread-count', asyncHandler(async (request, response) => {
  const userId = resolveUserId(request);

  const unreadCount = await prisma.notification.count({
    where: {
      userId,
      readAt: null
    }
  });

  response.json({ unreadCount });
}));

notificationRoutes.delete('/:id', asyncHandler(async (request, response) => {
  const userId = resolveUserId(request);
  const id = typeof request.params.id === 'string' ? request.params.id : undefined;
  if (!id) {
    throw new AppError('Thiếu notification id.', 400);
  }

  await prisma.notification.deleteMany({
    where: {
      id,
      userId
    }
  });

  const unreadCount = await prisma.notification.count({
    where: {
      userId,
      readAt: null
    }
  });

  response.json({ success: true, unreadCount });
}));
