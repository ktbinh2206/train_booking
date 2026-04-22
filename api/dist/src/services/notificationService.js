"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = sendNotification;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
function toDbNotificationType(type) {
    if (type === 'REMINDER')
        return client_1.NotificationType.REMINDER;
    if (type === 'DELAY')
        return client_1.NotificationType.DELAY;
    if (type === 'CANCEL')
        return client_1.NotificationType.CANCEL;
    return client_1.NotificationType.HOLD_EXPIRE;
}
async function sendNotification(input) {
    const notification = await prisma_1.prisma.notification.create({
        data: {
            userId: input.userId,
            bookingId: input.bookingId,
            type: toDbNotificationType(input.type),
            message: input.message
        }
    });
    if (input.toEmail) {
        console.log(`[MockEmail] to=${input.toEmail} type=${input.type} message=${input.message}`);
        await prisma_1.prisma.emailLog.create({
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
