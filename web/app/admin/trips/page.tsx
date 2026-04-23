'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Eye, Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  getAdminCarriages,
  createAdminTrip,
  deleteAdminTrip,
  getAdminTripDetail,
  getAdminStations,
  getAdminTrains,
  getAdminTrips,
  updateAdminTrip
} from '@/lib/api';
import { TripBuilderModal } from '@/components/admin/trip-builder-modal';

export default function TripsPage() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trips, setTrips] = useState<Awaited<ReturnType<typeof getAdminTrips>>['data']>([]);
  const [stations, setStations] = useState<Awaited<ReturnType<typeof getAdminStations>>['data']>([]);
  const [trains, setTrains] = useState<Awaited<ReturnType<typeof getAdminTrains>>['data']>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [templates, setTemplates] = useState<Awaited<ReturnType<typeof getAdminCarriages>>['data']>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderMode, setBuilderMode] = useState<'create' | 'edit' | 'view'>('create');
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [activeTripDetail, setActiveTripDetail] = useState<Awaited<ReturnType<typeof getAdminTripDetail>> | null>(null);
  const [loadingTripDetail, setLoadingTripDetail] = useState(false);

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
        const [tripsData, stationsData, trainsData, templatesData] = await Promise.all([
          getAdminTrips({ page: 1, pageSize: 10 }),
          getAdminStations({ page: 1, pageSize: 200 }),
          getAdminTrains({ page: 1, pageSize: 200 }),
          getAdminCarriages({ page: 1, pageSize: 200 })
        ]);
        if (active) {
          setTrips(tripsData.data);
          setPage(tripsData.page);
          setTotalPages(tripsData.totalPages);
          setStations(stationsData.data);
          setTrains(trainsData.data);
          setTemplates(templatesData.data);
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

  const handleCreateTrip = async (payload: Parameters<typeof createAdminTrip>[0]) => {
    try {
      setError(null);
      if (builderMode === 'edit' && activeTripId) {
        await updateAdminTrip(activeTripId, {
          trainId: payload.trainId,
          originStationId: payload.originStationId,
          destinationStationId: payload.destinationStationId,
          departureTime: payload.departureTime,
          arrivalTime: payload.arrivalTime,
          price: payload.price
        });
      } else {
        await createAdminTrip(payload);
      }
      setShowBuilder(false);
      setActiveTripId(null);
      setActiveTripDetail(null);
      await loadTrips(page);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Luu chuyen tau that bai.');
    }
  };

  const openBuilderWithTrip = async (tripId: string, mode: 'edit' | 'view') => {
    try {
      setError(null);
      setBuilderMode(mode);
      setActiveTripId(tripId);
      setLoadingTripDetail(true);
      setShowBuilder(true);
      const detail = await getAdminTripDetail(tripId);
      setActiveTripDetail(detail);
    } catch (unknownError) {
      setShowBuilder(false);
      setError(unknownError instanceof Error ? unknownError.message : 'Khong the tai chi tiet chuyen tau.');
    } finally {
      setLoadingTripDetail(false);
    }
  };

  const toUiStatus = (status: 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'DEPARTED' | 'COMPLETED') => {
    if (status === 'ON_TIME') return 'Đúng giờ';
    if (status === 'DELAYED') return 'Trễ';
    if (status === 'DEPARTED') return 'Đã khởi hành';
    if (status === 'COMPLETED') return 'Đã hoàn thành';
    return 'Đã hủy';
  };

  const toStatusClass = (status: 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'DEPARTED' | 'COMPLETED') => {
    if (status === 'ON_TIME') return 'bg-green-100 text-green-800';
    if (status === 'DELAYED') return 'bg-yellow-100 text-yellow-800';
    if (status === 'DEPARTED') return 'bg-blue-100 text-blue-800';
    if (status === 'COMPLETED') return 'bg-purple-100 text-purple-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý chuyến tàu</h1>
        <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2" onClick={() => {
          setBuilderMode('create');
          setActiveTripId(null);
          setActiveTripDetail(null);
          setShowBuilder(true);
        }}>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Đến nơi</th> 
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTrips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{trip.train.code}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{trip.origin} → {trip.destination}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {new Date(trip.departureTime).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {new Date(trip.arrivalTime).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${toStatusClass(trip.status)}`}>
                        {toUiStatus(trip.status)}
                      </span>
                    </td>
                    <td className="px-6 py-3 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => void openBuilderWithTrip(trip.id, 'edit')}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void openBuilderWithTrip(trip.id, 'view')}>
                        <Eye className="w-4 h-4" />
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

      <TripBuilderModal
        open={showBuilder}
        mode={builderMode}
        trains={trains}
        stations={stations}
        templates={templates}
        initialTrip={activeTripDetail}
        loadingInitial={loadingTripDetail}
        onClose={() => {
          setShowBuilder(false);
          setActiveTripId(null);
          setActiveTripDetail(null);
        }}
        onSave={handleCreateTrip}
      />
    </div>
  );
}
