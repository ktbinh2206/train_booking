'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StationSelect, type StationOption } from '@/components/shared/station-select';
import { listStations } from '@/lib/api';
import { AlertCircle } from 'lucide-react';

export type SearchFormData = {
  departureStationId: string;
  arrivalStationId: string;
  fromDate: string;
  toDate: string;
  tripType: 'one-way' | 'round-trip';
};

type SearchFormProps = {
  onSearch: (data: SearchFormData) => void;
  loading?: boolean;
  initialData?: Partial<SearchFormData>;
};

/**
 * Form tìm kiếm chuyến tàu
 * Bắt buộc: departureStationId, arrivalStationId, fromDate, toDate
 */
export function SearchForm({ onSearch, loading = false, initialData }: SearchFormProps) {
  const [stations, setStations] = useState<StationOption[]>([]);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<SearchFormData>({
    departureStationId: initialData?.departureStationId || '',
    arrivalStationId: initialData?.arrivalStationId || '',
    fromDate: initialData?.fromDate || format(new Date(), 'yyyy-MM-dd'),
    toDate: initialData?.toDate || format(new Date(), 'yyyy-MM-dd'),
    tripType: initialData?.tripType || 'one-way'
  });

  // Load danh sách ga
  useEffect(() => {
    async function fetchStations() {
      try {
        setStationsLoading(true);
        setError(null);
        const stationList = await listStations();
        setStations(stationList || []);
      } catch (unknownError) {
        const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải danh sách ga';
        setError(message);
      } finally {
        setStationsLoading(false);
      }
    }
    void fetchStations();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    if (!formData.departureStationId) {
      setError('Vui lòng chọn ga đi');
      return;
    }

    if (!formData.arrivalStationId) {
      setError('Vui lòng chọn ga đến');
      return;
    }

    if (formData.departureStationId === formData.arrivalStationId) {
      setError('Ga đi và ga đến phải khác nhau');
      return;
    }

    if (!formData.fromDate) {
      setError('Vui lòng chọn ngày khởi hành');
      return;
    }

    if (formData.tripType === 'round-trip' && !formData.toDate) {
      setError('Vui lòng chọn ngày về');
      return;
    }

    // Validate date
    if (formData.tripType === 'round-trip' && formData.fromDate > formData.toDate) {
      setError('Ngày về phải sau ngày đi');
      return;
    }

    onSearch(formData);
  };

  const minDate = format(new Date(), 'yyyy-MM-dd');

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Tìm kiếm chuyến tàu</h2>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-6 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {stationsLoading && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 mb-6">
          Đang tải danh sách ga...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Ga đi */}
        <StationSelect
          label="Ga đi"
          placeholder="Chọn ga đi"
          value={formData.departureStationId}
          options={stations}
          onChange={(id) => setFormData((prev) => ({ ...prev, departureStationId: id }))}
        />

        {/* Ga đến */}
        <StationSelect
          label="Ga đến"
          placeholder="Chọn ga đến"
          value={formData.arrivalStationId}
          options={stations}
          onChange={(id) => setFormData((prev) => ({ ...prev, arrivalStationId: id }))}
        />
      </div>

      {/* Trip type */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Loại chuyến</label>
          <Select value={formData.tripType} onValueChange={(value) => setFormData((prev) => ({ ...prev, tripType: value as 'one-way' | 'round-trip' }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one-way">Một chiều</SelectItem>
              <SelectItem value="round-trip">Khứ hồi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Ngày đi */}
        <div>
          <label htmlFor="fromDate" className="text-sm font-medium text-gray-700 mb-1 block">
            Ngày đi
          </label>
          <Input
            id="fromDate"
            type="date"
            min={minDate}
            value={formData.fromDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, fromDate: e.target.value }))}
            required
          />
        </div>

        {/* Ngày về (nếu round-trip) */}
        {formData.tripType === 'round-trip' && (
          <div>
            <label htmlFor="toDate" className="text-sm font-medium text-gray-700 mb-1 block">
              Ngày về
            </label>
            <Input
              id="toDate"
              type="date"
              min={formData.fromDate || minDate}
              value={formData.toDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, toDate: e.target.value }))}
              required
            />
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={loading || stationsLoading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? 'Đang tìm kiếm...' : 'Tìm kiếm'}
        </Button>
      </div>
    </form>
  );
}
