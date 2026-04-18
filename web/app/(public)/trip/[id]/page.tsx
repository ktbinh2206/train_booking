'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/shared/breadcrumb';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Users, Zap, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { VN } from '@/lib/translations';
import { getTripDetail } from '@/lib/api';
import { Trip } from '@/lib/types';
import { formatCurrencyVND, formatDateVn } from '@/lib/utils';

function TripDetailPageContent() {
  const { id } = useParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (typeof id !== 'string') {
        setError('Chuyến tàu không hợp lệ.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const detail = await getTripDetail(id);
        if (active) {
          setTrip(detail.trip);
        }
      } catch (unknownError) {
        if (active) {
          const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải chi tiết chuyến tàu.';
          setError(message);
          setTrip(null);
        }
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-600">Đang tải chi tiết chuyến tàu...</p>
      </div>
    );
  }

  if (error) {
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
        <Breadcrumb
          items={[
            { label: VN.nav.home, href: '/' },
            { label: VN.results.searchResults, href: '/results' },
            { label: 'Chuyến tàu không tìm thấy' },
          ]}
        />
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">Chuyến tàu không tìm thấy</p>
          <Link href="/search">
            <Button>Quay lại tìm kiếm</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: VN.nav.home, href: '/' },
          { label: VN.results.searchResults, href: '/results' },
          { label: VN.trip.tripDetails },
        ]}
      />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trip Overview Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {trip.source} → {trip.destination}
                </h1>
                <p className="text-gray-600">
                  Tàu {trip.trainNumber} • {trip.trainName}
                </p>
              </div>
              <StatusBadge status={trip.status} />
            </div>

            {/* Timeline Route */}
            <div className="space-y-6 pb-6 border-b border-gray-200">
              {/* Departure */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <div className="w-1 h-12 bg-gray-300 my-2"></div>
                </div>
                <div className="pb-4">
                  <p className="text-sm text-gray-500 mb-1">Khởi hành</p>
                  <p className="text-2xl font-bold text-gray-900">{trip.departureTime}</p>
                  <p className="text-sm text-gray-600">
                    Ga {trip.source}
                  </p>
                </div>
              </div>

              {/* Journey Info */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <Zap className="w-4 h-4 text-gray-400" />
                </div>
                <div className="pb-4">
                  <p className="text-sm text-gray-600">
                    Hành trình: <span className="font-semibold">{trip.duration}</span> •{' '}
                    <span className="font-semibold">{trip.distance} km</span>
                  </p>
                </div>
              </div>

              {/* Arrival */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-1 h-12 bg-gray-300 mb-2"></div>
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                </div>
                <div className="pb-4">
                  <p className="text-sm text-gray-500 mb-1">Đến nơi</p>
                  <p className="text-2xl font-bold text-gray-900">{trip.arrivalTime}</p>
                  <p className="text-sm text-gray-600">
                    Ga {trip.destination}
                  </p>
                </div>
              </div>
            </div>

            {/* Key Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">Ngày đi</p>
                <p className="font-semibold text-gray-900">
                  {formatDateVn(trip.date, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Ghế còn trống</p>
                <p className="font-semibold text-gray-900">{trip.availableSeats}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Hạng ghế</p>
                <p className="font-semibold text-gray-900">Nhiều hạng</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Điểm dừng</p>
                <p className="font-semibold text-gray-900">5 ga</p>
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tiện ích</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { icon: '🛏️', name: 'Chăn gối' },
                { icon: '🍽️', name: 'Suất ăn' },
                { icon: '📡', name: 'WiFi' },
                { icon: '🚻', name: 'Nhà vệ sinh' },
                { icon: '🔌', name: 'Ổ cắm điện' },
                { icon: '❄️', name: 'AC' },
              ].map((amenity, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <span className="text-xl">{amenity.icon}</span>
                  <span className="text-sm text-gray-700">{amenity.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Policies */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Chính sách hủy vé</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Hủy trước 48 giờ: hoàn 75%</li>
                  <li>• Hủy trước 24 giờ: hoàn 50%</li>
                  <li>• Hủy trong vòng 24 giờ: hoàn 25%</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-20">
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-2">Giá từ</p>
              <p className="text-4xl font-bold text-gray-900">{formatCurrencyVND(trip.basePrice)}</p>
              <p className="text-xs text-gray-500 mt-1">mỗi hành khách</p>
            </div>

            <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
              <div className="flex items-center gap-3 text-sm">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  Còn {trip.availableSeats} ghế trống
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Thời lượng {trip.duration}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Quãng đường {trip.distance} km</span>
              </div>
            </div>

            <div className="space-y-3">
              <Link href={`/booking/seats?tripId=${trip.id}`} className="block">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Tiếp tục đặt vé
                </Button>
              </Link>
              <Button variant="outline" className="w-full">
                Lưu để đặt sau
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TripDetailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TripDetailPageContent />
    </Suspense>
  );
}
