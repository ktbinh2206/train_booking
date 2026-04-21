'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader } from 'lucide-react';
import { searchTripsByStationAndDate, getTripSeatsDetail } from '@/lib/api';
import type { SearchFormData } from './search-form-refactored';

export type TripSearchResult = {
  id: string;
  trainCode: string;
  trainName: string;
  origin: string;
  destination: string;
  originStationId: string;
  destinationStationId: string;
  departureTime: string;
  departureTimeVN: string;
  arrivalTime: string;
  arrivalTimeVN: string;
  price: number;
  capacity: number;
  availableSeatCount: number;
  reservedSeatCount: number;
};

type SearchResultsProps = {
  searchData: SearchFormData;
  onSelectTrip: (tripId: string) => void;
};

/**
 * Hiển thị kết quả tìm kiếm chuyến tàu
 */
export function SearchResults({ searchData, onSelectTrip }: SearchResultsProps) {
  const [results, setResults] = useState<TripSearchResult[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectingTripId, setSelectingTripId] = useState<string | null>(null);

  const pageSize = 10;

  // Load search results
  useEffect(() => {
    async function loadResults() {
      try {
        setLoading(true);
        setError(null);
        const response = await searchTripsByStationAndDate({
          departureStationId: searchData.departureStationId || undefined,
          arrivalStationId: searchData.arrivalStationId || undefined,
          fromDate: searchData.fromDate,
          toDate: searchData.toDate,
          page,
          pageSize
        });
        setResults(response.data || response.items || []);
        setPage(response.page);
        setTotalPages(response.totalPages);
        setTotal(response.total);
      } catch (unknownError) {
        const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải kết quả tìm kiếm';
        setError(message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }

    void loadResults();
  }, [searchData, page, pageSize]);

  const handleSelectTrip = async (tripId: string) => {
    try {
      setSelectingTripId(tripId);
      // Kiểm tra ghế trước khi navigate
      await getTripSeatsDetail(tripId);
      onSelectTrip(tripId);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải chi tiết chuyến';
      setError(message);
    } finally {
      setSelectingTripId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Loader className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
        <p className="text-gray-600">Đang tải danh sách chuyến...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-800">Lỗi tìm kiếm</h3>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600">Không tìm thấy chuyến tàu nào phù hợp với tiêu chí tìm kiếm.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-600">
          Tìm thấy <strong>{total}</strong> chuyến tàu
        </p>
      </div>

      <div className="space-y-3">
        {results.map((trip) => (
          <div
            key={trip.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
          >
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start mb-3">
              {/* Train info */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Chuyến tàu</p>
                <p className="font-bold text-gray-900">{trip.trainCode}</p>
                <p className="text-sm text-gray-600">{trip.trainName}</p>
              </div>

              {/* Route */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tuyến</p>
                <p className="text-sm font-semibold text-gray-900">{trip.origin}</p>
                <p className="text-sm text-gray-600">→</p>
                <p className="text-sm font-semibold text-gray-900">{trip.destination}</p>
              </div>

              {/* Time */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Giờ</p>
                <p className="text-sm font-semibold text-gray-900">{trip.departureTimeVN}</p>
                <p className="text-xs text-gray-500">(khởi hành)</p>
                <p className="text-sm text-gray-600 mt-1">{trip.arrivalTimeVN}</p>
                <p className="text-xs text-gray-500">(đến)</p>
              </div>

              {/* Price & Seats */}
              <div>
                <div className="mb-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Giá</p>
                  <p className="text-lg font-bold text-blue-600">
                    {trip.price.toLocaleString('vi-VN')} ₫
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Ghế</p>
                  <p className="text-sm">
                    <span className="font-semibold text-green-600">{trip.availableSeatCount}</span>
                    <span className="text-gray-500"> / {trip.capacity}</span>
                  </p>
                </div>
              </div>

              {/* Action */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => handleSelectTrip(trip.id)}
                  disabled={selectingTripId === trip.id || trip.availableSeatCount === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                >
                  {selectingTripId === trip.id ? 'Đang tải...' : 'Chọn ghế'}
                </Button>
              </div>
            </div>

            {/* Status indicator */}
            {trip.availableSeatCount === 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-2">
                <p className="text-xs text-red-600 font-semibold">Hết ghế</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Trước
          </Button>
          <span className="text-sm text-gray-600">
            Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Tiếp theo
          </Button>
        </div>
      )}
    </div>
  );
}
