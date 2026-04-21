"use strict";
/**
 * Timezone helper cho Vietnam (UTC+7)
 * Xử lý chuyển đổi giữa UTC và Vietnam local time
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTodayInVN = getTodayInVN;
exports.getStartOfDayUTC7 = getStartOfDayUTC7;
exports.getEndOfDayUTC7 = getEndOfDayUTC7;
exports.toVNDateString = toVNDateString;
exports.toVNTimeString = toVNTimeString;
exports.isValidDateString = isValidDateString;
const VN_OFFSET_MINUTES = 7 * 60; // UTC+7
/**
 * Lấy ngày hiện tại theo giờ Vietnam (UTC+7)
 * Trả về object Date tương ứng với ngày hôm nay theo giờ VN
 */
function getTodayInVN() {
    const now = new Date();
    const vnNow = new Date(now.getTime() + VN_OFFSET_MINUTES * 60_000);
    // Reset thành đầu ngày UTC tương ứng với ngày VN
    const year = vnNow.getUTCFullYear();
    const month = vnNow.getUTCMonth();
    const date = vnNow.getUTCDate();
    return new Date(Date.UTC(year, month, date, 0, 0, 0, 0) - VN_OFFSET_MINUTES * 60_000);
}
/**
 * Lấy start of day (00:00:00) theo UTC+7 cho một ngày nhất định
 * @param dateStr Format YYYY-MM-DD (VN date)
 */
function getStartOfDayUTC7(dateStr) {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
        throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD`);
    }
    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = Number.parseInt(match[3], 10);
    // Tạo UTC time, trừ đi offset để được UTC+7 equivalence
    const utcTime = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    return new Date(utcTime.getTime() - VN_OFFSET_MINUTES * 60_000);
}
/**
 * Lấy end of day (23:59:59.999) theo UTC+7 cho một ngày nhất định
 * @param dateStr Format YYYY-MM-DD (VN date)
 */
function getEndOfDayUTC7(dateStr) {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
        throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD`);
    }
    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = Number.parseInt(match[3], 10);
    const utcTime = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    return new Date(utcTime.getTime() - VN_OFFSET_MINUTES * 60_000);
}
/**
 * Chuyển đổi UTC Date sang định dạng YYYY-MM-DD theo Vietnam time (UTC+7)
 */
function toVNDateString(utcDate) {
    const shifted = new Date(utcDate.getTime() + VN_OFFSET_MINUTES * 60_000);
    const year = shifted.getUTCFullYear();
    const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
    const day = String(shifted.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
/**
 * Chuyển đổi UTC Date sang định dạng HH:mm theo Vietnam time (UTC+7)
 */
function toVNTimeString(utcDate) {
    const shifted = new Date(utcDate.getTime() + VN_OFFSET_MINUTES * 60_000);
    const hours = String(shifted.getUTCHours()).padStart(2, '0');
    const minutes = String(shifted.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}
/**
 * Validate date string format YYYY-MM-DD
 */
function isValidDateString(dateStr) {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match)
        return false;
    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = Number.parseInt(match[3], 10);
    if (month < 1 || month > 12)
        return false;
    if (day < 1 || day > 31)
        return false;
    return true;
}
