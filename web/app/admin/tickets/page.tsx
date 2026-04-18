'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getAdminTickets } from '@/lib/api';
import { formatCurrencyVND, formatDateTimeVn } from '@/lib/utils';

export default function TicketsPage() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [data, setData] = useState<Awaited<ReturnType<typeof getAdminTickets>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const payload = await getAdminTickets();
        if (active) {
          setData(payload);
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
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return data.filter((ticket) => {
      const matchesQuery =
        !normalizedQuery ||
        ticket.booking.code.toLowerCase().includes(normalizedQuery) ||
        ticket.ticketNumber.toLowerCase().includes(normalizedQuery) ||
        ticket.booking.user.name.toLowerCase().includes(normalizedQuery);

      const matchesStatus = statusFilter === 'all' || ticket.booking.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [data, query, statusFilter]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Quản lý vé</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input placeholder="Tìm theo mã đặt vé, mã vé, hành khách..." className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <select className="px-4 py-2 border border-gray-300 rounded-md" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="PAID">PAID</option>
            <option value="HOLDING">HOLDING</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="REFUNDED">REFUNDED</option>
            <option value="EXPIRED">EXPIRED</option>
          </select>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">{error}</div>}
        {loading && <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 mb-4">Đang tải danh sách vé...</div>}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Mã đặt vé</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Mã vé</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Hành khách</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Tuyến đường</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Số tiền</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Phát hành</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-mono font-semibold text-blue-600">{ticket.booking.code}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{ticket.ticketNumber}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{ticket.booking.user.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{ticket.booking.trip.origin} → {ticket.booking.trip.destination}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{ticket.booking.status}</td>
                  <td className="px-6 py-3 text-sm font-semibold text-gray-900">{formatCurrencyVND(ticket.booking.totalAmount)}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{formatDateTimeVn(ticket.issuedAt)}</td>
                  <td className="px-6 py-3 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.open(`/tickets/${ticket.booking.id}`, '_blank')}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
