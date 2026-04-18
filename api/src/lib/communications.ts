import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

type EmailInput = {
  userId?: string;
  bookingId?: string;
  toEmail: string;
  subject: string;
  kind: string;
  html: string;
};

type NotificationInput = {
  userId: string;
  bookingId?: string;
  type: 'BOOKING_HELD' | 'BOOKING_PAID' | 'TRIP_DELAYED' | 'TRIP_CANCELLED' | 'REFUND_ISSUED' | 'INVOICE_SENT' | 'BOOKING_EXPIRED';
  message: string;
};

export async function recordEmail(input: EmailInput) {
  const data: any = {
    kind: input.kind,
    subject: input.subject,
    toEmail: input.toEmail,
    html: input.html
  };

  if (input.userId) {
    data.userId = input.userId;
  }

  if (input.bookingId) {
    data.bookingId = input.bookingId;
  }

  return prisma.emailLog.create({ data });
}

export async function createNotification(input: NotificationInput) {
  const data: any = {
    userId: input.userId,
    type: input.type,
    message: input.message
  };

  if (input.bookingId) {
    data.bookingId = input.bookingId;
  }

  return prisma.notification.create({ data });
}

export function buildInvoiceHtml(args: {
  bookingCode: string;
  ticketNumber: string;
  tripLabel: string;
  seatLabels: string[];
  amount: Prisma.Decimal;
  customerName: string;
}) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>Hóa đơn điện tử</h2>
      <p>Khách hàng: ${args.customerName}</p>
      <p>Mã đặt vé: ${args.bookingCode}</p>
      <p>Mã vé: ${args.ticketNumber}</p>
      <p>Chuyến: ${args.tripLabel}</p>
      <p>Ghế: ${args.seatLabels.join(', ')}</p>
      <p>Tổng tiền: ${args.amount.toString()} VND</p>
    </div>
  `;
}