// Railway Booking Constants

export const BOOKING_CONSTANTS = {
  HOLD_TIME_MINUTES: 5,
  MAX_PASSENGERS: 6,
  MIN_PASSENGERS: 1,
  CANCELLATION_DAYS_BEFORE: 1,
};

export const TRIP_STATUSES = {
  SCHEDULED: 'scheduled',
  BOARDING: 'boarding',
  DEPARTED: 'departed',
  CANCELLED: 'cancelled',
  DELAYED: 'delayed',
} as const;

export const TICKET_STATUSES = {
  CONFIRMED: 'confirmed',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const;

export const SEAT_STATUSES = {
  AVAILABLE: 'available',
  SELECTED: 'selected',
  HOLDING: 'holding',
  SOLD: 'sold',
  BLOCKED: 'blocked',
} as const;

export const CARRIAGE_TYPES = {
  ECONOMY: 'economy',
  BUSINESS: 'business',
  FIRST_CLASS: 'first_class',
} as const;

export const PAYMENT_METHODS = {
  CARD: 'card',
  UPI: 'upi',
  NET_BANKING: 'net_banking',
  WALLET: 'wallet',
} as const;

export const ROUTES = {
  HOME: '/',
  SEARCH: '/search',
  RESULTS: '/results',
  TRIP_DETAIL: '/trip',
  BOOKING_SEATS: '/booking/seats',
  BOOKING_CHECKOUT: '/booking/checkout',
  BOOKING_PAYMENT: '/booking/payment',
  BOOKING_SUCCESS: '/booking/success',
  TICKETS: '/tickets',
  TICKET_DETAIL: '/tickets',
  PROFILE: '/profile',
  NOTIFICATIONS: '/notifications',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_TRIPS: '/admin/trips',
  ADMIN_CARRIAGES: '/admin/carriages',
  ADMIN_TICKETS: '/admin/tickets',
  ADMIN_USERS: '/admin/users',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_SETTINGS: '/admin/settings',
} as const;

export const STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-800 border-blue-300',
  boarding: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  departed: 'bg-purple-100 text-purple-800 border-purple-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
  delayed: 'bg-orange-100 text-orange-800 border-orange-300',
  confirmed: 'bg-green-100 text-green-800 border-green-300',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  completed: 'bg-blue-100 text-blue-800 border-blue-300',
} as const;
