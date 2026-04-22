'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { formatCurrencyVND } from '@/lib/utils';

interface SearchFiltersProps {
  maxPrice: number;
  onFilterChange: (filters: any) => void;
}

export function SearchFilters({ maxPrice, onFilterChange }: SearchFiltersProps) {
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ maxPrice: parseInt(e.target.value) });
  };

  const handleStatusChange = (status: string) => {
    onFilterChange({ status });
  };

  const handleTypeChange = (type: string) => {
    onFilterChange({ carriageType: type });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-fit">
      <h3 className="font-semibold text-gray-900 mb-4">Bộ lọc</h3>

      {/* Price Filter */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Giá tối đa: {formatCurrencyVND(maxPrice)}
        </label>
        <input
          type="range"
          min="100000"
          max="10000000"
          step="50000"
          defaultValue={maxPrice}
          onChange={handlePriceChange}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{formatCurrencyVND(100000)}</span>
          <span>{formatCurrencyVND(10000000)}</span>
        </div>
      </div>

      {/* Train Type */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <label className="text-sm font-medium text-gray-700 mb-3 block">Loại tàu</label>
        <div className="space-y-2">
          {[
            { id: 'express', label: 'Nhanh' },
            { id: 'fast', label: 'Tốc hành' },
            { id: 'rajdhani', label: 'Rajdhani' },
            { id: 'shatabdi', label: 'Shatabdi' },
          ].map(type => (
            <div key={type.id} className="flex items-center">
              <Checkbox
                id={type.id}
                onCheckedChange={() => handleTypeChange(type.id)}
              />
              <Label htmlFor={type.id} className="ml-2 text-sm cursor-pointer">
                {type.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Seat Type */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <label className="text-sm font-medium text-gray-700 mb-3 block">Hạng ghế</label>
        <div className="space-y-2">
          {[
            { id: 'economy', label: 'Phổ thông' },
            { id: 'business', label: 'Thương gia' },
            { id: 'first', label: 'Hạng nhất' },
          ].map(type => (
            <div key={type.id} className="flex items-center">
              <Checkbox
                id={`seat-${type.id}`}
                onCheckedChange={() => handleTypeChange(type.id)}
              />
              <Label htmlFor={`seat-${type.id}`} className="ml-2 text-sm cursor-pointer">
                {type.label}
              </Label>
            </div>
          ))}
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
              <Checkbox id={`time-${time.id}`} />
              <Label htmlFor={`time-${time.id}`} className="ml-2 text-sm cursor-pointer">
                {time.icon} {time.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full mt-4"
        onClick={() => onFilterChange({ reset: true })}
      >
        Đặt lại bộ lọc
      </Button>
    </div>
  );
}
