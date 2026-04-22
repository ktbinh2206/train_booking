'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/shared/breadcrumb';
import { SeatMap } from '@/components/public/seat-map';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { VN } from '@/lib/translations';
import { Carriage, Seat, Trip } from '@/lib/types';
import { getTripDetail, mapCarriagesToUi, mapSeatsForCarriage } from '@/lib/api';
import { formatCurrencyVND } from '@/lib/utils';

function BookingSeatsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tripId = searchParams.get('tripId') || '';

  const [trip, setTrip] = useState<Trip | null>(null);
  const [carriages, setCarriages] = useState<Carriage[]>([]);
  const [carriageSeatsById, setCarriageSeatsById] = useState<Record<string, Seat[]>>({});
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [carriageGroupIndex, setCarriageGroupIndex] = useState(0);
  const [selectedCarriageId, setSelectedCarriageId] = useState<string | null>(null);

  const CARRIAGES_PER_GROUP = 5;

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!tripId) {
        setError('Thiếu mã chuyến tàu.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const detail = await getTripDetail(tripId);
        const uiCarriages = mapCarriagesToUi(detail.carriages, detail.trip);
        const seatMapByCarriage: Record<string, Seat[]> = {};

        for (const carriage of detail.carriages) {
          seatMapByCarriage[carriage.id] = mapSeatsForCarriage(carriage, detail.trip.basePrice);
        }

        if (!active) return;

        setTrip(detail.trip);
        setCarriages(uiCarriages);
        if (uiCarriages.length > 0) {
          setSelectedCarriageId(uiCarriages[0].id);
        }
        setCarriageSeatsById(seatMapByCarriage);
      } catch (unknownError) {
        if (!active) return;
        const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải sơ đồ ghế.';
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
  }, [tripId]);

  // Calculate visible carriages for current group
  const visibleCarriages = useMemo(() => {
    const start = carriageGroupIndex * CARRIAGES_PER_GROUP;
    const end = start + CARRIAGES_PER_GROUP;
    return carriages.slice(start, end);
  }, [carriages, carriageGroupIndex]);

  const totalGroups = Math.ceil(carriages.length / CARRIAGES_PER_GROUP);
  const canPrevious = carriageGroupIndex > 0;
  const canNext = carriageGroupIndex < totalGroups - 1;

  const handleSeatSelect = (seatId: string) => {
    setSelectedSeats(prev => {
      if (prev.includes(seatId)) {
        return prev.filter(id => id !== seatId);
      } else {
        // Max 6 passengers per booking
        if (prev.length < 6) {
          return [...prev, seatId];
        }
        return prev;
      }
    });
  };

  const selectedSeatObjects = Object.values(carriageSeatsById).flat().filter((seat) => selectedSeats.includes(seat.id));
  const totalPrice = selectedSeatObjects.reduce((sum, seat) => sum + seat.price, 0);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-600">Đang tải sơ đồ ghế...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => router.push('/search')}>Quay lại tìm kiếm</Button>
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

  const selectedCarriage = carriages.find(c => c.id === selectedCarriageId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Tìm chuyến', href: '/results' },
          { label: trip.source, href: `/trip/${trip.id}` },
          { label: 'Chọn ghế' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Trip Info Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Chọn ghế của bạn
            </h1>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Tàu</p>
                <p className="font-semibold text-gray-900">{trip.trainName}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Khởi hành</p>
                <p className="font-semibold text-gray-900">{trip.departureTime}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Từ</p>
                <p className="font-semibold text-gray-900">{trip.source}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Đến</p>
                <p className="font-semibold text-gray-900">{trip.destination}</p>
              </div>
            </div>
          </div>

          {/* Carriage Group Navigation */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCarriageGroupIndex(prev => Math.max(prev - 1, 0))}
              disabled={!canPrevious}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Toa trước
            </Button>
            <div className="text-sm text-gray-600 text-center">
              Toa {carriageGroupIndex * CARRIAGES_PER_GROUP + 1} - {Math.min((carriageGroupIndex + 1) * CARRIAGES_PER_GROUP, carriages.length)} / {carriages.length}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCarriageGroupIndex(prev => prev + 1)}
              disabled={!canNext}
              className="flex items-center gap-2"
            >
              Toa tiếp
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Visible Carriages Grid - 5 columns */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {visibleCarriages.map(carriage => {
                const carriageSeats = carriageSeatsById[carriage.id] ?? [];
                const selectedCount = selectedSeats.filter(id =>
                  carriageSeats.some(seat => seat.id === id)
                ).length;
                const totalSeats = carriageSeats.length;
                const availableSeats = carriageSeats.filter(s => s.status === 'available').length;

                return (
                  <div
                    key={carriage.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                    onClick={() => {
                      setSelectedCarriageId(carriage.id);
                    }}
                  >
                    <div className="text-center mb-3">
                      <div className="text-xl font-bold text-gray-900 mb-1">Toa {carriage.number}</div>
                      <div className="text-xs text-gray-600 mb-2">{carriage.type.replace('_', ' ')}</div>
                      <div className="text-sm font-semibold text-blue-600">{totalSeats - availableSeats}/{totalSeats}</div>
                    </div>
                    <div className="text-xs text-gray-600 text-center">
                      {availableSeats} / {totalSeats} còn trống
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Seat Map for Selected Carriage */}
          {selectedCarriage && (
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Sơ đồ chi tiết - Toa {selectedCarriage.number}
              </h3>
              <SeatMap
                seats={carriageSeatsById[selectedCarriage.id] ?? []}
                selectedSeats={selectedSeats}
                onSeatSelect={handleSeatSelect}
              />
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Lưu ý đặt vé</p>
              <p>Ghế sẽ được giữ trong 5 phút. Vui lòng hoàn tất đặt vé trong thời gian này.</p>
            </div>
          </div>
        </div>

        {/* Booking Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-20">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tóm tắt đặt vé</h2>

            {/* Selected Seats */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">{VN.booking.selectSeats}</h3>
              {selectedSeats.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedSeatObjects.map(seat => (
                    <div key={seat.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">Ghế {seat.seatNumber}</span>
                      <span className="font-semibold text-gray-900">{formatCurrencyVND(seat.price)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Chưa chọn ghế nào</p>
              )}
            </div>

            {/* Pricing */}
            <div className="space-y-2 mb-6 pb-6 border-b border-gray-200 mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tạm tính</span>
                <span className="font-semibold text-gray-900">{formatCurrencyVND(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Thuế và phí</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrencyVND(Math.round(totalPrice * 0.1))}
                </span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="font-semibold text-gray-900">Tổng cộng</span>
                <span className="font-bold text-blue-600">
                  {formatCurrencyVND(Math.round(totalPrice * 1.1))}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button
                onClick={() => {
                  
                  router.push(
                    `/booking/checkout?tripId=${tripId}&seats=${selectedSeats.join(',')}&total=${Math.round(totalPrice * 1.1)}`
                  )
                }
                }
                disabled={selectedSeats.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                Tiếp tục thanh toán
              </Button>
              <Button variant="outline" className="w-full">
                Quay lại
              </Button>
            </div>

            {/* Info */}
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-900 flex gap-2">
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Ghế được
                <br />
                giữ trong 5 phút
              </span>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}

export default function BookingSeatsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookingSeatsPageContent />
    </Suspense>
  );
}
