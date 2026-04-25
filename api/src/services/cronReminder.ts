import { prisma } from '../lib/prisma';
import { addMinutes } from '../lib/dates';
import { renderReminderEmail } from './emailTemplates';
import { sendEmail } from './emailService';

export async function runReminderCron(now = new Date()) {
  const to = addMinutes(now, 60);
  const reminderType = 'REMINDER_BEFORE_DEPARTURE' as any;

  const bookings = await prisma.booking.findMany({
    where: {
      status: 'PAID',
      trip: {
        departureTime: {
          lte: to
        }
      }
    },
    include: {
      trip: {
        include: {
          train: true
        }
        },
        bookingSeats: {
          include: {
            seat: true
          }
      }
    }
  });

  console.log(`Found ${bookings.length} bookings departing between ${now.toISOString()} and ${to.toISOString()}`);

  let sentCount = 0;

  for (const booking of bookings) {
      const existed = await prisma.notification.findFirst({
        where: {
          bookingId: booking.id,
          type: reminderType
        },
        select: {
          id: true
        }
      });

      if (existed) {
      continue;
    }

      const seatCodes = booking.bookingSeats
        .map((item) => item.seat?.seatNumber)
        .filter((code): code is string => Boolean(code));

      const ticketUrl = `${(process.env.FRONTEND_URL ?? process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')}/tickets/${booking.id}`;
      const html = renderReminderEmail({
        booking: {
          id: booking.id,
          code: booking.code,
          contactEmail: booking.contactEmail,
          contactPhone: null,
          seatCodes,
          trip: {
            origin: booking.trip.origin,
            destination: booking.trip.destination,
            departureTime: booking.trip.departureTime,
            trainName: booking.trip.train.name
          }
        },
        ticketUrl
      });

      const sendResult = await sendEmail({
        bookingId: booking.id,
        toEmail: booking.contactEmail,
        subject: `Nhắc chuyến: ${booking.code}`,
        html,
        text: `Nhắc chuyến sắp khởi hành\nMã đặt vé: ${booking.code}\nTuyến: ${booking.trip.origin} -> ${booking.trip.destination}\nGiờ khởi hành: ${booking.trip.departureTime.toISOString()}\nXem vé: ${ticketUrl}`
      });

      if (!sendResult) {
        continue;
      }

      await prisma.notification.create({
        data: {
          userId: booking.userId,
          bookingId: booking.id,
          type: reminderType,
          message: 'Nhắc chuyến sắp khởi hành'
        }
    });

    sentCount += 1;
  }

  return {
    scanned: bookings.length,
    sentCount
  };
}
