import { prisma } from './lib/prisma';
import { createApp } from './app';
import { expireHoldingBookingsForCron } from './services/bookingService';
import { sendNotification } from './services/notificationService';
import { runReminderCron } from './services/cronReminder';

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

const server = app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});

const INTERVAL = 10_000; // 10s
const REMINDER_INTERVAL = 10_000; // 10 seconds

const cleanupTimer = setInterval(async () => {
  const now = new Date();

  console.log(`[CRON] Running cleanup at ${now.toISOString()}`);

  try {
    const oneMinuteLater = new Date(now.getTime() + 60_000);

    /* ==============================
       1. EXPIRE HOLDING BOOKING
    ============================== */
    await expireHoldingBookingsForCron(now);

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

      await sendNotification(prisma, {
        userId: booking.userId,
        bookingId: booking.id,
        type: 'HOLD_EXPIRE',
        message: `Booking ${booking.code} sẽ hết hạn trong chưa đến 1 phút.`,
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

        await sendNotification(prisma, {
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

const reminderTimer = setInterval(async () => {
  const now = new Date();
  try {
    const summary = await runReminderCron(now);
    if (summary.sentCount > 0) {
      console.log(`[CRON] Reminder sent=${summary.sentCount} scanned=${summary.scanned} at ${now.toISOString()}`);
    }
  } catch (error) {
    console.error('REMINDER CRON ERROR:', error);
  }
}, REMINDER_INTERVAL);

reminderTimer.unref();

process.on('SIGINT', async () => {
  clearInterval(cleanupTimer);
  clearInterval(reminderTimer);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  clearInterval(cleanupTimer);
  clearInterval(reminderTimer);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
});