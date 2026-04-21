import { prisma } from './lib/prisma';
import { createApp } from './app';
import { expireBooking } from './services/bookingService';
import { sendNotification } from './services/notificationService';

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

const server = app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});

const cleanupTimer = setInterval(async () => {
  const now = new Date();

  const [expiredBookings, soonExpireBookings, reminderCandidates] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: 'HOLDING',
        expiredAt: { lt: now }
      },
      select: { id: true }
    }),
    prisma.booking.findMany({
      where: {
        status: 'HOLDING',
        expiredAt: {
          gt: now,
          lte: new Date(now.getTime() + 60_000)
        }
      },
      include: {
        notifications: { where: { type: 'HOLD_EXPIRE' } }
      }
    }),
    prisma.booking.findMany({
      where: {
        status: 'PAID',
        OR: [
          { trip: { delayedDepartureTime: { gt: now, lte: new Date(now.getTime() + 60 * 60_000) } } },
          {
            trip: {
              delayedDepartureTime: null,
              departureTime: { gt: now, lte: new Date(now.getTime() + 60 * 60_000) }
            }
          }
        ]
      },
      include: {
        trip: true,
        notifications: { where: { type: 'REMINDER' } }
      }
    })
  ]);

  for (const booking of expiredBookings) {
    await expireBooking(booking.id, 'Booking hết hạn giữ chỗ và đã bị hủy tự động.');
  }

  for (const booking of soonExpireBookings) {
    if (booking.notifications.length > 0) {
      continue;
    }

    await sendNotification({
      userId: booking.userId,
      bookingId: booking.id,
      type: 'HOLD_EXPIRE',
      message: `Booking ${booking.code} sẽ hết hạn trong chưa đến 1 phút.`,
      toEmail: booking.contactEmail
    });
  }

  for (const booking of reminderCandidates) {
    if (booking.notifications.length > 0) {
      continue;
    }

    const departure = booking.trip.delayedDepartureTime ?? booking.trip.departureTime;
    await sendNotification({
      userId: booking.userId,
      bookingId: booking.id,
      type: 'REMINDER',
      message: `Nhắc chuyến: tàu ${booking.trip.origin} - ${booking.trip.destination} sẽ khởi hành lúc ${departure.toISOString()}.`,
      toEmail: booking.contactEmail
    });
  }
}, 60_000);

cleanupTimer.unref();

process.on('SIGINT', async () => {
  clearInterval(cleanupTimer);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  clearInterval(cleanupTimer);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
});