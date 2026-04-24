import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { normalizeLayoutJson } from './trainBuilderService';

type PaginationInput = { page?: number; pageSize?: number };

function toPage(input: PaginationInput) {
  const page = Number.isFinite(input.page) && (input.page ?? 0) > 0 ? Number(input.page) : 1;
  const pageSize = Number.isFinite(input.pageSize) && (input.pageSize ?? 0) > 0 ? Math.min(Number(input.pageSize), 100) : 10;
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function toPaged<T>(items: T[], total: number, page: number, pageSize: number) {
  return { data: items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function listTrainsRailwayAdmin(input: PaginationInput) {
  const { page, pageSize, skip } = toPage(input);
  const [total, items] = await Promise.all([
    prisma.train.count(),
    prisma.train.findMany({ orderBy: { code: 'asc' }, skip, take: pageSize })
  ]);
  return toPaged(items.map((it) => ({ ...it, carriageCount: 0, seatCount: 0, minCarriagePrice: null, maxCarriagePrice: null })), total, page, pageSize);
}

export async function createTrainRailwayAdmin(input: { code: string; name: string }) {
  return prisma.train.create({ data: { code: input.code.trim().toUpperCase(), name: input.name.trim() } });
}

export async function updateTrainRailwayAdmin(trainId: string, input: { code?: string; name?: string }) {
  return prisma.train.update({
    where: { id: trainId },
    data: {
      ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
      ...(input.name !== undefined ? { name: input.name.trim() } : {})
    }
  });
}

export async function deleteTrainRailwayAdmin(trainId: string) {
  await prisma.train.delete({ where: { id: trainId } });
  return { success: true };
}

export async function listCarriageTemplatesRailwayAdmin(input: PaginationInput) {
  const { page, pageSize, skip } = toPage(input);
  const [total, items] = await Promise.all([
    prisma.carriageTemplate.count(),
    prisma.carriageTemplate.findMany({ orderBy: [{ code: 'asc' }], skip, take: pageSize })
  ]);
  return toPaged(items, total, page, pageSize);
}

export async function createCarriageTemplateRailwayAdmin(input: { code: string; type: 'SOFT_SEAT' | 'HARD_SEAT' | 'SLEEPER'; layout?: unknown }) {
  const layout = normalizeLayoutJson(input.layout);
  return prisma.carriageTemplate.create({
    data: { code: input.code.trim().toUpperCase(), type: input.type, layout: layout as never }
  });
}

export async function updateCarriageTemplateRailwayAdmin(id: string, input: { code?: string; type?: 'SOFT_SEAT' | 'HARD_SEAT' | 'SLEEPER'; layout?: unknown }) {
  return prisma.carriageTemplate.update({
    where: { id },
    data: {
      ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.layout !== undefined ? { layout: normalizeLayoutJson(input.layout) as never } : {})
    }
  });
}

export async function deleteCarriageTemplateRailwayAdmin(id: string) {
  await prisma.carriageTemplate.delete({ where: { id } });
  return { success: true };
}

export async function createTripWithCarriagesRailwayAdmin(input: {
  trainId: string;
  originStationId: string;
  destinationStationId: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  carriages: Array<{ templateId: string; code: string; orderIndex: number; basePrice: number }>;
}) {
  if (input.carriages.length === 0) {
    throw new AppError('Trip must include at least one carriage.', 400);
  }

  const templateIds = [...new Set(input.carriages.map((item) => item.templateId))];
  const templates = await prisma.carriageTemplate.findMany({ where: { id: { in: templateIds } } });
  const templateById = new Map(templates.map((t) => [t.id, t]));
  if (templates.length !== templateIds.length) {
    throw new AppError('Some carriage templates do not exist.', 404);
  }

  return prisma.$transaction(async (tx) => {
    const [originStation, destinationStation] = await Promise.all([
      tx.station.findUnique({ where: { id: input.originStationId } }),
      tx.station.findUnique({ where: { id: input.destinationStationId } })
    ]);
    if (!originStation || !destinationStation) {
      throw new AppError('Origin or destination station is invalid.', 404);
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
        price: new Decimal(input.price),
        status: 'ON_TIME'
      }
    });

    const createdCarriages = await Promise.all(input.carriages.map((carriage) => {
      const template = templateById.get(carriage.templateId)!;
      const normalizedLayout = normalizeLayoutJson(template.layout);
      return tx.tripCarriage.create({
        data: {
          tripId: trip.id,
          templateId: template.id,
          code: carriage.code.trim().toUpperCase(),
          orderIndex: carriage.orderIndex,
          basePrice: new Decimal(carriage.basePrice),
          layout: normalizedLayout as never
        }
      });
    }));

    const seatsPayload = createdCarriages.flatMap((carriage) => {
      const normalized = normalizeLayoutJson(carriage.layout);
      return normalized.seats.map((seat) => ({
        carriageId: carriage.id,
        seatNumber: seat.seatNumber,
        price: seat.price === null || seat.price === undefined ? null : new Decimal(seat.price),
        status: 'ACTIVE' as const
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

type TripCarriageUpdateInput = {
  templateId: string;
  code: string;
  orderIndex: number;
  basePrice: number;
};

type TripUpdateWithCarriagesInput = {
  trainId?: string;
  originStationId?: string;
  destinationStationId?: string;
  departureTime?: string;
  arrivalTime?: string;
  price?: number;
  status?: 'ON_TIME' | 'DELAYED' | 'CANCELLED';
  delayMinutes?: number;
  note?: string | null;
  carriages: TripCarriageUpdateInput[];
};

function buildTripCarriageSeats(tripCarriage: { id: string; code: string; layout: unknown }, templateLayout: unknown) {
  const normalized = normalizeLayoutJson(templateLayout ?? tripCarriage.layout);

  return normalized.seats.map((seat) => ({
    carriageId: tripCarriage.id,
    seatNumber: seat.seatNumber,
    price: seat.price === null || seat.price === undefined ? null : new Decimal(seat.price),
    status: 'ACTIVE' as const
  }));
}

async function loadTripCarriageTemplates(tx: Prisma.TransactionClient, templateIds: string[]) {
  const templates = await tx.carriageTemplate.findMany({ where: { id: { in: templateIds } } });
  if (templates.length !== templateIds.length) {
    throw new AppError('Some carriage templates do not exist.', 404);
  }

  return new Map(templates.map((template) => [template.id, template]));
}

export async function updateTripWithCarriagesRailwayAdmin(tripId: string, input: TripUpdateWithCarriagesInput) {
  if (input.carriages.length === 0) {
    throw new AppError('Trip must include at least one carriage.', 400);
  }

  const carriageOrderIndexes = input.carriages.map((item) => item.orderIndex);
  if (new Set(carriageOrderIndexes).size !== carriageOrderIndexes.length) {
    throw new AppError('Carriage order indexes must be unique.', 400);
  }

  const templateIds = [...new Set(input.carriages.map((item) => item.templateId))];

  return prisma.$transaction(async (tx) => {
    const [trip, templateById] = await Promise.all([
      tx.trip.findUnique({
        where: { id: tripId },
        include: {
          tripCarriages: {
            orderBy: { orderIndex: 'asc' },
            include: {
              seats: {
                include: {
                  bookingSeats: true
                },
                orderBy: { seatNumber: 'asc' }
              },
              template: true
            }
          }
        }
      }),
      loadTripCarriageTemplates(tx, templateIds)
    ]);

    if (!trip) {
      throw new AppError('Trip not found.', 404);
    }

    const [train, originStation, destinationStation] = await Promise.all([
      input.trainId !== undefined ? tx.train.findUnique({ where: { id: input.trainId } }) : Promise.resolve(null),
      input.originStationId !== undefined ? tx.station.findUnique({ where: { id: input.originStationId } }) : Promise.resolve(null),
      input.destinationStationId !== undefined ? tx.station.findUnique({ where: { id: input.destinationStationId } }) : Promise.resolve(null)
    ]);

    if (input.trainId !== undefined && !train) {
      throw new AppError('Tàu không tồn tại.', 404);
    }
    if (input.originStationId !== undefined && !originStation) {
      throw new AppError('Ga đi không tồn tại.', 404);
    }
    if (input.destinationStationId !== undefined && !destinationStation) {
      throw new AppError('Ga đến không tồn tại.', 404);
    }

    const tripData: Record<string, unknown> = {};
    if (input.trainId !== undefined) tripData.trainId = input.trainId;
    if (input.originStationId !== undefined) {
      tripData.originStationId = originStation!.id;
      tripData.origin = originStation!.name;
    }
    if (input.destinationStationId !== undefined) {
      tripData.destinationStationId = destinationStation!.id;
      tripData.destination = destinationStation!.name;
    }
    if (input.departureTime !== undefined) tripData.departureTime = new Date(input.departureTime);
    if (input.arrivalTime !== undefined) tripData.arrivalTime = new Date(input.arrivalTime);
    if (input.price !== undefined) tripData.price = new Decimal(input.price);
    if (input.status !== undefined) tripData.status = input.status;
    if (input.delayMinutes !== undefined) tripData.delayMinutes = input.delayMinutes;
    if (input.note !== undefined) tripData.note = input.note;

    const existingByOrderIndex = new Map(trip.tripCarriages.map((carriage) => [carriage.orderIndex, carriage]));
    const inputOrderIndexes = new Set(input.carriages.map((item) => item.orderIndex));

    for (const existingCarriage of trip.tripCarriages) {
      if (inputOrderIndexes.has(existingCarriage.orderIndex)) {
        continue;
      }

      const hasBookings = existingCarriage.seats.some((seat) => seat.bookingSeats.length > 0);
      if (hasBookings) {
        throw new AppError('Không thể xóa toa đã có đặt chỗ.', 409);
      }
    }

    const updatedTrip = await tx.trip.update({
      where: { id: tripId },
      data: tripData,
      include: {
        train: true,
        originStation: true,
        destinationStation: true
      }
    });

    for (const carriageInput of input.carriages) {
      const template = templateById.get(carriageInput.templateId);
      if (!template) {
        throw new AppError('Some carriage templates do not exist.', 404);
      }

      const existingCarriage = existingByOrderIndex.get(carriageInput.orderIndex);
      if (!existingCarriage) {
        const normalizedLayout = normalizeLayoutJson(template.layout);
        const createdCarriage = await tx.tripCarriage.create({
          data: {
            tripId: updatedTrip.id,
            templateId: template.id,
            code: carriageInput.code.trim().toUpperCase(),
            orderIndex: carriageInput.orderIndex,
            basePrice: new Decimal(carriageInput.basePrice),
            layout: normalizedLayout as never
          }
        });

        const seatsPayload = buildTripCarriageSeats(createdCarriage, normalizedLayout);
        if (seatsPayload.length > 0) {
          await tx.tripSeat.createMany({ data: seatsPayload });
        }

        continue;
      }

      const hasBookings = existingCarriage.seats.some((seat) => seat.bookingSeats.length > 0);
      if (hasBookings) {
        await tx.tripCarriage.update({
          where: { id: existingCarriage.id },
          data: {
            code: carriageInput.code.trim().toUpperCase(),
            basePrice: new Decimal(carriageInput.basePrice)
          }
        });
        continue;
      }

      await tx.tripSeat.deleteMany({ where: { carriageId: existingCarriage.id } });

      const updatedCarriage = await tx.tripCarriage.update({
        where: { id: existingCarriage.id },
        data: {
          templateId: template.id,
          code: carriageInput.code.trim().toUpperCase(),
          orderIndex: carriageInput.orderIndex,
          basePrice: new Decimal(carriageInput.basePrice),
          layout: normalizeLayoutJson(template.layout) as never
        }
      });

      const seatsPayload = buildTripCarriageSeats(updatedCarriage, template.layout);
      if (seatsPayload.length > 0) {
        await tx.tripSeat.createMany({ data: seatsPayload });
      }
    }

    return tx.trip.findUniqueOrThrow({
      where: { id: updatedTrip.id },
      include: {
        train: true,
        originStation: true,
        destinationStation: true,
        tripCarriages: {
          orderBy: { orderIndex: 'asc' },
          include: {
            template: true,
            seats: {
              orderBy: { seatNumber: 'asc' },
              include: {
                bookingSeats: true
              }
            }
          }
        }
      }
    });
  });
}
