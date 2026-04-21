import { apiRequest } from '@/lib/api-client';
import { Carriage, Notification, Trip, User } from '@/lib/types';
import { normalizeTrainLayoutJson, type TrainLayoutJson } from '@/lib/train-layout';
import { toVnYmd } from '@/lib/utils';

type ApiTripSearchItem = {
  id: string;
  trainId?: string;
  trainCode: string | null;
  trainName: string | null;
  origin: string;
  destination: string;
  originStationId?: string | null;
  destinationStationId?: string | null;
  departureTime: string;
  departureTimeVN?: string;
  arrivalTime: string;
  arrivalTimeVN?: string;
  price: number;
  status: 'ON_TIME' | 'DELAYED' | 'CANCELLED';
  delayMinutes: number;
  delayedDepartureTime?: string | null;
  availableSeatCount: number;
  capacity: number;
};

type ApiTripSearchResponse = {
  data: ApiTripSearchItem[];
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
    delayedDepartureTime?: string | null;
  };
  carriages: Array<{
    id: string;
    code: string;
    orderIndex: number;
    basePrice: number;
    layoutJson?: TrainLayoutJson | null;
    seats: Array<{
      id: string;
      code: string;
      orderIndex: number;
      status: 'ACTIVE' | 'INACTIVE';
      available: boolean;
      price?: number | null;
    }>;
  }>;
};

type ApiBooking = {
  id: string;
  code: string;
  status: 'HOLDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
  holdExpiresAt: string | null;
  expiredAt?: string | null;
  isAffected?: boolean;
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
    delayMinutes?: number;
    delayedDepartureTime?: string | null;
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
    trainName: raw.trainName ?? 'Tàu chưa xác định',
    delayedDepartureTime: raw.delayedDepartureTime ?? null
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
  departureStationId?: string;
  arrivalStationId?: string;
  date?: string;
  fromDate?: string;
  toDate?: string;
  tripType?: 'one-way' | 'round-trip';
  page?: number;
  pageSize?: number;
}) {
  const data = await apiRequest<ApiTripSearchResponse>('/api/trips/search', { params });
  return {
    data: data.data.map(toUiTrip),
    page: data.page,
    pageSize: data.pageSize,
    total: data.total,
    totalPages: data.totalPages
  };
}

export async function searchTripsByStationAndDate(params: {
  departureStationId?: string;
  arrivalStationId?: string;
  fromDate: string;
  toDate: string;
  page?: number;
  pageSize?: number;
}) {
  return searchTrips(params);
}

type ApiTripTodayItem = ApiTripSearchItem;

type ApiTripTodayResponse = {
  data?: ApiTripTodayItem[];
  items?: ApiTripTodayItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export async function getTodayTrips(params?: { page?: number; pageSize?: number }) {
  const data = await apiRequest<ApiTripTodayResponse>('/api/trips/today', { params });
  const items = Array.isArray(data.data) ? data.data : Array.isArray(data.items) ? data.items : [];

  return {
    data: items.map(toUiTrip),
    page: data.page,
    pageSize: data.pageSize,
    total: data.total,
    totalPages: data.totalPages
  };
}

export async function listStations(query?: string) {
  const data = await apiRequest<{ items: Array<{ id: string; code: string; name: string; city: string; label: string }> }>('/api/stations', {
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
      delayedDepartureTime: data.trip.delayedDepartureTime,
      availableSeatCount: data.carriages.flatMap((carriage) => carriage.seats).filter((seat) => seat.available).length,
      capacity: data.carriages.flatMap((carriage) => carriage.seats).length
    }),
    carriages: data.carriages
  };
}

