import Decimal from 'decimal.js';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

export type TrainLayoutSeat = {
  seatId: string;
  seatNumber: string;
  row: number;
  col: number;
  price?: number | null;
};

export type TrainLayoutJson = {
  rows: number;
  cols: number;
  seats: TrainLayoutSeat[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = typeof value === 'string' ? Number(value) : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function rowLabelFromIndex(index: number) {
  let value = index + 1;
  let label = '';

  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }

  return label;
}

function seatNumberFromPosition(row: number, col: number) {
  return `${rowLabelFromIndex(row)}${col + 1}`;
}

function createSeatId() {
  return `seat_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function normalizeLayoutJson(value: unknown, fallbackRows = 8, fallbackCols = 4): TrainLayoutJson {
  if (!isRecord(value)) {
    return {
      rows: fallbackRows,
      cols: fallbackCols,
      seats: []
    };
  }

  const rows = toPositiveInteger(value.rows, fallbackRows);
  const cols = toPositiveInteger(value.cols, fallbackCols);
  const rawSeats = Array.isArray(value.seats) ? value.seats : Array.isArray(value.cells) ? value.cells : [];

  const seats = rawSeats
    .map((seat, index) => {
      if (!isRecord(seat)) {
        return null;
      }

      const row = Math.max(0, toPositiveInteger(seat.row, index + 1) - 1);
      const col = Math.max(0, toPositiveInteger(seat.col, 1) - 1);
      const seatNumber = typeof seat.seatNumber === 'string' && seat.seatNumber.trim()
        ? seat.seatNumber.trim().toUpperCase()
        : seatNumberFromPosition(row, col);

      return {
        seatId: typeof seat.seatId === 'string' && seat.seatId.trim() ? seat.seatId.trim() : createSeatId(),
        seatNumber,
        row,
        col,
        price: seat.price === undefined || seat.price === null || seat.price === '' ? null : Number(seat.price)
      } satisfies TrainLayoutSeat;
    })
    .filter((seat): seat is TrainLayoutSeat => seat !== null)
    .sort((left, right) => left.row - right.row || left.col - right.col || left.seatNumber.localeCompare(right.seatNumber));

  return {
    rows,
    cols,
    seats
  };
}

export function createLayoutFromSeats(seats: Array<{ id: string; code: string; orderIndex: number; price: Decimal | null }>) {
  const layoutSeats = seats
    .map((seat) => {
      const orderIndex = Number(seat.orderIndex);
      const row = Math.max(0, Math.floor((orderIndex - 1) / 4));
      const col = Math.max(0, (orderIndex - 1) % 4);

      return {
        seatId: seat.id,
        seatNumber: seat.code,
        row,
        col,
        price: seat.price === null ? null : Number(seat.price.toString())
      } satisfies TrainLayoutSeat;
    })
    .sort((left, right) => left.row - right.row || left.col - right.col || left.seatNumber.localeCompare(right.seatNumber));

  const maxRow = layoutSeats.reduce((max, seat) => Math.max(max, seat.row), 0);
  const maxCol = layoutSeats.reduce((max, seat) => Math.max(max, seat.col), 0);

  return {
    rows: Math.max(1, maxRow + 1),
    cols: Math.max(1, maxCol + 1),
    seats: layoutSeats
  } satisfies TrainLayoutJson;
}

function getNextCarriageCode(existingCodes: string[], baseCode?: string) {
  if (baseCode && !existingCodes.includes(baseCode)) {
    return baseCode;
  }

  let suffix = 2;
  while (existingCodes.includes(`${baseCode ?? 'C'}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseCode ?? 'C'}-${suffix}`;
}

export async function saveCarriageLayoutAdmin(carriageId: string, layoutJson: unknown) {
  const carriage = await prisma.carriage.findUnique({ where: { id: carriageId } });
  if (!carriage) {
    throw new AppError('Không tìm thấy toa.', 404);
  }

  const normalized = normalizeLayoutJson(layoutJson);

  return prisma.carriage.update({
    where: { id: carriageId },
    data: {
      layoutJson: normalized as never
    },
    include: {
      train: true,
      seats: {
        orderBy: {
          orderIndex: 'asc'
        }
      }
    }
  });
}

export async function syncCarriageSeatsAdmin(carriageId: string, layoutJson: unknown) {
  const carriage = await prisma.carriage.findUnique({
    where: { id: carriageId },
    include: {
      train: true,
      seats: {
        include: {
          bookingSeats: true
        },
        orderBy: {
          orderIndex: 'asc'
        }
      }
    }
  });

  if (!carriage) {
    throw new AppError('Không tìm thấy toa.', 404);
  }

  const blockedSeat = carriage.seats.find((seat) => seat.bookingSeats.length > 0);
  if (blockedSeat) {
    throw new AppError('Không thể đồng bộ ghế vì toa đã có đặt chỗ. Hãy nhân bản toa trước khi chỉnh layout.', 409);
  }

  const normalized = normalizeLayoutJson(layoutJson);

  return prisma.$transaction(async (tx) => {
    await tx.seat.deleteMany({ where: { carriageId } });

    if (normalized.seats.length > 0) {
      await tx.seat.createMany({
        data: normalized.seats.map((seat, index) => ({
          carriageId,
          code: seat.seatNumber,
          orderIndex: index + 1,
          status: 'ACTIVE',
          price: seat.price === null || seat.price === undefined ? null : new Decimal(seat.price)
        }))
      });
    }

    const updated = await tx.carriage.update({
      where: { id: carriageId },
      data: {
        layoutJson: normalized as never
      },
      include: {
        train: true,
        seats: {
          orderBy: {
            orderIndex: 'asc'
          }
        }
      }
    });

    return updated;
  });
}

export async function bulkSyncCarriageSeatsAdmin(
  carriageId: string,
  seats: Array<{ code: string; orderIndex: number; price?: number | null }>,
  layoutJson?: unknown
) {
  const carriage = await prisma.carriage.findUnique({
    where: { id: carriageId },
    include: {
      seats: {
        include: {
          bookingSeats: true
        }
      }
    }
  });

  if (!carriage) {
    throw new AppError('Không tìm thấy toa.', 404);
  }

  const blockedSeat = carriage.seats.find((seat) => seat.bookingSeats.length > 0);
  if (blockedSeat) {
    throw new AppError('Không thể đồng bộ ghế vì toa đã có đặt chỗ. Hãy nhân bản toa trước khi chỉnh layout.', 409);
  }

  return prisma.$transaction(async (tx) => {
    await tx.seat.deleteMany({ where: { carriageId } });

    if (seats.length > 0) {
      await tx.seat.createMany({
        data: seats.map((seat) => ({
          carriageId,
          code: seat.code.trim().toUpperCase(),
          orderIndex: seat.orderIndex,
          status: 'ACTIVE',
          price: seat.price === undefined || seat.price === null ? null : new Decimal(seat.price)
        }))
      });
    }

    return tx.carriage.update({
      where: { id: carriageId },
      data: layoutJson === undefined ? {} : { layoutJson: normalizeLayoutJson(layoutJson) as never },
      include: {
        train: true,
        seats: {
          orderBy: {
            orderIndex: 'asc'
          }
        }
      }
    });
  });
}

export async function duplicateCarriageAdmin(carriageId: string, newCode?: string) {
  const carriage = await prisma.carriage.findUnique({
    where: { id: carriageId },
    include: {
      train: true,
      seats: {
        orderBy: {
          orderIndex: 'asc'
        }
      }
    }
  });

  if (!carriage) {
    throw new AppError('Không tìm thấy toa.', 404);
  }

  const existingCodes = await prisma.carriage.findMany({
    where: {
      trainId: carriage.trainId
    },
    select: {
      code: true
    }
  });

  const nextOrderIndex = (await prisma.carriage.aggregate({
    where: {
      trainId: carriage.trainId
    },
    _max: {
      orderIndex: true
    }
  }))._max.orderIndex ?? carriage.orderIndex;

  const duplicatedCode = getNextCarriageCode(existingCodes.map((item) => item.code), newCode?.trim().toUpperCase() || carriage.code);
  const layoutJson = carriage.layoutJson ? normalizeLayoutJson(carriage.layoutJson) : createLayoutFromSeats(carriage.seats);

  return prisma.$transaction(async (tx) => {
    const created = await tx.carriage.create({
      data: {
        trainId: carriage.trainId,
        code: duplicatedCode,
        orderIndex: nextOrderIndex + 1,
        type: carriage.type,
        basePrice: carriage.basePrice,
        layoutJson: layoutJson as never
      }
    });

    if (layoutJson.seats.length > 0) {
      await tx.seat.createMany({
        data: layoutJson.seats.map((seat, index) => ({
          carriageId: created.id,
          code: seat.seatNumber,
          orderIndex: index + 1,
          status: 'ACTIVE',
          price: seat.price === null || seat.price === undefined ? null : new Decimal(seat.price)
        }))
      });
    }

    return tx.carriage.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        train: true,
        seats: {
          orderBy: {
            orderIndex: 'asc'
          }
        }
      }
    });
  });
}
