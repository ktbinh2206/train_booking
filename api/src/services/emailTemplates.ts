export type BookingEmailStatus = 'HOLDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';

type TicketHtmlBookingInput = {
  id: string;
  code: string;
  contactEmail: string;
  totalAmount: number | string;
  seatCount: number;
  trip: {
    origin: string;
    destination: string;
    departureTime: Date;
    trainName: string;
  };
};

type TicketHtmlInput = {
  booking: TicketHtmlBookingInput;
  ticket: {
    id: string;
    ticketNumber: string;
    qrDataUrl: string;
    qrImageSrc?: string;
  };
};

type BookingEmailInput = {
  userName: string;
  booking: {
    code: string;
    status: BookingEmailStatus;
    totalAmount: number;
    contactEmail: string;
    holdExpiresAt?: Date | null;
  };
  trip: {
    trainCode: string;
    trainName: string;
    origin: string;
    destination: string;
    departureTime: Date;
    arrivalTime: Date;
  };
  passengers: Array<{
    name: string;
    type: string;
    seatNumber: string;
  }>;
  payment: {
    method: string;
    status: string;
  };
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatVnDateTime(date: Date) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount));
}

function formatAmountVnd(amount: number | string) {
  const normalized = typeof amount === 'number' ? amount : Number.parseFloat(String(amount));
  if (Number.isNaN(normalized)) {
    return `${amount} VND`;
  }
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(normalized))} VND`;
}

export function buildTicketEmailHtml(input: TicketHtmlInput) {
  const frontendUrl = process.env.FRONTEND_URL ?? process.env.APP_URL ?? 'http://localhost:3000';
  const ticketUrl = `${frontendUrl}/tickets/${input.booking.id}`;
  const qrImageSrc = input.ticket.qrImageSrc ?? input.ticket.qrDataUrl;

  return `
  <div style="font-family:Arial,sans-serif;background:#f1f5f9;padding:24px 12px;color:#0f172a">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dbeafe">
      <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;padding:20px 24px">
        <h1 style="margin:0;font-size:28px;letter-spacing:0.5px">VÉ ĐIỆN TỬ</h1>
        <p style="margin:8px 0 0;font-size:16px;opacity:.95">${escapeHtml(input.booking.trip.origin)} → ${escapeHtml(input.booking.trip.destination)}</p>
      </div>

      <div style="padding:24px">
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;margin-bottom:16px">
          <h2 style="margin:0 0 12px;font-size:18px;color:#1e293b">Thông tin vé</h2>
          <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">
            <tbody>
              <tr><td style="padding:8px 0;color:#64748b;width:40%">Mã đặt vé</td><td style="padding:8px 0;font-weight:700">${escapeHtml(input.booking.code)}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b">Mã vé</td><td style="padding:8px 0;font-weight:700">${escapeHtml(input.ticket.ticketNumber)}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b">Tàu</td><td style="padding:8px 0">${escapeHtml(input.booking.trip.trainName)}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b">Tuyến</td><td style="padding:8px 0">${escapeHtml(input.booking.trip.origin)} → ${escapeHtml(input.booking.trip.destination)}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b">Thời gian</td><td style="padding:8px 0">${escapeHtml(formatVnDateTime(input.booking.trip.departureTime))}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b">Số ghế</td><td style="padding:8px 0">${input.booking.seatCount}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b">Tổng tiền</td><td style="padding:8px 0;font-weight:700;color:#2563eb">${escapeHtml(formatAmountVnd(input.booking.totalAmount))}</td></tr>
            </tbody>
          </table>
        </div>

        <div style="text-align:center;padding:8px 0 18px">
          <p style="margin:0 0 10px;font-size:13px;color:#64748b">Quét mã QR hoặc bấm vào mã để mở vé điện tử</p>
          <a href="${escapeHtml(ticketUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none">
            <img src="${escapeHtml(qrImageSrc)}" alt="QR vé điện tử" width="180" height="180" style="display:block;border:1px solid #dbeafe;border-radius:10px;padding:8px;background:#ffffff" />
          </a>
        </div>

        <div style="text-align:center;margin-bottom:16px">
          <a href="${escapeHtml(ticketUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;font-size:14px">
            Xem vé điện tử
          </a>
        </div>

        <div style="font-size:12px;line-height:1.6;color:#475569;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 14px">
          Vui lòng có mặt tại ga trước giờ khởi hành ít nhất 30 phút và mang theo giấy tờ tùy thân để đối chiếu thông tin.
        </div>
      </div>
    </div>
  </div>`;
}

function getSubject(status: BookingEmailStatus, code: string) {
  switch (status) {
    case 'HOLDING':
      return `Giữ chỗ thành công - ${code}`;
    case 'PAID':
      return `Xác nhận thanh toán thành công - ${code}`;
    case 'CANCELLED':
      return `Thông báo hủy vé - ${code}`;
    case 'REFUNDED':
      return `Hoàn tiền thành công - ${code}`;
    default:
      return `Thông tin đặt vé - ${code}`;
  }
}

function getStatusLabel(status: BookingEmailStatus) {
  switch (status) {
    case 'HOLDING':
      return 'Đang giữ chỗ';
    case 'PAID':
      return 'Đã thanh toán';
    case 'CANCELLED':
      return 'Đã hủy';
    case 'REFUNDED':
      return 'Đã hoàn tiền';
    default:
      return status;
  }
}

function normalizePassengerType(input: string) {
  const normalized = input.trim().toUpperCase();
  if (normalized === 'ADULT') return 'Người lớn';
  if (normalized === 'CHILD') return 'Trẻ em';
  if (normalized === 'SENIOR') return 'Người cao tuổi';
  return input;
}

export function buildBookingEmail(input: BookingEmailInput) {
  const subject = getSubject(input.booking.status, input.booking.code);
  const statusLabel = getStatusLabel(input.booking.status);
  const totalAmountLabel = `${formatVnd(input.booking.totalAmount)} VND`;
  const seatCount = input.passengers.length;
  const holdExpiresAtLabel = input.booking.holdExpiresAt ? formatVnDateTime(input.booking.holdExpiresAt) : null;
  const safeName = escapeHtml(input.userName || 'Quý khách');

  const passengerText = input.passengers
    .map((passenger) => `- ${passenger.name} (${normalizePassengerType(passenger.type)}) - Ghế: ${passenger.seatNumber}`)
    .join('\n');

  const text = `Xin chào ${input.userName},

