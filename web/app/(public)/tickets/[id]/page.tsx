'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CalendarDays, Clock3, CreditCard, MapPin, QrCode, Ticket, TrainFront, UserRound, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBooking, getTicketByBooking } from '@/lib/api';
import { formatCurrencyVND, formatDateTimeVn } from '@/lib/utils';

function TicketDetailPageContent() {
  const { id } = useParams();
  const [booking, setBooking] = useState<Awaited<ReturnType<typeof getBooking>> | null>(null);
  const [ticket, setTicket] = useState<Awaited<ReturnType<typeof getTicketByBooking>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof id === 'string') {
      console.log('Ticket opened via QR:', id);
    }
  }, [id]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (typeof id !== 'string') {
        setError('Thiếu mã vé.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [bookingData, ticketData] = await Promise.all([getBooking(id), getTicketByBooking(id)]);

        if (!active) {
          return;
        }

        setBooking(bookingData);
        setTicket(ticketData);
      } catch {
        if (!active) {
          return;
        }

        setError('Không tìm thấy vé');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [id]);

  const effectiveDeparture = useMemo(() => booking?.trip.delayedDepartureTime ?? booking?.trip.departureTime ?? null, [booking?.trip.delayedDepartureTime, booking?.trip.departureTime]);
  const hasDelay = (booking?.trip.delayMinutes ?? 0) > 0 || Boolean(booking?.trip.delayedDepartureTime);
  const isHoldingExpired = Boolean(booking?.status === 'HOLDING' && booking?.holdExpiresAt && new Date(booking.holdExpiresAt).getTime() <= Date.now());
  const contactPhone = (booking as typeof booking & { contactPhone?: string | null } | null)?.contactPhone ?? null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-slate-200 px-4 py-8 sm:py-12">
        <div className="mx-auto flex min-h-[60vh] w-full max-w-4xl items-center justify-center rounded-3xl bg-white shadow-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-600">Đang tải vé điện tử...</p>
        </div>
      </div>
    );
  }

  if (!booking || !ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-slate-200 px-4 py-8 sm:py-12">
        <div className="mx-auto flex min-h-[60vh] w-full max-w-4xl items-center justify-center rounded-3xl bg-white shadow-xl border border-gray-200 p-8 text-center">
          <div>
            <p className="text-lg font-semibold text-gray-900">{error ?? 'Không tìm thấy vé'}</p>
            <p className="mt-2 text-sm text-gray-600">Vui lòng kiểm tra lại đường dẫn hoặc mở lại từ email.</p>
            <Link href="/tickets" className="inline-block mt-6">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lại danh sách vé
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const passengerBlocks = booking.bookingSeats?.length
    ? booking.bookingSeats
    : booking.seatCodes.map((seatCode, index) => ({
        seatId: booking.seatIds[index] ?? seatCode,
        seatCode,
        passengerName: null,
        passengerType: null,
        passengerId: null,
        priceSnapshot: 0
      }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-slate-200 px-4 py-8 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-lg bg-white shadow-lg border border-white/70">
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-sky-700 px-6 py-7 text-white sm:px-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-blue-100/90">VÉ ĐIỆN TỬ</p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  {booking.trip.origin} → {booking.trip.destination}
                </h1>
                <p className="mt-2 text-sm text-blue-100/90">Mã đặt vé: {booking.code} · Mã vé: {ticket.ticketNumber}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge label={booking.status} tone={booking.status === 'PAID' ? 'success' : booking.status === 'CANCELLED' || booking.status === 'REFUNDED' ? 'danger' : 'warning'} />
                <Badge label={booking.payment?.status ?? 'UNKNOWN'} tone={booking.payment?.status === 'PAID' ? 'success' : booking.payment?.status === 'REFUNDED' ? 'danger' : 'warning'} />
                {isHoldingExpired && <Badge label="HẾT HẠN GIỮ CHỖ" tone="danger" />}
              </div>
            </div>
          </div>

          <div className="px-5 py-6 sm:px-10 sm:py-8 space-y-6">
            <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-white to-blue-50 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600">QR vé</p>
                <a href={`/tickets/${booking.id}`} className="mt-4 block overflow-hidden rounded-3xl border border-blue-100 bg-white p-4 shadow-sm transition hover:shadow-md">
                  <img src={ticket.qrDataUrl} alt={`QR vé ${ticket.ticketNumber}`} className="mx-auto block h-auto w-full max-w-[240px] rounded-2xl" />
                </a>
                <p className="mt-3 text-center text-xs leading-5 text-gray-500">Quét mã QR hoặc bấm vào ảnh để mở vé điện tử.</p>
                <div className="mt-5">
                  <Button asChild className="w-full rounded-2xl bg-blue-600 px-6 py-6 text-base font-semibold hover:bg-blue-700">
                    <a href={`/tickets/${booking.id}`}>Xem vé điện tử</a>
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <InfoCard icon={<Ticket className="h-4 w-4 text-blue-600" />} label="Mã đặt vé" value={booking.code} mono />
                  <InfoCard icon={<QrCode className="h-4 w-4 text-blue-600" />} label="Mã vé" value={ticket.ticketNumber} mono />
                  <InfoCard icon={<Users className="h-4 w-4 text-blue-600" />} label="Số ghế" value={String(booking.seatCount)} />
                  <InfoCard icon={<CreditCard className="h-4 w-4 text-blue-600" />} label="Tổng tiền" value={formatCurrencyVND(booking.totalAmount)} strong />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <InfoCard label="Trạng thái booking" value={booking.status} />
                  <InfoCard label="Trạng thái thanh toán" value={booking.payment?.status ?? 'UNKNOWN'} />
                  <InfoCard label="Ngày đặt vé" value={formatDateTimeVn(booking.createdAt)} />
                  <InfoCard label="Email liên hệ" value={booking.contactEmail} mono />
                </div>

                {booking.payment?.status && (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                    <div className="flex items-center gap-2 text-gray-900">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <h2 className="text-lg font-semibold">Thanh toán</h2>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <InfoCard label="Phương thức" value={booking.payment?.method ?? '-'} />
                      <InfoCard label="Mã giao dịch" value={booking.payment?.transactionRef ?? '-'} mono />
                      <InfoCard label="Số tiền" value={formatCurrencyVND(booking.payment?.amount ?? booking.totalAmount)} strong />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                      <InfoCard label="Thanh toán lúc" value={booking.payment?.paidAt ? formatDateTimeVn(booking.payment.paidAt) : '-'} />
                      <InfoCard label="Hoàn tiền lúc" value={booking.payment?.refundedAt ? formatDateTimeVn(booking.payment.refundedAt) : '-'} />
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-gray-900">
                <MapPin className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Thông tin hành trình</h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <InfoCard icon={<TrainFront className="h-4 w-4 text-blue-600" />} label="Tàu" value={booking.trip.trainName ?? '-'} />
                <InfoCard label="Tuyến" value={`${booking.trip.origin} → ${booking.trip.destination}`} />
                <InfoCard icon={<CalendarDays className="h-4 w-4 text-blue-600" />} label="Ngày đi" value={effectiveDeparture ? formatDateTimeVn(effectiveDeparture) : '-'} />
                <InfoCard icon={<Clock3 className="h-4 w-4 text-blue-600" />} label="Giờ khởi hành" value={effectiveDeparture ? formatDateTimeVn(effectiveDeparture) : '-'} />
                <InfoCard icon={<Clock3 className="h-4 w-4 text-blue-600" />} label="Giờ đến" value={booking.trip.arrivalTime ? formatDateTimeVn(booking.trip.arrivalTime) : '-'} />
                <InfoCard label="Delay" value={hasDelay ? `${booking.trip.delayMinutes ?? 0} phút` : 'Không có'} strong={hasDelay} />
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-gray-900">
                <UserRound className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Hành khách</h2>
              </div>
              <div className="mt-4 grid gap-4">
                {passengerBlocks.map((item, index) => (
                  <div key={`${item.seatId}-${index}`} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Hành khách {index + 1}</p>
                        <p className="mt-1 text-sm text-gray-600">Ghế: <span className="font-semibold text-gray-900">{item.seatCode ?? '-'}</span></p>
                      </div>
                      <Badge label={item.passengerType ?? 'Hành khách'} tone="neutral" />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <InfoCard label="Tên" value={item.passengerName ?? 'Chưa cập nhật'} strong />
                      <InfoCard label="Mã vé" value={ticket.ticketNumber} mono />
                      <InfoCard label="Giá ghế" value={item.priceSnapshot ? formatCurrencyVND(item.priceSnapshot) : '-'} strong />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-gray-900">
                <Users className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Thông tin ghế</h2>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {booking.seatCodes.map((seatCode) => (
                  <span key={seatCode} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 ring-1 ring-blue-100">
                    {seatCode}
                  </span>
                ))}
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Thông tin liên hệ</h2>
                <div className="mt-4 space-y-3 text-sm text-gray-700">
                  <Line label="Email" value={booking.contactEmail} mono />
                  <Line label="SĐT" value={contactPhone ?? 'Chưa cập nhật'} />
                  <Line label="Thời gian đặt vé" value={formatDateTimeVn(booking.createdAt)} />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <h2 className="text-lg font-semibold text-gray-900">Tóm tắt giá vé</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <Line label="Số lượng ghế" value={String(booking.seatCount)} />
                  <Line label="Tổng tiền" value={formatCurrencyVND(booking.totalAmount)} strong />
                  <Line label="Thanh toán" value={booking.payment?.status ?? '-'} />
                </div>
              </div>
            </section>

            {booking.status === 'REFUNDED' && booking.payment?.refundedAt && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
                <h2 className="text-lg font-semibold">Thông tin hoàn tiền</h2>
                <p className="mt-2 text-sm">Vé này đã được hoàn tiền vào {formatDateTimeVn(booking.payment.refundedAt)}.</p>
              </section>
            )}

            {isHoldingExpired && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
                <h2 className="text-lg font-semibold">Lưu ý</h2>
                <p className="mt-2 text-sm">Giữ chỗ đã hết hạn vào {booking.holdExpiresAt ? formatDateTimeVn(booking.holdExpiresAt) : '-'}. Vui lòng kiểm tra lại tình trạng thanh toán.</p>
              </section>
            )}

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-semibold mb-1">Lưu ý quan trọng</p>
              <p>Vui lòng có mặt tại ga ít nhất 30 phút trước giờ khởi hành và mang theo giấy tờ tùy thân hợp lệ để đối chiếu thông tin.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon,
  mono,
  strong,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`mt-2 text-sm ${strong ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'} ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function Line({
  label,
  value,
  mono,
  strong,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className={`text-right ${strong ? 'font-semibold text-gray-900' : 'text-gray-800'} ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
}) {
  const className =
    tone === 'success'
      ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
      : tone === 'warning'
        ? 'bg-amber-100 text-amber-800 ring-amber-200'
        : tone === 'danger'
          ? 'bg-red-100 text-red-700 ring-red-200'
          : 'bg-slate-100 text-slate-700 ring-slate-200';

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${className}`}>{label}</span>;
}

export default function TicketDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100" />}>
      <TicketDetailPageContent />
    </Suspense>
  );
}
