"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMinutes = addMinutes;
exports.startOfDay = startOfDay;
exports.endOfDay = endOfDay;
exports.formatIsoDateTime = formatIsoDateTime;
exports.toDateYmdInVn = toDateYmdInVn;
exports.parseVnDateInputToUtcRange = parseVnDateInputToUtcRange;
function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60_000);
}
const VN_OFFSET_MINUTES = 7 * 60;
function startOfDay(date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}
function endOfDay(date) {
    const copy = new Date(date);
    copy.setHours(23, 59, 59, 999);
    return copy;
}
function formatIsoDateTime(date) {
    return date.toISOString();
}
function toDateYmdInVn(date) {
    const shifted = new Date(date.getTime() + VN_OFFSET_MINUTES * 60_000);
    const year = shifted.getUTCFullYear();
    const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
    const day = String(shifted.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function parseVnDateInputToUtcRange(input) {
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
