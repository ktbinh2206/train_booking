// Railway Booking System Types

export interface Trip {
  id: string;
  source: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  distance: string;
  basePrice: number;
  availableSeats: number;
  totalSeats: number;
  status: 'scheduled' | 'boarding' | 'departed' | 'cancelled' | 'delayed';
  date: string;
  trainNumber: string;
  trainName: string;
  delayedDepartureTime?: string | null;
}

export interface Carriage {
  id: string;
  number: number;
  type: 'economy' | 'business' | 'first_class';
  totalSeats: number;
  priceMultiplier: number;
}

export interface Seat {
  id: string;
  carriageId: string;
  seatNumber: string;
  row: number;
  column: number;
  status: 'available' | 'selected' | 'holding' | 'sold' | 'blocked';
  price: number;
}

export interface Passenger {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  idType: 'passport' | 'aadhar' | 'pan' | 'dl';
  idNumber: string;
}

export interface Booking {
  id: string;
  bookingCode: string;
  tripId: string;
  passengers: Passenger[];
  seats: Seat[];
  totalPrice: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  createdAt: string;
  heldUntil: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
}

export interface Ticket {
  id: string;
  bookingId: string;
  bookingCode: string;
  trip: Trip;
  passenger: Passenger;
  seat: Seat;
  price: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  qrCode: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role?: 'USER' | 'ADMIN';
  phone: string;
  avatar?: string;
  createdAt: string;
  totalBookings: number;
  totalTickets: number;
}

export interface Notification {
  id: string;
  userId: string;
  bookingId?: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface SearchFilters {
  source: string;
  destination: string;
  date: string;
  passengers: number;
  carriageType?: 'economy' | 'business' | 'first_class';
  maxPrice?: number;
  sortBy?: 'price' | 'departure' | 'duration';
}

export interface DashboardStats {
  totalTrips: number;
  totalTickets: number;
  totalRevenue: number;
  activeBookings: number;
  todayRevenue: number;
  occupancyRate: number;
}
