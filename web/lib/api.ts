import { apiRequest } from '@/lib/api-client';
import { Carriage, Notification, Trip, User } from '@/lib/types';
import { toVnYmd } from '@/lib/utils';

type ApiTripSearchItem = {
  id: string;
  trainCode: string | null;
  trainName: string | null;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  status: 'ON_TIME' | 'DELAYED' | 'CANCELLED';
  delayMinutes: number;
  availableSeatCount: number;
  capacity: number;
};

type ApiTripSearchResponse = {
  items: ApiTripSearchItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type ApiTripDetail = {
  trip: {
    id: string;
    trainCode: string | null;
    trainName: string | null;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    price: number;
    status: 'ON_TIME' | 'DELAYED' | 'CANCELLED';
    delayMinutes: number;
  };
  carriages: Array<{
    id: string;
    code: string;
    orderIndex: number;
    seats: Array<{
      id: string;
      code: string;
      orderIndex: number;
      status: 'ACTIVE' | 'INACTIVE';
      available: boolean;
    }>;
  }>;
};

type ApiBooking = {
  id: string;
  code: string;
  status: 'HOLDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
  holdExpiresAt: string | null;
  totalAmount: number;
  contactEmail: string;
  seatCount: number;
  seatIds: string[];
  seatCodes: string[];
  user: {
    id: string;
    name: string;
    email: string;
    role: 'USER' | 'ADMIN';
  };
  trip: {
    id: string;
    trainCode: string | null;
    trainName: string | null;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    price: number;
    status: 'ON_TIME' | 'DELAYED' | 'CANCELLED';
  };
  payment: {
    id: string;
    status: 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';
    method: string;
    amount: number;
    transactionRef: string | null;
  } | null;
  ticket: {
    id: string;
    ticketNumber: string;
    qrDataUrl: string;
    eTicketUrl: string | null;
    issuedAt: string;
    invoiceNumber: string | null;
  } | null;
};

type ApiTicket = {
  id: string;
  ticketNumber: string;
  qrToken: string;
  qrDataUrl: string;
  eTicketUrl: string | null;
  issuedAt: string;
  invoiceNumber: string | null;
  booking: {
    id: string;
    code: string;
    status: string;
    totalAmount: number;
    seats: string[];
    trip: {
      origin: string;
      destination: string;
      departureTime: string;
      arrivalTime: string;
      trainCode: string;
    };
  };
};

type ApiMetaDemo = {
  defaultUserId: string | null;
  adminUserId: string | null;
};

type ApiAuthPayload = {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'USER' | 'ADMIN';
  };
};

type ApiUserMe = {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  bookingCount: number;
  ticketCount: number;
  createdAt: string;
};

