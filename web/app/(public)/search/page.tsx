'use client';

import { useState } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowRightLeft, Calendar, Users, ArrowRight, Bus, Star, Zap } from 'lucide-react';
import { StationSearchSelect } from '@/components/public/station-search-select';
import { toLocalYmd } from '@/lib/utils';
import { TodayTrips } from '@/components/public/today-trips';

export default function SearchPage() {
  const router = useRouter();
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  const [departureStationId, setDepartureStationId] = useState('');
  const [arrivalStationId, setArrivalStationId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [passengers, setPassengers] = useState('1');
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    const today = toLocalYmd();
    setFromDate((previous) => previous || today);
    setToDate((previous) => previous || today);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');

    if (!departureStationId || !arrivalStationId) {
      setSearchError('Vui lòng chọn đầy đủ ga đi và ga đến.');
      return;
    }

    if (departureStationId === arrivalStationId) {
      setSearchError('Ga đi và ga đến phải khác nhau.');
      return;
    }

    if (tripType === 'round-trip' && toDate && fromDate && toDate < fromDate) {
      setSearchError('Ngày về phải sau ngày đi.');
      return;
    }

    const searchParams = new URLSearchParams();
    if (departureStationId.trim()) searchParams.set('departureStationId', departureStationId.trim());
    if (arrivalStationId.trim()) searchParams.set('arrivalStationId', arrivalStationId.trim());
    if (fromDate.trim()) searchParams.set('fromDate', fromDate.trim());
    searchParams.set('toDate', tripType === 'round-trip' ? toDate.trim() : fromDate.trim());
    searchParams.set('tripType', tripType);
    searchParams.set('passengers', passengers);

    router.push(`/results?${searchParams.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 to-blue-50">
      {/* Hero Section */}
      <div className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="w-full mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 text-center">
            Tìm hành trình phù hợp nhất
          </h1>
          <p className="text-lg text-blue-100 text-center mb-12">
            Tìm kiếm hàng ngàn chuyến tàu và đặt vé ngay lập tức
          </p>

          {/* Search Form Card */}
          <Card className="border-0 shadow-2xl ">
            <div className="p-6 sm:p-8">
              {/* Trip Type Selection */}
              <div className="flex gap-4 mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="one-way"
                    checked={tripType === 'one-way'}
                    onChange={(e) => setTripType(e.target.value as 'one-way')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Một chiều</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="round-trip"
                    checked={tripType === 'round-trip'}
                    onChange={(e) => setTripType(e.target.value as 'round-trip')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Khứ hồi</span>
                </label>
              </div>

              <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-3">
                {/* From City */}
                <div>
                  <StationSearchSelect
                    label="Ga đi"
                    value={departureStationId}
                    placeholder="Chọn ga đi"
                    exclude={arrivalStationId}
                    onChange={setDepartureStationId}
                  />
                </div>

                {/* To City */}
                <div>
                  <StationSearchSelect
                    label="Ga đến"
                    value={arrivalStationId}
                    placeholder="Chọn ga đến"
                    exclude={departureStationId}
                    onChange={setArrivalStationId}
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-1 flex flex-col items-center justify-center">
                  <span className="text-sm mb-2">
                    Đổi ga
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setDepartureStationId(arrivalStationId);
                      setArrivalStationId(departureStationId);
                    }}
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                  </Button>
                </div>

                {/* Depart Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ngày đi</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      min={toLocalYmd()}
                      className="pl-10 border-gray-300"
                    />
                  </div>
                </div>

                {/* Return Date - Only show for round trip */}
                {tripType === 'round-trip' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ngày về</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <Input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        min={fromDate || toLocalYmd()}
                        className="pl-10 border-gray-300"
                      />
                    </div>
                  </div>
                )}

                {/* Passengers - Responsive positioning */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hành khách</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <select
                      value={passengers}
                      onChange={(e) => setPassengers(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-gray-900 appearance-none bg-white"
                    >
                      {[1, 2, 3, 4, 5, 6].map((num) => (
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
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 flex items-center justify-center gap-2"
                  >
                    <span className="hidden sm:inline">Tìm chuyến tàu</span>
                    <span className="sm:hidden">Tìm</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </form>
              {searchError ? <p className="mt-4 text-sm text-red-600">{searchError}</p> : null}
            </div>
          </Card>
        </div>
      </div>

      <TodayTrips title="Chuyến hôm nay" />

      {/* Why Choose Us Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Vì sao chọn RailBook?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Instant Booking</h3>
            <p className="text-gray-600">Xác nhận đặt vé ngay lập tức</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
              <Bus className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nhiều lựa chọn</h3>
            <p className="text-gray-600">Chọn từ hàng ngàn chuyến tàu và tuyến đường</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
              <Star className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Giá tốt nhất</h3>
            <p className="text-gray-600">Cam kết giá cạnh tranh trên mọi tuyến</p>
          </div>
        </div>
      </div>

    </div>
  );
}
