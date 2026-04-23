Backend: Node.js + Express + Prisma + PostgreSQL
Frontend: Next.js (App Router)
Database: PostgreSQL via Docker
🚀 Project Setup Instructions
1. Start Database (Docker)
Install Docker Desktop
Navigate to the folder containing docker-compose.yml
Run:
docker compose up -d --build

This will start the PostgreSQL database.

2. Run Backend (API)
cd api
npm install

Then:

# 1. chạy DB
docker compose up -d

# 2. tạo bảng
npx prisma db push

# 3. generate client
npx prisma generate

# 4. seed
npx prisma db seed

npm run dev

Backend will run at:

http://localhost:4000
3. Run Frontend (Web)
cd web
npm install
npm run dev

Frontend will run at:

http://localhost:3000

# Train Booking System

Hệ thống đặt vé tàu full-flow, hỗ trợ từ tìm chuyến → chọn ghế → giữ chỗ → thanh toán → xuất vé điện tử → hủy vé hoàn tiền → thông báo realtime.

---

## 1. Mục tiêu sản phẩm

Xây dựng hệ thống đặt vé tàu hoàn chỉnh với 2 nhóm người dùng:

- User: tìm chuyến, chọn ghế, đặt vé, thanh toán, nhận vé
- Admin: quản lý tàu, chuyến, toa, ghế, booking, vận hành hệ thống

### Tech stack

- Backend: Express + Prisma + PostgreSQL  
- Frontend: Next.js (App Router)  
- Realtime: Server-Sent Events (SSE)

---

## 2. Kiến trúc tổng thể

- Backend cung cấp REST API trung tâm
- Frontend gọi API qua HTTP
- Realtime seat update dùng SSE theo từng chuyến

### Tổ chức module

- Auth
- Trip
- Booking
- Ticket
- Notification
- Admin


app.ts → main router
sseRoutes.ts → realtime channel


---

## 3. Data Model cốt lõi

### Quan hệ chính


Trip → TripCarriage → TripSeat

Booking → BookingSeat
→ Payment
→ Ticket
→ Refund
→ Notification


### Enum nghiệp vụ

- TripStatus: ON_TIME, DELAYED, DEPARTED, COMPLETED, CANCELLED
- BookingStatus: HOLDING, PAID, CANCELLED, REFUNDED
- PaymentStatus: PENDING, PAID, REFUNDED
- NotificationType: REMINDER, DELAY, CANCEL, HOLD_EXPIRE

### Điểm mạnh

- Tách rõ seat runtime vs seat snapshot
- Booking lưu priceSnapshot để đảm bảo consistency
- Schema phù hợp hệ thống vận tải thực tế

---

## 4. Flow nghiệp vụ chính

### 4.1 Tìm chuyến và xem ghế

- API: tripRoutes.ts
- Logic seat runtime:
  - ACTIVE
  - INACTIVE
  - HOLDING
  - SOLD

Xử lý tại:


tripService.ts


---

### 4.2 Đặt vé

Flow chuẩn:

1. User chọn ghế
2. Click "Thanh toán"
3. Tạo booking HOLDING
4. Set holdExpiresAt (ví dụ: +5 phút)
5. Lock ghế tạm thời

---

### 4.3 Thanh toán

- Booking chuyển sang PAID
- Sinh:
  - Ticket
  - QR code

---

### 4.4 Hủy vé và hoàn tiền

Policy:

| Thời gian trước giờ chạy | Hoàn tiền |
|-------------------------|----------|
| > 48h                  | 75%      |
| > 24h                  | 50%      |
| < 24h                  | 25%      |

---

## 5. Realtime Seat System

### Cách hoạt động

#### 1. Client subscribe SSE theo trip


GET /api/sse/trip/:tripId


#### 2. Server emit khi có thay đổi ghế


emitSeatUpdates(tripId, updates)


#### 3. Frontend nhận event và update state

- Không cần refetch toàn bộ
- Update theo seatId

### File liên quan


sseRoutes.ts
sse.ts
bookingService.ts
use-seat-realtime.ts


---

## 6. Admin module

Chức năng:

- Quản lý station
- Quản lý train
- Quản lý carriage template
- Quản lý trip
- Quản lý booking
- Quản lý user

Route:


adminRoutes.ts


Điểm nổi bật:

- Admin có thể vận hành toàn bộ vòng đời hệ thống
- Không chỉ CRUD mà có logic nghiệp vụ thực tế

---

## 7. Vận hành tự động (cron)

Cron job xử lý:

- Expire booking HOLDING
- Gửi nhắc hết hạn giữ chỗ
- Gửi nhắc chuyến sắp khởi hành
- Update trạng thái trip theo thời gian

File:


index.ts


---

## 8. Bảo mật và chuẩn backend

### Authentication

- Token custom
- Parse từ Authorization header


auth.ts


### Validation

- Dùng zod tại route layer

Ví dụ:


authRoutes.ts
bookingRoutes.ts


### Error handling

- Centralized error handler


errorHandler.ts


---

## 9. Demo flow

### User flow

1. Search trip
2. Xem ghế
3. Chọn ghế
4. Thanh toán
5. Nhận vé

### Realtime demo

- Mở 2 tab cùng 1 chuyến
- Chọn ghế ở tab A → tab B update ngay

### Admin demo

- Tạo/chỉnh trip
- Quản lý toa và ghế

---

## 10. Key điểm mạnh

- Thiết kế theo domain rõ ràng → dễ mở rộng
- Realtime seat + hold lifecycle → giải quyết tranh chấp ghế
- Full flow từ user đến admin → có thể vận hành thực tế