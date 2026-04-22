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
  cells: Array<Array<TrainLayoutSeat | null>>;
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

function rowIndexFromLabel(label: string) {
  let value = 0;
  for (const char of label.toUpperCase()) {
    value = value * 26 + (char.charCodeAt(0) - 64);
  }

  return Math.max(0, value - 1);
}

function seatPositionFromCode(code: string) {
  const match = code.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    return null;
  }

  const row = rowIndexFromLabel(match[1]);
  const col = Number.parseInt(match[2], 10) - 1;
  if (!Number.isFinite(col) || col < 0) {
    return null;
  }

  return { row, col };
}

function seatIdFromTrainCode(trainCode: string, carriageCode: string, seatCode: string) {
  return `${trainCode.trim().toUpperCase()}_${carriageCode.trim().toUpperCase()}_${seatCode.trim().toUpperCase()}`;
}

function dedupeSeatInputs(seats: Array<{ code: string; price?: number | null }>) {
  const byCode = new Map<string, { code: string; price?: number | null }>();

  seats.forEach((seat) => {
    const code = seat.code.trim().toUpperCase();
    if (!code || byCode.has(code)) {
      return;
    }

    byCode.set(code, {
      code,
      price: seat.price ?? null
    });
  });

  return Array.from(byCode.values());
}

