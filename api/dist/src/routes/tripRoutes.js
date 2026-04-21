"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tripRoutes = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../lib/asyncHandler");
const errors_1 = require("../lib/errors");
const prisma_1 = require("../lib/prisma");
const tripService = require('../services/tripService');
exports.tripRoutes = (0, express_1.Router)();
exports.tripRoutes.get('/search', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const departureStationId = typeof request.query.departureStationId === 'string' ? request.query.departureStationId : undefined;
    const arrivalStationId = typeof request.query.arrivalStationId === 'string' ? request.query.arrivalStationId : undefined;
    const date = typeof request.query.date === 'string' ? request.query.date : undefined;
    const fromDate = typeof request.query.fromDate === 'string' ? request.query.fromDate : undefined;
    const toDate = typeof request.query.toDate === 'string' ? request.query.toDate : undefined;
    const tripType = typeof request.query.tripType === 'string' && (request.query.tripType === 'one-way' || request.query.tripType === 'round-trip')
        ? request.query.tripType
        : undefined;
    const page = typeof request.query.page === 'string' ? Number.parseInt(request.query.page, 10) : undefined;
    const pageSize = typeof request.query.pageSize === 'string' ? Number.parseInt(request.query.pageSize, 10) : undefined;
    const trips = await tripService.searchTrips({ departureStationId, arrivalStationId, date, fromDate, toDate, tripType, page, pageSize });
    response.json(trips);
}));
exports.tripRoutes.get('/today', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const page = typeof request.query.page === 'string' ? Number.parseInt(request.query.page, 10) : undefined;
    const pageSize = typeof request.query.pageSize === 'string' ? Number.parseInt(request.query.pageSize, 10) : undefined;
    response.json(await tripService.getTodayTrips({ page, pageSize }));
}));
exports.tripRoutes.get('/stations', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const q = typeof request.query.q === 'string' ? request.query.q : undefined;
    response.json(await tripService.listStations(q));
}));
exports.tripRoutes.get('/admin', (0, asyncHandler_1.asyncHandler)(async (_request, response) => {
    response.json(await tripService.listTripsForAdmin());
}));
exports.tripRoutes.get('/:id', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const id = typeof request.params.id === 'string' ? request.params.id : undefined;
    if (!id)
        throw new errors_1.AppError('Không tìm thấy chuyến tàu.', 404);
    const detail = await tripService.getTripDetail(id);
    if (!detail) {
        throw new errors_1.AppError('Không tìm thấy chuyến tàu.', 404);
    }
    response.json(detail);
}));
exports.tripRoutes.get('/:id/seat-map', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const id = typeof request.params.id === 'string' ? request.params.id : undefined;
    if (!id)
        throw new errors_1.AppError('Không tìm thấy chuyến tàu.', 404);
    const seatMap = await tripService.getTripSeatMap(id);
    if (!seatMap) {
        throw new errors_1.AppError('Không tìm thấy chuyến tàu.', 404);
    }
    response.json(seatMap);
}));
exports.tripRoutes.get('/:id/seats', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const id = typeof request.params.id === 'string' ? request.params.id : undefined;
    if (!id)
        throw new errors_1.AppError('Không tìm thấy chuyến tàu.', 404);
    const seatsDetail = await tripService.getTripSeatsDetail(id);
    if (!seatsDetail) {
        throw new errors_1.AppError('Không tìm thấy chuyến tàu.', 404);
    }
    response.json(seatsDetail);
}));
exports.tripRoutes.get('/:id/availability', (0, asyncHandler_1.asyncHandler)(async (request, response) => {
    const id = typeof request.params.id === 'string' ? request.params.id : undefined;
    if (!id)
        throw new errors_1.AppError('Không tìm thấy chuyến tàu.', 404);
    const trip = await prisma_1.prisma.trip.findUnique({ where: { id } });
    if (!trip) {
        throw new errors_1.AppError('Không tìm thấy chuyến tàu.', 404);
    }
    response.json({
        tripId: trip.id,
        status: trip.status,
        delayMinutes: trip.delayMinutes,
        isActive: trip.status !== 'CANCELLED'
    });
}));
