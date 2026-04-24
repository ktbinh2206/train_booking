'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  CalendarRange,
  CircleDollarSign,
  Download,
  FileText,
  Percent,
  Ticket,
  TrainFront,
  TrendingUp,
  Users2
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Button } from '@/components/ui/button';
import { getAdminReports } from '@/lib/api';
import { formatCurrencyVND } from '@/lib/utils';

type ReportData = Awaited<ReturnType<typeof getAdminReports>>;

type RangeState = {
  fromDate: string;
  toDate: string;
};

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toStartIso(date: string) {
  return `${date}T00:00:00.000Z`;
}

function toEndIso(date: string) {
  return `${date}T23:59:59.999Z`;
}

function formatAxisDate(date: string) {
  if (!DATE_INPUT_PATTERN.test(date)) {
    return date;
  }

  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

function exportCsv(report: ReportData) {
  const rows = [
    ['revenue', 'totalTrips', 'totalBookings', 'occupancyRate'],
    [report.revenue, report.totalTrips, report.totalBookings, report.occupancyRate]
  ];

  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `admin-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />;
}

function StatSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <SkeletonBlock className="h-5 w-24" />
      <SkeletonBlock className="mt-4 h-9 w-2/3" />
      <SkeletonBlock className="mt-3 h-4 w-1/2" />
    </div>
  );
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [range, setRange] = useState<RangeState>({ fromDate: '', toDate: '' });
  const [debouncedRange, setDebouncedRange] = useState<RangeState>({ fromDate: '', toDate: '' });
  const requestIdRef = useRef(0);
  const lastFetchedKeyRef = useRef<string | null>(null);

  const rangeError = useMemo(() => {
    if (!range.fromDate || !range.toDate) {
      return null;
    }

    return range.fromDate <= range.toDate ? null : 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.';
  }, [range.fromDate, range.toDate]);

  const hasActiveFilters = range.fromDate.length > 0 || range.toDate.length > 0;

  const loadReport = async (nextRange: RangeState, source: 'auto' | 'manual') => {
    if (nextRange.fromDate && nextRange.toDate && nextRange.fromDate > nextRange.toDate) {
      setError('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.');
      setLoading(false);
      return;
    }

    const from = nextRange.fromDate ? toStartIso(nextRange.fromDate) : undefined;
    const to = nextRange.toDate ? toEndIso(nextRange.toDate) : undefined;
    const requestKey = `${from ?? ''}|${to ?? ''}`;

    if (source === 'auto' && lastFetchedKeyRef.current === requestKey) {
      return;
    }

    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);
      setError(null);
      const data = await getAdminReports({ from, to });

      if (requestId !== requestIdRef.current) {
        return;
      }

      setReport(data);
      lastFetchedKeyRef.current = requestKey;
    } catch (unknownError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải báo cáo.';
      setError(message);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedRange(range);
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [range]);

  useEffect(() => {
    void loadReport(debouncedRange, 'auto');
  }, [debouncedRange]);

  const summaryCards = useMemo(() => {
    const items = [
      {
        title: 'Doanh thu',
        value: report ? formatCurrencyVND(report.revenue) : 'Chưa có',
        description: 'Tổng doanh thu trong phạm vi đã chọn',
        icon: CircleDollarSign,
        tone: 'from-emerald-500 to-teal-500'
      },
      {
        title: 'Tổng chuyến tàu',
        value: report ? `${report.totalTrips}` : 'Chưa có',
        description: 'Số chuyến được tổng hợp',
        icon: TrainFront,
        tone: 'from-sky-500 to-blue-500'
      },
      {
        title: 'Tổng đặt vé',
        value: report ? `${report.totalBookings}` : 'Chưa có',
        description: 'Tổng số booking trong kỳ',
        icon: Ticket,
        tone: 'from-amber-500 to-orange-500'
      },
      {
        title: 'Tỉ lệ lấp đầy',
        value: report ? `${report.occupancyRate.toFixed(1)}%` : 'Chưa có',
        description: 'Tỷ lệ ghế đã bán trên tổng ghế',
        icon: Percent,
        tone: 'from-violet-500 to-fuchsia-500'
      }
    ];

    return items;
  }, [report]);

  const breakdownItems = useMemo(() => {
    if (!report) {
      return [];
    }

    return [
      { label: 'Đơn đã thanh toán', value: report.paidBookings, icon: TrendingUp },
      { label: 'Đơn đang hiệu lực', value: report.activeBookings, icon: CalendarRange },
      { label: 'Đơn đã hủy', value: report.cancelledBookings, icon: FileText },
      { label: 'Đơn đã hoàn tiền', value: report.refundedBookings, icon: CircleDollarSign },
      { label: 'Chuyến bị trễ', value: report.delayedTrips, icon: BarChart3 },
      { label: 'Chuyến bị hủy', value: report.cancelledTrips, icon: TrainFront }
    ];
  }, [report]);

  const chartData = useMemo(() => report?.revenueByDate ?? [], [report]);
  const hasChartData = chartData.length > 0;
  const canExport = Boolean(report) && !loading;
  const canCreateReport = !loading && !rangeError;

  const handleCreateReport = async () => {
    await loadReport(range, 'manual');
  };

  const handleExport = () => {
    if (!report) {
      return;
    }

    exportCsv(report);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Báo cáo và phân tích</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Dashboard báo cáo</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Xem doanh thu, số booking và hiệu suất vận hành theo khoảng thời gian tùy chọn.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            onClick={handleExport}
            disabled={!canExport}
          >
            <Download className="mr-2 h-4 w-4" />
            Xuất dữ liệu
          </Button>
          <Button
            className="bg-slate-950 text-white hover:bg-slate-800"
            onClick={handleCreateReport}
            disabled={!canCreateReport}
          >
            Tạo báo cáo
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <CalendarRange className="h-4 w-4" />
          Bộ lọc ngày
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Từ ngày</label>
            <input
              type="date"
              value={range.fromDate}
              onChange={(event) => setRange((current) => ({ ...current, fromDate: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Đến ngày</label>
            <input
              type="date"
              value={range.toDate}
              onChange={(event) => setRange((current) => ({ ...current, toDate: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />
          </div>

          <div className="flex items-end">
            <Button
              className="h-11 w-full bg-slate-950 text-white hover:bg-slate-800"
              onClick={handleCreateReport}
              disabled={!canCreateReport}
            >
              Tạo báo cáo
            </Button>
          </div>
        </div>

        {rangeError && (
          <p className="mt-3 text-sm text-red-600">{rangeError}</p>
        )}

        {hasActiveFilters && !rangeError && (
          <p className="mt-3 text-xs text-slate-500">
            Đang lọc theo khoảng từ {range.fromDate || '...'} đến {range.toDate || '...'}.
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <StatSkeleton key={index} />
            ))}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <SkeletonBlock className="h-6 w-40" />
            <SkeletonBlock className="mt-6 h-[320px] w-full rounded-2xl" />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <SkeletonBlock className="h-6 w-48" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-slate-200 p-4">
                  <SkeletonBlock className="h-4 w-32" />
                  <SkeletonBlock className="mt-3 h-8 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.title}
                  className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className={`inline-flex rounded-2xl bg-gradient-to-br ${card.tone} p-3 text-white shadow-sm`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-5 text-sm font-medium text-slate-500">{card.title}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{card.value}</p>
                  <p className="mt-2 text-sm text-slate-600">{card.description}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Xu hướng doanh thu</h2>
                <p className="mt-1 text-sm text-slate-600">Biểu đồ doanh thu theo ngày trong khoảng đã chọn.</p>
              </div>
              <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 md:flex">
                <TrendingUp className="h-4 w-4" />
                Revenue by date
              </div>
            </div>

            {hasChartData ? (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatAxisDate}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(value) => new Intl.NumberFormat('vi-VN').format(Number(value))}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrencyVND(value), 'Doanh thu']}
                      labelFormatter={(label) => `Ngày: ${formatAxisDate(String(label))}`}
                      contentStyle={{
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 12px 24px rgba(15, 23, 42, 0.08)'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#0f172a"
                      strokeWidth={3}
                      dot={{ r: 3, strokeWidth: 2, fill: '#ffffff' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
                <div className="rounded-full bg-white p-4 shadow-sm">
                  <BarChart3 className="h-7 w-7 text-slate-500" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-950">Chưa có dữ liệu biểu đồ</h3>
                <p className="mt-2 max-w-md text-sm text-slate-600">
                  Hãy chọn khoảng thời gian khác hoặc tạo báo cáo để tải dữ liệu doanh thu theo ngày.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Booking breakdown</h2>
                <p className="mt-1 text-sm text-slate-600">Tổng hợp trạng thái booking và chuyến tàu.</p>
              </div>
              <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 md:flex">
                <Users2 className="h-4 w-4" />
                Overview
              </div>
            </div>

            {report ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {breakdownItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-600">{item.label}</p>
                        <Icon className="h-4 w-4 text-slate-500" />
                      </div>
                      <p className="mt-3 text-2xl font-semibold text-slate-950">{item.value}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
                Không có dữ liệu trong khoảng thời gian này.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}