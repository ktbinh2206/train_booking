'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { formatCurrencyVND } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type SearchFilterChange = {
  minPrice?: number;
  maxPrice?: number;
  departureTimeRanges?: string[];
  status?: string;
  carriageType?: string;
  reset?: boolean;
};

interface SearchFiltersProps {
  minPrice?: number;
  maxPrice: number;
  onFilterChange: (filters: SearchFilterChange) => void;
}

export function SearchFilters({ minPrice = 0, maxPrice, onFilterChange }: SearchFiltersProps) {
  const searchParams = useSearchParams();
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);

  useEffect(() => {
    const ranges = (searchParams.get('departureTimeRanges') || '')
      .split(',')
      .map((item) => item.trim())
      .filter((item) => ['morning', 'afternoon', 'evening', 'night'].includes(item));

    setSelectedTimes(ranges);
  }, [searchParams]);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = Number.parseInt(e.target.value, 10);
    if (Number.isFinite(parsed)) {
      setLocalMaxPrice(parsed); // chỉ update UI
    }
  };

  const handlePriceCommit = () => {
    onFilterChange({
      minPrice,
      maxPrice: localMaxPrice,
    });
  };

  const handleStatusChange = (status: string) => {
    onFilterChange({ status });
  };

  const handleTypeChange = (type: string) => {
    onFilterChange({ carriageType: type });
  };

  const handleTimeToggle = (timeId: string, checked: boolean) => {
    const updatedArray = checked
      ? [...selectedTimes, timeId]
      : selectedTimes.filter((value) => value !== timeId);

    setSelectedTimes(updatedArray);
    onFilterChange({
      departureTimeRanges: updatedArray
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-fit">
      <h3 className="font-semibold text-gray-900 mb-4">Bộ lọc</h3>

      {/* Price Filter */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Giá tối đa: {formatCurrencyVND(localMaxPrice)}
        </label>
        <input
          type="range"
          min="100000"
          max="10000000"
          step="50000"
          value={localMaxPrice}
          onChange={handlePriceChange}
          onMouseUp={handlePriceCommit}     // desktop
          onTouchEnd={handlePriceCommit}    // mobile
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{formatCurrencyVND(100000)}</span>
          <span>{formatCurrencyVND(10000000)}</span>
        </div>
      </div>

      {/* Time Filter */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 mb-3 block">Khung giờ khởi hành</label>
        <div className="space-y-2">
          {[
            { id: 'morning', label: '06:00 - 12:00', icon: '🌅' },
            { id: 'afternoon', label: '12:00 - 18:00', icon: '☀️' },
            { id: 'evening', label: '18:00 - 24:00', icon: '🌆' },
            { id: 'night', label: '00:00 - 06:00', icon: '🌙' },
          ].map(time => (
            <div key={time.id} className="flex items-center">
              <Checkbox
                id={`time-${time.id}`}
                checked={selectedTimes.includes(time.id)}
                onCheckedChange={(value) => handleTimeToggle(time.id, Boolean(value))}
              />
              <Label htmlFor={`time-${time.id}`} className="ml-2 text-sm cursor-pointer">
                {time.icon} {time.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* <Button
        variant="outline"
        className="w-full mt-4"
        onClick={() => onFilterChange({ reset: true })}
      >
        Đặt lại bộ lọc
      </Button> */}
    </div>
  );
}
