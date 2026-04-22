"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const asyncHandler_1 = require("../lib/asyncHandler");
const auth_1 = require("../lib/auth");
const errors_1 = require("../lib/errors");
const adminService_1 = require("../services/adminService");
const adminService_2 = require("../services/adminService");
const adminCrudService_1 = require("../services/adminCrudService");
const trainBuilderService_1 = require("../services/trainBuilderService");
const railwayAdminService_1 = require("../services/railwayAdminService");
exports.adminRoutes = (0, express_1.Router)();
exports.adminRoutes.use((request, _response, next) => {
    const authUser = (0, auth_1.getAuthUserFromRequest)(request);
    if (!authUser) {
        throw new errors_1.AppError('Chưa đăng nhập.', 401);
    }
    if (authUser.role !== 'ADMIN') {
        throw new errors_1.AppError('Bạn không có quyền truy cập trang quản trị.', 403);
    }
    next();
});
function getPaginationQuery(request) {
    const page = typeof request.query.page === 'string' ? Number.parseInt(request.query.page, 10) : undefined;
    const pageSize = typeof request.query.pageSize === 'string' ? Number.parseInt(request.query.pageSize, 10) : undefined;
    return { page, pageSize };
}
function getIdParam(request, key) {
    const value = request.params[key];
    if (typeof value !== 'string') {
        throw new errors_1.AppError(`Thiếu ${key}.`, 400);
    }
    return value;
}
const stationPayloadSchema = zod_1.z.object({
    code: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    city: zod_1.z.string().min(1)
});
exports.adminRoutes.get('/stations', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, adminCrudService_1.listStationsAdmin)(getPaginationQuery(request)));
}));
exports.adminRoutes.get('/stations/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, adminCrudService_1.getStationByIdAdmin)(getIdParam(request, 'id')));
}));
exports.adminRoutes.post('/stations', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const payload = stationPayloadSchema.parse(request.body);
    response.status(201).json(await (0, adminCrudService_1.createStationAdmin)(payload));
}));
exports.adminRoutes.put('/stations/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const payload = stationPayloadSchema.partial().parse(request.body);
    response.json(await (0, adminCrudService_1.updateStationAdmin)(getIdParam(request, 'id'), payload));
}));
exports.adminRoutes.delete('/stations/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, adminCrudService_1.deleteStationAdmin)(getIdParam(request, 'id')));
}));
const trainPayloadSchema = zod_1.z.object({
    code: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1)
});
exports.adminRoutes.get('/trains', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, railwayAdminService_1.listTrainsRailwayAdmin)(getPaginationQuery(request)));
}));
exports.adminRoutes.get('/trains/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, adminCrudService_1.getTrainByIdAdmin)(getIdParam(request, 'id')));
}));
exports.adminRoutes.post('/trains', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const payload = trainPayloadSchema.parse(request.body);
    response.status(201).json(await (0, railwayAdminService_1.createTrainRailwayAdmin)(payload));
}));
exports.adminRoutes.put('/trains/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const payload = trainPayloadSchema.partial().parse(request.body);
    response.json(await (0, railwayAdminService_1.updateTrainRailwayAdmin)(getIdParam(request, 'id'), payload));
}));
exports.adminRoutes.delete('/trains/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, railwayAdminService_1.deleteTrainRailwayAdmin)(getIdParam(request, 'id')));
}));
const carriagePayloadSchema = zod_1.z.object({
    code: zod_1.z.string().min(1),
    type: zod_1.z.enum(['SOFT_SEAT', 'HARD_SEAT', 'SLEEPER']),
    layout: zod_1.z.unknown()
});
exports.adminRoutes.get('/carriages', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, railwayAdminService_1.listCarriageTemplatesRailwayAdmin)(getPaginationQuery(request)));
}));
exports.adminRoutes.get('/carriages/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, adminCrudService_1.getCarriageByIdAdmin)(getIdParam(request, 'id')));
}));
exports.adminRoutes.post('/carriages', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const payload = carriagePayloadSchema.parse(request.body);
    response.status(201).json(await (0, railwayAdminService_1.createCarriageTemplateRailwayAdmin)(payload));
}));
exports.adminRoutes.put('/carriages/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const payload = carriagePayloadSchema.partial().parse(request.body);
    response.json(await (0, railwayAdminService_1.updateCarriageTemplateRailwayAdmin)(getIdParam(request, 'id'), payload));
}));
exports.adminRoutes.delete('/carriages/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, railwayAdminService_1.deleteCarriageTemplateRailwayAdmin)(getIdParam(request, 'id')));
}));
exports.adminRoutes.post('/carriages/:id/duplicate', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const payload = zod_1.z.object({
        code: zod_1.z.string().min(1).optional()
    }).optional().parse(request.body ?? {});
    response.status(201).json(await (0, trainBuilderService_1.duplicateCarriageAdmin)(getIdParam(request, 'id'), payload?.code));
}));
exports.adminRoutes.patch('/carriages/:id/layout', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const layout = (0, trainBuilderService_1.normalizeLayoutJson)(request.body.layout ?? request.body);
    response.json(await (0, trainBuilderService_1.saveCarriageLayoutAdmin)(getIdParam(request, 'id'), layout));
}));
const seatPayloadSchema = zod_1.z.object({
    carriageId: zod_1.z.string().min(1),
    code: zod_1.z.string().min(1),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE']).optional(),
    price: zod_1.z.number().nonnegative().nullable().optional()
});
exports.adminRoutes.get('/seats', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const carriageId = typeof request.query.carriageId === 'string' ? request.query.carriageId : undefined;
    response.json(await (0, adminCrudService_1.listSeatsAdmin)({ ...getPaginationQuery(request), carriageId }));
}));
exports.adminRoutes.post('/seats/sync', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const payload = zod_1.z.object({
        carriageId: zod_1.z.string().min(1),
        layout: zod_1.z.unknown()
    }).parse(request.body);
    response.json(await (0, trainBuilderService_1.syncCarriageSeatsAdmin)(payload.carriageId, payload.layout));
}));
exports.adminRoutes.post('/seats/bulk', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const payload = zod_1.z.object({
        carriageId: zod_1.z.string().min(1),
        seats: zod_1.z.array(zod_1.z.object({
            code: zod_1.z.string().min(1),
            price: zod_1.z.number().nonnegative().nullable().optional()
        })).min(0),
        layout: zod_1.z.unknown().optional()
    }).parse(request.body);
    response.json(await (0, trainBuilderService_1.bulkSyncCarriageSeatsAdmin)(payload.carriageId, payload.seats, payload.layout));
}));
exports.adminRoutes.get('/seats/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, adminCrudService_1.getSeatByIdAdmin)(getIdParam(request, 'id')));
}));
exports.adminRoutes.post('/seats', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const payload = seatPayloadSchema.parse(request.body);
    response.status(201).json(await (0, adminCrudService_1.createSeatAdmin)(payload));
}));
exports.adminRoutes.put('/seats/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const payload = seatPayloadSchema.partial().parse(request.body);
    response.json(await (0, adminCrudService_1.updateSeatAdmin)(getIdParam(request, 'id'), payload));
}));
exports.adminRoutes.delete('/seats/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, adminCrudService_1.deleteSeatAdmin)(getIdParam(request, 'id')));
}));
const tripPayloadSchema = zod_1.z.object({
    trainId: zod_1.z.string().min(1),
    originStationId: zod_1.z.string().min(1),
    destinationStationId: zod_1.z.string().min(1),
    departureTime: zod_1.z.string().datetime(),
    arrivalTime: zod_1.z.string().datetime(),
    price: zod_1.z.number().positive(),
    status: zod_1.z.enum(['ON_TIME', 'DELAYED', 'CANCELLED']).optional(),
    delayMinutes: zod_1.z.number().int().nonnegative().optional(),
    note: zod_1.z.string().nullable().optional(),
    carriages: zod_1.z.array(zod_1.z.object({
        templateId: zod_1.z.string().min(1),
        code: zod_1.z.string().min(1),
        orderIndex: zod_1.z.number().int().nonnegative(),
        basePrice: zod_1.z.number().nonnegative()
    })).optional()
});
exports.adminRoutes.get('/trips', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, adminCrudService_1.listTripsAdmin)(getPaginationQuery(request)));
}));
exports.adminRoutes.get('/trips/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, adminCrudService_1.getTripByIdAdmin)(getIdParam(request, 'id')));
}));
exports.adminRoutes.post('/trips', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const payload = tripPayloadSchema.parse(request.body);
    if (!payload.carriages) {
        response.status(201).json(await (0, adminCrudService_1.createTripAdmin)(payload));
        return;
    }
    response.status(201).json(await (0, railwayAdminService_1.createTripWithCarriagesRailwayAdmin)({
        trainId: payload.trainId,
        originStationId: payload.originStationId,
        destinationStationId: payload.destinationStationId,
        departureTime: payload.departureTime,
        arrivalTime: payload.arrivalTime,
        price: payload.price,
        carriages: payload.carriages
    }));
}));
exports.adminRoutes.put('/trips/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const payload = tripPayloadSchema.partial().parse(request.body);
    response.json(await (0, adminCrudService_1.updateTripAdmin)(getIdParam(request, 'id'), payload));
}));
exports.adminRoutes.delete('/trips/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, adminCrudService_1.deleteTripAdmin)(getIdParam(request, 'id')));
}));
exports.adminRoutes.post('/trips/:id/status', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const payload = zod_1.z.object({
        status: zod_1.z.enum(['ON_TIME', 'DELAYED', 'CANCELLED']),
        delayMinutes: zod_1.z.number().int().nonnegative().optional(),
        note: zod_1.z.string().optional()
    }).parse(request.body);
    if (payload.status === 'DELAYED' && typeof payload.delayMinutes !== 'number') {
        throw new errors_1.AppError('Delay phải có số phút delay.', 400);
    }
    response.json(await (0, adminService_1.setTripStatus)(getIdParam(request, 'id'), payload));
}));
const bookingPayloadSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1),
    tripId: zod_1.z.string().min(1),
    seatIds: zod_1.z.array(zod_1.z.string().min(1)).min(1),
    contactEmail: zod_1.z.string().email(),
    markAsPaid: zod_1.z.boolean().optional()
});
exports.adminRoutes.get('/bookings', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, adminCrudService_1.listBookingsAdmin)(getPaginationQuery(request)));
}));
exports.adminRoutes.get('/bookings/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, adminCrudService_1.getBookingByIdAdmin)(getIdParam(request, 'id')));
}));
exports.adminRoutes.post('/bookings', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const payload = bookingPayloadSchema.parse(request.body);
    response.status(201).json(await (0, adminCrudService_1.createBookingAdmin)(payload));
}));
exports.adminRoutes.put('/bookings/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const payload = zod_1.z.object({
        status: zod_1.z.enum(['HOLDING', 'PAID', 'EXPIRED', 'CANCELLED', 'REFUNDED']).optional(),
        contactEmail: zod_1.z.string().email().optional()
    }).parse(request.body);
    response.json(await (0, adminCrudService_1.updateBookingAdmin)(getIdParam(request, 'id'), payload));
}));
exports.adminRoutes.delete('/bookings/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, adminCrudService_1.deleteBookingAdmin)(getIdParam(request, 'id')));
}));
const ticketPayloadSchema = zod_1.z.object({
    bookingId: zod_1.z.string().min(1),
    ticketNumber: zod_1.z.string().min(1).optional(),
    qrDataUrl: zod_1.z.string().min(1),
    eTicketUrl: zod_1.z.string().url().optional(),
    invoiceNumber: zod_1.z.string().min(1).optional()
});
exports.adminRoutes.get('/tickets', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, adminCrudService_1.listTicketsAdmin)(getPaginationQuery(request)));
}));
exports.adminRoutes.get('/tickets/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, adminCrudService_1.getTicketByIdAdmin)(getIdParam(request, 'id')));
}));
exports.adminRoutes.post('/tickets', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const payload = ticketPayloadSchema.parse(request.body);
    response.status(201).json(await (0, adminCrudService_1.createTicketAdmin)(payload));
}));
exports.adminRoutes.put('/tickets/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const payload = zod_1.z.object({
        eTicketUrl: zod_1.z.string().url().nullable().optional(),
        invoiceNumber: zod_1.z.string().nullable().optional(),
        qrDataUrl: zod_1.z.string().min(1).optional()
    }).parse(request.body);
    response.json(await (0, adminCrudService_1.updateTicketAdmin)(getIdParam(request, 'id'), payload));
}));
exports.adminRoutes.delete('/tickets/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, adminCrudService_1.deleteTicketAdmin)(getIdParam(request, 'id')));
}));
const userPayloadSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6).optional(),
    role: zod_1.z.enum(['USER', 'ADMIN']).optional()
});
exports.adminRoutes.get('/users', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, adminCrudService_1.listUsersAdmin)(getPaginationQuery(request)));
}));
exports.adminRoutes.get('/users/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, adminCrudService_1.getUserByIdAdmin)(getIdParam(request, 'id')));
}));
exports.adminRoutes.post('/users', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const payload = userPayloadSchema.parse(request.body);
    response.status(201).json(await (0, adminCrudService_1.createUserAdmin)(payload));
}));
exports.adminRoutes.put('/users/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const payload = userPayloadSchema.partial().parse(request.body);
    response.json(await (0, adminCrudService_1.updateUserAdmin)(getIdParam(request, 'id'), payload));
}));
exports.adminRoutes.delete('/users/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    response.json(await (0, adminCrudService_1.deleteUserAdmin)(getIdParam(request, 'id')));
}));
exports.adminRoutes.get('/reports', (0, asyncHandler_1.asyncHandler)(async (_request, response) => {
    response.json(await (0, adminService_1.getReports)());
}));
exports.adminRoutes.get('/recent-bookings', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const limit = typeof request.query.limit === 'string' ? Number.parseInt(request.query.limit, 10) : undefined;
    response.json(await (0, adminService_2.listRecentBookings)(limit));
}));
