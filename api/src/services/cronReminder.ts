import { prisma } from '../lib/prisma';
import { sendNotification } from './notificationService';
import { buildReminderEmail } from './emailTemplates';
import { sendEmail } from './emailService';

export async function runReminderCron(now = new Date()) {
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60_000);

  const bookings = await prisma.booking.findMany({
    where: {
      status: 'PAID',
      trip: {
        departureTime: {
          gte: now,
          lte: twoHoursLater
        }
      }
    },
    include: {
      trip: {
        include: {
          train: true
        }
      },
      emailLogs: {
        where: {
          kind: 'TRIP_REMINDER'
        },
        select: {
          id: true
        }
      }
    }
  });

  let sentCount = 0;

  for (const booking of bookings) {
    if (booking.emailLogs.length > 0) {
      continue;
    }

    const html = buildReminderEmail({
      bookingCode: booking.code,
      trainName: booking.trip.train.name,
      origin: booking.trip.origin,
      destination: booking.trip.destination,
      departureTime: booking.trip.departureTime
    });

    await sendEmail({
      bookingId: booking.id,
      toEmail: booking.contactEmail,
      subject: 'Sap den gio khoi hanh',
      html
    });

    await sendNotification(prisma, {
      userId: booking.userId,
      bookingId: booking.id,
      type: 'REMINDER',
      message: 'Sap den gio khoi hanh'
    });

    sentCount += 1;
  }

  return {
    scanned: bookings.length,
    sentCount
  };
}
