'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { TripCard } from '@/components/public/trip-card';
import { getTodayTrips } from '@/lib/api';
import { Trip } from '@/lib/types';
import { Loader2 } from 'lucide-react';

type TodayTripsProps = {
  title?: string;
};

export function TodayTrips({ title = 'Chuyến hôm nay' }: TodayTripsProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getTodayTrips({ page, pageSize: 10 });
        if (!active) return;
        setTrips(data.data);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      } catch (unknownError) {
        if (!active) return;
        const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải chuyến hôm nay.';
        setError(message);
        setTrips([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [page]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-600 mt-1">Tối đa 10 chuyến trên mỗi trang, sắp xếp theo giờ khởi hành.</p>
        </div>
        <div className="text-sm text-gray-500">
          {total} chuyến
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">Đang tải chuyến hôm nay...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">
          Không có chuyến nào trong ngày hôm nay.
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-8 flex justify-center items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((previous) => Math.max(previous - 1, 1))}
          >
            Quay lại
          </Button>
          {Array.from({ length: totalPages }, (_, index) => index + 1)
            .filter((pageNumber) => Math.abs(pageNumber - page) <= 1 || pageNumber === 1 || pageNumber === totalPages)
            .map((pageNumber) => (
              <Button
                key={pageNumber}
                variant="outline"
                size="sm"
                className={pageNumber === page ? 'bg-blue-600 text-white' : ''}
                disabled={loading}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </Button>
            ))}
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((previous) => Math.min(previous + 1, totalPages))}
          >
            Tiếp tục
          </Button>
        </div>
      ) : null}
    </section>
  );
}
