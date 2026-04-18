'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { getAdminReports } from '@/lib/api';
import { formatCurrencyVND } from '@/lib/utils';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Awaited<ReturnType<typeof getAdminReports>> | null>(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAdminReports();
        if (active) {
          setReport(data);
        }
      } catch (unknownError) {
        if (!active) return;
        const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải báo cáo.';
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

  const cards = [
    { title: 'Doanh thu', icon: '📊', description: report ? formatCurrencyVND(report.revenue) : 'Chưa có' },
    { title: 'Tổng chuyến tàu', icon: '🚂', description: report ? `${report.totalTrips} chuyến` : 'Chưa có' },
    { title: 'Tổng đặt vé', icon: '🎫', description: report ? `${report.totalBookings} đơn` : 'Chưa có' },
    { title: 'Tỉ lệ lấp đầy', icon: '👥', description: report ? `${report.occupancyRate.toFixed(1)}%` : 'Chưa có' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Báo cáo và phân tích</h1>
        <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Xuất dữ liệu
        </Button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Từ ngày</label>
            <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Đến ngày</label>
            <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div className="flex items-end">
            <Button variant="outline" className="w-full">
              Tạo báo cáo
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">Đang tải dữ liệu báo cáo...</div>
      )}

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl mb-2">{card.icon}</p>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{card.title}</h3>
                <p className="text-sm text-gray-600">{card.description}</p>
              </div>
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Sample Chart Placeholder */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Xu hướng doanh thu</h2>
        {report ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg bg-gray-50 p-4">Đơn đã thanh toán: {report.paidBookings}</div>
            <div className="rounded-lg bg-gray-50 p-4">Đơn đang hiệu lực: {report.activeBookings}</div>
            <div className="rounded-lg bg-gray-50 p-4">Đơn đã hủy: {report.cancelledBookings}</div>
            <div className="rounded-lg bg-gray-50 p-4">Đơn đã hoàn tiền: {report.refundedBookings}</div>
            <div className="rounded-lg bg-gray-50 p-4">Chuyến bị trễ: {report.delayedTrips}</div>
            <div className="rounded-lg bg-gray-50 p-4">Chuyến bị hủy: {report.cancelledTrips}</div>
          </div>
        ) : (
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
            Biểu đồ sẽ hiển thị tại đây
          </div>
        )}
      </div>
    </div>
  );
}
