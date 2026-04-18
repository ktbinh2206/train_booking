'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { deleteAdminTrip, getAdminTrips } from '@/lib/api';

export default function TripsPage() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trips, setTrips] = useState<Awaited<ReturnType<typeof getAdminTrips>>>([]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAdminTrips();
        if (active) {
          setTrips(data);
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
      const text = `${trip.trainCode} ${trip.origin} ${trip.destination}`.toLowerCase();
      return text.includes(query);
    });
  }, [trips, search]);

  const handleDelete = async (tripId: string) => {
    try {
      await deleteAdminTrip(tripId);
      setTrips((previous) => previous.filter((trip) => trip.id !== tripId));
    } catch {
      setError('Xóa chuyến tàu thất bại.');
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
        <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Thêm chuyến
        </Button>
      </div>

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
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{trip.trainCode}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{trip.origin} → {trip.destination}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{new Date(trip.departureTime).toLocaleString('vi-VN')}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${toStatusClass(trip.status)}`}>
                        {toUiStatus(trip.status)}
                      </span>
                    </td>
                    <td className="px-6 py-3 flex gap-2">
                      <Button variant="outline" size="sm" disabled>
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
      </div>
    </div>
  );
}
