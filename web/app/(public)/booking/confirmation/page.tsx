'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getBooking } from '@/lib/api';
import { formatCurrencyVND, formatDateTimeVn } from '@/lib/utils';

function BookingConfirmationContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId') || '';
  const [booking, setBooking] = useState<Awaited<ReturnType<typeof getBooking>> | null>(null);
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
        const data = await getBooking(bookingId);
        if (!active) return;
        setBooking(data);
      } catch (unknownError) {
        if (!active) return;
        const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải thông tin xác nhận.';
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
    return <div className="max-w-4xl mx-auto px-4 py-8 text-gray-600">Đang tải trang xác nhận...</div>;
  }

  if (!booking) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-red-600 mb-4">{error ?? 'Không tìm thấy booking.'}</p>
        <Link href="/search">
          <Button>Quay lại tìm kiếm</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Xác nhận đặt vé</h1>

      <Card className="border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-gray-600">Mã đặt vé</p>
          <p className="font-mono font-semibold text-blue-600">{booking.code}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-gray-600">Tuyến đường</p>
          <p className="font-semibold text-gray-900">{booking.trip.origin} → {booking.trip.destination}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-gray-600">Khởi hành</p>
          <p className="font-semibold text-gray-900">{formatDateTimeVn(booking.trip.departureTime)}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-gray-600">Số ghế</p>
          <p className="font-semibold text-gray-900">{booking.seatCount}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-gray-600">Trạng thái</p>
          <p className="font-semibold text-gray-900">{booking.status}</p>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 pt-3">
          <p className="text-gray-900 font-semibold">Tổng cộng</p>
          <p className="text-blue-600 text-xl font-bold">{formatCurrencyVND(booking.totalAmount)}</p>
        </div>
      </Card>

      <div className="flex gap-3">
        <Link href={`/booking/payment?bookingId=${booking.id}`}>
          <Button className="bg-blue-600 hover:bg-blue-700">Tiếp tục thanh toán</Button>
        </Link>
        <Link href="/tickets">
          <Button variant="outline">Xem vé của tôi</Button>
        </Link>
      </div>
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center">Đang tải trang xác nhận...</div>}>
      <BookingConfirmationContent />
    </Suspense>
  );
}
