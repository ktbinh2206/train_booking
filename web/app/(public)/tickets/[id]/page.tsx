'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shared/breadcrumb';
import { StatusBadge } from '@/components/shared/status-badge';
import { Download, Printer, Share2, Calendar, Clock, MapPin, Users, QrCode, Info } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getBooking, getTicketByBooking } from '@/lib/api';
import { formatCurrencyVND, formatDateTimeVn } from '@/lib/utils';

function TicketDetailPageContent() {
  const { id } = useParams();
  const [booking, setBooking] = useState<Awaited<ReturnType<typeof getBooking>> | null>(null);
  const [ticket, setTicket] = useState<Awaited<ReturnType<typeof getTicketByBooking>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (unknownError) {
        if (!active) {
          return;
        }
        const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải chi tiết vé.';
        setError(message);
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-600">Đang tải chi tiết vé...</p>
      </div>
    );
  }

  if (!booking || !ticket) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-600 mb-4">{error ?? 'Không tìm thấy vé.'}</p>
        <Link href="/tickets">
          <Button>Quay lại danh sách vé</Button>
        </Link>
      </div>
    );
  }

  const uiStatus = booking.status === 'PAID' ? 'confirmed' : booking.status === 'REFUNDED' || booking.status === 'CANCELLED' ? 'cancelled' : 'pending';
  const effectiveDeparture = booking.trip.delayedDepartureTime ?? booking.trip.departureTime;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Trang chủ', href: '/' },
            { label: 'Vé của tôi', href: '/tickets' },
            { label: 'Vé điện tử' },
          ]}
        />

        {/* E-Ticket Card */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">VÉ ĐIỆN TỬ</h1>
                  <p className="text-blue-100 text-lg">
                    {booking.trip.origin} → {booking.trip.destination}
                  </p>
                </div>
                <StatusBadge status={uiStatus as any} />
              </div>
            </div>

            {/* Main Content */}
            <div className="p-6 sm:p-8">
              {/* QR Code Section */}
              <div className="border-b border-gray-200 pb-6 mb-6">
                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                  {/* QR Code */}
                  <div className="text-center">
                    <div className="bg-gray-100 border-2 border-gray-300 p-4 rounded-lg w-48 h-48 flex items-center justify-center">
                      <div className="text-center text-xs text-gray-600 whitespace-pre">
                        <QrCode className="w-12 h-12 mx-auto mb-2" />
                        Mã QR
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Xuất trình mã QR này tại ga
                    </p>
                  </div>

                  {/* Booking Info */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Mã đặt vé</p>
                      <p className="text-2xl font-bold text-gray-900 font-mono">
                        {booking.code}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Tàu</p>
                        <p className="font-semibold text-gray-900">
                          {booking.trip.trainName ?? '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Ngày đặt vé</p>
                        <p className="font-semibold text-gray-900">
                          {formatDateTimeVn(booking.holdExpiresAt ?? booking.trip.departureTime)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Journey Details */}
              <div className="border-b border-gray-200 pb-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Chi tiết hành trình</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex gap-4">
                    <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Ngày đi</p>
                      <p className="font-semibold text-gray-900">
                        {formatDateTimeVn(effectiveDeparture)}
                      </p>
                      {booking.trip.status === 'DELAYED' && booking.trip.delayedDepartureTime && (
                        <p className="text-xs text-amber-600">Lịch chạy đã bị dời</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Giờ khởi hành</p>
                      <p className="font-semibold text-gray-900">
                        {formatDateTimeVn(effectiveDeparture)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Tuyến đường</p>
                      <p className="font-semibold text-gray-900">
                        {booking.trip.origin} đến {booking.trip.destination}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Passengers */}
              <div className="border-b border-gray-200 pb-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Hành khách</h2>
                <div className="space-y-4">
                  {booking.seatCodes.map((seatCode, idx) => (
                    <div key={seatCode} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <p className="font-semibold text-gray-900">Hành khách {idx + 1}</p>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                          Ghế {seatCode}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Booking</p>
                          <p className="text-gray-900 font-mono">{booking.code}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Trạng thái</p>
                          <p className="text-gray-900">{booking.status}</p>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <p className="text-gray-500 text-xs mb-1">Mã vé</p>
                          <p className="text-gray-900">{ticket.ticketNumber}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div className="border-b border-gray-200 pb-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Chi tiết giá vé</h2>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Số ghế</span>
                    <span className="font-semibold text-gray-900">{booking.seatCount}</span>
                  </div>
                  <div className="flex justify-between text-lg border-t border-gray-200 pt-3 mt-3">
                    <span className="font-semibold text-gray-900">Tổng cộng</span>
                    <span className="font-bold text-blue-600">{formatCurrencyVND(booking.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Important Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Thông tin quan trọng</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Có mặt tại ga ít nhất 30 phút trước giờ khởi hành</li>
                    <li>• Mang theo giấy tờ tùy thân hợp lệ để đối chiếu</li>
                    <li>• Xem quy định hành lý trên website</li>
                    <li>• Liên hệ CSKH nếu cần đổi hoặc hủy vé</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer with Actions */}
            <div className="bg-gray-50 border-t border-gray-200 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => window.print()}
                >
                  <Printer className="w-4 h-4" />
                  In vé
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Tải PDF
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Chia sẻ
                </Button>
                <Link href="/tickets" className="flex-1">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Quay lại vé của tôi
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TicketDetailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TicketDetailPageContent />
    </Suspense>
  );
}