type ApiNotification = {
  id: string;
  userId: string;
  type: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

function formatTime(inputIso: string) {
  return new Date(inputIso).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function mapTripStatus(status: 'ON_TIME' | 'DELAYED' | 'CANCELLED'): Trip['status'] {
  if (status === 'DELAYED') return 'delayed';
  if (status === 'CANCELLED') return 'cancelled';
  return 'scheduled';
}

function parseSeatPosition(code: string, orderIndex: number) {
  const match = code.match(/([A-Za-z]+)(\d+)$/);
  if (match) {
    const letters = match[1].toUpperCase();
    const row = Number.parseInt(match[2], 10);
    const column = letters.charCodeAt(letters.length - 1) - 64;
    if (Number.isFinite(row) && Number.isFinite(column) && row > 0 && column > 0) {
      return { row, column };
    }
  }

  const row = Math.floor((orderIndex - 1) / 6) + 1;
  const column = ((orderIndex - 1) % 6) + 1;
  return { row, column };
}

function toUiTrip(raw: ApiTripSearchItem): Trip {
  const departure = new Date(raw.departureTime);
  const arrival = new Date(raw.arrivalTime);
  const durationMinutes = Math.max(0, Math.round((arrival.getTime() - departure.getTime()) / 60000));
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  return {
    id: raw.id,
    source: raw.origin,
    destination: raw.destination,
    departureTime: formatTime(raw.departureTime),
    arrivalTime: formatTime(raw.arrivalTime),
    duration: `${hours}h ${minutes}m`,
    distance: '-',
    basePrice: raw.price,
    availableSeats: raw.availableSeatCount,
    totalSeats: raw.capacity,
    status: mapTripStatus(raw.status),
    date: toVnYmd(departure),
    trainNumber: raw.trainCode ?? '-',
    trainName: raw.trainName ?? 'Tàu chưa xác định'
  };
}

export async function login(input: { email: string; password: string }) {
  return apiRequest<ApiAuthPayload>('/api/auth/login', {
    method: 'POST',
    body: input
  });
}

export async function register(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}) {
  return apiRequest<ApiAuthPayload>('/api/auth/register', {
    method: 'POST',
    body: input
  });
}

export async function getAuthMe() {
  return apiRequest<ApiUserMe>('/api/auth/me');
}

export async function getDemoMeta() {
  return apiRequest<ApiMetaDemo>('/api/meta/demo');
}

export async function searchTrips(params: {
  origin?: string;
  destination?: string;
  date?: string;
  page?: number;
  pageSize?: number;
}) {
  const data = await apiRequest<ApiTripSearchResponse>('/api/trips/search', { params });
  return {
    items: data.items.map(toUiTrip),
    page: data.page,
    pageSize: data.pageSize,
    total: data.total,
    totalPages: data.totalPages
  };
}

export async function listStations(query?: string) {
  const data = await apiRequest<{ items: string[] }>('/api/trips/stations', {
    params: {
      q: query?.trim() || undefined
    }
  });

  return data.items;
}

export async function getTripDetail(tripId: string) {
  const data = await apiRequest<ApiTripDetail>(`/api/trips/${tripId}`);
  return {
    trip: toUiTrip({
      id: data.trip.id,
      trainCode: data.trip.trainCode,
      trainName: data.trip.trainName,
      origin: data.trip.origin,
      destination: data.trip.destination,
      departureTime: data.trip.departureTime,
      arrivalTime: data.trip.arrivalTime,
      price: data.trip.price,
      status: data.trip.status,
      delayMinutes: data.trip.delayMinutes,
      availableSeatCount: data.carriages.flatMap((carriage) => carriage.seats).filter((seat) => seat.available).length,
      capacity: data.carriages.flatMap((carriage) => carriage.seats).length
    }),
    carriages: data.carriages
  };
}

export function mapCarriagesToUi(data: ApiTripDetail['carriages'], trip: Trip): Carriage[] {
  return data.map((carriage) => ({
    id: carriage.id,
    number: carriage.orderIndex,
    type: carriage.orderIndex <= 2 ? 'economy' : carriage.orderIndex === 3 ? 'business' : 'first_class',
    totalSeats: carriage.seats.length,
    priceMultiplier: carriage.orderIndex <= 2 ? 1 : carriage.orderIndex === 3 ? 1.5 : 2
  }));
}

export function mapSeatsForCarriage(data: ApiTripDetail['carriages'][number], basePrice: number) {
  const multiplier = data.orderIndex <= 2 ? 1 : data.orderIndex === 3 ? 1.5 : 2;

  return data.seats.map((seat) => {
    const position = parseSeatPosition(seat.code, seat.orderIndex);
    return {
      id: seat.id,
      carriageId: data.id,
      seatNumber: seat.code,
      row: position.row,
      column: position.column,
      status: seat.available ? ('available' as const) : ('sold' as const),
      price: Math.round(basePrice * multiplier)
    };
  });
}

export async function createBooking(input: {
  userId?: string;
  tripId: string;
  seatIds: string[];
  contactEmail: string;
}) {
  return apiRequest<ApiBooking>('/api/bookings', {
    method: 'POST',
    body: input
  });
}

export async function getBooking(bookingId: string) {
  return apiRequest<ApiBooking>(`/api/bookings/${bookingId}`);
}

export async function payBooking(bookingId: string) {
  return apiRequest<ApiBooking>(`/api/bookings/${bookingId}/pay`, {
    method: 'POST'
  });
}

export async function listBookings(userId?: string) {
  return apiRequest<ApiBooking[]>('/api/bookings', {
    params: { userId: userId || undefined }
  });
}

export async function getTicketByBooking(bookingId: string) {
  return apiRequest<ApiTicket>(`/api/tickets/${bookingId}`);
}

export async function getCurrentUser(_userId?: string): Promise<User> {
  const data = await apiRequest<ApiUserMe>('/api/users/me', {
    params: undefined
  });

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role,
    phone: '-',
    createdAt: data.createdAt,
    totalBookings: data.bookingCount,
    totalTickets: data.ticketCount
  };
}

