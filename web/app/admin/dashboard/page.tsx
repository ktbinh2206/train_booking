'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Activity } from 'lucide-react';
import { getAdminRecentBookings, getAdminReports } from '@/lib/api';
import { formatCurrencyVND, formatDateTimeVn } from '@/lib/utils';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Awaited<ReturnType<typeof getAdminReports>> | null>(null);
  const [recentBookings, setRecentBookings] = useState<Awaited<ReturnType<typeof getAdminRecentBookings>>>([]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const [reportData, bookingData] = await Promise.all([getAdminReports(), getAdminRecentBookings(8)]);
        if (active) {
          setReport(reportData);
          setRecentBookings(bookingData);
        }
      } catch (unknownError) {
        if (!active) return;
        const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải thống kê dashboard.';
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
  }, []);

  const stats = useMemo(() => {
    return [
      {
        label: 'Chuyến đang hoạt động',
        value: report ? String(report.totalTrips - report.cancelledTrips) : '--',
        change: 'Dữ liệu thời gian thực',
        icon: '🚂',
        color: 'bg-blue-50',
      },
      {
        label: 'Vé đã bán',
        value: report ? report.paidBookings.toLocaleString() : '--',
        change: 'Đơn đã thanh toán',
        icon: '🎫',
        color: 'bg-green-50',
      },
      {
        label: 'Tổng đơn đặt vé',
        value: report ? report.totalBookings.toLocaleString() : '--',
        change: 'Tất cả trạng thái',
        icon: '👥',
        color: 'bg-purple-50',
      },
      {
        label: 'Doanh thu',
        value: report ? formatCurrencyVND(report.revenue) : '--',
        change: `Lấp đầy ${report ? report.occupancyRate.toFixed(1) : 0}%`,
        icon: '💰',
        color: 'bg-orange-50',
      },
    ];
  }, [report]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bảng điều khiển</h1>
          <p className="text-gray-600 mt-2">Chào mừng quay lại! Đây là tình hình hôm nay.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">Tạo báo cáo</Button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading && <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">Đang tải dashboard...</div>}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className={`rounded-lg border border-gray-200 p-6 ${stat.color}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-2">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-2">{stat.change}</p>
              </div>
              <div className="text-4xl">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bookings */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Đặt vé gần đây</h2>
            <Link href="/admin/tickets">
              <Button variant="ghost" size="sm">
                Xem tất cả
              </Button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Mã đặt vé</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Hành khách</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Tuyến đường</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Số tiền</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentBookings.map(booking => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <span className="font-mono text-sm font-semibold text-blue-600">
                        {booking.code}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{booking.user.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{booking.trip.origin} → {booking.trip.destination}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          booking.status === 'PAID'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                      {formatCurrencyVND(booking.totalAmount)}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{formatDateTimeVn(booking.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Thao tác nhanh</h2>
          <div className="space-y-2">
            <Link href="/admin/trips">
              <Button variant="outline" className="w-full justify-start">
                ➕ Thêm chuyến mới
              </Button>
            </Link>
            <Link href="/admin/carriages">
              <Button variant="outline" className="w-full justify-start">
                🚃 Quản lý toa tàu
              </Button>
            </Link>
            <Link href="/admin/tickets">
              <Button variant="outline" className="w-full justify-start">
                🎫 Xem tất cả vé
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button variant="outline" className="w-full justify-start">
                👥 Quản lý người dùng
              </Button>
            </Link>
            <Link href="/admin/reports">
              <Button variant="outline" className="w-full justify-start">
                📊 Tạo báo cáo
              </Button>
            </Link>
          </div>

          {/* System Status */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Trạng thái hệ thống</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Trạng thái API</span>
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Cơ sở dữ liệu</span>
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Cổng thanh toán</span>
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Activity className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold mb-1">Bảo trì hệ thống</p>
          <p>Lịch bảo trì vào Thứ Hai từ 23:00 đến 02:00</p>
        </div>
      </div>
    </div>
  );
}
