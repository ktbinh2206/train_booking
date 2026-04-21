"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordEmail = recordEmail;
exports.createNotification = createNotification;
exports.buildInvoiceHtml = buildInvoiceHtml;
const prisma_1 = require("./prisma");
async function recordEmail(input) {
    const data = {
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
    return prisma_1.prisma.emailLog.create({ data });
}
async function createNotification(input) {
    const data = {
        userId: input.userId,
        type: input.type,
        message: input.message
    };
    if (input.bookingId) {
        data.bookingId = input.bookingId;
    }
    return prisma_1.prisma.notification.create({ data });
}
function buildInvoiceHtml(args) {
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
