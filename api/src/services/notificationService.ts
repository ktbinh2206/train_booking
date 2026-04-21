import { NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma';

export type NotificationEventType = 'REMINDER' | 'DELAY' | 'CANCEL' | 'HOLD_EXPIRE';

function toDbNotificationType(type: NotificationEventType): NotificationType {
  if (type === 'REMINDER') return NotificationType.REMINDER;
  if (type === 'DELAY') return NotificationType.DELAY;
  if (type === 'CANCEL') return NotificationType.CANCEL;
  return NotificationType.HOLD_EXPIRE;
}

export async function sendNotification(input: {
  userId: string;
  type: NotificationEventType;
  message: string;
  bookingId?: string;
  toEmail?: string;
  toPhone?: string;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      bookingId: input.bookingId,
      type: toDbNotificationType(input.type),
      message: input.message
    }
  });

  if (input.toEmail) {
    console.log(`[MockEmail] to=${input.toEmail} type=${input.type} message=${input.message}`);
    await prisma.emailLog.create({
      data: {
        userId: input.userId,
        bookingId: input.bookingId,
        kind: input.type,
        subject: `[${input.type}] Train booking notification`,
        toEmail: input.toEmail,
        html: `<p>${input.message}</p>`
      }
    });
  }

  // SMS is mocked by console log for now.
  if (input.toPhone) {
    console.log(`[MockSMS] to=${input.toPhone} type=${input.type} message=${input.message}`);
  }

  return notification;
}
