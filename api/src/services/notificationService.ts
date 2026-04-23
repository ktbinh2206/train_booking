import { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export type NotificationEventType = 'REMINDER' | 'DELAY' | 'CANCEL' | 'HOLD_EXPIRE';
type NotificationDbClient = typeof prisma | Prisma.TransactionClient;

function toDbNotificationType(type: NotificationEventType): NotificationType {
  if (type === 'REMINDER') return NotificationType.REMINDER;
  if (type === 'DELAY') return NotificationType.DELAY;
  if (type === 'CANCEL') return NotificationType.CANCEL;
  return NotificationType.HOLD_EXPIRE;
}

export async function sendNotification(db: NotificationDbClient, input: {
  userId: string;
  type: NotificationEventType;
  message: string;
  bookingId?: string;
  toEmail?: string;
  toPhone?: string;
}) {
  const notification = await db.notification.create({
    data: {
      userId: input.userId,
      type: toDbNotificationType(input.type),
      message: input.message,
      ...(input.bookingId && { bookingId: input.bookingId })
    }
  });

  if (input.toEmail) {
    console.log(`[MockEmail] to=${input.toEmail} type=${input.type} message=${input.message}`);
    await db.emailLog.create({
      data: {
        userId: input.userId,
        ...(input.bookingId && { bookingId: input.bookingId }),
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