Cảm ơn bạn đã sử dụng dịch vụ đặt vé tàu.

----------------------------------------
THÔNG TIN ĐẶT VÉ
----------------------------------------

Mã đơn: ${input.booking.code}
Trạng thái: ${statusLabel}
Số ghế: ${seatCount}
Tổng tiền: ${totalAmountLabel}

----------------------------------------
THÔNG TIN CHUYẾN TÀU
----------------------------------------

Tàu: ${input.trip.trainCode} - ${input.trip.trainName}
Hành trình: ${input.trip.origin} → ${input.trip.destination}
Khởi hành: ${formatVnDateTime(input.trip.departureTime)}
Dự kiến đến: ${formatVnDateTime(input.trip.arrivalTime)}

----------------------------------------
DANH SÁCH HÀNH KHÁCH
----------------------------------------

${passengerText || '- Chưa có thông tin hành khách'}

----------------------------------------
THÔNG TIN THANH TOÁN
----------------------------------------

Phương thức: ${input.payment.method}
Trạng thái: ${input.payment.status}
${holdExpiresAtLabel
  ? `

----------------------------------------
LƯU Ý
----------------------------------------
Giữ chỗ sẽ hết hạn vào: ${holdExpiresAtLabel}
Vui lòng hoàn tất thanh toán trước thời gian này.`
  : ''}

----------------------------------------

Mọi thắc mắc vui lòng liên hệ hỗ trợ.

