import { BookingStatus, TripStatus } from '@prisma/client';

export function isHoldActive(status: BookingStatus, holdExpiresAt: Date | null, now: Date): boolean {
  if (status !== BookingStatus.HOLDING) {
    return false;
  }

  return holdExpiresAt !== null && holdExpiresAt.getTime() > now.getTime();
}

export function isBookingUsable(status: BookingStatus, holdExpiresAt: Date | null, now: Date): boolean {
  if (status === BookingStatus.PAID) {
    return true;
  }

  return isHoldActive(status, holdExpiresAt, now);
}

export function isTripActive(status: TripStatus): boolean {
  return status !== TripStatus.CANCELLED;
}