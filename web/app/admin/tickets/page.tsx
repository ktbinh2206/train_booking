'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Eye, Plus, Edit2, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createAdminTicket, deleteAdminTicket, getAdminTickets, updateAdminTicket } from '@/lib/api';
import { formatCurrencyVND, formatDateTimeVn } from '@/lib/utils';

export default function TicketsPage() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [data, setData] = useState<Awaited<ReturnType<typeof getAdminTickets>>['data']>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    bookingId: '',
    qrDataUrl: 'https://example.local/qr/',
    eTicketUrl: '',
    invoiceNumber: ''
  });

  const loadTickets = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const payload = await getAdminTickets({ page: targetPage, pageSize: 10 });
      setData(Array.isArray(payload.data) ? payload.data : []);
      setPage(payload.page);
      setTotalPages(payload.totalPages);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải danh sách vé.';
      setError(message);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const run = async () => {
      await loadTickets(1);
    };

    run();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const safeData = Array.isArray(data) ? data : [];

    return safeData.filter((ticket) => {
      const matchesQuery =
        !normalizedQuery ||
        ticket.booking.code.toLowerCase().includes(normalizedQuery) ||
        ticket.ticketNumber.toLowerCase().includes(normalizedQuery) ||
        ticket.booking.user.name.toLowerCase().includes(normalizedQuery);

      const matchesStatus = statusFilter === 'all' || ticket.booking.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [data, query, statusFilter]);

  const handleDelete = async (ticketId: string) => {
    try {
      setError(null);
      await deleteAdminTicket(ticketId);
      await loadTickets(page);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Xóa vé thất bại.';
      setError(message);
    }
  };

  const handleEdit = (ticketId: string) => {
    const ticket = data.find((item) => item.id === ticketId);
    if (!ticket) return;
    setEditingId(ticket.id);
    setShowForm(true);
    setForm({
      bookingId: ticket.booking.id,
      qrDataUrl: 'https://example.local/qr/',
      eTicketUrl: '',
      invoiceNumber: ''
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setError(null);
      if (editingId) {
        await updateAdminTicket(editingId, {
          qrDataUrl: form.qrDataUrl || undefined,
          eTicketUrl: form.eTicketUrl || null,
          invoiceNumber: form.invoiceNumber || null
        });
      } else {
        if (!form.bookingId) {
          setError('Vui lòng nhập bookingId để tạo vé.');
          return;
        }
        await createAdminTicket({
          bookingId: form.bookingId,
          qrDataUrl: form.qrDataUrl,
          eTicketUrl: form.eTicketUrl || undefined,
          invoiceNumber: form.invoiceNumber || undefined
        });
      }

      setShowForm(false);
      setEditingId(null);
      setForm({
        bookingId: '',
        qrDataUrl: 'https://example.local/qr/',
        eTicketUrl: '',
        invoiceNumber: ''
      });
      await loadTickets(page);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Lưu vé thất bại.';
      setError(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý vé</h1>
        <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2" onClick={() => {
          setShowForm((previous) => !previous);
          setEditingId(null);
        }}>
          <Plus className="w-4 h-4" />
          {showForm ? 'Đóng form' : 'Tạo vé'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder="Booking ID" value={form.bookingId} disabled={Boolean(editingId)} onChange={(event) => setForm((previous) => ({ ...previous, bookingId: event.target.value }))} />
          <Input placeholder="QR Data URL" value={form.qrDataUrl} onChange={(event) => setForm((previous) => ({ ...previous, qrDataUrl: event.target.value }))} />
          <Input placeholder="E-ticket URL" value={form.eTicketUrl} onChange={(event) => setForm((previous) => ({ ...previous, eTicketUrl: event.target.value }))} />
          <Input placeholder="Invoice" value={form.invoiceNumber} onChange={(event) => setForm((previous) => ({ ...previous, invoiceNumber: event.target.value }))} />
          <div className="md:col-span-4 flex gap-2">
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">{editingId ? 'Cập nhật vé' : 'Tạo vé'}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Hủy</Button>
          </div>
        </form>
      )}

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
                    <Button variant="outline" size="sm" onClick={() => handleEdit(ticket.id)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDelete(ticket.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => loadTickets(page - 1)}>Prev</Button>
          <span className="text-sm text-gray-600">Trang {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => loadTickets(page + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
