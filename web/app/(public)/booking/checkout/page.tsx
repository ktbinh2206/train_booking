'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Mail, Phone } from 'lucide-react';
import { Breadcrumb } from '@/components/shared/breadcrumb';
import { CountdownTimer } from '@/components/public/countdown-timer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { createBooking, getTripDetail, mapSeatsForCarriage } from '@/lib/api';
import { Trip } from '@/lib/types';
import { VN } from '@/lib/translations';
import { formatCurrencyVND, formatDateVn } from '@/lib/utils';
import { useAuth } from '@/components/auth/auth-provider';

interface Passenger {
  firstName: string;
  lastName: string;
  age: string;
  gender: string;
}

function CheckoutPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const { user, loading: authLoading } = useAuth();

  const tripId = searchParams.get('tripId') || '';
  const seatIds = (searchParams.get('seats') || '').split(',').filter(Boolean);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [passengers, setPassengers] = useState<Passenger[]>(
    seatIds.map(() => ({
      firstName: '',
      lastName: '',
      age: '',
      gender: ''
    }))
  );

  const [contactInfo, setContactInfo] = useState({
    email: '',
    phone: ''
  });

  const [policies, setPolicies] = useState({
    terms: false,
    cancellation: false,
    newsletter: false
  });

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!tripId || seatIds.length === 0) {
        setError('Thiếu thông tin chuyến hoặc ghế.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const detail = await getTripDetail(tripId);
        const availableSeatIds = new Set(
          detail.carriages.flatMap((carriage) =>
            mapSeatsForCarriage(carriage, detail.trip.basePrice)
              .filter((seat) => seat.status === 'available')
              .map((seat) => seat.id)
          )
        );
        const unavailableSeats = seatIds.filter((seatId) => !availableSeatIds.has(seatId));

        if (unavailableSeats.length > 0) {
          throw new Error('Một hoặc nhiều ghế đã được giữ hoặc đã bán. Vui lòng quay lại chọn ghế khác.');
        }

        if (!active) return;

        setTrip(detail.trip);
      } catch (unknownError) {
        if (!active) return;
        const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải dữ liệu checkout.';
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
  }, [tripId, seatIds.length]);

  const subtotal = useMemo(() => {
    return Math.round((trip?.basePrice ?? 0) * seatIds.length);
  }, [trip?.basePrice, seatIds.length]);
  const taxes = Math.round(subtotal * 0.1);
  const total = subtotal + taxes;

  const handlePassengerChange = (index: number, field: keyof Passenger, value: string) => {
    setPassengers((previous) => {
      const next = [...previous];
      next[index][field] = value;
      return next;
    });
  };

  const canSubmit =
    !!user &&
    !!trip &&
    !!contactInfo.email &&
    !!contactInfo.phone &&
    policies.terms &&
    passengers.every((passenger) => passenger.firstName && passenger.lastName && passenger.age && passenger.gender);

  const handleContinue = async () => {
    if (!canSubmit || !trip) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const booking = await createBooking({
        userId: user?.id,
        tripId: trip.id,
        seatIds,
        contactEmail: contactInfo.email
      });

      router.push(`/booking/payment?bookingId=${booking.id}`);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Tạo booking thất bại.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-600">Đang tải thông tin checkout...</p>
      </div>
    );
  }

  if (!authLoading && !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-700 mb-4">Bạn cần đăng nhập để tiếp tục đặt vé.</p>
        <Link href="/login">
          <Button>Đăng nhập</Button>
        </Link>
      </div>
    );
  }

  if (error && !trip) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/search">
          <Button>Quay lại tìm kiếm</Button>
        </Link>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-600">Không tìm thấy chuyến tàu</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb
        items={[
          { label: VN.nav.home, href: '/' },
          { label: VN.results.searchResults, href: '/results' },
          { label: VN.booking.selectSeats, href: `/booking/seats?tripId=${trip.id}` },
          { label: VN.booking.checkout }
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 space-y-8">
          <CountdownTimer minutes={5} />

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tóm tắt chuyến đi</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Ngày đi</p>
                <p className="font-semibold text-gray-900">{formatDateVn(trip.date)}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Tàu</p>
                <p className="font-semibold text-gray-900">{trip.trainName}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Tuyến đường</p>
                <p className="font-semibold text-gray-900">{trip.source} → {trip.destination}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Số ghế</p>
                <p className="font-semibold text-gray-900">{seatIds.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Thông tin hành khách</h2>
            <div className="space-y-8">
              {passengers.map((passenger, index) => (
                <div key={`${seatIds[index]}-${index}`} className="pb-6 border-b border-gray-200 last:border-0">
                  <h3 className="font-semibold text-gray-900 mb-4">Hành khách {index + 1} (Ghế {seatIds[index]})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor={`firstName-${index}`} className="text-sm mb-1">Tên</Label>
                      <Input
                        id={`firstName-${index}`}
                        value={passenger.firstName}
                        onChange={(event) => handlePassengerChange(index, 'firstName', event.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`lastName-${index}`} className="text-sm mb-1">Họ</Label>
                      <Input
                        id={`lastName-${index}`}
                        value={passenger.lastName}
                        onChange={(event) => handlePassengerChange(index, 'lastName', event.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`age-${index}`} className="text-sm mb-1">Tuổi</Label>
                      <Input
                        id={`age-${index}`}
                        type="number"
                        value={passenger.age}
                        onChange={(event) => handlePassengerChange(index, 'age', event.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`gender-${index}`} className="text-sm mb-1">Giới tính</Label>
                      <select
                        id={`gender-${index}`}
                        value={passenger.gender}
                        onChange={(event) => handlePassengerChange(index, 'gender', event.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Chọn</option>
                        <option value="male">Nam</option>
                        <option value="female">Nữ</option>
                        <option value="other">Khác</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Thông tin liên hệ</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Địa chỉ email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={contactInfo.email}
                  onChange={(event) => setContactInfo((previous) => ({ ...previous, email: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Số điện thoại
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+84 9xxxxxxx"
                  value={contactInfo.phone}
                  onChange={(event) => setContactInfo((previous) => ({ ...previous, phone: event.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Điều khoản và cam kết</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={policies.terms}
                  onCheckedChange={(checked) => setPolicies((previous) => ({ ...previous, terms: checked as boolean }))}
                />
                <Label htmlFor="terms" className="text-sm cursor-pointer">Tôi đồng ý với Điều khoản và Điều kiện</Label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="cancellation"
                  checked={policies.cancellation}
                  onCheckedChange={(checked) => setPolicies((previous) => ({ ...previous, cancellation: checked as boolean }))}
                />
                <Label htmlFor="cancellation" className="text-sm cursor-pointer">Tôi đã đọc và đồng ý Chính sách hủy vé</Label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="newsletter"
                  checked={policies.newsletter}
                  onCheckedChange={(checked) => setPolicies((previous) => ({ ...previous, newsletter: checked as boolean }))}
                />
                <Label htmlFor="newsletter" className="text-sm cursor-pointer">Gửi cho tôi cập nhật và ưu đãi</Label>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-20">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tóm tắt đặt vé</h2>

            <div className="mb-6 pb-6 border-b border-gray-200 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Tàu</span>
                <span className="font-semibold text-gray-900">{trip.trainName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tuyến đường</span>
                <span className="font-semibold text-gray-900">{trip.source} → {trip.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Hành khách</span>
                <span className="font-semibold text-gray-900">{seatIds.length}</span>
              </div>
            </div>

            <div className="space-y-2 mb-6 pb-6 border-b border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tạm tính</span>
                <span className="font-semibold text-gray-900">{formatCurrencyVND(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Thuế và phí</span>
                <span className="font-semibold text-gray-900">{formatCurrencyVND(taxes)}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="font-semibold text-gray-900">Tổng cộng</span>
                <span className="font-bold text-blue-600">{formatCurrencyVND(total)}</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700 mb-4">
                {error}
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-900 mb-4 flex gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Hoàn tất thanh toán trong 5 phút để xác nhận đặt vé</span>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleContinue}
                disabled={!canSubmit || submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5"
              >
                {submitting ? 'Đang tạo đặt vé...' : 'Tiếp tục thanh toán'}
              </Button>
              <Link href={`/booking/seats?tripId=${tripId}`}>
                <Button variant="outline" className="w-full">Quay lại</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutPageContent />
    </Suspense>
  );
}
