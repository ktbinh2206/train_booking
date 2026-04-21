'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { TripCard } from '@/components/public/trip-card';
import { SearchFilters } from '@/components/public/search-filters';
import { Breadcrumb } from '@/components/shared/breadcrumb';
import { StationSearchSelect } from '@/components/public/station-search-select';
import { Button } from '@/components/ui/button';
import { listStations, searchTrips } from '@/lib/api';
import { Trip } from '@/lib/types';
import { ArrowUpDown, ListFilter, Calendar } from 'lucide-react';
import { VN } from '@/lib/translations';
import { toLocalYmd } from '@/lib/utils';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const [maxPrice, setMaxPrice] = useState(1000000);
  const [sortBy, setSortBy] = useState('recommended');
  const [showFilters, setShowFilters] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTrips, setTotalTrips] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stations, setStations] = useState<Array<{ id: string; code: string; name: string; city: string; label: string }>>([]);
  const [stationsLoading, setStationsLoading] = useState(true);

  const departureStationId = searchParams.get('departureStationId') || searchParams.get('source') || '';
  const arrivalStationId = searchParams.get('arrivalStationId') || searchParams.get('destination') || '';
  const fromDate = searchParams.get('fromDate') || searchParams.get('date') || searchParams.get('departDate') || '';
  const toDate = searchParams.get('toDate') || searchParams.get('returnDate') || '';
  const tripType = searchParams.get('tripType') === 'round-trip' ? 'round-trip' : 'one-way';
  const passengers = searchParams.get('passengers') || '1';
  const effectiveFromDate = fromDate || toLocalYmd();
  const effectiveToDate = toDate || effectiveFromDate;

  // Form state for embedded search form
  const [formData, setFormData] = useState({
    departureStationId,
    arrivalStationId,
    fromDate: effectiveFromDate,
    toDate: effectiveToDate,
    tripType,
    passengers: passengers || '1',
    useRange: !!(fromDate || toDate)
  });

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setStationsLoading(true);
        const data = await listStations();
        if (active) {
          setStations(data);
        }
      } finally {
        if (active) {
          setStationsLoading(false);
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [departureStationId, arrivalStationId, fromDate, toDate, tripType]);

  // Update search params when form changes
  const handleEditSearch = () => {
    const params = new URLSearchParams();
    if (formData.departureStationId.trim()) params.set('departureStationId', formData.departureStationId.trim());
    if (formData.arrivalStationId.trim()) params.set('arrivalStationId', formData.arrivalStationId.trim());

    if (formData.useRange) {
      if (formData.fromDate.trim()) params.set('fromDate', formData.fromDate.trim());
      if (formData.toDate.trim()) params.set('toDate', formData.toDate.trim());
      params.set('tripType', 'round-trip');
    } else {
      if (formData.fromDate.trim()) params.set('fromDate', formData.fromDate.trim());
      params.set('toDate', formData.fromDate.trim());
      params.set('tripType', 'one-way');
    }

    if (formData.passengers && formData.passengers !== '1') params.set('passengers', formData.passengers);

    router.push(`/results?${params.toString()}`);
  };

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await searchTrips({
          departureStationId: departureStationId.trim() || undefined,
          arrivalStationId: arrivalStationId.trim() || undefined,
          fromDate: (fromDate || effectiveFromDate).trim() || undefined,
          toDate: (toDate || effectiveToDate).trim() || undefined,
          tripType,
          page,
          pageSize: 10
        });

        if (active) {
          setTrips(data.data);
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
  }, [departureStationId, arrivalStationId, fromDate, toDate, tripType, page]);

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

  const departureStationLabel = stations.find((station) => station.id === departureStationId)?.label || 'Tất cả';
  const arrivalStationLabel = stations.find((station) => station.id === arrivalStationId)?.label || 'Tất cả';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: VN.nav.home, href: '/' },
          { label: VN.results.searchResults },
        ]}
      />

      {/* Embedded Search Form */}
      <div className="mt-6 mb-8 bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Chỉnh sửa tìm kiếm</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Origin */}
          <div>
            <StationSearchSelect
              label="Ga đi"
              value={formData.departureStationId}
              placeholder="Chọn ga đi"
              exclude={formData.arrivalStationId}
              onChange={(value) => setFormData((previous) => ({ ...previous, departureStationId: value }))}
            />
          </div>

          {/* Destination */}
          <div>
            <StationSearchSelect
              label="Ga đến"
              value={formData.arrivalStationId}
              placeholder="Chọn ga đến"
              exclude={formData.departureStationId}
              onChange={(value) => setFormData((previous) => ({ ...previous, arrivalStationId: value }))}
            />
          </div>

          {/* Date or Date Range Toggle */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Ngày</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useRange"
                checked={formData.useRange}
                onChange={(e) => setFormData(prev => ({ ...prev, useRange: e.target.checked }))}
                className="w-4 h-4 border border-gray-300 rounded"
              />
              <label htmlFor="useRange" className="text-sm text-gray-600">Khoảng ngày</label>
            </div>
          </div>

          {/* Passengers */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Hành khách</label>
            <select
              value={formData.passengers}
              onChange={(e) => setFormData(prev => ({ ...prev, passengers: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
            >
              {[1, 2, 3, 4, 5, 6].map(num => (
                <option key={num} value={num}>{num} hành khách</option>
              ))}
            </select>
          </div>

          {/* Search Button */}
          <div className="flex items-end">
            <Button onClick={handleEditSearch} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Tìm kiếm
            </Button>
          </div>
        </div>

        {/* Date inputs row */}
        {formData.useRange ? (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Từ ngày</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={formData.fromDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, fromDate: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Đến ngày</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={formData.toDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, toDate: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Ngày khởi hành</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={formData.fromDate}
                onChange={(e) => setFormData(prev => ({ ...prev, fromDate: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Search Summary */}
      <div className="mt-6 mb-8 bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {departureStationLabel} → {arrivalStationLabel}
            </h1>
            <p className="text-gray-600 text-sm">
              {formData.useRange && formData.fromDate && formData.toDate
                ? `${formatSearchDate(formData.fromDate)} → ${formatSearchDate(formData.toDate)}`
                : formatSearchDate(formData.fromDate)}{' '}
              • {passengers} {passengers === '1' ? 'Hành khách' : 'Hành khách'}
            </p>
          </div>
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
              <Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Chỉnh sửa tìm kiếm</Button>
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
