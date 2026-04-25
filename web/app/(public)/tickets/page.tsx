'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, Search, Share2, X } from 'lucide-react';
import { Breadcrumb } from '@/components/shared/breadcrumb';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cancelBooking, listBookings } from '@/lib/api';
import { VN } from '@/lib/translations';
import { formatCurrencyVND, formatDateTimeVn } from '@/lib/utils';
import { useAuth } from '@/components/auth/auth-provider';

function mapBookingStatusToUi(status: string) {
  if (status === 'PAID') return 'confirmed';
  if (status === 'CANCELLED' || status === 'REFUNDED') return 'cancelled';
  return 'pending';
}

export default function TicketsPage() {
  const { user, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('confirmed');
  const [loading, setLoading] = useState(true);
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Awaited<ReturnType<typeof listBookings>>>([]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        if (!user) {
          setError('Vui lòng đăng nhập để xem vé của bạn.');
          return;
        }

        setLoading(true);
        setError(null);

        const data = await listBookings();
        if (active) {
          setBookings(data);
        }
      } catch (unknownError) {
        if (!active) return;
        const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải danh sách vé.';
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [user]);

  if (!authLoading && !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-700 mb-4">Bạn cần đăng nhập để xem vé của mình.</p>
        <Link href="/login">
          <Button>Đăng nhập</Button>
        </Link>
      </div>
    );
  }

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const routeLabel = `${booking.trip.origin} ${booking.trip.destination}`.toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = booking.code.toLowerCase().includes(query) || routeLabel.includes(query);

      const status = mapBookingStatusToUi(booking.status);
      const matchesStatus = statusFilter === 'all' || statusFilter === status;

      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchQuery, statusFilter]);

  const handleCancelBooking = async (bookingId: string) => {
    try {
      setProcessingBookingId(bookingId);
      await cancelBooking(bookingId);
      setBookings((prev) => prev.map((booking) => (
        booking.id === bookingId
          ? { ...booking, status: 'CANCELLED' as const }
          : booking
      )));
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Không thể hủy vé.';
      setError(message);
    } finally {
      setProcessingBookingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb
        items={[
          { label: VN.nav.home, href: '/' },
          { label: VN.tickets.myTickets }
        ]}
      />

      <div className="mt-8 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Vé của tôi</h1>
        <p className="text-gray-600">Quản lý và theo dõi các đơn đặt vé tàu</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Tìm theo mã đặt vé, tuyến đường..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
          >
            <option value="all">Tất cả vé</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="pending">Đang chờ</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-600">Đang tải vé...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg border border-red-200 p-12 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Tải lại
          </Button>
        </div>
      ) : filteredBookings.length > 0 ? (
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const uiStatus = mapBookingStatusToUi(booking.status);
            const effectiveDeparture = booking.trip.delayedDepartureTime ?? booking.trip.departureTime;
            const canCancel = uiStatus === 'confirmed' && new Date(effectiveDeparture).getTime() > Date.now();

            return (
              <div key={booking.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{booking.trip.origin} → {booking.trip.destination}</h3>
                        <StatusBadge status={uiStatus as any} />
                      </div>
                      <p className="text-sm text-gray-600">
                        Mã đặt vé: <span className="font-mono font-semibold text-blue-600">{booking.code}</span>
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">{formatCurrencyVND(booking.totalAmount)}</div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 pb-6 border-b border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500">Khởi hành</p>
                      <p className="text-sm font-semibold text-gray-900">{formatDateTimeVn(effectiveDeparture)}</p>
                      {booking.trip.status === 'DELAYED' && booking.trip.delayedDepartureTime && (
                        <p className="text-xs text-amber-600">Đã dời lịch chạy</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Đến nơi</p>
                      <p className="text-sm font-semibold text-gray-900">{formatDateTimeVn(booking.trip.arrivalTime)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Hành khách</p>
                      <p className="text-sm font-semibold text-gray-900">{booking.seatCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Thanh toán</p>
                      <p className="text-sm font-semibold text-gray-900">{booking.payment?.status ?? 'Chưa có'}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    {booking.ticket ? (
                      <Link href={`/tickets/${booking.id}`} className="flex-1">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700">Xem vé điện tử</Button>
                      </Link>
                    ) : (
                      <Button className="flex-1" disabled>
                        Chưa phát hành vé
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Tải xuống
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Share2 className="w-4 h-4" />
                      Chia sẻ
                    </Button>
                    {uiStatus === 'confirmed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 flex items-center gap-2"
                        disabled={!canCancel || processingBookingId === booking.id}
                        onClick={() => {
                          if (!canCancel) return;
                          void handleCancelBooking(booking.id);
                        }}
                      >
                        <X className="w-4 h-4" />
                        {processingBookingId === booking.id ? 'Đang hủy...' : 'Hủy vé'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-600 mb-4">Không tìm thấy vé</p>
          <Link href="/search">
            <Button>Đặt vé ngay</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
