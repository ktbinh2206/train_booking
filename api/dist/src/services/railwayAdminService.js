"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTrainsRailwayAdmin = listTrainsRailwayAdmin;
exports.createTrainRailwayAdmin = createTrainRailwayAdmin;
exports.updateTrainRailwayAdmin = updateTrainRailwayAdmin;
exports.deleteTrainRailwayAdmin = deleteTrainRailwayAdmin;
exports.listCarriageTemplatesRailwayAdmin = listCarriageTemplatesRailwayAdmin;
exports.createCarriageTemplateRailwayAdmin = createCarriageTemplateRailwayAdmin;
exports.updateCarriageTemplateRailwayAdmin = updateCarriageTemplateRailwayAdmin;
exports.deleteCarriageTemplateRailwayAdmin = deleteCarriageTemplateRailwayAdmin;
exports.createTripWithCarriagesRailwayAdmin = createTripWithCarriagesRailwayAdmin;
const decimal_js_1 = __importDefault(require("decimal.js"));
const prisma_1 = require("../lib/prisma");
const errors_1 = require("../lib/errors");
const trainBuilderService_1 = require("./trainBuilderService");
function toPage(input) {
    const page = Number.isFinite(input.page) && (input.page ?? 0) > 0 ? Number(input.page) : 1;
    const pageSize = Number.isFinite(input.pageSize) && (input.pageSize ?? 0) > 0 ? Math.min(Number(input.pageSize), 100) : 10;
    return { page, pageSize, skip: (page - 1) * pageSize };
}
function toPaged(items, total, page, pageSize) {
    return { data: items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
async function listTrainsRailwayAdmin(input) {
    const { page, pageSize, skip } = toPage(input);
    const [total, items] = await Promise.all([
        prisma_1.prisma.train.count(),
        prisma_1.prisma.train.findMany({ orderBy: { code: 'asc' }, skip, take: pageSize })
    ]);
    return toPaged(items.map((it) => ({ ...it, carriageCount: 0, seatCount: 0, minCarriagePrice: null, maxCarriagePrice: null })), total, page, pageSize);
}
async function createTrainRailwayAdmin(input) {
    return prisma_1.prisma.train.create({ data: { code: input.code.trim().toUpperCase(), name: input.name.trim() } });
}
async function updateTrainRailwayAdmin(trainId, input) {
    return prisma_1.prisma.train.update({
        where: { id: trainId },
        data: {
            ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
            ...(input.name !== undefined ? { name: input.name.trim() } : {})
        }
    });
}
async function deleteTrainRailwayAdmin(trainId) {
    await prisma_1.prisma.train.delete({ where: { id: trainId } });
    return { success: true };
}
async function listCarriageTemplatesRailwayAdmin(input) {
    const { page, pageSize, skip } = toPage(input);
    const [total, items] = await Promise.all([
        prisma_1.prisma.carriageTemplate.count(),
        prisma_1.prisma.carriageTemplate.findMany({ orderBy: [{ code: 'asc' }], skip, take: pageSize })
    ]);
    return toPaged(items, total, page, pageSize);
}
async function createCarriageTemplateRailwayAdmin(input) {
    const layout = (0, trainBuilderService_1.normalizeLayoutJson)(input.layout);
    return prisma_1.prisma.carriageTemplate.create({
        data: { code: input.code.trim().toUpperCase(), type: input.type, layout: layout }
    });
}
async function updateCarriageTemplateRailwayAdmin(id, input) {
    return prisma_1.prisma.carriageTemplate.update({
        where: { id },
        data: {
            ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
            ...(input.type !== undefined ? { type: input.type } : {}),
            ...(input.layout !== undefined ? { layout: (0, trainBuilderService_1.normalizeLayoutJson)(input.layout) } : {})
        }
    });
}
async function deleteCarriageTemplateRailwayAdmin(id) {
    await prisma_1.prisma.carriageTemplate.delete({ where: { id } });
    return { success: true };
}
async function createTripWithCarriagesRailwayAdmin(input) {
    if (input.carriages.length === 0) {
        throw new errors_1.AppError('Trip must include at least one carriage.', 400);
    }
    const templateIds = [...new Set(input.carriages.map((item) => item.templateId))];
    const templates = await prisma_1.prisma.carriageTemplate.findMany({ where: { id: { in: templateIds } } });
    const templateById = new Map(templates.map((t) => [t.id, t]));
    if (templates.length !== templateIds.length) {
        throw new errors_1.AppError('Some carriage templates do not exist.', 404);
    }
    return prisma_1.prisma.$transaction(async (tx) => {
        const [originStation, destinationStation] = await Promise.all([
            tx.station.findUnique({ where: { id: input.originStationId } }),
            tx.station.findUnique({ where: { id: input.destinationStationId } })
        ]);
        if (!originStation || !destinationStation) {
            throw new errors_1.AppError('Origin or destination station is invalid.', 404);
        }
        const trip = await tx.trip.create({
            data: {
                trainId: input.trainId,
                originStationId: input.originStationId,
                destinationStationId: input.destinationStationId,
                origin: originStation.name,
                destination: destinationStation.name,
                departureTime: new Date(input.departureTime),
                arrivalTime: new Date(input.arrivalTime),
                price: new decimal_js_1.default(input.price),
                status: 'ON_TIME'
            }
        });
        const createdCarriages = await Promise.all(input.carriages.map((carriage) => {
            const template = templateById.get(carriage.templateId);
            return tx.tripCarriage.create({
                data: {
                    tripId: trip.id,
                    templateId: template.id,
                    code: carriage.code.trim().toUpperCase(),
                    orderIndex: carriage.orderIndex,
                    basePrice: new decimal_js_1.default(carriage.basePrice),
                    layout: template.layout
                }
            });
        }));
        const seatsPayload = createdCarriages.flatMap((carriage) => {
            const normalized = (0, trainBuilderService_1.normalizeLayoutJson)(carriage.layout);
            return normalized.seats.map((seat) => ({
                carriageId: carriage.id,
                seatNumber: seat.seatNumber,
                price: seat.price === null || seat.price === undefined ? null : new decimal_js_1.default(seat.price),
                status: 'ACTIVE'
            }));
        });
        if (seatsPayload.length > 0) {
            await tx.tripSeat.createMany({ data: seatsPayload });
        }
        return tx.trip.findUniqueOrThrow({
            where: { id: trip.id },
            include: {
                train: true,
                tripCarriages: {
                    orderBy: { orderIndex: 'asc' },
                    include: { seats: { orderBy: { seatNumber: 'asc' } }, template: true }
                }
            }
        });
    });
}
