"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHoldActive = isHoldActive;
exports.isBookingUsable = isBookingUsable;
exports.isTripActive = isTripActive;
const client_1 = require("@prisma/client");
function isHoldActive(status, holdExpiresAt, now) {
    if (status !== client_1.BookingStatus.HOLDING) {
        return false;
    }
    return holdExpiresAt !== null && holdExpiresAt.getTime() > now.getTime();
}
function isBookingUsable(status, holdExpiresAt, now) {
    if (status === client_1.BookingStatus.PAID) {
        return true;
    }
    return isHoldActive(status, holdExpiresAt, now);
}
function isTripActive(status) {
    return status !== client_1.TripStatus.CANCELLED;
}
