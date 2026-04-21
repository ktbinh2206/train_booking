'use client';

import { useState } from 'react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRightLeft, Calendar, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { VN } from '@/lib/translations';
import { StationSearchSelect } from '@/components/public/station-search-select';
import { toLocalYmd } from '@/lib/utils';

export function SearchForm() {
  const router = useRouter();
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    departureStationId: '',
    arrivalStationId: '',
    fromDate: '',
    toDate: '',
    tripType: 'one-way' as 'one-way' | 'round-trip',
    passengers: '1',
  });

  useEffect(() => {
    const today = toLocalYmd();
    setFormData((previous) => ({
      ...previous,
      fromDate: previous.fromDate || today,
      toDate: previous.toDate || today
    }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.departureStationId) {
      setFormError('Vui lòng chọn ga đi.');
      return;
    }

    if (!formData.arrivalStationId) {
      setFormError('Vui lòng chọn ga đến.');
      return;
    }

    if (formData.departureStationId === formData.arrivalStationId) {
      setFormError('Ga đi và ga đến phải khác nhau.');
      return;
    }

    if (formData.tripType === 'round-trip' && formData.toDate && formData.fromDate && formData.toDate < formData.fromDate) {
      setFormError('Ngày về phải sau ngày đi.');
      return;
    }

    const params = new URLSearchParams();
    params.set('departureStationId', formData.departureStationId);
    params.set('arrivalStationId', formData.arrivalStationId);
    params.set('fromDate', formData.fromDate);
    params.set('toDate', formData.tripType === 'round-trip' ? formData.toDate : formData.fromDate);
    params.set('tripType', formData.tripType);
    params.set('passengers', formData.passengers);
    router.push(`/results?${params.toString()}`);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
        <div className="relative">
          <StationSearchSelect
            label={VN.search.from}
            value={formData.departureStationId}
            placeholder="Chọn ga đi"
            exclude={formData.arrivalStationId}
            onChange={(value) => setFormData((previous) => ({ ...previous, departureStationId: value }))}
          />
        </div>

        <div className="relative">
          <StationSearchSelect
            label="Ga đến"
            value={formData.arrivalStationId}
            placeholder="Chọn ga đến"
            exclude={formData.departureStationId}
            onChange={(value) => setFormData((previous) => ({ ...previous, arrivalStationId: value }))}
          />
        </div>

        <div className="flex items-end justify-center">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setFormData((previous) => ({
                ...previous,
                departureStationId: previous.arrivalStationId,
                arrivalStationId: previous.departureStationId
              }));
            }}
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Đổi ga
          </Button>
        </div>

        {/* Date */}
        <div className="relative">
          <label className="text-sm font-medium text-gray-700 mb-1 block">Ngày đi</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
            <Input
              type="date"
              name="fromDate"
              value={formData.fromDate}
              onChange={handleChange}
              className="pl-10"
            />
          </div>
        </div>

        <div className="relative">
          <label className="text-sm font-medium text-gray-700 mb-1 block">Loại chuyến</label>
          <select
            name="tripType"
            value={formData.tripType}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-transparent"
          >
            <option value="one-way">Một chiều</option>
            <option value="round-trip">Khứ hồi</option>
          </select>
        </div>

        {formData.tripType === 'round-trip' ? (
          <div className="relative">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Ngày về</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
              <Input
                type="date"
                name="toDate"
                value={formData.toDate}
                onChange={handleChange}
                className="pl-10"
              />
            </div>
          </div>
        ) : null}

        <div className="relative">
          <label className="text-sm font-medium text-gray-700 mb-1 block">{VN.search.passengers}</label>
          <div className="relative">
            <Users className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
            <select
              name="passengers"
              value={formData.passengers}
              onChange={handleChange}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-transparent"
            >
              {[1, 2, 3, 4, 5, 6].map(num => (
                <option key={String(num)} value={String(num)}>
                  {num} {num === 1 ? 'Hành khách' : 'Hành khách'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Button */}
        <div className="flex items-end">
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            {VN.search.searchTrips}
          </Button>
        </div>
      </div>
      {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
    </form>
  );
}