function createSeatId() {
  return `seat_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function inferOneBasedPositions(rawSeats: unknown[]) {
  const numericPositions = rawSeats
    .filter(isRecord)
    .flatMap((seat) => [seat.row, seat.col])
    .map((value) => (typeof value === 'string' ? Number(value) : Number(value)))
    .filter((value) => Number.isFinite(value));

  if (numericPositions.length === 0) {
    return false;
  }

  const hasZero = numericPositions.some((value) => value === 0);
  if (hasZero) {
    return false;
  }

  return numericPositions.every((value) => value >= 1);
}

function normalizeAxisIndex(value: unknown, fallback: number, oneBased: boolean, maxExclusive: number) {
  const parsed = typeof value === 'string' ? Number(value) : Number(value);
  if (!Number.isFinite(parsed)) {
    return Math.min(maxExclusive - 1, Math.max(0, fallback));
  }

  const integer = Math.floor(parsed);
  const zeroBased = oneBased ? integer - 1 : integer;
  return Math.min(maxExclusive - 1, Math.max(0, zeroBased));
}

function buildLayoutCells(rows: number, cols: number, seats: TrainLayoutSeat[]) {
  const cells: Array<Array<TrainLayoutSeat | null>> = Array.from(
    { length: rows },
    () => Array.from({ length: cols }, () => null)
  );

  seats.forEach((seat) => {
    if (seat.row >= 0 && seat.row < rows && seat.col >= 0 && seat.col < cols) {
      cells[seat.row][seat.col] = seat;
    }
  });

  return cells;
}

export function normalizeLayoutJson(value: unknown, fallbackRows = 8, fallbackCols = 4): TrainLayoutJson {
  if (!isRecord(value)) {
    return {
      rows: fallbackRows,
      cols: fallbackCols,
      seats: [],
      cells: Array.from({ length: fallbackRows }, () => Array.from({ length: fallbackCols }, () => null))
    };
  }

  const rows = toPositiveInteger(value.rows, fallbackRows);
  const cols = toPositiveInteger(value.cols, fallbackCols);

  const rawSeatsFromCells = Array.isArray(value.cells)
    ? value.cells.flatMap((rowValue, rowIndex) => {
      if (!Array.isArray(rowValue)) {
        return [];
      }

      return rowValue
        .map((cell, colIndex) => {
          if (!isRecord(cell)) {
            return null;
          }

          return {
            ...cell,
            row: cell.row ?? rowIndex,
            col: cell.col ?? colIndex
          };
        })
        .filter((cell) => cell !== null) as Array<Record<string, unknown>>;
    })
    : [];

  const rawSeats = Array.isArray(value.seats) && value.seats.length > 0 ? value.seats : rawSeatsFromCells;
  const oneBased = inferOneBasedPositions(rawSeats);

  const seats = rawSeats
    .map((seat, index) => {
      if (!isRecord(seat)) {
        return null;
      }

      const row = normalizeAxisIndex(seat.row, Math.floor(index / Math.max(cols, 1)), oneBased, rows);
      const col = normalizeAxisIndex(seat.col, index % Math.max(cols, 1), oneBased, cols);
      const seatNumber = typeof seat.seatNumber === 'string' && seat.seatNumber.trim()
        ? seat.seatNumber.trim().toUpperCase()
        : seatNumberFromPosition(row, col);

      return {
        seatId: typeof seat.seatId === 'string' && seat.seatId.trim() ? seat.seatId.trim() : createSeatId(),
        seatNumber,
        row,
        col,
        price: seat.price === undefined || seat.price === null || seat.price === '' ? null : Number(seat.price)
      };
    })
    .filter((seat): seat is NonNullable<typeof seat> => seat !== null)
    .sort((left, right) => left.row - right.row || left.col - right.col || left.seatNumber.localeCompare(right.seatNumber));

  return {
    rows,
    cols,
    seats,
    cells: buildLayoutCells(rows, cols, seats)
  };
}

export function createLayoutFromSeats(seats: Array<{ id: string; code: string; price: Decimal | null }>) {
  const layoutSeats = seats
    .map((seat, index) => {
      const parsedPosition = seatPositionFromCode(seat.code);
      const row = parsedPosition?.row ?? Math.max(0, Math.floor(index / 4));
      const col = parsedPosition?.col ?? Math.max(0, index % 4);

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
    seats: layoutSeats,
    cells: buildLayoutCells(Math.max(1, maxRow + 1), Math.max(1, maxCol + 1), layoutSeats)
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

export async function saveCarriageLayoutAdmin(carriageId: string, layout: unknown) {
  const carriage = await prisma.carriage.findUnique({ where: { id: carriageId } });
  if (!carriage) {
    throw new AppError('Không tìm thấy toa.', 404);
  }

  const normalized = normalizeLayoutJson(layout);

  return prisma.carriage.update({
    where: { id: carriageId },
    data: { layout: normalized as never },
    include: {
      train: true,
      seats: {
        orderBy: {
          code: 'asc'
        }
      }
    }
  });
}

export async function syncCarriageSeatsAdmin(carriageId: string, layout: unknown) {
  const carriage = await prisma.carriage.findUnique({
    where: { id: carriageId },
    include: {
      train: true,
      seats: {
        include: {
          bookingSeats: true
        },
        orderBy: {
          code: 'asc'
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

  const normalized = normalizeLayoutJson(layout);
  const uniqueSeats = dedupeSeatInputs(
    normalized.seats.map((seat) => ({
      code: seat.seatNumber,
      price: seat.price ?? null
    }))
  );

  return prisma.$transaction(async (tx) => {
    await tx.seat.deleteMany({ where: { carriageId } });

    if (uniqueSeats.length > 0) {
      await tx.seat.createMany({
        data: uniqueSeats.map((seat) => ({
          id: seatIdFromTrainCode(carriage.train.code, carriage.code, seat.code),
          carriageId,
          code: seat.code,
          status: 'ACTIVE',
          price: seat.price === null || seat.price === undefined ? null : new Decimal(seat.price)
        })),
        skipDuplicates: true
      });
    }

    return tx.carriage.update({
      where: { id: carriageId },
      data: { layout: normalized as never },
      include: {
        train: true,
        seats: {
          orderBy: {
            code: 'asc'
          }
        }
      }
    });
  });
}

export async function bulkSyncCarriageSeatsAdmin(
  carriageId: string,
  seats: Array<{ code: string; price?: number | null }>,
  layout?: unknown
) {
  const carriage = await prisma.carriage.findUnique({
    where: { id: carriageId },
    include: {
      train: true,
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

  const normalizedSeats = dedupeSeatInputs(seats);

  return prisma.$transaction(async (tx) => {
    await tx.seat.deleteMany({ where: { carriageId } });

    if (normalizedSeats.length > 0) {
      await tx.seat.createMany({
        data: normalizedSeats.map((seat) => ({
          id: seatIdFromTrainCode(carriage.train.code, carriage.code, seat.code),
          carriageId,
          code: seat.code,
          status: 'ACTIVE',
          price: seat.price === undefined || seat.price === null ? null : new Decimal(seat.price)
        })),
        skipDuplicates: true
      });
    }

    return tx.carriage.update({
      where: { id: carriageId },
      data: layout === undefined ? {} : { layout: normalizeLayoutJson(layout) as never },
      include: {
        train: true,
        seats: {
          orderBy: {
            code: 'asc'
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
          code: 'asc'
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
  const layout = carriage.layout ? normalizeLayoutJson(carriage.layout) : createLayoutFromSeats(carriage.seats);

  return prisma.$transaction(async (tx) => {
    const created = await tx.carriage.create({
      data: {
        trainId: carriage.trainId,
        code: duplicatedCode,
        orderIndex: nextOrderIndex + 1,
        type: carriage.type,
        basePrice: carriage.basePrice,
        layout: layout as never
      }
    });

    if (layout.seats.length > 0) {
      const uniqueSeats = dedupeSeatInputs(
        layout.seats.map((seat) => ({
          code: seat.seatNumber,
          price: seat.price ?? null
        }))
      );

      await tx.seat.createMany({
        data: uniqueSeats.map((seat) => ({
          id: seatIdFromTrainCode(carriage.train.code, duplicatedCode, seat.code),
          carriageId: created.id,
          code: seat.code,
          status: 'ACTIVE',
          price: seat.price === null || seat.price === undefined ? null : new Decimal(seat.price)
        })),
        skipDuplicates: true
      });
    }

    return tx.carriage.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        train: true,
        seats: {
          orderBy: {
            code: 'asc'
          }
        }
      }
    });
  });
}