function mapNotificationType(type: string): Notification['type'] {
  if (type === 'BOOKING_HELD' || type === 'BOOKING_PAID') return 'booking';
  if (type === 'TRIP_DELAYED' || type === 'TRIP_CANCELLED') return 'trip';
  if (type === 'REFUND_ISSUED') return 'refund';
  if (type === 'INVOICE_SENT') return 'payment';
  return 'general';
}

export async function listNotifications(userId?: string): Promise<Notification[]> {
  const data = await apiRequest<ApiNotification[]>('/api/notifications', {
    params: { userId: userId || undefined }
  });

  return data.map((item) => ({
    id: item.id,
    userId: item.userId,
    type: mapNotificationType(item.type),
    title: item.type.replaceAll('_', ' '),
    message: item.message,
    read: item.readAt !== null,
    createdAt: item.createdAt
  }));
}

export async function markNotificationRead(notificationId: string) {
  return apiRequest(`/api/notifications/${notificationId}/read`, {
    method: 'POST'
  });
}

export async function deleteNotification(notificationId: string) {
  return apiRequest(`/api/notifications/${notificationId}`, {
    method: 'DELETE'
  });
}

export async function getAdminReports() {
  return apiRequest<{
    totalTrips: number;
    totalBookings: number;
    activeBookings: number;
    paidBookings: number;
    cancelledBookings: number;
    refundedBookings: number;
    delayedTrips: number;
    cancelledTrips: number;
    revenue: number;
    occupancyRate: number;
  }>('/api/admin/reports');
}

export async function getAdminTrips() {
  return apiRequest<Array<{
    id: string;
    trainCode: string;
    origin: string;
    destination: string;
    departureTime: string;
    status: 'ON_TIME' | 'DELAYED' | 'CANCELLED';
  }>>('/api/trips/admin');
}

export async function getAdminTickets() {
  return apiRequest<Array<{
    id: string;
    ticketNumber: string;
    issuedAt: string;
    booking: {
      id: string;
      code: string;
      status: 'HOLDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
      totalAmount: number;
      seatCodes: string[];
      user: {
        id: string;
        name: string;
        email: string;
      };
      trip: {
        id: string;
        trainCode: string;
        trainName: string;
        origin: string;
        destination: string;
        departureTime: string;
        arrivalTime: string;
        status: 'ON_TIME' | 'DELAYED' | 'CANCELLED';
      };
      payment: {
        id: string;
        status: 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';
        method: string;
        paidAt: string | null;
      } | null;
    };
  }>>('/api/admin/tickets');
}

export async function getAdminRecentBookings(limit = 8) {
  return apiRequest<Array<{
    id: string;
    code: string;
    status: 'HOLDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
    createdAt: string;
    totalAmount: number;
    user: {
      name: string;
      email: string;
    };
    trip: {
      origin: string;
      destination: string;
      trainCode: string;
      departureTime: string;
    };
    payment: {
      status: 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';
      paidAt: string | null;
    } | null;
    ticket: {
      id: string;
      ticketNumber: string;
    } | null;
  }>>('/api/admin/recent-bookings', {
    params: { limit }
  });
}

export async function deleteAdminTrip(tripId: string) {
  return apiRequest<{ success: boolean }>(`/api/admin/trips/${tripId}`, {
    method: 'DELETE'
  });
}