Trân trọng,
Hệ thống đặt vé tàu`;

  const passengersHtml = input.passengers
    .map((passenger) => `<li style="margin:0 0 8px;color:#1f2937">${escapeHtml(passenger.name)} (${escapeHtml(normalizePassengerType(passenger.type))}) - Ghế: <strong>${escapeHtml(passenger.seatNumber)}</strong></li>`)
    .join('');

  const html = `
  <div style="font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#f6f8fb;padding:24px 12px;color:#0f172a">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:#0b3a8a;padding:20px 24px;color:#ffffff">
        <h1 style="margin:0;font-size:22px;line-height:1.3">Thông tin đặt vé tàu</h1>
        <p style="margin:8px 0 0;font-size:14px;opacity:.95">Xin chào ${safeName}, cảm ơn bạn đã sử dụng dịch vụ đặt vé tàu.</p>
      </div>

      <div style="padding:20px 24px">
        <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a">Thông tin đặt vé</h2>
        <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px">
          <tbody>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f8fafc;width:35%">Mã đơn</td><td style="padding:10px;border:1px solid #e5e7eb;font-weight:600">${escapeHtml(input.booking.code)}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f8fafc">Trạng thái</td><td style="padding:10px;border:1px solid #e5e7eb"><span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#e0ecff;color:#1d4ed8;font-weight:600">${escapeHtml(statusLabel)}</span></td></tr>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f8fafc">Số ghế</td><td style="padding:10px;border:1px solid #e5e7eb">${seatCount}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f8fafc">Tổng tiền</td><td style="padding:10px;border:1px solid #e5e7eb;font-weight:700;color:#b91c1c">${escapeHtml(totalAmountLabel)}</td></tr>
          </tbody>
        </table>

        <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a">Chuyến tàu</h2>
        <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px">
          <tbody>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f8fafc;width:35%">Tàu</td><td style="padding:10px;border:1px solid #e5e7eb">${escapeHtml(input.trip.trainCode)} - ${escapeHtml(input.trip.trainName)}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f8fafc">Hành trình</td><td style="padding:10px;border:1px solid #e5e7eb">${escapeHtml(input.trip.origin)} → ${escapeHtml(input.trip.destination)}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f8fafc">Khởi hành</td><td style="padding:10px;border:1px solid #e5e7eb">${escapeHtml(formatVnDateTime(input.trip.departureTime))}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f8fafc">Dự kiến đến</td><td style="padding:10px;border:1px solid #e5e7eb">${escapeHtml(formatVnDateTime(input.trip.arrivalTime))}</td></tr>
          </tbody>
        </table>

        <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a">Hành khách</h2>
        <ul style="margin:0 0 20px 18px;padding:0;font-size:14px">
          ${passengersHtml || '<li>Chưa có thông tin hành khách</li>'}
        </ul>

        <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a">Thanh toán</h2>
        <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px">
          <tbody>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f8fafc;width:35%">Phương thức</td><td style="padding:10px;border:1px solid #e5e7eb">${escapeHtml(input.payment.method)}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f8fafc">Trạng thái</td><td style="padding:10px;border:1px solid #e5e7eb">${escapeHtml(input.payment.status)}</td></tr>
          </tbody>
        </table>

        ${holdExpiresAtLabel
          ? `<div style="border:1px solid #f59e0b;background:#fff7ed;border-radius:10px;padding:12px 14px;margin-bottom:18px">
              <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#92400e">Lưu ý</p>
              <p style="margin:0;font-size:14px;color:#7c2d12">Giữ chỗ sẽ hết hạn vào: <strong>${escapeHtml(holdExpiresAtLabel)}</strong>. Vui lòng hoàn tất thanh toán trước thời gian này.</p>
            </div>`
          : ''}

        <p style="margin:0;font-size:14px;color:#334155">Mọi thắc mắc vui lòng liên hệ hỗ trợ.</p>
        <p style="margin:6px 0 0;font-size:14px;color:#334155">Trân trọng,<br/>Hệ thống đặt vé tàu</p>
      </div>
    </div>
  </div>`;

  return {
    subject,
    html,
    text
  };
}

export function buildReminderEmail(input: {
  bookingCode: string;
  trainName: string;
  origin: string;
  destination: string;
  departureTime: Date;
}) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#111827;line-height:1.6">
    <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#ffffff">
      <div style="background:#0f766e;color:#ffffff;padding:16px 20px">
        <h2 style="margin:0;font-size:20px">Sap den gio khoi hanh</h2>
      </div>
      <div style="padding:20px">
        <p>Booking <strong>${input.bookingCode}</strong> sap khoi hanh.</p>
        <p style="margin:0 0 8px"><strong>Tau:</strong> ${input.trainName}</p>
        <p style="margin:0 0 8px"><strong>Tuyen:</strong> ${input.origin} -> ${input.destination}</p>
        <p style="margin:0"><strong>Gio khoi hanh:</strong> ${formatVnDateTime(input.departureTime)}</p>
      </div>
    </div>
  </div>
  `;
}

export function renderReminderEmail(input: {
  booking: {
    id: string;
    code: string;
    contactEmail: string;
    contactPhone?: string | null;
    seatCodes: string[];
    trip: {
      origin: string;
      destination: string;
      departureTime: Date;
      trainName?: string | null;
    };
  };
  ticketUrl: string;
}) {
  const seatCodesLabel = input.booking.seatCodes.length > 0
    ? input.booking.seatCodes.join(', ')
    : '-';

  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #eee;border-radius:8px;overflow:hidden;background:#ffffff;color:#0f172a">
    <div style="background:#2563eb;color:#ffffff;padding:16px">
      <h2 style="margin:0 0 6px;font-size:22px">Nhắc chuyến sắp khởi hành</h2>
      <p style="margin:0;font-size:14px">${escapeHtml(input.booking.trip.origin)} → ${escapeHtml(input.booking.trip.destination)}</p>
    </div>

    <div style="padding:16px">
      <h3 style="margin:0 0 10px;font-size:18px">Thông tin đặt vé</h3>
      <p style="margin:0 0 8px"><b>Mã đặt vé:</b> ${escapeHtml(input.booking.code)}</p>
      <p style="margin:0 0 8px"><b>Tàu:</b> ${escapeHtml(input.booking.trip.trainName ?? '-')}</p>
      <p style="margin:0 0 8px"><b>Thời gian:</b> ${escapeHtml(formatVnDateTime(input.booking.trip.departureTime))}</p>
      <p style="margin:0 0 14px"><b>Ghế:</b> ${escapeHtml(seatCodesLabel)}</p>

      <h3 style="margin:0 0 10px;font-size:18px">Thông tin liên hệ</h3>
      <p style="margin:0 0 8px"><b>Email:</b> ${escapeHtml(input.booking.contactEmail)}</p>
      <p style="margin:0 0 14px"><b>SĐT:</b> ${escapeHtml(input.booking.contactPhone ?? '-')}</p>

      <div style="margin-top:20px;text-align:center">
        <a href="${escapeHtml(input.ticketUrl)}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:700">
          Xem vé điện tử
        </a>
      </div>

      <p style="margin-top:20px;font-size:12px;color:#555555">
        Vui lòng có mặt tại ga trước ít nhất 30 phút và mang theo giấy tờ tùy thân.
      </p>
    </div>
  </div>
  `;
}
