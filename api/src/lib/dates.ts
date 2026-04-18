export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

const VN_OFFSET_MINUTES = 7 * 60;

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function formatIsoDateTime(date: Date): string {
  return date.toISOString();
}

export function toDateYmdInVn(date: Date): string {
  const shifted = new Date(date.getTime() + VN_OFFSET_MINUTES * 60_000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseVnDateInputToUtcRange(input: string): { start: Date; end: Date } | null {
  const text = input.trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  const utcStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - VN_OFFSET_MINUTES * 60_000);
  const utcEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - VN_OFFSET_MINUTES * 60_000);

  if (Number.isNaN(utcStart.getTime()) || Number.isNaN(utcEnd.getTime())) {
    return null;
  }

  return { start: utcStart, end: utcEnd };
}