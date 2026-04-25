import { Button } from '@/components/ui/button';
import { SearchForm } from '@/components/public/search-form';
import { TodayTrips } from '@/components/public/today-trips';
import {
  Clock,
  Shield,
  Zap,
  MapPin,
  ArrowRight,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrencyVND } from '@/lib/utils';
import { HeroVideo } from '@/components/shared/herovideo';
import { PromoBanner } from '@/components/shared/promote-banner';

export const metadata = {
  title: 'RailBooking - Đặt vé tàu hỏa trực tuyến',
  description:
    'Đặt vé tàu hỏa dễ dàng và an toàn. Tìm tàu, so sánh giá và đặt ghế của bạn chỉ trong vài phút.',
};

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      {/* HERO VIDEO */}
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        {/* VIDEO */}
        <HeroVideo />

        {/* OVERLAY */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20" />

        {/* CONTENT */}
        <div className="relative z-10 text-center text-white px-4 max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Khám phá Việt Nam bằng đường sắt
          </h1>
          <p className="text-lg md:text-xl mb-6 text-gray-200">
            Đặt vé nhanh chóng, chọn ghế realtime, nhận vé điện tử ngay lập tức
          </p>

          <Link href="/search">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg font-semibold shadow-xl"
            >
              Đặt vé ngay
            </Button>
          </Link>
        </div>
      </section>
      <section className="py-10 bg-gray-50">
        <div className="w-[80vw] mx-auto px-4">
          <PromoBanner />
        </div>
      </section>F
      {/* CTA Section */}
      <section className="pb-12 md:pb-20 bg-blue-100">
        <div className="max-w-5xl mx-auto">
          <TodayTrips title="Chuyến tàu hôm nay" />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 text-center">
          <div>
            <p className="text-3xl font-bold text-blue-600 mb-2">500+</p>
            <p className="text-gray-600">Tuyến tàu</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-600 mb-2">50K+</p>
            <p className="text-gray-600">Hành khách hàng ngày</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-600 mb-2">24/7</p>
            <p className="text-gray-600">Hỗ trợ khách hàng</p>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-12 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
            Tại sao chọn RailBooking?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-lg border border-gray-200 hover:shadow-md transition">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Đặt vé tức thì</h3>
              <p className="text-gray-600">
                Đặt vé của bạn trong chưa đầy một phút. Không có biểu mẫu dài, không phải chờ đợi. Quy trình nhanh chóng và dễ dàng.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-lg border border-gray-200 hover:shadow-md transition">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Payment</h3>
              <p className="text-gray-600">
                Thông tin thanh toán của bạn được mã hóa an toàn. Hỗ trợ nhiều phương thức
                thanh toán.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-lg border border-gray-200 hover:shadow-md transition">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Hỗ trợ 24/7</h3>
              <p className="text-gray-600">
                Có thắc mắc? Đội ngũ hỗ trợ luôn sẵn sàng đồng hành cùng bạn.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Steps */}
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
            Quy trình đặt vé
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: 1,
                title: 'Tìm chuyến tàu',
                description: 'Nhập điểm đi, điểm đến và ngày đi',
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
                title: 'Thanh toán và nhận vé',
                description: 'Hoàn tất thanh toán và nhận vé điện tử ngay',
              },
            ].map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-white rounded-lg border border-gray-200 p-6 text-center h-full">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mx-auto mb-4">
                    {step.step}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>

                {index < 3 && (
                  <div className="hidden md:flex absolute -right-6 top-1/2 -translate-y-1/2">
                    <ArrowRight className="w-6 h-6 text-gray-500" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Routes */}
      <section className="py-12 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-center">
            Tuyến phổ biến
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Khám phá các tuyến tàu được đặt nhiều với mức giá cạnh tranh
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { from: 'Hà Nội', to: 'Đà Nẵng', trains: '12', price: 2500000 },
              { from: 'Sài Gòn', to: 'Nha Trang', trains: '8', price: 1200000 },
              { from: 'Huế', to: 'Hà Nội', trains: '10', price: 2000000 },
              { from: 'Đà Nẵng', to: 'Nha Trang', trains: '6', price: 1500000 },
              { from: 'Hà Nội', to: 'Vinh', trains: '15', price: 800000 },
              { from: 'Sài Gòn', to: 'Phan Thiết', trains: '7', price: 2200000 },
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
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{route.trains} chuyến/ngày</span>
                  <span className="font-semibold text-blue-600">Từ {formatCurrencyVND(route.price)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>



      {/* Announcements */}
      <section className="py-8 bg-yellow-50 border-t border-yellow-200 border-b border-yellow-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-yellow-700 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">Ưu đãi đặc biệt!</h3>
              <p className="text-yellow-800 text-sm">
                Giảm 15% cho lần đặt vé đầu tiên. Dùng mã RAILFIRST15 khi thanh toán.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
