'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  createAdminCarriage,
  createAdminSeat,
  deleteAdminCarriage,
  deleteAdminSeat,
  getAdminCarriages,
  getAdminSeats,
  getAdminTrains,
  updateAdminCarriage,
  updateAdminSeat
} from '@/lib/api';

export default function CarriagesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trains, setTrains] = useState<Awaited<ReturnType<typeof getAdminTrains>>['data']>([]);
  const [carriages, setCarriages] = useState<Awaited<ReturnType<typeof getAdminCarriages>>['data']>([]);
  const [seats, setSeats] = useState<Awaited<ReturnType<typeof getAdminSeats>>['data']>([]);
  const [carriagePage, setCarriagePage] = useState(1);
  const [seatPage, setSeatPage] = useState(1);
  const [carriageTotalPages, setCarriageTotalPages] = useState(1);
  const [seatTotalPages, setSeatTotalPages] = useState(1);

  const [editingCarriageId, setEditingCarriageId] = useState<string | null>(null);
  const [carriageForm, setCarriageForm] = useState({
    trainId: '',
    code: '',
    orderIndex: '1',
    type: 'SOFT_SEAT' as 'SOFT_SEAT' | 'HARD_SEAT' | 'SLEEPER'
  });

  const [editingSeatId, setEditingSeatId] = useState<string | null>(null);
  const [seatForm, setSeatForm] = useState({
    carriageId: '',
    code: '',
    orderIndex: '1',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  });

  const loadCarriages = async (targetPage = carriagePage) => {
    setLoading(true);
    setError(null);
    try {
      const [carriageData, trainData] = await Promise.all([
        getAdminCarriages({ page: targetPage, pageSize: 10 }),
        getAdminTrains({ page: 1, pageSize: 200 })
      ]);
      setCarriages(carriageData.data);
      setCarriagePage(carriageData.page);
      setCarriageTotalPages(carriageData.totalPages);
      setTrains(trainData.data);
      if (!carriageForm.trainId && trainData.data[0]?.id) {
        setCarriageForm((previous) => ({ ...previous, trainId: trainData.data[0]!.id }));
      }
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Không thể tải danh sách toa.');
    } finally {
      setLoading(false);
    }
  };

  const loadSeats = async (targetPage = seatPage) => {
    setLoading(true);
    setError(null);
    try {
      const [seatData, carriageData] = await Promise.all([
        getAdminSeats({ page: targetPage, pageSize: 10 }),
        getAdminCarriages({ page: 1, pageSize: 200 })
      ]);
      setSeats(seatData.data);
      setSeatPage(seatData.page);
      setSeatTotalPages(seatData.totalPages);
      if (!seatForm.carriageId && carriageData.data[0]?.id) {
        setSeatForm((previous) => ({ ...previous, carriageId: carriageData.data[0]!.id }));
      }
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Không thể tải danh sách ghế.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.all([loadCarriages(1), loadSeats(1)]);
  }, []);

  const submitCarriage = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setError(null);
      if (editingCarriageId) {
        await updateAdminCarriage(editingCarriageId, {
          code: carriageForm.code,
          orderIndex: Number(carriageForm.orderIndex),
          type: carriageForm.type
        });
      } else {
        await createAdminCarriage({
          trainId: carriageForm.trainId,
          code: carriageForm.code,
          orderIndex: Number(carriageForm.orderIndex),
          type: carriageForm.type
        });
      }
      setEditingCarriageId(null);
      setCarriageForm((previous) => ({ ...previous, code: '', orderIndex: '1', type: 'SOFT_SEAT' }));
      await loadCarriages(carriagePage);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Lưu toa tàu thất bại.');
    }
  };

  const submitSeat = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setError(null);
      if (editingSeatId) {
        await updateAdminSeat(editingSeatId, {
          code: seatForm.code,
          orderIndex: Number(seatForm.orderIndex),
          status: seatForm.status
        });
      } else {
        await createAdminSeat({
          carriageId: seatForm.carriageId,
          code: seatForm.code,
          orderIndex: Number(seatForm.orderIndex),
          status: seatForm.status
        });
      }
      setEditingSeatId(null);
      setSeatForm((previous) => ({ ...previous, code: '', orderIndex: '1', status: 'ACTIVE' }));
      await loadSeats(seatPage);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Lưu ghế thất bại.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý toa tàu và ghế</h1>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>

      <Tabs defaultValue="carriages">
        <TabsList>
          <TabsTrigger value="carriages">Toa tàu</TabsTrigger>
          <TabsTrigger value="seats">Ghế</TabsTrigger>
        </TabsList>

        <TabsContent value="carriages" className="mt-6">
          <form onSubmit={submitCarriage} className="bg-white rounded-lg border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
            <select className="px-3 py-2 border rounded" value={carriageForm.trainId} onChange={(event) => setCarriageForm((previous) => ({ ...previous, trainId: event.target.value }))}>
              <option value="">Chọn tàu</option>
              {trains.map((train) => <option key={train.id} value={train.id}>{train.code} - {train.name}</option>)}
            </select>
            <input className="px-3 py-2 border rounded" placeholder="Mã toa" value={carriageForm.code} onChange={(event) => setCarriageForm((previous) => ({ ...previous, code: event.target.value }))} />
            <input className="px-3 py-2 border rounded" type="number" min="1" placeholder="Thứ tự" value={carriageForm.orderIndex} onChange={(event) => setCarriageForm((previous) => ({ ...previous, orderIndex: event.target.value }))} />
            <select className="px-3 py-2 border rounded" value={carriageForm.type} onChange={(event) => setCarriageForm((previous) => ({ ...previous, type: event.target.value as 'SOFT_SEAT' | 'HARD_SEAT' | 'SLEEPER' }))}>
              <option value="SOFT_SEAT">SOFT_SEAT</option>
              <option value="HARD_SEAT">HARD_SEAT</option>
              <option value="SLEEPER">SLEEPER</option>
            </select>
            <div className="flex gap-2">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {editingCarriageId ? 'Cập nhật toa' : 'Thêm toa'}
              </Button>
              {editingCarriageId ? <Button type="button" variant="outline" onClick={() => setEditingCarriageId(null)}>Hủy</Button> : null}
            </div>
          </form>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Toa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Tàu</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Loại</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Tổng ghế</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Còn trống</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {carriages.map(carriage => (
                    <tr key={carriage.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">{carriage.code}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{carriage.train.code}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{carriage.type}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{carriage._count?.seats ?? 0}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">-</td>
                      <td className="px-6 py-3 flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          setEditingCarriageId(carriage.id);
                          setCarriageForm({
                            trainId: carriage.trainId,
                            code: carriage.code,
                            orderIndex: String(carriage.orderIndex),
                            type: carriage.type
                          });
                        }}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600" onClick={async () => {
                          await deleteAdminCarriage(carriage.id);
                          await loadCarriages(carriagePage);
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" disabled={carriagePage <= 1 || loading} onClick={() => loadCarriages(carriagePage - 1)}>Prev</Button>
              <span className="text-sm text-gray-600">Trang {carriagePage} / {carriageTotalPages}</span>
              <Button variant="outline" size="sm" disabled={carriagePage >= carriageTotalPages || loading} onClick={() => loadCarriages(carriagePage + 1)}>Next</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="seats" className="mt-6">
          <form onSubmit={submitSeat} className="bg-white rounded-lg border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
            <select className="px-3 py-2 border rounded" value={seatForm.carriageId} onChange={(event) => setSeatForm((previous) => ({ ...previous, carriageId: event.target.value }))}>
              <option value="">Chọn toa</option>
              {carriages.map((carriage) => <option key={carriage.id} value={carriage.id}>{carriage.train.code} - {carriage.code}</option>)}
            </select>
            <input className="px-3 py-2 border rounded" placeholder="Mã ghế" value={seatForm.code} onChange={(event) => setSeatForm((previous) => ({ ...previous, code: event.target.value }))} />
            <input className="px-3 py-2 border rounded" type="number" min="1" placeholder="Thứ tự" value={seatForm.orderIndex} onChange={(event) => setSeatForm((previous) => ({ ...previous, orderIndex: event.target.value }))} />
            <select className="px-3 py-2 border rounded" value={seatForm.status} onChange={(event) => setSeatForm((previous) => ({ ...previous, status: event.target.value as 'ACTIVE' | 'INACTIVE' }))}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
            <div className="flex gap-2">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">{editingSeatId ? 'Cập nhật ghế' : 'Thêm ghế'}</Button>
              {editingSeatId ? <Button type="button" variant="outline" onClick={() => setEditingSeatId(null)}>Hủy</Button> : null}
            </div>
          </form>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Mã ghế</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Toa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Tàu</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Trạng thái</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {seats.map((seat) => (
                    <tr key={seat.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">{seat.code}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{seat.carriage.code}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{seat.carriage.train.code}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{seat.status}</td>
                      <td className="px-6 py-3 flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          setEditingSeatId(seat.id);
                          setSeatForm({
                            carriageId: seat.carriageId,
                            code: seat.code,
                            orderIndex: String(seat.orderIndex),
                            status: seat.status
                          });
                        }}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600" onClick={async () => {
                          await deleteAdminSeat(seat.id);
                          await loadSeats(seatPage);
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" disabled={seatPage <= 1 || loading} onClick={() => loadSeats(seatPage - 1)}>Prev</Button>
              <span className="text-sm text-gray-600">Trang {seatPage} / {seatTotalPages}</span>
              <Button variant="outline" size="sm" disabled={seatPage >= seatTotalPages || loading} onClick={() => loadSeats(seatPage + 1)}>Next</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
