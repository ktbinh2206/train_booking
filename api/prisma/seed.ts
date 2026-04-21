import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type RoutePlan = {
  originCode: string;
  destinationCode: string;
  basePrice: number;
  durationHours: number;
  departureSlots: Array<{ hour: number; minute: number }>;
};

function buildSeatCode(index: number) {
  const group = Math.floor((index - 1) / 10);
  const letter = String.fromCharCode(65 + group);
  const number = ((index - 1) % 10) + 1;
  return `${letter}${number}`;
}

function buildUtcTimeFromVn(dayOffset: number, hour: number, minute: number) {
  const now = new Date();
  const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const base = new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate() + dayOffset, hour - 7, minute, 0, 0));
  return base;
}

async function main() {
  const defaultPasswordHash = await bcrypt.hash('123456', 10);

  await prisma.bookingSeat.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.carriage.deleteMany();
  await prisma.train.deleteMany();
  await prisma.station.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      name: 'Quản trị viên hệ thống',
      email: 'admin@trainbooking.local',
      passwordHash: defaultPasswordHash,
      role: 'ADMIN'
    }
  });

  const customers = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Nguyễn Văn A',
        email: 'customer.a@trainbooking.local',
        passwordHash: defaultPasswordHash,
        role: 'USER'
      }
    }),
    prisma.user.create({
      data: {
        name: 'Trần Thị B',
        email: 'customer.b@trainbooking.local',
        passwordHash: defaultPasswordHash,
        role: 'USER'
      }
    }),
    prisma.user.create({
      data: {
        name: 'Lê Văn C',
        email: 'customer.c@trainbooking.local',
        passwordHash: defaultPasswordHash,
        role: 'USER'
      }
    })
  ]);

  const stations = await Promise.all([
    prisma.station.create({ data: { code: 'HN', name: 'Hà Nội', city: 'Hà Nội' } }),
    prisma.station.create({ data: { code: 'DN', name: 'Đà Nẵng', city: 'Đà Nẵng' } }),
    prisma.station.create({ data: { code: 'HU', name: 'Huế', city: 'Thừa Thiên Huế' } }),
    prisma.station.create({ data: { code: 'SG', name: 'Sài Gòn', city: 'Hồ Chí Minh' } }),
    prisma.station.create({ data: { code: 'NT', name: 'Nha Trang', city: 'Khánh Hòa' } }),
    prisma.station.create({ data: { code: 'HP', name: 'Hải Phòng', city: 'Hải Phòng' } })
  ]);
  const stationByCode = new Map(stations.map((station) => [station.code, station]));

  const trainPlans = [
    { code: 'SE1', name: 'Thống Nhất SE1', carriageCount: 10 },
    { code: 'SE2', name: 'Thống Nhất SE2', carriageCount: 9 },
    { code: 'SE3', name: 'Thống Nhất SE3', carriageCount: 8 },
    { code: 'SE4', name: 'Thống Nhất SE4', carriageCount: 12 }
  ] as const;

  const trains = [] as Array<{ id: string; code: string; name: string }>;

  for (const trainPlan of trainPlans) {
    const train = await prisma.train.create({
      data: {
        code: trainPlan.code,
        name: trainPlan.name
      }
    });

    trains.push(train);

    for (let carriageIndex = 1; carriageIndex <= trainPlan.carriageCount; carriageIndex += 1) {
      const type = carriageIndex <= 4 ? 'SOFT_SEAT' : carriageIndex <= 8 ? 'HARD_SEAT' : 'SLEEPER';
      const seatCount = type === 'SOFT_SEAT' ? 48 : type === 'HARD_SEAT' ? 56 : 40;
      const carriageCode = `${String.fromCharCode(64 + carriageIndex)}${carriageIndex}`;

      const carriage = await prisma.carriage.create({
        data: {
          trainId: train.id,
          code: carriageCode,
          orderIndex: carriageIndex,
          type
        }
      });

      const seatBatch = Array.from({ length: seatCount }, (_, seatOffset) => {
        const orderIndex = seatOffset + 1;
        return {
          carriageId: carriage.id,
          code: buildSeatCode(orderIndex),
          orderIndex,
          status: 'ACTIVE' as const
        };
      });

      await prisma.seat.createMany({ data: seatBatch });
    }
  }

  const routePlans: RoutePlan[] = [
    {
      originCode: 'HN',
      destinationCode: 'DN',
      basePrice: 760000,
      durationHours: 14,
      departureSlots: [
        { hour: 6, minute: 15 },
        { hour: 13, minute: 40 },
        { hour: 20, minute: 10 }
      ]
    },
    {
      originCode: 'DN',
      destinationCode: 'SG',
      basePrice: 980000,
      durationHours: 16,
      departureSlots: [
        { hour: 7, minute: 0 },
        { hour: 14, minute: 20 },
        { hour: 21, minute: 30 }
      ]
    },
    {
      originCode: 'HU',
      destinationCode: 'HN',
      basePrice: 690000,
      durationHours: 11,
      departureSlots: [
        { hour: 8, minute: 25 },
        { hour: 17, minute: 10 }
      ]
    },
    {
      originCode: 'HN',
      destinationCode: 'HP',
      basePrice: 180000,
      durationHours: 3,
      departureSlots: [
        { hour: 5, minute: 50 },
        { hour: 10, minute: 40 },
        { hour: 18, minute: 5 }
      ]
    },
    {
      originCode: 'SG',
      destinationCode: 'NT',
      basePrice: 520000,
      durationHours: 8,
      departureSlots: [
        { hour: 6, minute: 35 },
        { hour: 15, minute: 15 },
        { hour: 22, minute: 0 }
      ]
    },
    {
      originCode: 'NT',
      destinationCode: 'DN',
      basePrice: 440000,
      durationHours: 9,
      departureSlots: [
        { hour: 7, minute: 45 },
        { hour: 19, minute: 20 }
      ]
    }
  ];

  const trips = [] as Array<{ id: string; trainId: string; origin: string; destination: string; price: Decimal }>;

  for (let dayOffset = -7; dayOffset <= 7; dayOffset += 1) {
    for (let routeIndex = 0; routeIndex < routePlans.length; routeIndex += 1) {
      const route = routePlans[routeIndex]!;
      for (let slotIndex = 0; slotIndex < route.departureSlots.length; slotIndex += 1) {
        const slot = route.departureSlots[slotIndex]!;
        const train = trains[(routeIndex + slotIndex + dayOffset + 14) % trains.length]!;
        const departureTime = buildUtcTimeFromVn(dayOffset, slot.hour, slot.minute);
        const arrivalTime = new Date(departureTime.getTime() + route.durationHours * 60 * 60 * 1000);

        const originStation = stationByCode.get(route.originCode);
        const destinationStation = stationByCode.get(route.destinationCode);

        if (!originStation || !destinationStation) {
          throw new Error(`Missing station mapping for route ${route.originCode} -> ${route.destinationCode}`);
        }

        const trip = await prisma.trip.create({
          data: {
            trainId: train.id,
            originStationId: originStation.id,
            destinationStationId: destinationStation.id,
            origin: originStation.name,
            destination: destinationStation.name,
            departureTime,
            arrivalTime,
            price: new Decimal(route.basePrice),
            status: dayOffset === 1 && slotIndex === 1 ? 'DELAYED' : 'ON_TIME',
            delayMinutes: dayOffset === 1 && slotIndex === 1 ? 35 : 0,
            delayedDepartureTime: dayOffset === 1 && slotIndex === 1 ? new Date(departureTime.getTime() + 35 * 60 * 1000) : null,
            note: dayOffset === 1 && slotIndex === 1 ? 'Điều chỉnh lịch trình do thời tiết xấu.' : null
          }
        });

        trips.push({
          id: trip.id,
          trainId: trip.trainId,
          origin: trip.origin,
          destination: trip.destination,
          price: trip.price
        });
      }
    }
  }

  const demoTrips = {
    paid: trips.find((trip) => trip.origin === 'Hà Nội' && trip.destination === 'Đà Nẵng'),
    holding: trips.find((trip) => trip.origin === 'Sài Gòn' && trip.destination === 'Nha Trang'),
    cancelled: trips.find((trip) => trip.origin === 'Đà Nẵng' && trip.destination === 'Sài Gòn')
  };

  if (!demoTrips.paid || !demoTrips.holding || !demoTrips.cancelled) {
    throw new Error('Unable to locate demo trips for booking seed data.');
  }

  const paidTrip = demoTrips.paid;
  const holdingTrip = demoTrips.holding;
  const cancelledTrip = demoTrips.cancelled;

  const trainCarriages = await prisma.carriage.findMany({
    where: {
      trainId: {
        in: [paidTrip.trainId, holdingTrip.trainId, cancelledTrip.trainId]
      }
    },
    include: {
      seats: {
        orderBy: {
          orderIndex: 'asc'
        }
      }
    },
    orderBy: {
      orderIndex: 'asc'
    }
  });

  const carriagesByTrainId = new Map<string, typeof trainCarriages>();
  for (const carriage of trainCarriages) {
    const items = carriagesByTrainId.get(carriage.trainId) ?? [];
    items.push(carriage);
    carriagesByTrainId.set(carriage.trainId, items);
  }

  const pickSeats = (trainId: string, offset: number, count: number) => {
    const carriages = carriagesByTrainId.get(trainId) ?? [];
    const allSeats = carriages.flatMap((carriage) => carriage.seats);
    return allSeats.slice(offset, offset + count);
  };

  const now = new Date();

  const paidSeats = pickSeats(paidTrip.trainId, 0, 2);
  const holdingSeats = pickSeats(holdingTrip.trainId, 10, 3);
  const cancelledSeats = pickSeats(cancelledTrip.trainId, 30, 2);

  const paidBooking = await prisma.booking.create({
    data: {
      code: 'BK-REAL-PAID-001',
      userId: customers[0]!.id,
      tripId: paidTrip.id,
      status: 'PAID',
      holdExpiresAt: new Date(now.getTime() + 5 * 60 * 1000),
      expiredAt: null,
      totalAmount: paidTrip.price.mul(paidSeats.length),
      contactEmail: customers[0]!.email,
      seatCount: paidSeats.length,
      bookingSeats: {
        create: paidSeats.map((seat) => ({
          seatId: seat.id,
          priceSnapshot: paidTrip.price
        }))
      },
      payment: {
        create: {
          status: 'PAID',
          method: 'CARD',
          transactionRef: 'PAY-REAL-0001',
          amount: paidTrip.price.mul(paidSeats.length),
          paidAt: now
        }
      },
      ticket: {
        create: {
          ticketNumber: 'TK-REAL-0001',
          qrToken: 'token-real-0001',
          qrDataUrl: 'https://example.local/qr/TK-REAL-0001',
          eTicketUrl: 'https://example.local/tickets/TK-REAL-0001',
          invoiceNumber: 'INV-REAL-0001'
        }
      }
    }
  });

  const holdingBooking = await prisma.booking.create({
    data: {
      code: 'BK-REAL-HOLD-001',
      userId: customers[1]!.id,
      tripId: holdingTrip.id,
      status: 'HOLDING',
      holdExpiresAt: new Date(now.getTime() + 3 * 60 * 1000),
      expiredAt: new Date(now.getTime() + 3 * 60 * 1000),
      totalAmount: holdingTrip.price.mul(holdingSeats.length),
      contactEmail: customers[1]!.email,
      seatCount: holdingSeats.length,
      bookingSeats: {
        create: holdingSeats.map((seat) => ({
          seatId: seat.id,
          priceSnapshot: holdingTrip.price
        }))
      },
      payment: {
        create: {
          status: 'PENDING',
          method: 'TRANSFER',
          amount: holdingTrip.price.mul(holdingSeats.length)
        }
      }
    }
  });

  const cancelledBooking = await prisma.booking.create({
    data: {
      code: 'BK-REAL-CANCEL-001',
      userId: customers[2]!.id,
      tripId: cancelledTrip.id,
      status: 'CANCELLED',
      holdExpiresAt: new Date(now.getTime() - 10 * 60 * 1000),
      expiredAt: new Date(now.getTime() - 10 * 60 * 1000),
      totalAmount: cancelledTrip.price.mul(cancelledSeats.length),
      contactEmail: customers[2]!.email,
      seatCount: cancelledSeats.length,
      bookingSeats: {
        create: cancelledSeats.map((seat) => ({
          seatId: seat.id,
          priceSnapshot: cancelledTrip.price
        }))
      },
      payment: {
        create: {
          status: 'FAILED',
          method: 'E_WALLET',
          amount: cancelledTrip.price.mul(cancelledSeats.length),
          transactionRef: 'FAIL-REAL-0001'
        }
      }
    }
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: customers[0]!.id,
        bookingId: paidBooking.id,
        type: 'REMINDER',
        message: 'Vé đã được thanh toán thành công và sẵn sàng sử dụng.'
      },
      {
        userId: customers[1]!.id,
        bookingId: holdingBooking.id,
        type: 'HOLD_EXPIRE',
        message: 'Booking đang được giữ trong 5 phút, vui lòng thanh toán sớm.'
      },
      {
        userId: customers[2]!.id,
        bookingId: cancelledBooking.id,
        type: 'CANCEL',
        message: 'Booking đã bị hủy theo yêu cầu của khách hàng.'
      }
    ]
  });

  await prisma.refund.create({
    data: {
      bookingId: cancelledBooking.id,
      amount: cancelledTrip.price.mul(cancelledSeats.length),
      status: 'COMPLETED',
      reason: 'Seed mock refund for cancelled booking'
    }
  });

  await prisma.emailLog.createMany({
    data: [
      {
        userId: customers[0]!.id,
        bookingId: paidBooking.id,
        kind: 'INVOICE_SENT',
        subject: 'Hóa đơn vé tàu BK-REAL-PAID-001',
        toEmail: customers[0]!.email,
        html: '<p>Hóa đơn và vé điện tử của bạn đã được phát hành.</p>'
      },
      {
        userId: customers[1]!.id,
        bookingId: holdingBooking.id,
        kind: 'BOOKING_HELD',
        subject: 'Giữ chỗ tạm thời BK-REAL-HOLD-001',
        toEmail: customers[1]!.email,
        html: '<p>Booking đang chờ thanh toán, ghế sẽ được giữ trong 5 phút.</p>'
      },
      {
        userId: customers[2]!.id,
        bookingId: cancelledBooking.id,
        kind: 'BOOKING_CANCELLED',
        subject: 'Xác nhận hủy BK-REAL-CANCEL-001',
        toEmail: customers[2]!.email,
        html: '<p>Booking đã được hủy thành công.</p>'
      }
    ]
  });

  console.log(`Seed complete: ${stations.length} stations, ${trains.length} trains, ${trips.length} trips.`);
  console.log(`Admin login: ${admin.email}`);
  console.log(`Demo users: ${customers.map((customer) => customer.email).join(', ')}`);
  console.log('Seed logic: fixed timetable routes, carriage template by train, and deterministic booking statuses for demo.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
