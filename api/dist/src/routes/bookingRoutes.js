"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const asyncHandler_1 = require("../lib/asyncHandler");
const auth_1 = require("../lib/auth");
const errors_1 = require("../lib/errors");
const serializers_1 = require("../lib/serializers");
const bookingService_1 = require("../services/bookingService");
exports.bookingRoutes = (0, express_1.Router)();
const createBookingSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1).optional(),
    tripId: zod_1.z.string().min(1),
    seatIds: zod_1.z.array(zod_1.z.string().min(1)).min(1),
    contactEmail: zod_1.z.string().email()
});
exports.bookingRoutes.get('/', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const authUser = (0, auth_1.getAuthUserFromRequest)(request);
    const statusQuery = typeof request.query.status === 'string' ? request.query.status : undefined;
    const allowedStatuses = ['HOLDING', 'PAID', 'EXPIRED', 'CANCELLED', 'REFUNDED'];
    const status = statusQuery && allowedStatuses.includes(statusQuery)
        ? statusQuery
        : undefined;
    const filter = {};
    const userId = typeof request.query.userId === 'string' ? request.query.userId : undefined;
    const from = typeof request.query.from === 'string' ? request.query.from : undefined;
    const to = typeof request.query.to === 'string' ? request.query.to : undefined;
    const effectiveUserId = userId ?? authUser?.id;
    if (effectiveUserId) {
        if (authUser && authUser.role !== 'ADMIN' && effectiveUserId !== authUser.id) {
            throw new errors_1.AppError('Bạn không có quyền xem booking của người khác.', 403);
        }
        filter.userId = effectiveUserId;
    }
    if (status)
        filter.status = status;
    if (from)
        filter.from = from;
    if (to)
        filter.to = to;
    const bookings = await (0, bookingService_1.listBookings)(filter);
    response.json(bookings.map((booking) => (0, serializers_1.serializeBooking)(booking)));
}));
exports.bookingRoutes.get('/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const id = typeof request.params.id === 'string' ? request.params.id : undefined;
    if (!id)
        throw new errors_1.AppError('Thiếu id booking.', 400);
    const booking = await (0, bookingService_1.getBookingById)(id);
    if (!booking) {
        throw new errors_1.AppError('Không tìm thấy booking.', 404);
    }
    response.json((0, serializers_1.serializeBooking)(booking));
}));
exports.bookingRoutes.post('/', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const authUser = (0, auth_1.getAuthUserFromRequest)(request);
    const payload = createBookingSchema.parse(request.body);
    const effectiveUserId = payload.userId ?? authUser?.id;
    if (!effectiveUserId) {
        throw new errors_1.AppError('Thiếu userId.', 400);
    }
    if (authUser && authUser.role !== 'ADMIN' && effectiveUserId !== authUser.id) {
        throw new errors_1.AppError('Bạn không có quyền tạo booking cho user khác.', 403);
    }
    const booking = await (0, bookingService_1.createBooking)({
        ...payload,
        userId: effectiveUserId
    });
    response.status(201).json((0, serializers_1.serializeBooking)(booking));
}));
exports.bookingRoutes.post('/:id/pay', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const id = typeof request.params.id === 'string' ? request.params.id : undefined;
    if (!id)
        throw new errors_1.AppError('Thiếu id booking.', 400);
    const booking = await (0, bookingService_1.payBooking)(id);
    response.json((0, serializers_1.serializeBooking)(booking));
}));
exports.bookingRoutes.post('/:id/cancel', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const authUser = (0, auth_1.getAuthUserFromRequest)(request);
    const payload = zod_1.z.object({
        reason: zod_1.z.string().min(1).optional()
    }).parse(request.body ?? {});
    const id = typeof request.params.id === 'string' ? request.params.id : undefined;
    if (!id)
        throw new errors_1.AppError('Thiếu id booking.', 400);
    const targetBooking = await (0, bookingService_1.getBookingById)(id);
    if (!targetBooking) {
        throw new errors_1.AppError('Không tìm thấy booking.', 404);
    }
    if (authUser && authUser.role !== 'ADMIN' && targetBooking.userId !== authUser.id) {
        throw new errors_1.AppError('Bạn không có quyền hủy booking này.', 403);
    }
    const booking = await (0, bookingService_1.cancelBooking)({ bookingId: id, reason: payload.reason });
    response.json((0, serializers_1.serializeBooking)(booking));
}));
exports.bookingRoutes.post('/:id/expire', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const id = typeof request.params.id === 'string' ? request.params.id : undefined;
    if (!id)
        throw new errors_1.AppError('Thiếu id booking.', 400);
    const booking = await (0, bookingService_1.expireBooking)(id, 'Booking đã hết hạn giữ chỗ.');
    response.json({ success: true, bookingId: booking?.id ?? id });
}));
