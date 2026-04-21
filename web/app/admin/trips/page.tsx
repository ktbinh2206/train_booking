'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  createAdminTrip,
  deleteAdminTrip,
  getAdminStations,
  getAdminTrains,
  getAdminTrips,
  updateAdminTrip
} from '@/lib/api';

export default function TripsPage() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trips, setTrips] = useState<Awaited<ReturnType<typeof getAdminTrips>>['data']>([]);
  const [stations, setStations] = useState<Awaited<ReturnType<typeof getAdminStations>>['data']>([]);
  const [trains, setTrains] = useState<Awaited<ReturnType<typeof getAdminTrains>>['data']>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    trainId: '',
    originStationId: '',
    destinationStationId: '',
    departureTime: '',
    arrivalTime: '',
    price: ''
  });

  const loadTrips = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminTrips({ page: targetPage, pageSize: 10 });
      setTrips(data.data);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải danh sách chuyến tàu.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const [tripsData, stationsData, trainsData] = await Promise.all([
          getAdminTrips({ page: 1, pageSize: 10 }),
          getAdminStations({ page: 1, pageSize: 200 }),
          getAdminTrains({ page: 1, pageSize: 200 })
        ]);
        if (active) {
          setTrips(tripsData.data);
          setPage(tripsData.page);
          setTotalPages(tripsData.totalPages);
          setStations(stationsData.data);
          setTrains(trainsData.data);
        }
      } catch (unknownError) {
        if (!active) return;
        const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải danh sách chuyến tàu.';
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

  const filteredTrips = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return trips;
    return trips.filter((trip) => {
      const text = `${trip.train.code} ${trip.origin} ${trip.destination}`.toLowerCase();
      return text.includes(query);
    });
  }, [trips, search]);

  const handleDelete = async (tripId: string) => {
    try {
      setError(null);
      await deleteAdminTrip(tripId);
      await loadTrips(page);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Xóa chuyến tàu thất bại.';
      setError(message);
    }
  };

  const resetForm = () => {
    setForm({
      trainId: trains[0]?.id ?? '',
      originStationId: '',
      destinationStationId: '',
      departureTime: '',
      arrivalTime: '',
      price: ''
    });
    setEditingId(null);
    setShowCreate(false);
  };

  const handleEdit = (tripId: string) => {
    const trip = trips.find((item) => item.id === tripId);
    if (!trip) return;

    setEditingId(trip.id);
    setShowCreate(true);
    setForm({
      trainId: trip.trainId,
      originStationId: trip.originStationId ?? '',
      destinationStationId: trip.destinationStationId ?? '',
      departureTime: new Date(trip.departureTime).toISOString().slice(0, 16),
      arrivalTime: new Date(trip.arrivalTime).toISOString().slice(0, 16),
      price: String(trip.price)
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.trainId || !form.originStationId || !form.destinationStationId || !form.departureTime || !form.arrivalTime || !form.price) {
      setError('Vui lòng nhập đầy đủ thông tin chuyến tàu.');
      return;
    }
    if (form.originStationId === form.destinationStationId) {
      setError('Ga đi và ga đến phải khác nhau.');
      return;
    }

    try {
      setError(null);
      const payload = {
        trainId: form.trainId,
        originStationId: form.originStationId,
        destinationStationId: form.destinationStationId,
        departureTime: new Date(form.departureTime).toISOString(),
        arrivalTime: new Date(form.arrivalTime).toISOString(),
        price: Number(form.price)
      };

      if (editingId) {
        await updateAdminTrip(editingId, payload);
      } else {
        await createAdminTrip(payload);
      }

      resetForm();
      await loadTrips(page);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Lưu chuyến tàu thất bại.';
      setError(message);
    }
  };

  const toUiStatus = (status: 'ON_TIME' | 'DELAYED' | 'CANCELLED') => {
    if (status === 'ON_TIME') return 'Đúng giờ';
    if (status === 'DELAYED') return 'Trễ';
    return 'Đã hủy';
  };

  const toStatusClass = (status: 'ON_TIME' | 'DELAYED' | 'CANCELLED') => {
    if (status === 'ON_TIME') return 'bg-green-100 text-green-800';
    if (status === 'DELAYED') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý chuyến tàu</h1>
        <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2" onClick={() => {
          setShowCreate((previous) => !previous);
          if (!showCreate) {
            resetForm();
            setShowCreate(true);
          }
        }}>
          <Plus className="w-4 h-4" />
          {showCreate ? 'Đóng form' : 'Thêm chuyến'}
        </Button>
      </div>

      {showCreate && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <select className="px-3 py-2 border rounded" value={form.trainId} onChange={(event) => setForm((previous) => ({ ...previous, trainId: event.target.value }))}>
            <option value="">Chọn tàu</option>
            {trains.map((train) => (
              <option key={train.id} value={train.id}>{train.code} - {train.name}</option>
            ))}
          </select>
          <select className="px-3 py-2 border rounded" value={form.originStationId} onChange={(event) => setForm((previous) => ({ ...previous, originStationId: event.target.value }))}>
            <option value="">Chọn ga đi</option>
            {stations.map((station) => (
              <option key={station.id} value={station.id}>{station.code} - {station.name}</option>
            ))}
          </select>
          <select className="px-3 py-2 border rounded" value={form.destinationStationId} onChange={(event) => setForm((previous) => ({ ...previous, destinationStationId: event.target.value }))}>
            <option value="">Chọn ga đến</option>
            {stations.map((station) => (
              <option key={station.id} value={station.id}>{station.code} - {station.name}</option>
            ))}
          </select>
          <input type="datetime-local" className="px-3 py-2 border rounded" value={form.departureTime} onChange={(event) => setForm((previous) => ({ ...previous, departureTime: event.target.value }))} />
          <input type="datetime-local" className="px-3 py-2 border rounded" value={form.arrivalTime} onChange={(event) => setForm((previous) => ({ ...previous, arrivalTime: event.target.value }))} />
          <input type="number" min="0" className="px-3 py-2 border rounded" placeholder="Giá vé" value={form.price} onChange={(event) => setForm((previous) => ({ ...previous, price: event.target.value }))} />
          <div className="md:col-span-3 flex gap-2">
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">{editingId ? 'Cập nhật chuyến' : 'Tạo chuyến'}</Button>
            <Button type="button" variant="outline" onClick={resetForm}>Hủy</Button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Tìm chuyến tàu..."
              className="pl-10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="p-8 text-center text-gray-600">Đang tải danh sách chuyến tàu...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Tàu</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Tuyến đường</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Khởi hành</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTrips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{trip.train.code}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{trip.origin} → {trip.destination}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{new Date(trip.departureTime).toLocaleString('vi-VN')}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${toStatusClass(trip.status)}`}>
                        {toUiStatus(trip.status)}
                      </span>
                    </td>
                    <td className="px-6 py-3 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(trip.id)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDelete(trip.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && (
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => loadTrips(page - 1)}>Prev</Button>
            <span className="text-sm text-gray-600">Trang {page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => loadTrips(page + 1)}>Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}
