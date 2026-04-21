export type TrainSeatCell = {
  seatId: string;
  seatNumber: string;
  price?: number | null;
};

export type TrainSeatGrid = Array<Array<TrainSeatCell | null>>;

export type TrainPreviewCarriage = {
  id?: string;
  code: string;
  type?: 'SOFT_SEAT' | 'HARD_SEAT' | 'SLEEPER';
  basePrice: number;
  layout: TrainSeatGrid;
};

export type TrainLayoutJson = {
  rows: number;
  cols: number;
  seats: Array<{
    seatId: string;
    seatNumber: string;
    row: number;
    col: number;
    price?: number | null;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function positiveInt(value: unknown, fallback: number) {
  const parsed = typeof value === 'string' ? Number(value) : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function rowLabel(index: number) {
  let value = index + 1;
  let label = '';

  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }

  return label;
}

export function seatNumberFromPosition(row: number, col: number) {
  return `${rowLabel(row)}${col + 1}`;
}

export function createEmptyTrainLayout(rows = 8, cols = 4): TrainSeatGrid {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
}

export function cloneTrainLayout(layout: TrainSeatGrid): TrainSeatGrid {
  return layout.map((row) => row.map((seat) => (seat ? { ...seat } : null)));
}

export function layoutJsonToTrainGrid(layoutJson: TrainLayoutJson | null | undefined): TrainSeatGrid {
  if (!layoutJson || !Array.isArray(layoutJson.seats)) {
    return createEmptyTrainLayout();
  }

  const rows = Math.max(1, layoutJson.rows || 1);
  const cols = Math.max(1, layoutJson.cols || 1);
  const next = createEmptyTrainLayout(rows, cols);

  layoutJson.seats.forEach((seat) => {
    if (seat.row >= 0 && seat.row < rows && seat.col >= 0 && seat.col < cols) {
      next[seat.row][seat.col] = {
        seatId: seat.seatId,
        seatNumber: seat.seatNumber,
        price: seat.price ?? null,
      };
    }
  });

  return next;
}

export function trainGridToLayoutJson(layout: TrainSeatGrid): TrainLayoutJson {
  const seats: TrainLayoutJson['seats'] = [];

  layout.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (!cell) {
        return;
      }

      seats.push({
        seatId: cell.seatId,
        seatNumber: cell.seatNumber,
        row: rowIndex,
        col: colIndex,
        price: cell.price ?? null,
      });
    });
  });

  return {
    rows: layout.length,
    cols: layout[0]?.length ?? 0,
    seats,
  };
}

export function resizeTrainLayout(layout: TrainSeatGrid, rows: number, cols: number): TrainSeatGrid {
  const next = Array.from({ length: rows }, (_, rowIndex) =>
    Array.from({ length: cols }, (_, colIndex) => layout[rowIndex]?.[colIndex] ?? null),
  );

  return next;
}

export function toggleTrainSeat(layout: TrainSeatGrid, row: number, col: number): TrainSeatGrid {
  const next = cloneTrainLayout(layout);
  const current = next[row]?.[col] ?? null;

  if (current) {
    next[row][col] = null;
    return next;
  }

  next[row][col] = {
    seatId: `seat_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    seatNumber: seatNumberFromPosition(row, col),
    price: null,
  };

  return next;
}

export function normalizeTrainLayout(value: unknown, fallbackRows = 8, fallbackCols = 4): TrainSeatGrid {
  if (!Array.isArray(value)) {
    return createEmptyTrainLayout(fallbackRows, fallbackCols);
  }

  const rows = positiveInt(value.length, fallbackRows);
  const colsSource = Array.isArray(value[0]) ? value[0] : [];
  const cols = positiveInt(colsSource.length, fallbackCols);

  return Array.from({ length: rows }, (_, rowIndex) =>
    Array.from({ length: cols }, (_, colIndex) => {
      const cell = value[rowIndex]?.[colIndex];
      if (!isRecord(cell)) {
        return null;
      }

      const seatId = typeof cell.seatId === 'string' && cell.seatId.trim() ? cell.seatId.trim() : `seat_${rowIndex}_${colIndex}`;
      const seatNumber = typeof cell.seatNumber === 'string' && cell.seatNumber.trim()
        ? cell.seatNumber.trim().toUpperCase()
        : seatNumberFromPosition(rowIndex, colIndex);

      return {
        seatId,
        seatNumber,
        price: typeof cell.price === 'number' ? cell.price : cell.price === null || cell.price === undefined || cell.price === '' ? null : Number(cell.price),
      };
    }),
  );
}

export function flattenLayoutSeats(layout: TrainSeatGrid) {
  const seats: Array<{ seatId: string; code: string; orderIndex: number; price: number | null }> = [];
  let orderIndex = 1;

  layout.forEach((row) => {
    row.forEach((cell) => {
      if (cell) {
        seats.push({
          seatId: cell.seatId,
          code: cell.seatNumber,
          orderIndex,
          price: cell.price ?? null,
        });
      }
      orderIndex += 1;
    });
  });

  return seats;
}

export function layoutSeatCount(layout: TrainSeatGrid) {
  return layout.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
}

export function gridMaxDimensions(layout: TrainSeatGrid) {
  return {
    rows: layout.length,
    cols: layout[0]?.length ?? 0,
  };
}

export function isSeatCell(value: unknown): value is TrainSeatCell {
  return isRecord(value) && typeof value.seatId === 'string' && typeof value.seatNumber === 'string';
}
