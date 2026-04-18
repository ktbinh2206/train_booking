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

const POPULAR_ROUTES = [
  { from: 'Hà Nội', to: 'Đà Nẵng', trips: '45+', duration: '20h 30m' },
  { from: 'Hà Nội', to: 'TP.HCM', trips: '38+', duration: '27h 15m' },
  { from: 'Nha Trang', to: 'Đà Nẵng', trips: '32+', duration: '12h 45m' },
  { from: 'Huế', to: 'Hà Nội', trips: '28+', duration: '18h' },
  { from: 'Sài Gòn', to: 'Nha Trang', trips: '56+', duration: '3h 30m' },
  { from: 'Hà Nội', to: 'Vinh', trips: '42+', duration: '2h 45m' },
];

export default function SearchPage() {
  const router = useRouter();
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [departDate, setDepartDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [passengers, setPassengers] = useState('1');

  useEffect(() => {
    const today = toLocalYmd();
    setDepartDate((previous) => previous || today);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const searchParams = new URLSearchParams();
    if (fromCity.trim()) searchParams.set('source', fromCity.trim());
    if (toCity.trim()) searchParams.set('destination', toCity.trim());
    if (departDate.trim()) searchParams.set('date', departDate.trim());
    if (tripType === 'round-trip' && returnDate.trim()) searchParams.set('returnDate', returnDate.trim());
    searchParams.set('passengers', passengers);

    router.push(`/results?${searchParams.toString()}`);
  };

  const handleQuickRoute = (from: string, to: string) => {
    const searchParams = new URLSearchParams({
      source: from,
      destination: to,
      date: toLocalYmd(),
      passengers: '1',
    });
    router.push(`/results?${searchParams.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 via-blue-500 to-blue-50">
      {/* Hero Section */}
      <div className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 text-center">
            Tìm hành trình phù hợp nhất
          </h1>
          <p className="text-lg text-blue-100 text-center mb-12">
            Tìm kiếm hàng ngàn chuyến tàu và đặt vé ngay lập tức
          </p>

          {/* Search Form Card */}
          <Card className="border-0 shadow-2xl">
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
                    value={fromCity}
                    placeholder="Chọn ga đi"
                    exclude={toCity}
                    onChange={setFromCity}
                  />
                </div>

                {/* To City */}
                <div>
                  <StationSearchSelect
                    label="Ga đến"
                    value={toCity}
                    placeholder="Chọn ga đến"
                    exclude={fromCity}
                    onChange={setToCity}
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-1 flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setFromCity(toCity);
                      setToCity(fromCity);
                    }}
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    Đổi ga
                  </Button>
                </div>

                {/* Depart Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ngày đi</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <Input
                      type="date"
                      value={departDate}
                      onChange={(e) => setDepartDate(e.target.value)}
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
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        min={departDate || toLocalYmd()}
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
            </div>
          </Card>
        </div>
      </div>

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

      {/* Popular Routes Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Tuyến phổ biến</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {POPULAR_ROUTES.map((route, index) => (
            <button
              key={index}
              onClick={() => handleQuickRoute(route.from, route.to)}
              className="bg-white rounded-lg p-5 border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-900">
                  {route.from} <span className="text-gray-400">→</span> {route.to}
                </p>
              </div>
              <p className="text-sm text-gray-600">{route.trips} chuyến tàu</p>
              <p className="text-sm text-gray-500">Thời gian trung bình: {route.duration}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
