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
  const [formData, setFormData] = useState({
    source: '',
    destination: '',
    date: '',
    passengers: '1',
  });

  useEffect(() => {
    const today = toLocalYmd();
    setFormData((previous) => ({
      ...previous,
      date: previous.date || today
    }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (formData.source.trim()) params.set('source', formData.source.trim());
    if (formData.destination.trim()) params.set('destination', formData.destination.trim());
    if (formData.date.trim()) params.set('date', formData.date.trim());
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
            value={formData.source}
            placeholder="Chọn ga đi"
            exclude={formData.destination}
            onChange={(value) => setFormData((previous) => ({ ...previous, source: value }))}
          />
        </div>

        <div className="relative">
          <StationSearchSelect
            label="Ga đến"
            value={formData.destination}
            placeholder="Chọn ga đến"
            exclude={formData.source}
            onChange={(value) => setFormData((previous) => ({ ...previous, destination: value }))}
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
                source: previous.destination,
                destination: previous.source
              }));
            }}
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Đổi ga
          </Button>
        </div>

        {/* Date */}
        <div className="relative">
          <label className="text-sm font-medium text-gray-700 mb-1 block">Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
            <Input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="pl-10"
            />
          </div>
        </div>

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
                <option key={num} value={num}>
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
    </form>
  );
}
