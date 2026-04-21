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

export function rowLabelFromIndex(index: number) {
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
  return `${rowLabelFromIndex(row)}${col + 1}`;
}

export function createSeatId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `seat_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function createEmptyTrainLayout(rows = 8, cols = 4): TrainLayoutJson {
  return {
    rows,
    cols,
    seats: []
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = typeof value === 'string' ? Number(value) : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function normalizeSeat(seat: unknown, fallbackIndex: number): TrainLayoutSeat | null {
  if (!isRecord(seat)) {
    return null;
  }

  const row = toPositiveInteger(seat.row, fallbackIndex + 1) - 1;
  const col = toPositiveInteger(seat.col, 1) - 1;
  const seatNumber = typeof seat.seatNumber === 'string' && seat.seatNumber.trim()
    ? seat.seatNumber.trim().toUpperCase()
    : seatNumberFromPosition(row, col);

  return {
    seatId: typeof seat.seatId === 'string' && seat.seatId.trim() ? seat.seatId.trim() : createSeatId(),
    seatNumber,
    row,
    col,
    price: seat.price === undefined || seat.price === null || seat.price === ''
      ? null
      : Number(seat.price)
  };
}

export function normalizeTrainLayoutJson(value: unknown, fallbackRows = 8, fallbackCols = 4): TrainLayoutJson {
  if (!isRecord(value)) {
    return createEmptyTrainLayout(fallbackRows, fallbackCols);
  }

  const rows = toPositiveInteger(value.rows, fallbackRows);
  const cols = toPositiveInteger(value.cols, fallbackCols);
  const rawSeats: unknown[] = Array.isArray(value.seats) ? value.seats : Array.isArray(value.cells)
    ? value.cells
    : [];

  const seats = rawSeats
    .map((seat, index) => normalizeSeat(seat, index))
    .filter((seat): seat is TrainLayoutSeat => seat !== null)
    .sort((left, right) => left.row - right.row || left.col - right.col || left.seatNumber.localeCompare(right.seatNumber));

  return {
    rows,
    cols,
    seats
  };
}

export function cloneTrainLayout(layout: TrainLayoutJson): TrainLayoutJson {
  return {
    rows: layout.rows,
    cols: layout.cols,
    seats: layout.seats.map((seat) => ({ ...seat }))
  };
}

export function createGridFromLayout(layout: TrainLayoutJson) {
  const grid = Array.from({ length: layout.rows }, () => Array.from({ length: layout.cols }, () => null as TrainLayoutSeat | null));

  layout.seats.forEach((seat) => {
    if (seat.row >= 0 && seat.row < layout.rows && seat.col >= 0 && seat.col < layout.cols) {
      grid[seat.row][seat.col] = { ...seat };
    }
  });

  return grid;
}

export function toggleLayoutSeat(layout: TrainLayoutJson, row: number, col: number): TrainLayoutJson {
  const next = cloneTrainLayout(layout);
  const index = next.seats.findIndex((seat) => seat.row === row && seat.col === col);

  if (index >= 0) {
    next.seats.splice(index, 1);
    return next;
  }

  next.seats.push({
    seatId: createSeatId(),
    seatNumber: seatNumberFromPosition(row, col),
    row,
    col,
    price: null
  });
  next.seats.sort((left, right) => left.row - right.row || left.col - right.col);
  return next;
}

export function updateLayoutSeatPrice(layout: TrainLayoutJson, row: number, col: number, price: number | null) {
  const next = cloneTrainLayout(layout);
  const seat = next.seats.find((item) => item.row === row && item.col === col);

  if (seat) {
    seat.price = price;
  }

  return next;
}
