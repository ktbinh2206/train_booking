import { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { sendEmail } from './emailService';
import { buildTicketEmailHtml } from './emailTemplates';

export type NotificationEventType = 'REMINDER' | 'DELAY' | 'CANCEL' | 'HOLD_EXPIRE';
type NotificationDbClient = typeof prisma | Prisma.TransactionClient;

function toDbNotificationType(type: NotificationEventType): NotificationType {
  if (type === 'REMINDER') return NotificationType.REMINDER;
  if (type === 'DELAY') return NotificationType.DELAY;
  if (type === 'CANCEL') return NotificationType.CANCEL;
  return NotificationType.HOLD_EXPIRE;
}

function buildBookingStatusSubject(status: 'HOLDING' | 'PAID' | 'CANCELLED' | 'REFUNDED', code: string) {
  if (status === 'HOLDING') return `Giữ chỗ thành công - ${code}`;
  if (status === 'PAID') return `Xác nhận thanh toán thành công - ${code}`;
  if (status === 'CANCELLED') return `Thông báo hủy vé - ${code}`;
  return `Hoàn tiền thành công - ${code}`;
}

export async function sendNotification(db: NotificationDbClient, input: {
  userId: string;
  type: NotificationEventType;
  message: string;
  bookingId?: string;
  toEmail?: string;
  toPhone?: string;
  ticket?: {
    id: string;
    ticketNumber: string;
    qrDataUrl: string;
  };
}) {
  const bookingForEmail = input.bookingId
    ? await db.booking.findUnique({
        where: { id: input.bookingId },
        select: {
          id: true,
          code: true,
          status: true,
          contactEmail: true,
          totalAmount: true,
          seatCount: true,
          trip: {
            select: {
              origin: true,
              destination: true,
              departureTime: true,
              train: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      })
    : null;

  const resolvedBookingEmail = bookingForEmail?.contactEmail ?? input.toEmail;

  const notification = await db.notification.create({
    data: {
      userId: input.userId,
      type: toDbNotificationType(input.type),
      message: input.message,
      ...(input.bookingId && { bookingId: input.bookingId })
    }
  });

  if (resolvedBookingEmail) {
    const canSendSmtp = db === prisma;

    if (input.ticket && bookingForEmail) {
      const bookingStatus = bookingForEmail.status as 'HOLDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
      const subject = buildBookingStatusSubject(bookingStatus, bookingForEmail.code);
      const qrCid = `ticket-qr-${bookingForEmail.id}`;
      let attachments: SMTPTransport.Options['attachments'] | undefined;

      if (input.ticket.qrDataUrl.startsWith('data:image/')) {
        const match = input.ticket.qrDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (match) {
          attachments = [{
            filename: `${input.ticket.ticketNumber}.png`,
            content: Buffer.from(match[2], 'base64'),
            contentType: match[1],
            cid: qrCid
          }];
        }
      }

      const html = buildTicketEmailHtml({
        booking: {
          id: bookingForEmail.id,
          code: bookingForEmail.code,
          contactEmail: bookingForEmail.contactEmail,
          totalAmount: bookingForEmail.totalAmount.toString(),
          seatCount: bookingForEmail.seatCount,
          trip: {
            origin: bookingForEmail.trip.origin,
            destination: bookingForEmail.trip.destination,
            departureTime: bookingForEmail.trip.departureTime,
            trainName: bookingForEmail.trip.train.name
          }
        },
        ticket: {
          id: input.ticket.id,
          ticketNumber: input.ticket.ticketNumber,
          qrDataUrl: input.ticket.qrDataUrl,
          qrImageSrc: attachments ? `cid:${qrCid}` : input.ticket.qrDataUrl
        }
      });

      if (canSendSmtp) {
        await sendEmail({
          bookingId: bookingForEmail.id,
          toEmail: bookingForEmail.contactEmail,
          subject,
          html,
          text: `Xin chào,\nVé điện tử của bạn đã sẵn sàng. Vui lòng mở vé tại: ${process.env.FRONTEND_URL ?? process.env.APP_URL ?? 'http://localhost:3000'}/tickets/${bookingForEmail.id}`,
          attachments
        });
      } else {
        await db.emailLog.create({
          data: {
            userId: input.userId,
            ...(input.bookingId && { bookingId: input.bookingId }),
            kind: input.type,
            subject,
            toEmail: bookingForEmail.contactEmail,
            html
          }
        });
      }
    } else {
      const subject = `[${input.type}] Train booking notification`;
      const html = `<p>${input.message}</p>`;

      if (canSendSmtp) {
        await sendEmail({
          bookingId: input.bookingId,
          toEmail: resolvedBookingEmail,
          subject,
          html,
          text: input.message
        });
      } else {
        await db.emailLog.create({
          data: {
            userId: input.userId,
            ...(input.bookingId && { bookingId: input.bookingId }),
            kind: input.type,
            subject,
            toEmail: resolvedBookingEmail,
            html
          }
        });
      }
    }
  }

  // SMS is mocked by console log for now.
  if (input.toPhone) {
    console.log(`[MockSMS] to=${input.toPhone} type=${input.type} message=${input.message}`);
  }

  return notification;
}
