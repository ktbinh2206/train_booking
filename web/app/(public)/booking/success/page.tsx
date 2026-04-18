'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, CheckCircle, Clock, Download, Printer, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBooking, getTicketByBooking } from '@/lib/api';
import { formatCurrencyVND, formatDateTimeVn } from '@/lib/utils';

function BookingSuccessPageContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId') || '';

  const [booking, setBooking] = useState<Awaited<ReturnType<typeof getBooking>> | null>(null);
  const [ticket, setTicket] = useState<Awaited<ReturnType<typeof getTicketByBooking>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!bookingId) {
        setError('Thiếu bookingId.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const bookingData = await getBooking(bookingId);
        const ticketData = await getTicketByBooking(bookingId);

        if (!active) return;
        setBooking(bookingData);
        setTicket(ticketData);
      } catch (unknownError) {
        if (!active) return;
        const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải thông tin vé.';
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
  }, [bookingId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-gray-600">Đang tải thông tin xác nhận...</p>
      </div>
    );
  }

  if (!booking || !ticket) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-red-600 mb-4">{error ?? 'Không tìm thấy thông tin vé.'}</p>
        <Link href="/search">
          <Button>Quay lại tìm kiếm</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-20 h-20 text-green-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Đặt vé thành công!</h1>
          <p className="text-lg text-gray-600">Đơn đặt vé của bạn đã được xác nhận</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border-t-4 border-green-600">
          <div className="text-center mb-8 pb-8 border-b border-gray-200">
            <p className="text-sm text-gray-500 mb-2">Mã đặt vé của bạn</p>
            <p className="text-4xl font-bold text-blue-600 font-mono">{booking.code}</p>
            <p className="text-sm text-gray-500 mt-2">Mã vé: {ticket.ticketNumber}</p>
          </div>

          <div className="mb-8 pb-8 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Chi tiết chuyến đi</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Tuyến đường</p>
                <p className="text-2xl font-semibold text-gray-900">{booking.trip.origin} → {booking.trip.destination}</p>
                <p className="text-sm text-gray-600 mt-1">{booking.trip.trainName}</p>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-600 mt-1" />
                <div>
                  <p className="text-sm text-gray-500 mb-1">Khởi hành</p>
                  <p className="font-semibold text-gray-900">{formatDateTimeVn(booking.trip.departureTime)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 mt-1" />
                <div>
                  <p className="text-sm text-gray-500 mb-1">Đến nơi</p>
                  <p className="font-semibold text-gray-900">{formatDateTimeVn(booking.trip.arrivalTime)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Tổng tiền</p>
                <div className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                  {formatCurrencyVND(booking.totalAmount)}
                </div>
              </div>
            </div>
          </div>

          {ticket.qrDataUrl && (
            <div className="mb-8 pb-8 border-b border-gray-200 text-center">
              <p className="font-semibold text-gray-900 mb-3">Vé QR</p>
              <img src={ticket.qrDataUrl} alt="Vé QR" className="mx-auto w-48 h-48 border rounded-lg" />
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="flex items-center gap-2" onClick={() => window.print()}>
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">In vé</span>
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Tải xuống</span>
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Chia sẻ</span>
            </Button>
            <Link href="/tickets" className="flex">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2">Xem vé</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookingSuccessPageContent />
    </Suspense>
  );
}
