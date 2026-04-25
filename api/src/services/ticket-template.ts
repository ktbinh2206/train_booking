export const buildTicketHtml = (booking: any, qrDataUrl: string) => {
  return `
  <!DOCTYPE html>
  <html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        background: #f5f7fb;
      }

      .container {
        width: 900px;
        margin: auto;
        background: white;
        border-radius: 12px;
        overflow: hidden;
      }

      .header {
        background: linear-gradient(135deg, #2563eb, #1e40af);
        color: white;
        padding: 24px;
      }

      .title {
        font-size: 26px;
        font-weight: bold;
      }

      .sub {
        font-size: 14px;
        opacity: 0.9;
      }

      .content {
        display: flex;
        padding: 20px;
        gap: 20px;
      }

      .qr-box {
        width: 250px;
        border: 1px solid #ddd;
        border-radius: 12px;
        padding: 16px;
        text-align: center;
      }

      .qr-box img {
        width: 180px;
      }

      .info {
        flex: 1;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .card {
        border: 1px solid #eee;
        border-radius: 10px;
        padding: 12px;
      }

      .label {
        font-size: 11px;
        color: #777;
      }

      .value {
        font-weight: bold;
        margin-top: 4px;
      }

      .section {
        padding: 20px;
        border-top: 1px solid #eee;
      }

      .footer {
        padding: 16px;
        text-align: center;
        font-size: 12px;
        color: #666;
        background: #f1f5f9;
      }
    </style>
  </head>
  <body>
    <div class="container">

      <div class="header">
        <div class="title">${booking.trip.origin} → ${booking.trip.destination}</div>
        <div class="sub">Mã đặt vé: ${booking.code}</div>
      </div>

      <div class="content">
        <div class="qr-box">
          <img src="${qrDataUrl}" />
          <p>Quét QR để mở vé</p>
        </div>

        <div class="info">
          <div class="card">
            <div class="label">MÃ ĐẶT VÉ</div>
            <div class="value">${booking.code}</div>
          </div>

          <div class="card">
            <div class="label">MÃ VÉ</div>
            <div class="value">${booking.ticket?.ticketNumber || '-'}</div>
          </div>

          <div class="card">
            <div class="label">SỐ GHẾ</div>
            <div class="value">${booking.seatCount}</div>
          </div>

          <div class="card">
            <div class="label">TỔNG TIỀN</div>
            <div class="value">${booking.totalAmount.toLocaleString()} đ</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h3>Hành trình</h3>
        <p>Khởi hành: ${new Date(booking.trip.departureTime).toLocaleString('vi-VN')}</p>
        <p>Đến nơi: ${new Date(booking.trip.arrivalTime).toLocaleString('vi-VN')}</p>
      </div>

      <div class="section">
        <h3>Hành khách</h3>
        ${booking.bookingSeats.map((s: any, i: number) => `
          <p>Hành khách ${i + 1} - Ghế ${s.seatCode}</p>
        `).join('')}
      </div>

      <div class="footer">
        Vui lòng có mặt trước 30 phút
      </div>

    </div>
  </body>
  </html>
  `;
};