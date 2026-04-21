"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const asyncHandler_1 = require("../lib/asyncHandler");
const auth_1 = require("../lib/auth");
const errors_1 = require("../lib/errors");
const password_1 = require("../lib/password");
const prisma_1 = require("../lib/prisma");
exports.authRoutes = (0, express_1.Router)();
exports.authRoutes.post('/login', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const payload = zod_1.z.object({
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(1)
    }).parse(request.body);
    const user = await prisma_1.prisma.user.findUnique({
        where: { email: payload.email.trim().toLowerCase() }
    });
    if (!user) {
        throw new errors_1.AppError('Invalid credentials', 401);
    }
    const passwordHash = user.passwordHash;
    if (!passwordHash) {
        throw new errors_1.AppError('Invalid credentials', 401);
    }
    const isValidPassword = await (0, password_1.verifyPassword)(payload.password, passwordHash);
    if (!isValidPassword) {
        throw new errors_1.AppError('Invalid credentials', 401);
    }
    const accessToken = (0, auth_1.createAccessToken)({
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
exports.authRoutes.post('/register', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const payload = zod_1.z.object({
        firstName: zod_1.z.string().min(1),
        lastName: zod_1.z.string().min(1),
        email: zod_1.z.string().email(),
        phone: zod_1.z.string().optional(),
        password: zod_1.z.string().min(6)
    }).parse(request.body);
    const email = payload.email.trim().toLowerCase();
    const existed = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (existed) {
        throw new errors_1.AppError('Email đã được sử dụng.', 409);
    }
    const user = await prisma_1.prisma.user.create({
        data: {
            email,
            name: `${payload.firstName.trim()} ${payload.lastName.trim()}`.trim(),
            passwordHash: await (0, password_1.hashPassword)(payload.password),
            role: 'USER'
        }
    });
    const accessToken = (0, auth_1.createAccessToken)({
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
exports.authRoutes.get('/me', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const authUser = (0, auth_1.getAuthUserFromRequest)(request);
    if (!authUser) {
        throw new errors_1.AppError('Chưa đăng nhập.', 401);
    }
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: authUser.id },
        include: {
            _count: {
                select: { bookings: true }
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
