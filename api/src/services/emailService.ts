import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { prisma } from '../lib/prisma';

type SendEmailInput = {
  toEmail: string;
  subject: string;
  html: string;
  text?: string;
  bookingId?: string;
  attachments?: SMTPTransport.Options['attachments'];
};

let transporter: nodemailer.Transporter | null = null;

function resolveEmailKind(subject: string) {
  const normalized = subject.toLowerCase();
  if (normalized.includes('sap den gio khoi hanh')) {
    return 'TRIP_REMINDER';
  }
  if (normalized.includes('ve tau') || normalized.includes('ve tau dien tu')) {
    return 'BOOKING_PAID';
  }
  return 'GENERAL';
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const host = process.env.EMAIL_HOST;
  const port = Number.parseInt(process.env.EMAIL_PORT ?? '587', 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass || Number.isNaN(port)) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });

  return transporter;
}

export async function sendEmail(input: SendEmailInput) {
  try {
    const emailLog = await prisma.emailLog.create({
      data: {
        ...(input.bookingId ? { bookingId: input.bookingId } : {}),
        kind: resolveEmailKind(input.subject),
        subject: input.subject,
        toEmail: input.toEmail,
        html: input.html
      }
    });

    const smtp = getTransporter();
    if (!smtp) {
      console.error('[EMAIL] SMTP is not configured. Skipping send.');
      return emailLog;
    }

    await smtp.sendMail({
      from: process.env.EMAIL_USER,
      to: input.toEmail,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments
    });

    return emailLog;
  } catch (error) {
    console.error('[EMAIL] Failed to send email:', error);
    return null;
  }
}
