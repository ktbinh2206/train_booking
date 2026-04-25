import { formatDateTimeVnShort } from '../lib/dates';

export type NotificationMessageType =
  | 'HOLD_EXPIRE'
  | 'REMINDER_BEFORE_DEPARTURE'
  | 'PAYMENT_SUCCESS'
  | 'CANCELLED'
  | 'DELAY'
  | 'GENERAL';

export type NotificationMessageBooking = {
  code: string;
  holdExpiresAt?: Date | null;
  seatCodes?: string[];
  trip?: {
    origin: string;
    destination: string;
    departureTime: Date;
  } | null;
};

function stringifyRoute(booking: NotificationMessageBooking) {
  if (!booking.trip) {
    return '';
  }

  return `${booking.trip.origin} → ${booking.trip.destination}`;
}

function stringifyDeparture(booking: NotificationMessageBooking) {
  if (!booking.trip?.departureTime) {
    return '';
  }

  return formatDateTimeVnShort(booking.trip.departureTime);
}

export function buildNotificationMessage(type: NotificationMessageType, booking: NotificationMessageBooking) {
  switch (type) {
    case 'HOLD_EXPIRE': {
      const expiresAt = booking.holdExpiresAt ?? booking.trip?.departureTime ?? new Date();
      return `Đặt chỗ ${booking.code} sẽ hết hạn lúc ${formatDateTimeVnShort(expiresAt)}`;
    }

    case 'REMINDER_BEFORE_DEPARTURE': {
      return `Chuyến ${stringifyRoute(booking)} (${booking.code}) sẽ khởi hành lúc ${stringifyDeparture(booking)}`;
    }

    case 'PAYMENT_SUCCESS': {
      const seatCodes = booking.seatCodes ?? [];
      const seatCount = seatCodes.length;
      const seatText = seatCount > 0 ? ` - ${seatCount} ghế (${seatCodes.join(', ')})` : '';
      const routeText = booking.trip ? ` - ${stringifyRoute(booking)} lúc ${stringifyDeparture(booking)}` : '';
      return `Thanh toán thành công đơn ${booking.code}${seatText}${routeText}`;
    }

    case 'CANCELLED': {
      const routeText = booking.trip ? ` (${stringifyRoute(booking)} lúc ${stringifyDeparture(booking)})` : '';
      return `Đơn ${booking.code} đã được hủy${routeText}`;
    }

    case 'DELAY': {
      const routeText = booking.trip ? stringifyRoute(booking) : 'chuyến tàu';
      return `Chuyến ${routeText} (${booking.code}) có thay đổi giờ khởi hành`;
    }

    default:
      return 'Thông báo';
  }
}

export function normalizeNotificationMessageType(type: string): NotificationMessageType {
  if (type === 'HOLD_EXPIRE') return 'HOLD_EXPIRE';
  if (type === 'REMINDER_BEFORE_DEPARTURE') return 'REMINDER_BEFORE_DEPARTURE';
  if (type === 'PAYMENT_SUCCESS' || type === 'REMINDER') return 'PAYMENT_SUCCESS';
  if (type === 'CANCELLED' || type === 'CANCEL') return 'CANCELLED';
  if (type === 'DELAY') return 'DELAY';
  return 'GENERAL';
}

export function buildNotificationTitle(type: string) {
  const normalized = normalizeNotificationMessageType(type);
  if (normalized === 'HOLD_EXPIRE') return 'HOLD_EXPIRE';
  if (normalized === 'REMINDER_BEFORE_DEPARTURE') return 'REMINDER_BEFORE_DEPARTURE';
  if (normalized === 'PAYMENT_SUCCESS') return 'PAYMENT_SUCCESS';
  if (normalized === 'CANCELLED') return 'CANCELLED';
  if (normalized === 'DELAY') return 'DELAY';
  if (normalized === 'GENERAL') return 'GENERAL';
  return 'GENERAL';
}
