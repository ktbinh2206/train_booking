import { prisma } from './lib/prisma';
import { createApp } from './app';
import { expireBooking } from './services/bookingService';
import { sendNotification } from './services/notificationService';

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

const server = app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});

const INTERVAL = 15_000; // 15s

const cleanupTimer = setInterval(async () => {
  const now = new Date();

  console.log(`[CRON] Running cleanup at ${now.toISOString()}`);

  try {
    const oneMinuteLater = new Date(now.getTime() + 60_000);
    const oneHourLater = new Date(now.getTime() + 60 * 60_000);

    /* ==============================
       1. EXPIRE HOLDING BOOKING
    ============================== */
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: 'HOLDING',
        holdExpiresAt: { lt: now }
      },
      select: { id: true }
    });

    await Promise.all(
      expiredBookings.map((b) =>
        expireBooking(b.id, 'Booking hết hạn giữ chỗ và đã bị hủy tự động.')
      )
    );

    /* ==============================
       2. HOLD EXPIRE WARNING (<1 phút)
    ============================== */
    const soonExpireBookings = await prisma.booking.findMany({
      where: {
        status: 'HOLDING',
        holdExpiresAt: {
          gt: now,
          lte: oneMinuteLater
        }
      },
      select: {
        id: true,
        code: true,
        userId: true,
        contactEmail: true,
        notifications: {
          where: { type: 'HOLD_EXPIRE' },
          select: { id: true }
        }
      }
    });

    for (const booking of soonExpireBookings) {
      if (booking.notifications.length > 0) continue;

      await sendNotification({
        userId: booking.userId,
        bookingId: booking.id,
        type: 'HOLD_EXPIRE',
        message: `Booking ${booking.code} sẽ hết hạn trong chưa đến 1 phút.`,
        toEmail: booking.contactEmail
      });
    }

    /* ==============================
      3. REMINDER TRƯỚC 1 GIỜ
   ============================== */
    const reminderBookings = await prisma.booking.findMany({
      where: {
        status: 'PAID',
        OR: [
          {
            trip: {
              delayedDepartureTime: {
                gt: now,
                lte: oneHourLater
              }
            }
          },
          {
            trip: {
              delayedDepartureTime: null,
              departureTime: {
                gt: now,
                lte: oneHourLater
              }
            }
          }
        ]
      },
      include: {
        trip: true,
        notifications: {
          where: { type: 'REMINDER' }
        }
      }
    });

    for (const booking of reminderBookings) {
      if (booking.notifications.length > 0) continue;

      const departure =
        booking.trip.delayedDepartureTime ?? booking.trip.departureTime;

      await sendNotification({
        userId: booking.userId,
        bookingId: booking.id,
        type: 'REMINDER',
        message: `Nhắc chuyến: tàu ${booking.trip.origin} - ${booking.trip.destination} sẽ khởi hành lúc ${departure.toISOString()}.`,
        toEmail: booking.contactEmail
      });
    }

    /* ==============================
       4. DELAY NOTIFICATION
    ============================== */
    const delayedTrips = await prisma.trip.findMany({
      where: {
        status: 'DELAYED'
      },
      include: {
        bookings: {
          where: { status: 'PAID' },
          include: {
            notifications: {
              where: { type: 'DELAY' }
            }
          }
        }
      }
    });

    for (const trip of delayedTrips) {
      for (const booking of trip.bookings) {
        if (booking.notifications.length > 0) continue;

        await sendNotification({
          userId: booking.userId,
          bookingId: booking.id,
          type: 'DELAY',
          message: `Chuyến ${trip.origin} - ${trip.destination} bị delay ${trip.delayMinutes} phút.`,
          toEmail: booking.contactEmail
        });
      }
    }

    /* ==============================
       5. AUTO TRIP → DEPARTED
    ============================== */
    const departedTrips = await prisma.trip.updateMany({
      where: {
        status: { in: ['ON_TIME', 'DELAYED'] },
        OR: [
          {
            delayedDepartureTime: {
              lte: now
            }
          },
          {
            delayedDepartureTime: null,
            departureTime: {
              lte: now
            }
          }
        ]
      },
      data: {
        status: 'DEPARTED'
      }
    });

    /* ==============================
       6. AUTO TRIP → COMPLETED
    ============================== */
    await prisma.trip.updateMany({
      where: {
        status: 'DEPARTED',
        arrivalTime: { lte: now }
      },
      data: {
        status: 'COMPLETED'
      }
    });


  } catch (err) {
    console.error('CRON ERROR:', err);
  }

}, INTERVAL);

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