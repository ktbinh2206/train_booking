import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';

const prisma = new PrismaClient();

async function main() {
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
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      name: 'Quản trị viên',
      email: 'admin@trainbooking.local',
      role: 'ADMIN'
    }
  });

  const customer = await prisma.user.create({
    data: {
      name: 'Nguyễn Văn A',
      email: 'customer@trainbooking.local',
      role: 'USER'
    }
  });

  const trains = await Promise.all([
    prisma.train.create({ data: { code: 'SE1', name: 'Thống Nhất SE1' } }),
    prisma.train.create({ data: { code: 'SE2', name: 'Thống Nhất SE2' } })
  ]);

  for (const train of trains) {
    for (let carriageIndex = 1; carriageIndex <= 2; carriageIndex += 1) {
      const carriage = await prisma.carriage.create({
        data: {
          trainId: train.id,
          code: `C${carriageIndex}`,
          orderIndex: carriageIndex
        }
      });

      for (let seatIndex = 1; seatIndex <= 12; seatIndex += 1) {
        await prisma.seat.create({
          data: {
            carriageId: carriage.id,
            code: `${carriage.code}-${seatIndex.toString().padStart(2, '0')}`,
            orderIndex: seatIndex
          }
        });
      }
    }
  }

  const now = new Date();
  const trips = [
    {
      trainId: trains[0]!.id,
      origin: 'Hà Nội',
      destination: 'Đà Nẵng',
      departureTime: new Date(now.getTime() + 1000 * 60 * 60 * 26),
      arrivalTime: new Date(now.getTime() + 1000 * 60 * 60 * 40),
      price: new Decimal('750000'),
      status: 'ON_TIME' as const
    },
    {
      trainId: trains[0]!.id,
      origin: 'Hà Nội',
      destination: 'Đà Nẵng',
      departureTime: new Date(now.getTime() + 1000 * 60 * 60 * 50),
      arrivalTime: new Date(now.getTime() + 1000 * 60 * 60 * 64),
      price: new Decimal('820000'),
      status: 'DELAYED' as const,
      delayMinutes: 45,
      note: 'Chờ khắc phục thời tiết xấu'
    },
    {
      trainId: trains[1]!.id,
      origin: 'Đà Nẵng',
      destination: 'Hồ Chí Minh',
      departureTime: new Date(now.getTime() + 1000 * 60 * 60 * 18),
      arrivalTime: new Date(now.getTime() + 1000 * 60 * 60 * 34),
      price: new Decimal('980000'),
      status: 'ON_TIME' as const
    },
    {
      trainId: trains[1]!.id,
      origin: 'Hà Nội',
      destination: 'Hồ Chí Minh',
      departureTime: new Date(now.getTime() + 1000 * 60 * 60 * 72),
      arrivalTime: new Date(now.getTime() + 1000 * 60 * 60 * 92),
      price: new Decimal('1250000'),
      status: 'ON_TIME' as const
    }
  ];

  for (const trip of trips) {
    await prisma.trip.create({
      data: {
        ...trip,
        delayMinutes: trip.delayMinutes ?? 0
      }
    });
  }

  const demoTrip = await prisma.trip.findFirstOrThrow({
    where: { origin: 'Hà Nội', destination: 'Đà Nẵng' },
    include: {
      train: {
        include: {
          carriages: {
            include: { seats: true }
          }
        }
      }
    }
  });

  const firstCarriage = demoTrip.train.carriages[0];
  const seats = firstCarriage?.seats.slice(0, 2) ?? [];
  if (seats.length === 2) {
    const booking = await prisma.booking.create({
      data: {
        code: 'BK-DEMO-001',
        userId: customer.id,
        tripId: demoTrip.id,
        status: 'PAID',
        holdExpiresAt: new Date(now.getTime() + 1000 * 60 * 5),
        totalAmount: demoTrip.price.mul(2),
        contactEmail: customer.email,
        seatCount: 2,
        bookingSeats: {
          create: seats.map((seat: { id: string }) => ({
            seatId: seat.id,
            priceSnapshot: demoTrip.price
          }))
        },
        payment: {
          create: {
            status: 'PAID',
            method: 'MOCK',
            transactionRef: 'TXN-DEMO-001',
            amount: demoTrip.price.mul(2),
            paidAt: now
          }
        },
        ticket: {
          create: {
            ticketNumber: 'TK-DEMO-001',
            qrToken: 'demo-ticket-token',
            qrDataUrl: 'mock://qr/demo-ticket-token',
            eTicketUrl: 'https://example.local/tickets/BK-DEMO-001',
            invoiceNumber: 'INV-DEMO-001'
          }
        }
      }
    });

    await prisma.notification.createMany({
      data: [
        {
          userId: customer.id,
          bookingId: booking.id,
          type: 'BOOKING_PAID',
          message: 'Vé mẫu đã được thanh toán thành công.'
        },
        {
          userId: customer.id,
          bookingId: booking.id,
          type: 'INVOICE_SENT',
          message: 'Hóa đơn điện tử mẫu đã được gửi qua email.'
        }
      ]
    });
  }

  await prisma.emailLog.createMany({
    data: [
      {
        userId: customer.id,
        kind: 'BOOKING_PAID',
        subject: 'Vé tàu đã được xác nhận',
        toEmail: customer.email,
        html: '<p>Đây là email mẫu xác nhận vé đã thanh toán.</p>'
      },
      {
        userId: customer.id,
        kind: 'INVOICE_SENT',
        subject: 'Hóa đơn điện tử',
        toEmail: customer.email,
        html: '<p>Đây là hóa đơn điện tử mẫu.</p>'
      }
    ]
  });

  console.log(`Seeded demo data. Admin: ${admin.email}, Customer: ${customer.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });