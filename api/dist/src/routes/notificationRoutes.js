"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRoutes = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../lib/asyncHandler");
const auth_1 = require("../lib/auth");
const errors_1 = require("../lib/errors");
const serializers_1 = require("../lib/serializers");
const prisma_1 = require("../lib/prisma");
exports.notificationRoutes = (0, express_1.Router)();
exports.notificationRoutes.get('/', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const authUser = (0, auth_1.getAuthUserFromRequest)(request);
    const userIdQuery = typeof request.query.userId === 'string' ? request.query.userId : undefined;
    const userIdHeader = typeof request.headers['x-user-id'] === 'string' ? request.headers['x-user-id'] : undefined;
    const userId = authUser?.id ?? userIdQuery ?? userIdHeader;
    if (!userId) {
        throw new errors_1.AppError('Chưa đăng nhập.', 401);
    }
    const notifications = await prisma_1.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });
    response.json(notifications.map((notification) => (0, serializers_1.serializeNotification)(notification)));
}));
exports.notificationRoutes.post('/:id/read', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const id = typeof request.params.id === 'string' ? request.params.id : undefined;
    if (!id) {
        throw new errors_1.AppError('Thiếu notification id.', 400);
    }
    const notification = await prisma_1.prisma.notification.update({
        where: { id },
        data: { readAt: new Date() }
    });
    response.json((0, serializers_1.serializeNotification)(notification));
}));
exports.notificationRoutes.delete('/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const id = typeof request.params.id === 'string' ? request.params.id : undefined;
    if (!id) {
        throw new errors_1.AppError('Thiếu notification id.', 400);
    }
    await prisma_1.prisma.notification.delete({ where: { id } });
    response.json({ success: true });
}));