export async function getTripSeatsDetail(tripId: string) {
  return apiRequest<{
    trip: {
      id: string;
      trainCode: string | null;
      trainName: string | null;
      origin: string;
      destination: string;
      departureTime: string;
      departureTimeVN?: string;
      arrivalTime: string;
      arrivalTimeVN?: string;
      price: number;
    };
    carriages: Array<{
      id: string;
      code: string;
      orderIndex: number;
      type?: string;
      seats: Array<{
        id: string;
        code: string;
        orderIndex: number;
        status: 'ACTIVE' | 'INACTIVE';
        available: boolean;
        reserved?: boolean;
      }>;
    }>;
  }>(`/api/trips/${tripId}/seats`);
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
  const layout = normalizeTrainLayoutJson(data.layoutJson ?? null, Math.max(1, Math.ceil(data.seats.length / 4)), 4);
  const fallbackPrice = Math.round(basePrice + (data.basePrice ?? 0));
  const seatByCode = new Map(data.seats.map((seat) => [seat.code, seat]));

  if (layout.seats.length === 0) {
    return data.seats.map((seat) => {
      const position = parseSeatPosition(seat.code, seat.orderIndex);
      return {
        id: seat.id,
        carriageId: data.id,
        seatNumber: seat.code,
        row: position.row,
        column: position.column,
        status: seat.available ? ('available' as const) : ('sold' as const),
        price: seat.price ?? fallbackPrice
      };
    });
  }

  return layout.seats.map((seatCell) => {
    const seat = seatByCode.get(seatCell.seatNumber);
    return {
      id: seat?.id ?? seatCell.seatId,
      carriageId: data.id,
      seatNumber: seatCell.seatNumber,
      row: seatCell.row + 1,
      column: seatCell.col + 1,
      status: seat?.available ? ('available' as const) : ('sold' as const),
      price: seat?.price ?? seatCell.price ?? fallbackPrice
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

export async function cancelBooking(bookingId: string, reason?: string) {
  return apiRequest<ApiBooking>(`/api/bookings/${bookingId}/cancel`, {
    method: 'POST',
    body: {
      reason: reason?.trim() || undefined
    }
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
  if (type === 'HOLD_EXPIRE') return 'booking';
  if (type === 'REMINDER') return 'trip';
  if (type === 'DELAY') return 'delay';
  if (type === 'CANCEL') return 'refund';
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

export type AdminPagedResponse<T> = {
  data?: T[];
  items?: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function normalizePagedData<T>(payload: AdminPagedResponse<T> | T[]) {
  if (Array.isArray(payload)) {
    return {
      data: payload,
      total: payload.length,
      page: 1,
      pageSize: payload.length,
      totalPages: 1
    };
  }

  const data = Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(payload.items)
      ? payload.items
      : [];

  return {
    data,
    total: payload.total,
    page: payload.page,
    pageSize: payload.pageSize,
    totalPages: payload.totalPages
  };
}

export type AdminStation = {
  id: string;
  code: string;
  name: string;
  city: string;
};

export type AdminTrip = {
  id: string;
  trainId: string;
  originStationId: string | null;
  destinationStationId: string | null;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  status: 'ON_TIME' | 'DELAYED' | 'CANCELLED';
  delayMinutes: number;
  train: {
    id: string;
    code: string;
    name: string;
  };
  originStation?: AdminStation | null;
  destinationStation?: AdminStation | null;
};

export type AdminCarriage = {
  id: string;
  trainId: string;
  code: string;
  orderIndex: number;
  type: 'SOFT_SEAT' | 'HARD_SEAT' | 'SLEEPER';
  basePrice: number;
  layoutJson?: TrainLayoutJson | null;
  train: {
    id: string;
    code: string;
    name: string;
  };
  _count?: {
    seats: number;
  };
};

export type AdminSeat = {
  id: string;
  carriageId: string;
  code: string;
  orderIndex: number;
  status: 'ACTIVE' | 'INACTIVE';
  price: number | null;
  carriage: {
    id: string;
    code: string;
    orderIndex: number;
    train: {
      id: string;
      code: string;
      name: string;
    };
  };
};

export type AdminTicket = {
  id: string;
  ticketNumber: string;
  issuedAt: string;
  booking: {
    id: string;
    code: string;
    status: 'HOLDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
    totalAmount: number;
    user: {
      id: string;
      name: string;
      email: string;
    };
    trip: {
      id: string;
      origin: string;
      destination: string;
      departureTime: string;
      arrivalTime: string;
      train: {
        id: string;
        code: string;
        name: string;
      };
    };
  };
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  _count?: {
    bookings: number;
    notifications: number;
  };
};

export type AdminTrain = {
  id: string;
  code: string;
  name: string;
  carriageCount: number;
  seatCount: number;
  minCarriagePrice: number | null;
  maxCarriagePrice: number | null;
};

export type AdminTrainDetailSeat = {
  id: string;
  code: string;
  orderIndex: number;
  status: 'ACTIVE' | 'INACTIVE';
  price: number | null;
};

export type AdminTrainDetailCarriage = Omit<AdminCarriage, 'train' | '_count'> & {
  seatCount: number;
  seats: AdminTrainDetailSeat[];
};

export type AdminTrainDetail = AdminTrain & {
  carriages: AdminTrainDetailCarriage[];
};

export async function getAdminTrains(params?: { page?: number; pageSize?: number }) {
  const payload = await apiRequest<AdminPagedResponse<AdminTrain>>('/api/admin/trains', { params });
  return normalizePagedData(payload);
}

export async function getAdminTrainDetail(trainId: string) {
  return apiRequest<AdminTrainDetail>(`/api/admin/trains/${trainId}`);
}

export async function createAdminTrain(input: {
  code: string;
  name: string;
}) {
  return apiRequest<AdminTrain>('/api/admin/trains', {
    method: 'POST',
    body: input
  });
}

export async function updateAdminTrain(trainId: string, input: Partial<{
  code: string;
  name: string;
}>) {
  return apiRequest<AdminTrain>(`/api/admin/trains/${trainId}`, {
    method: 'PUT',
    body: input
  });
}

export async function deleteAdminTrain(trainId: string) {
  return apiRequest<{ success: boolean }>(`/api/admin/trains/${trainId}`, {
    method: 'DELETE'
  });
}

export async function getAdminTrips(params?: { page?: number; pageSize?: number }) {
  const payload = await apiRequest<AdminPagedResponse<AdminTrip>>('/api/admin/trips', { params });
  return normalizePagedData(payload);
}

export async function createAdminTrip(input: {
  trainId: string;
  originStationId: string;
  destinationStationId: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
}) {
  return apiRequest<AdminTrip>('/api/admin/trips', {
    method: 'POST',
    body: input
  });
}

export async function updateAdminTrip(tripId: string, input: Partial<{
  trainId: string;
  originStationId: string;
  destinationStationId: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  status: 'ON_TIME' | 'DELAYED' | 'CANCELLED';
  delayMinutes: number;
}>) {
  return apiRequest<AdminTrip>(`/api/admin/trips/${tripId}`, {
    method: 'PUT',
    body: input
  });
}

export async function getAdminCarriages(params?: { page?: number; pageSize?: number; trainId?: string }) {
  const payload = await apiRequest<AdminPagedResponse<AdminCarriage>>('/api/admin/carriages', { params });
  return normalizePagedData(payload);
}

export async function createAdminCarriage(input: {
  trainId: string;
  code: string;
  orderIndex: number;
  type: 'SOFT_SEAT' | 'HARD_SEAT' | 'SLEEPER';
  basePrice?: number;
  layoutJson?: TrainLayoutJson | null;
}) {
  return apiRequest<AdminCarriage>('/api/admin/carriages', {
    method: 'POST',
    body: input
  });
}

export async function updateAdminCarriage(carriageId: string, input: Partial<{
  code: string;
  orderIndex: number;
  type: 'SOFT_SEAT' | 'HARD_SEAT' | 'SLEEPER';
  basePrice: number;
  layoutJson: TrainLayoutJson | null;
}>) {
  return apiRequest<AdminCarriage>(`/api/admin/carriages/${carriageId}`, {
    method: 'PUT',
    body: input
  });
}

export async function deleteAdminCarriage(carriageId: string) {
  return apiRequest<{ success: boolean }>(`/api/admin/carriages/${carriageId}`, {
    method: 'DELETE'
  });
}

export async function getAdminSeats(params?: { page?: number; pageSize?: number; carriageId?: string }) {
  const payload = await apiRequest<AdminPagedResponse<AdminSeat>>('/api/admin/seats', { params });
  return normalizePagedData(payload);
}

export async function createAdminSeat(input: {
  carriageId: string;
  code: string;
  orderIndex: number;
  status?: 'ACTIVE' | 'INACTIVE';
  price?: number | null;
}) {
  return apiRequest<AdminSeat>('/api/admin/seats', {
    method: 'POST',
    body: input
  });
}

export async function updateAdminSeat(seatId: string, input: Partial<{
  code: string;
  orderIndex: number;
  status: 'ACTIVE' | 'INACTIVE';
  price: number | null;
}>) {
  return apiRequest<AdminSeat>(`/api/admin/seats/${seatId}`, {
    method: 'PUT',
    body: input
  });
}

export async function deleteAdminSeat(seatId: string) {
  return apiRequest<{ success: boolean }>(`/api/admin/seats/${seatId}`, {
    method: 'DELETE'
  });
}

export async function getAdminTickets(params?: { page?: number; pageSize?: number }) {
  const payload = await apiRequest<AdminPagedResponse<AdminTicket>>('/api/admin/tickets', { params });
  return normalizePagedData(payload);
}

export async function deleteAdminTicket(ticketId: string) {
  return apiRequest<{ success: boolean }>(`/api/admin/tickets/${ticketId}`, {
    method: 'DELETE'
  });
}

export async function createAdminTicket(input: {
  bookingId: string;
  qrDataUrl: string;
  eTicketUrl?: string;
  invoiceNumber?: string;
}) {
  return apiRequest<AdminTicket>('/api/admin/tickets', {
    method: 'POST',
    body: input
  });
}

export async function updateAdminTicket(ticketId: string, input: {
  qrDataUrl?: string;
  eTicketUrl?: string | null;
  invoiceNumber?: string | null;
}) {
  return apiRequest<AdminTicket>(`/api/admin/tickets/${ticketId}`, {
    method: 'PUT',
    body: input
  });
}

export async function duplicateAdminCarriage(carriageId: string, code?: string) {
  return apiRequest<AdminCarriage>(`/api/admin/carriages/${carriageId}/duplicate`, {
    method: 'POST',
    body: code ? { code } : {}
  });
}

export async function saveAdminCarriageLayout(carriageId: string, layoutJson: TrainLayoutJson) {
  return apiRequest<AdminCarriage>(`/api/admin/carriages/${carriageId}/layout`, {
    method: 'PATCH',
    body: { layoutJson }
  });
}

export async function bulkAdminCarriageSeats(input: {
  carriageId: string;
  seats: Array<{ code: string; orderIndex: number; price?: number | null }>;
  layoutJson?: TrainLayoutJson;
}) {
  return apiRequest<AdminCarriage>(`/api/admin/seats/bulk`, {
    method: 'POST',
    body: input
  });
}

export async function syncAdminCarriageSeats(carriageId: string, layoutJson: TrainLayoutJson) {
  return bulkAdminCarriageSeats({
    carriageId,
    seats: layoutJson.seats.map((seat, index) => ({
      code: seat.seatNumber,
      orderIndex: index + 1,
      price: seat.price ?? null,
    })),
    layoutJson
  });
}

export async function getAdminUsers(params?: { page?: number; pageSize?: number }) {
  const payload = await apiRequest<AdminPagedResponse<AdminUser>>('/api/admin/users', { params });
  return normalizePagedData(payload);
}

export async function createAdminUser(input: {
  name: string;
  email: string;
  password: string;
  role?: 'USER' | 'ADMIN';
}) {
  return apiRequest<AdminUser>('/api/admin/users', {
    method: 'POST',
    body: input
  });
}

export async function updateAdminUser(userId: string, input: Partial<{
  name: string;
  email: string;
  password: string;
  role: 'USER' | 'ADMIN';
}>) {
  return apiRequest<AdminUser>(`/api/admin/users/${userId}`, {
    method: 'PUT',
    body: input
  });
}

export async function deleteAdminUser(userId: string) {
  return apiRequest<{ success: boolean }>(`/api/admin/users/${userId}`, {
    method: 'DELETE'
  });
}

export async function getAdminStations(params?: { page?: number; pageSize?: number }) {
  const payload = await apiRequest<AdminPagedResponse<AdminStation>>('/api/admin/stations', { params });
  return normalizePagedData(payload);
}

export async function createAdminStation(input: { code: string; name: string; city: string }) {
  return apiRequest<AdminStation>('/api/admin/stations', {
    method: 'POST',
    body: input
  });
}

export async function updateAdminStation(stationId: string, input: Partial<{ code: string; name: string; city: string }>) {
  return apiRequest<AdminStation>(`/api/admin/stations/${stationId}`, {
    method: 'PUT',
    body: input
  });
}

export async function deleteAdminStation(stationId: string) {
  return apiRequest<{ success: boolean }>(`/api/admin/stations/${stationId}`, {
    method: 'DELETE'
  });
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
