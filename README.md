# Train Booking System

Hệ thống đặt vé tàu full-flow với Next.js App Router + Express + Prisma + PostgreSQL.

---

## Tổng quan

Hệ thống hỗ trợ toàn bộ vòng đời đặt vé:

- Tìm chuyến
- Chọn ghế
- Giữ chỗ (HOLDING)
- Checkout cập nhật thông tin
- Thanh toán
- Xuất vé điện tử (QR)
- Gửi email vé
- Trang vé public
- Hủy vé & hoàn tiền
- Realtime seat
- Cron vận hành tự động

---

## Tech Stack

- **Frontend**: Next.js (App Router)
- **Backend**: Node.js + Express + Prisma
- **Database**: PostgreSQL (Docker)
- **Realtime**: Server-Sent Events (SSE)

---

## Tính năng chính

### 1. Checkout cập nhật trước thanh toán

- Endpoint: `POST /api/bookings/update-checkout`
- Chỉ update booking `HOLDING`, không tạo mới
- Cập nhật:
  - `contactEmail`
  - `contactPhone`
  - thông tin hành khách theo từng ghế

---

### 2. Vé điện tử + QR

- Khi thanh toán thành công:
  - Sinh QR bằng `QRCode.toDataURL`
  - Encode URL: `${FRONTEND_URL}/tickets/${booking.id}`
- Lưu vào: `Ticket.qrDataUrl`
- QR scan bằng app ngoài sẽ mở trực tiếp trang vé

---

### 3. Email vé điện tử

- Gửi tới `booking.contactEmail`
- Nội dung:
  - Thông tin booking đầy đủ
  - QR hiển thị trực tiếp
  - Nút CTA mở trang vé
- QR dùng **CID attachment** để hiển thị ổn định trên email client

---

### 4. Trang vé điện tử (public)

- Route: `/tickets/[id]`
- Không cần login
- Full-screen (không header/footer)

Hiển thị:

- Booking info
- Trip info
- Passenger list
- Seat info
- Payment info
- Contact info
- QR code thật

---

### 5. Debug QR

- Endpoint: `GET /debug/qr`
- Dùng để test QR độc lập
- Kiểm tra:
  - QR có generate đúng không
  - URL có encode đúng không

---

## Cài đặt nhanh

### 1. Database

```bash
docker compose up -d --build
```

### 2. Backend

```bash
cd api
npm install

npx prisma db push
npx prisma generate
npx prisma db seed

npm run dev
```

Backend chạy tại:

`http://localhost:4000`

### 3. Frontend

```bash
cd web
npm install
npm run dev
```

Frontend chạy tại:

`http://localhost:3000`

---

## Biến môi trường

### Backend (`api/.env`)

```env
DATABASE_URL=
PORT=4000

FRONTEND_URL=http://localhost:3000
APP_URL=http://localhost:4000

EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
```

---

## Lưu ý quan trọng

Test QR bằng điện thoại:

- **KHÔNG** dùng localhost
- Dùng IP LAN: `http://192.168.x.x:3000`

---

## Luồng nghiệp vụ

### Flow chính

1. User chọn ghế
2. Tạo booking HOLDING
3. Lock ghế tạm thời
4. Checkout cập nhật thông tin
5. Thanh toán -> PAID
6. Tạo ticket + QR
7. Gửi email
8. User mở `/tickets/{bookingId}`

### Realtime Seat System

#### Cách hoạt động

- Client subscribe:

`GET /api/sse/trip/:tripId`

- Server emit:

`emitSeatUpdates(tripId, updates)`

- Frontend update state trực tiếp (không refetch)

---

## Cron vận hành

Tự động xử lý:

- Expire booking HOLDING
- Nhắc hết hạn giữ chỗ
- Nhắc chuyến sắp chạy
- Update trạng thái trip

---

## Chính sách hoàn tiền

| Thời gian trước giờ chạy | Hoàn tiền |
| --- | --- |
| > 48h | 75% |
| > 24h | 50% |
| < 24h | 25% |

---

## Data Model

### Quan hệ chính

`Trip -> TripCarriage -> TripSeat`

`Booking -> BookingSeat -> Payment -> Ticket -> Refund -> Notification`

### Enum nghiệp vụ

#### TripStatus

- ON_TIME
- DELAYED
- DEPARTED
- COMPLETED
- CANCELLED

#### BookingStatus

- HOLDING
- PAID
- CANCELLED
- REFUNDED

#### PaymentStatus

- PENDING
- PAID
- REFUNDED

#### NotificationType

- REMINDER
- DELAY
- CANCEL
- HOLD_EXPIRE

---

## Admin Module

Quản lý:

- Station
- Train
- Carriage Template
- Trip
- Booking
- User

Điểm mạnh:

- Không chỉ CRUD
- Có đầy đủ logic vận hành thực tế

---

## Demo Flow

### User

1. Search trip
2. Chọn ghế
3. Checkout
4. Thanh toán
5. Nhận vé

### Realtime

- Mở 2 tab cùng chuyến
- Tab A chọn ghế -> tab B update ngay

### Admin

- Tạo trip
- Quản lý toa & ghế
- Theo dõi booking

---

## Điểm mạnh hệ thống

- Thiết kế theo domain rõ ràng
- Realtime seat + hold lifecycle chuẩn
- Full flow từ user -> admin
- Có thể vận hành thực tế
