'use client';

import { Suspense, useMemo, useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TripCard } from '@/components/public/trip-card';
import { SearchFilters } from '@/components/public/search-filters';
import { Breadcrumb } from '@/components/shared/breadcrumb';
import { Button } from '@/components/ui/button';
import { listStations, searchTrips } from '@/lib/api';
import { Trip } from '@/lib/types';
import { ArrowUpDown, ListFilter } from 'lucide-react';
import { VN } from '@/lib/translations';
import { UnifiedSearchForm, type UnifiedSearchFormData } from '@/components/public/unified-search-form';

function formatSearchDate(value: string) {
  if (!value) {
    return 'Bất kỳ ngày nào';
  }

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
  const searchKey = searchParams.toString();
  
  // Derive filters from URL - this is the single source of truth
  const filters = useMemo(() => ({
    departureStationId: searchParams.get('departureStationId') || '',
    arrivalStationId: searchParams.get('arrivalStationId') || '',
    fromDate: searchParams.get('fromDate') || '',
    toDate: searchParams.get('toDate') || '',
    departureTimeRanges: (searchParams.get('departureTimeRanges') || '')
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
    status: searchParams.get('status') || 'all',
    minPrice: Number(searchParams.get('minPrice') || 0),
    maxPrice: Number(searchParams.get('maxPrice') || 10000000),
    page: Number(searchParams.get('page') || 1),
    pageSize: Number(searchParams.get('pageSize') || 10),
    passengers: searchParams.get('passengers') || '1',
  }), [searchKey]);

  // UI state only
  const [trips, setTrips] = useState<Trip[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTrips, setTotalTrips] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('recommended');
  const [showFilters, setShowFilters] = useState(true);
  const [stations, setStations] = useState<Array<{ id: string; code: string; name: string; city: string; label: string }>>([]);

  // Load stations on mount
  useEffect(() => {
    let active = true;

    const loadStations = async () => {
      try {
        const data = await listStations();
        if (active) {
          setStations(data);
        }
      } catch (err) {
        // Silently fail - stations are optional for display
        if (active) setStations([]);
      }
    };

    void loadStations();
    return () => { active = false; };
  }, []);

  // Fetch trips when filters change (URL changes)
  useEffect(() => {
    let active = true;

    const fetchTrips = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await searchTrips({
          departureStationId: filters.departureStationId || undefined,
          arrivalStationId: filters.arrivalStationId || undefined,
          status: filters.status !== 'all' ? filters.status : undefined,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          departureTimeRanges: filters.departureTimeRanges.length > 0 ? filters.departureTimeRanges : undefined,
          minPrice: filters.minPrice > 0 ? filters.minPrice : undefined,
          maxPrice: filters.maxPrice < 10000000 ? filters.maxPrice : undefined,
          page: filters.page,
          pageSize: filters.pageSize
        });

        if (active) {
          setTrips(data.data);
          setTotalPages(data.totalPages);
          setTotalTrips(data.total);
        }
      } catch (err) {
        if (active) {
          const message = err instanceof Error ? err.message : 'Không thể tải danh sách chuyến tàu.';
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

    void fetchTrips();
    return () => { active = false; };
  }, [filters]);

  // Handle form submission - update URL params
  const handleSearch = useCallback((formData: UnifiedSearchFormData) => {
    const params = new URLSearchParams();
    
    if (formData.departureStationId?.trim()) {
      params.set('departureStationId', formData.departureStationId.trim());
    }
    if (formData.arrivalStationId?.trim()) {
      params.set('arrivalStationId', formData.arrivalStationId.trim());
    }
    if (formData.fromDate?.trim()) {
      params.set('fromDate', formData.fromDate.trim());
    }
    if (formData.toDate?.trim()) {
      params.set('toDate', formData.toDate.trim());
    }
    if (formData.status && formData.status !== 'all') {
      params.set('status', formData.status);
    }
    if (formData.passengers && formData.passengers !== '1') {
      params.set('passengers', formData.passengers);
    }

    // Reset to page 1 on new search
    router.push(`/results?${params.toString()}`);
  }, [router]);

  // Handle price filter changes
  const handleFilterChange = useCallback((nextFilters: { minPrice?: number; maxPrice?: number; departureTimeRanges?: string[]; reset?: boolean }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextFilters.reset) {
      params.delete('minPrice');
      params.delete('maxPrice');
      params.delete('departureTimeRanges');
    } else {
      if (typeof nextFilters.minPrice === 'number' && Number.isFinite(nextFilters.minPrice)) {
        params.set('minPrice', String(nextFilters.minPrice));
      }

      if (typeof nextFilters.maxPrice === 'number' && Number.isFinite(nextFilters.maxPrice)) {
        params.set('maxPrice', String(nextFilters.maxPrice));
      }

      if (nextFilters.departureTimeRanges) {
        if (nextFilters.departureTimeRanges.length > 0) {
          params.set('departureTimeRanges', nextFilters.departureTimeRanges.join(','));
        } else {
          params.delete('departureTimeRanges');
        }
      }
    }

    params.set('page', '1'); // Reset pagination
    router.push(`/results?${params.toString()}`);
  }, [searchParams, router]);

  // Handle pagination
  const handlePageChange = useCallback((newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`/results?${params.toString()}`);
  }, [searchParams, router]);

  // Get station labels
  const departureStationLabel = stations.find((s) => s.id === filters.departureStationId)?.label || 'Tất cả';
  const arrivalStationLabel = stations.find((s) => s.id === filters.arrivalStationId)?.label || 'Tất cả';

  // Memoize initialValues to prevent infinite re-renders
  const formInitialValues = useMemo(() => ({
    departureStationId: filters.departureStationId,
    arrivalStationId: filters.arrivalStationId,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    status: filters.status,
    passengers: filters.passengers
  }), [filters.departureStationId, filters.arrivalStationId, filters.fromDate, filters.toDate, filters.status, filters.passengers]);

  // Sort trips client-side (filtering and sorting done after API fetch)
  const sortedTrips = useMemo(() => {
    const sorted = [...trips].sort((a, b) => {
      if (sortBy === 'price') return a.basePrice - b.basePrice;
      if (sortBy === 'duration') {
        const durationA = Number.parseInt(a.duration, 10);
        const durationB = Number.parseInt(b.duration, 10);
        return durationA - durationB;
      }
      return 0;
    });

    return sorted;
  }, [trips, sortBy]);

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
        <UnifiedSearchForm 
          initialValues={formInitialValues}
          onSearch={handleSearch}
          isSearchPage={false}
        />
      </div>

      {/* Search Summary */}
      <div className="mt-6 mb-8 bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {departureStationLabel} → {arrivalStationLabel}
            </h1>
            <p className="text-gray-600 text-sm">
              {formatSearchDate(filters.fromDate)} • {filters.passengers} {filters.passengers === '1' ? 'Hành khách' : 'Hành khách'}
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
              maxPrice={filters.maxPrice}
              minPrice={filters.minPrice}
              onFilterChange={handleFilterChange}
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
                disabled={filters.page <= 1 || loading}
                onClick={() => handlePageChange(filters.page - 1)}
              >
                Quay lại
              </Button>
              {Array.from({ length: totalPages }, (_, index) => index + 1)
                .filter((pageNumber) => Math.abs(pageNumber - filters.page) <= 1 || pageNumber === 1 || pageNumber === totalPages)
                .map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant="outline"
                    size="sm"
                    className={pageNumber === filters.page ? 'bg-blue-600 text-white' : ''}
                    disabled={loading}
                    onClick={() => handlePageChange(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                ))}
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page >= totalPages || loading}
                onClick={() => handlePageChange(filters.page + 1)}
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
