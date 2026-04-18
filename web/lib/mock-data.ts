import { Trip, Carriage, Seat, User } from '@/lib/types';

export const mockTrips: Trip[] = [
  {
    id: '1',
    source: 'Mumbai',
    destination: 'Delhi',
    departureTime: '10:30 AM',
    arrivalTime: '8:45 PM',
    duration: '10h 15m',
    distance: '1,400',
    basePrice: 2500,
    availableSeats: 45,
    totalSeats: 200,
    status: 'scheduled',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    trainNumber: '12015',
    trainName: 'Central Express',
  },
  {
    id: '2',
    source: 'Mumbai',
    destination: 'Delhi',
    departureTime: '2:15 PM',
    arrivalTime: '11:30 PM',
    duration: '9h 15m',
    distance: '1,400',
    basePrice: 3200,
    availableSeats: 28,
    totalSeats: 200,
    status: 'scheduled',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    trainNumber: '12050',
    trainName: 'Rajdhani Express',
  },
  {
    id: '3',
    source: 'Mumbai',
    destination: 'Delhi',
    departureTime: '6:00 PM',
    arrivalTime: '2:30 AM',
    duration: '8h 30m',
    distance: '1,400',
    basePrice: 4500,
    availableSeats: 52,
    totalSeats: 200,
    status: 'scheduled',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    trainNumber: '12001',
    trainName: 'Shatabdi Express',
  },
  {
    id: '4',
    source: 'Mumbai',
    destination: 'Delhi',
    departureTime: '11:45 PM',
    arrivalTime: '8:15 AM',
    duration: '8h 30m',
    distance: '1,400',
    basePrice: 2200,
    availableSeats: 18,
    totalSeats: 200,
    status: 'delayed',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    trainNumber: '12456',
    trainName: 'Night Express',
  },
];

export const mockCarriages: Carriage[] = [
  {
    id: 'c1',
    number: 1,
    type: 'economy',
    totalSeats: 72,
    priceMultiplier: 1,
  },
  {
    id: 'c2',
    number: 2,
    type: 'economy',
    totalSeats: 72,
    priceMultiplier: 1,
  },
  {
    id: 'c3',
    number: 3,
    type: 'business',
    totalSeats: 48,
    priceMultiplier: 1.5,
  },
  {
    id: 'c4',
    number: 4,
    type: 'first_class',
    totalSeats: 32,
    priceMultiplier: 2.5,
  },
];

// Generate seat layout for a carriage
export function generateSeatsForCarriage(carriageId: string, basePrice: number): Seat[] {
  const carriage = mockCarriages.find(c => c.id === carriageId);
  if (!carriage) return [];

  const seats: Seat[] = [];
  const seatsPerRow = 6;
  const rows = Math.ceil(carriage.totalSeats / seatsPerRow);

  for (let row = 1; row <= rows; row++) {
    for (let col = 1; col <= seatsPerRow; col++) {
      const seatIndex = (row - 1) * seatsPerRow + col;
      if (seatIndex > carriage.totalSeats) break;

      // Randomly mark some seats as sold
      const status =
        Math.random() > 0.7
          ? 'sold'
          : Math.random() > 0.8
            ? 'holding'
            : 'available';

      seats.push({
        id: `${carriageId}-${seatIndex}`,
        carriageId,
        seatNumber: `${String.fromCharCode(64 + col)}${row}`,
        row,
        column: col,
        status: status as any,
        price: Math.round(basePrice * carriage.priceMultiplier),
      });
    }
  }

  return seats;
}

export const mockCurrentUser: User = {
  id: 'user-1',
  name: 'Raj Kumar',
  email: 'raj.kumar@email.com',
  phone: '+91 98765 43210',
  avatar: '👤',
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  totalBookings: 8,
  totalTickets: 12,
};

// Generate notifications
export const mockNotifications = [
  {
    id: '1',
    userId: 'user-1',
    type: 'booking' as const,
    title: 'Booking Confirmed',
    message: 'Your booking for Mumbai to Delhi train is confirmed',
    read: false,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    userId: 'user-1',
    type: 'payment' as const,
    title: 'Thanh toán thành công',
    message: 'Đã nhận thanh toán 5.200.000 VNĐ',
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    userId: 'user-1',
    type: 'trip' as const,
    title: 'Reminder: Your Trip Tomorrow',
    message: 'Your train departs tomorrow at 10:30 AM',
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];
