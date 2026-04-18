'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { TripCard } from '@/components/public/trip-card';
import { SearchFilters } from '@/components/public/search-filters';
import { Breadcrumb } from '@/components/shared/breadcrumb';
import { Button } from '@/components/ui/button';
import { searchTrips } from '@/lib/api';
import { Trip } from '@/lib/types';
import { ArrowUpDown, ListFilter } from 'lucide-react';
import { VN } from '@/lib/translations';
import { toLocalYmd } from '@/lib/utils';

function formatSearchDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function ResultsPageContent() {
  const searchParams = useSearchParams();
  const [maxPrice, setMaxPrice] = useState(1000000);
  const [sortBy, setSortBy] = useState('recommended');
  const [showFilters, setShowFilters] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTrips, setTotalTrips] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultDate, setDefaultDate] = useState('');

  const source = searchParams.get('source') || searchParams.get('from') || '';
  const destination = searchParams.get('destination') || searchParams.get('to') || '';
  const date = searchParams.get('date') || searchParams.get('departDate') || '';
  const passengers = searchParams.get('passengers') || '1';
  const effectiveDate = date || defaultDate;

  useEffect(() => {
    setDefaultDate(toLocalYmd());
  }, []);

  useEffect(() => {
    setPage(1);
  }, [source, destination, effectiveDate]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await searchTrips({
          origin: source.trim() || undefined,
          destination: destination.trim() || undefined,
          date: effectiveDate.trim() || undefined,
          page,
          pageSize: 10
        });

        if (active) {
          setTrips(data.items);
          setTotalPages(data.totalPages);
          setTotalTrips(data.total);
        }
      } catch (unknownError) {
        if (active) {
          const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải danh sách chuyến tàu.';
          setError(message);
          setTrips([]);
          setTotalPages(1);
          setTotalTrips(0);
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
  }, [source, destination, effectiveDate, page]);

  const filteredTrips = useMemo(
    () => trips.filter((trip) => trip.basePrice <= maxPrice),
    [trips, maxPrice]
  );

  const sortedTrips = [...filteredTrips].sort((a, b) => {
    if (sortBy === 'price') return a.basePrice - b.basePrice;
    if (sortBy === 'duration') {
      const durationA = Number.parseInt(a.duration, 10);
      const durationB = Number.parseInt(b.duration, 10);
      return durationA - durationB;
    }
    return 0;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: VN.nav.home, href: '/' },
          { label: VN.results.searchResults },
        ]}
      />

      {/* Search Summary */}
      <div className="mt-6 mb-8 bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {source || 'Tất cả'} → {destination || 'Tất cả'}
            </h1>
            <p className="text-gray-600 text-sm">
              {date
                ? formatSearchDate(date)
                : effectiveDate
                  ? formatSearchDate(effectiveDate)
                  : 'Hôm nay'}{' '}
              • {passengers} {passengers === '1' ? 'Hành khách' : 'Hành khách'}
            </p>
          </div>
          <Button variant="outline" size="sm">
            Chỉnh sửa tìm kiếm
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Filters */}
        <div className="lg:block">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden mb-4 w-full flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg"
          >
            <ListFilter className="w-4 h-4" />
            <span>Hiển thị bộ lọc</span>
          </button>
          {showFilters && (
            <SearchFilters
              maxPrice={maxPrice}
              onFilterChange={(filters) => {
                if (filters.maxPrice) setMaxPrice(filters.maxPrice);
              }}
            />
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Sorting */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="text-sm text-gray-600">
              Hiển thị <span className="font-semibold">{sortedTrips.length}</span> / <span className="font-semibold">{totalTrips}</span> chuyến tàu
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500"
              >
                <option value="recommended">Được đề xuất</option>
                <option value="price">Giá: Thấp đến Cao</option>
                <option value="duration">Thời gian: Ngắn đến Dài</option>
              </select>
            </div>
          </div>

          {/* Trip List */}
          {loading ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-600">Đang tải danh sách chuyến tàu...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg border border-red-200 p-12 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Tải lại
              </Button>
            </div>
          ) : sortedTrips.length > 0 ? (
            <div className="space-y-4">
              {sortedTrips.map(trip => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-600 mb-4">Không tìm thấy chuyến tàu phù hợp với tiêu chí của bạn</p>
              <p className="text-sm text-gray-500 mb-6">
                Hãy thử điều chỉnh bộ lọc của bạn hoặc tìm kiếm tuyến đường khác
              </p>
              <Button variant="outline">Chỉnh sửa tìm kiếm</Button>
            </div>
          )}

          {/* Pagination */}
          {sortedTrips.length > 0 && (
            <div className="mt-8 flex justify-center items-center gap-2">
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
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResultsPageContent />
    </Suspense>
  );
}
