"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../lib/asyncHandler");
const auth_1 = require("../lib/auth");
const errors_1 = require("../lib/errors");
const prisma_1 = require("../lib/prisma");
exports.userRoutes = (0, express_1.Router)();
exports.userRoutes.get('/me', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const authUser = (0, auth_1.getAuthUserFromRequest)(request);
    const userIdQuery = typeof request.query.userId === 'string' ? request.query.userId : undefined;
    const userIdHeader = typeof request.headers['x-user-id'] === 'string' ? request.headers['x-user-id'] : undefined;
    const userId = authUser?.id ?? userIdQuery ?? userIdHeader;
    if (!userId) {
        throw new errors_1.AppError('Chưa đăng nhập.', 401);
    }
    const user = await prisma_1.prisma.user.findUnique({
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
        throw new errors_1.AppError('Không tìm thấy user.', 404);
    }
    const paidBookings = await prisma_1.prisma.booking.count({
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
