'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calendar, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StationSearchSelect } from '@/components/public/station-search-select';
import { toLocalYmd } from '@/lib/utils';

export interface UnifiedSearchFormData {
  departureStationId: string;
  arrivalStationId: string;
  fromDate: string;
  toDate: string;
  status: string;
  passengers: string;
}

export interface UnifiedSearchFormProps {
  /** Initial form values (typically from URL params) */
  initialValues?: Partial<UnifiedSearchFormData>;
  /** Called when form is submitted */
  onSearch: (data: UnifiedSearchFormData) => void;
  /** Show search button and form structure (true) or inline (false) */
  isSearchPage?: boolean;
  /** Loading state for submit button */
  loading?: boolean;
}

export function UnifiedSearchForm({
  initialValues = {},
  onSearch,
  isSearchPage = false,
  loading = false
}: UnifiedSearchFormProps) {
  const today = toLocalYmd();
  
  // Create a stable default values object using useMemo to prevent infinite loops
  const defaultValues = useMemo(() => ({
    departureStationId: initialValues.departureStationId || '',
    arrivalStationId: initialValues.arrivalStationId || '',
    fromDate: initialValues.fromDate || today,
    toDate: initialValues.toDate || today,
    status: initialValues.status || 'all',
    passengers: initialValues.passengers || '1'
  }), [initialValues.departureStationId, initialValues.arrivalStationId, initialValues.fromDate, initialValues.toDate, initialValues.status, initialValues.passengers, today]);

  const [formData, setFormData] = useState<UnifiedSearchFormData>(defaultValues);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Only sync form data when actual values change, not when object reference changes
  useEffect(() => {
    setFormData(defaultValues);
  }, [defaultValues]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // if (!formData.departureStationId.trim()) {
    //   newErrors.departureStationId = 'Vui lòng chọn ga đi';
    // }

    // if (!formData.arrivalStationId.trim()) {
    //   newErrors.arrivalStationId = 'Vui lòng chọn ga đến';
    // }

    if (formData.departureStationId === formData.arrivalStationId && formData.departureStationId) {
      newErrors.arrivalStationId = 'Ga đi và ga đến phải khác nhau';
    }

    // if (!formData.fromDate.trim()) {
    //   newErrors.fromDate = 'Vui lòng chọn ngày bắt đầu';
    // }

    // if (!formData.toDate.trim()) {
    //   newErrors.toDate = 'Vui lòng chọn ngày kết thúc';
    // }

    if (formData.fromDate && formData.toDate && formData.toDate < formData.fromDate) {
      newErrors.toDate = 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSearch(formData);
    }
  };

  const handleStationSwap = () => {
    setFormData(prev => ({
      ...prev,
      departureStationId: prev.arrivalStationId,
      arrivalStationId: prev.departureStationId
    }));
  };

  return (
    <form onSubmit={handleSubmit} className={isSearchPage ? 'w-full' : ''}>
      <div className={isSearchPage ? 'space-y-6' : 'space-y-4'}>
        {/* Main Grid */}
        <div className={isSearchPage 
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3'
        }>
          {/* Departure Station */}
          <div>
            <StationSearchSelect
              label="Ga đi"
              value={formData.departureStationId}
              placeholder="Chọn ga đi"
              exclude={formData.arrivalStationId}
              onChange={(value) => {
                setFormData(prev => ({ ...prev, departureStationId: value }));
                if (errors.departureStationId) {
                  setErrors(prev => ({ ...prev, departureStationId: '' }));
                }
              }}
            />
            {errors.departureStationId && (
              <p className="text-sm text-red-600 mt-1">{errors.departureStationId}</p>
            )}
          </div>

          {/* Arrival Station */}
          <div>
            <StationSearchSelect
              label="Ga đến"
              value={formData.arrivalStationId}
              placeholder="Chọn ga đến"
              exclude={formData.departureStationId}
              onChange={(value) => {
                setFormData(prev => ({ ...prev, arrivalStationId: value }));
                if (errors.arrivalStationId) {
                  setErrors(prev => ({ ...prev, arrivalStationId: '' }));
                }
              }}
            />
            {errors.arrivalStationId && (
              <p className="text-sm text-red-600 mt-1">{errors.arrivalStationId}</p>
            )}
          </div>

          {/* Station Swap Button */}
          {isSearchPage ? (
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleStationSwap}
                className="w-full"
              >
                ⇄ Đổi ga
              </Button>
            </div>
          ) : null}

          {/* From Date */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Từ ngày</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
              <Input
                type="date"
                value={formData.fromDate}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, fromDate: e.target.value }));
                  if (errors.fromDate) {
                    setErrors(prev => ({ ...prev, fromDate: '' }));
                  }
                }}
                className="pl-10"
                min={today}
              />
            </div>
            {errors.fromDate && (
              <p className="text-sm text-red-600 mt-1">{errors.fromDate}</p>
            )}
          </div>

          {/* To Date */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Đến ngày</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
              <Input
                type="date"
                value={formData.toDate}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, toDate: e.target.value }));
                  if (errors.toDate) {
                    setErrors(prev => ({ ...prev, toDate: '' }));
                  }
                }}
                className="pl-10"
                min={formData.fromDate || today}
              />
            </div>
            {errors.toDate && (
              <p className="text-sm text-red-600 mt-1">{errors.toDate}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Trạng thái</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 text-sm"
            >
              <option value="all">Tất cả</option>
              <option value="ON_TIME">Đúng giờ</option>
              <option value="DELAYED">Trễ giờ</option>
              <option value="DEPARTED">Đã khởi hành</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          {/* Passengers */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Hành khách</label>
            <div className="relative">
              <Users className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={formData.passengers}
                onChange={(e) => setFormData(prev => ({ ...prev, passengers: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 text-sm"
              >
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'Hành khách' : 'Hành khách'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Button */}
          {isSearchPage ? (
            <div className="lg:col-span-3 flex items-end">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {loading ? 'Đang tìm kiếm...' : 'Tìm chuyến tàu'}
              </Button>
            </div>
          ) : (
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {loading ? 'Đang tìm...' : 'Tìm'}
              </Button>
            </div>
          )}
        </div>

        {/* Error Summary */}
        {Object.keys(errors).length > 0 && isSearchPage && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700 font-medium">Vui lòng sửa các lỗi sau:</p>
            <ul className="mt-2 space-y-1">
              {Object.values(errors).map((error, idx) => (
                <li key={idx} className="text-sm text-red-600">• {error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </form>
  );
}
