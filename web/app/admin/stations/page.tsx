'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { createAdminStation, deleteAdminStation, getAdminStations, updateAdminStation } from '@/lib/api';

export default function StationsPage() {
  const [query, setQuery] = useState('');
  const [stations, setStations] = useState<Awaited<ReturnType<typeof getAdminStations>>['data']>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', name: '', city: '' });

  const loadStations = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const payload = await getAdminStations({ page: targetPage, pageSize: 10 });
      setStations(Array.isArray(payload.data) ? payload.data : []);
      setPage(payload.page);
      setTotalPages(payload.totalPages);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải danh sách ga.';
      setError(message);
      setStations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStations(1);
  }, []);

  const filteredStations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return stations;
    return stations.filter((station) => `${station.code} ${station.name} ${station.city}`.toLowerCase().includes(normalized));
  }, [stations, query]);

  const handleEdit = (stationId: string) => {
    const station = stations.find((item) => item.id === stationId);
    if (!station) return;
    setEditingId(station.id);
    setShowForm(true);
    setForm({ code: station.code, name: station.name, city: station.city });
  };

  const handleDelete = async (stationId: string) => {
    try {
      setError(null);
      await deleteAdminStation(stationId);
      await loadStations(page);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Xóa ga thất bại.';
      setError(message);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setError(null);
      if (editingId) {
        await updateAdminStation(editingId, form);
      } else {
        await createAdminStation(form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ code: '', name: '', city: '' });
      await loadStations(page);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Lưu ga thất bại.';
      setError(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý ga</h1>
        <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2" onClick={() => {
          setShowForm((previous) => !previous);
          setEditingId(null);
          setForm({ code: '', name: '', city: '' });
        }}>
          <Plus className="w-4 h-4" />
          {showForm ? 'Đóng form' : 'Thêm ga'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder="Code" value={form.code} onChange={(event) => setForm((previous) => ({ ...previous, code: event.target.value }))} />
          <Input placeholder="Tên ga" value={form.name} onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))} />
          <Input placeholder="Thành phố" value={form.city} onChange={(event) => setForm((previous) => ({ ...previous, city: event.target.value }))} />
          <div className="flex gap-2">
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">{editingId ? 'Cập nhật' : 'Tạo mới'}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Hủy</Button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input placeholder="Tìm theo code, tên ga, thành phố..." className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">{error}</div>}
        {loading && <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 mb-4">Đang tải danh sách ga...</div>}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Tên ga</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Thành phố</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStations.map((station) => (
                <tr key={station.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-semibold text-blue-600">{station.code}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{station.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{station.city}</td>
                  <td className="px-6 py-3 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(station.id)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDelete(station.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => loadStations(page - 1)}>Prev</Button>
          <span className="text-sm text-gray-600">Trang {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => loadStations(page + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
