'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Bus, CheckCircle, Clock, Shield, Star, Zap } from 'lucide-react';
import { UnifiedSearchForm, type UnifiedSearchFormData } from '@/components/public/unified-search-form';
import { formatCurrencyVND } from '@/lib/utils';

export default function SearchPage() {
  const router = useRouter();

  const handleSearch = (formData: UnifiedSearchFormData) => {
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

    router.push(`/results?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 to-blue-50">
      {/* Hero Section */}
      <div className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 text-center">
            Tìm hành trình phù hợp nhất
          </h1>
          <p className="text-lg text-blue-100 text-center mb-12">
            Tìm kiếm hàng ngàn chuyến tàu và đặt vé ngay lập tức
          </p>

          {/* Search Form Card */}
          <Card className="border-0 shadow-2xl">
            <div className="p-6 sm:p-8">
              <UnifiedSearchForm 
                onSearch={handleSearch}
                isSearchPage={true}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Why Choose Us Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Vì sao chọn RailBooking?
        </h2>
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
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Payment</h3>
            <p className="text-gray-600">Thông tin thanh toán được bảo vệ</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Hỗ trợ 24/7</h3>
            <p className="text-gray-600">Đội ngũ hỗ trợ luôn sẵn sàng</p>
          </div>
        </div>
      </div>

      {/* Featured Routes */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-white bg-opacity-50 rounded-lg my-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
          Tuyến phổ biến
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {[
            { from: 'Hà Nội', to: 'Đà Nẵng', trains: '12', price: 2500000 },
            { from: 'Sài Gòn', to: 'Nha Trang', trains: '8', price: 1200000 },
            { from: 'Huế', to: 'Hà Nội', trains: '10', price: 2000000 },
          ].map((route, index) => (
            <button
              key={index}
              className="group p-6 rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md transition text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Tuyến đường</p>
                  <p className="font-semibold text-gray-900">
                    {route.from} → {route.to}
                  </p>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{route.trains} chuyến/ngày</span>
                <span className="font-semibold text-blue-600">Từ {formatCurrencyVND(route.price)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Booking Steps */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
          Quy trình đặt vé
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              step: 1,
              title: 'Tìm chuyến tàu',
              description: 'Nhập điểm đi, điểm đến và ngày',
            },
            {
              step: 2,
              title: 'Chọn ghế',
              description: 'Chọn ghế phù hợp từ vị trí còn trống',
            },
            {
              step: 3,
              title: 'Xác nhận thông tin',
              description: 'Kiểm tra và nhập thông tin hành khách',
            },
            {
              step: 4,
              title: 'Thanh toán',
              description: 'Hoàn tất thanh toán và nhận vé',
            },
          ].map((step) => (
            <div key={step.step} className="relative">
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center h-full">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Promo */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-yellow-50 border border-yellow-200 rounded-lg mb-12">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-yellow-700 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-1">Ưu đãi đặc biệt!</h3>
            <p className="text-yellow-800 text-sm">
              Giảm 15% cho lần đặt vé đầu tiên. Dùng mã RAILFIRST15 khi thanh toán.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
