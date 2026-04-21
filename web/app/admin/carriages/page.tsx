'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrainTable } from '@/components/admin/train-table';
import { CarriageModal, type CarriageDraft } from '@/components/admin/carriage-modal';
import { SeatLayoutModal } from '@/components/admin/seat-layout-modal';
import { TrainFormModal, type TrainDraft } from '@/components/admin/train-form-modal';
import {
  bulkAdminCarriageSeats,
  createAdminCarriage,
  createAdminTrain,
  deleteAdminCarriage,
  deleteAdminTrain,
  duplicateAdminCarriage,
  getAdminTrainDetail,
  getAdminTrains,
  updateAdminCarriage,
  updateAdminTrain,
  type AdminTrain,
  type AdminTrainDetail,
  type AdminTrainDetailCarriage,
} from '@/lib/api';
import { createEmptyTrainLayout, layoutJsonToTrainGrid, trainGridToLayoutJson, type TrainSeatGrid } from '@/lib/train-management';
import { LayoutGrid, Plus, Train } from 'lucide-react';

const PAGE_SIZE = 10;

type DeleteTarget = {
  kind: 'train' | 'carriage';
  id: string;
  title: string;
};

function buildGridFromCarriage(carriage: AdminTrainDetailCarriage): TrainSeatGrid {
  if (carriage.layoutJson) {
    return layoutJsonToTrainGrid(carriage.layoutJson);
  }

  const cols = 4;
  const rows = Math.max(1, Math.ceil(Math.max(carriage.seatCount, carriage.seats.length) / cols));
  const grid = createEmptyTrainLayout(rows, cols);

  carriage.seats.forEach((seat, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;

    if (grid[row] && grid[row][col] !== undefined) {
      grid[row][col] = {
        seatId: seat.id,
        seatNumber: seat.code,
        price: seat.price,
      };
    }
  });

  return grid;
}

export default function CarriagesPage() {
  const [trains, setTrains] = useState<AdminTrain[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [trainModalOpen, setTrainModalOpen] = useState(false);
  const [trainModalMode, setTrainModalMode] = useState<'create' | 'edit'>('create');
  const [activeTrainId, setActiveTrainId] = useState<string | null>(null);
  const [activeTrain, setActiveTrain] = useState<AdminTrainDetail | null>(null);
  const [savingTrain, setSavingTrain] = useState(false);

  const [carriageModalOpen, setCarriageModalOpen] = useState(false);
  const [editingCarriage, setEditingCarriage] = useState<AdminTrainDetailCarriage | null>(null);
  const [savingCarriage, setSavingCarriage] = useState(false);

  const [layoutModalOpen, setLayoutModalOpen] = useState(false);
  const [layoutTarget, setLayoutTarget] = useState<AdminTrainDetailCarriage | null>(null);
  const [savingLayout, setSavingLayout] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTrains = async (pageNumber = page) => {
    setLoadingList(true);
    setError(null);

    try {
      const response = await getAdminTrains({ page: pageNumber, pageSize: PAGE_SIZE });
      setTrains(response.data);
      setPage(response.page);
      setTotalPages(response.totalPages);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Không thể tải danh sách tàu.');
    } finally {
      setLoadingList(false);
    }
  };

  const loadTrainDetail = async (trainId: string) => {
    setLoadingDetail(true);
    setError(null);

    try {
      const detail = await getAdminTrainDetail(trainId);
      setActiveTrain(detail);
    } catch (unknownError) {
      setActiveTrain(null);
      setError(unknownError instanceof Error ? unknownError.message : 'Không thể tải chi tiết tàu.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const refreshActiveTrain = async (trainId = activeTrainId) => {
    await loadTrains(page);

    if (trainId) {
      await loadTrainDetail(trainId);
    }
  };

  useEffect(() => {
    void loadTrains(page);
  }, [page]);

  useEffect(() => {
    if (!trainModalOpen) {
      return;
    }

    if (activeTrainId) {
      void loadTrainDetail(activeTrainId);
      return;
    }

    setActiveTrain(null);
  }, [activeTrainId, trainModalOpen]);

  const openCreateTrain = () => {
    setTrainModalMode('create');
    setActiveTrainId(null);
    setActiveTrain(null);
    setTrainModalOpen(true);
  };

  const openEditTrain = (trainId: string) => {
    setTrainModalMode('edit');
    setActiveTrainId(trainId);
    setTrainModalOpen(true);
  };

  const handleSaveTrain = async (value: TrainDraft) => {
    try {
      setSavingTrain(true);
      setError(null);

      if (trainModalMode === 'create') {
        const created = await createAdminTrain(value);
        setActiveTrainId(created.id);
        setTrainModalMode('edit');
        await refreshActiveTrain(created.id);
        return;
      }

      if (!activeTrainId) {
        throw new Error('Không tìm thấy tàu đang chỉnh sửa.');
      }

      await updateAdminTrain(activeTrainId, value);
      await refreshActiveTrain(activeTrainId);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Không thể lưu tàu.');
    } finally {
      setSavingTrain(false);
    }
  };

  const openCreateCarriage = () => {
    if (!activeTrainId) {
      setError('Hãy lưu tàu trước khi thêm toa.');
      return;
    }

    setEditingCarriage(null);
    setCarriageModalOpen(true);
  };

  const openEditCarriage = (carriage: AdminTrainDetailCarriage) => {
    setEditingCarriage(carriage);
    setCarriageModalOpen(true);
  };

  const handleSaveCarriage = async (value: CarriageDraft) => {
    if (!activeTrainId) {
      setError('Hãy chọn một tàu trước khi thêm toa.');
      return;
    }

    try {
      setSavingCarriage(true);
      setError(null);

      if (editingCarriage) {
        await updateAdminCarriage(editingCarriage.id, {
          code: value.code,
          type: value.type,
          basePrice: value.basePrice,
          orderIndex: editingCarriage.orderIndex,
        });
      } else {
        const nextOrderIndex = (activeTrain?.carriages.at(-1)?.orderIndex ?? activeTrain?.carriages.length ?? 0) + 1;
        await createAdminCarriage({
          trainId: activeTrainId,
          code: value.code,
          type: value.type,
          basePrice: value.basePrice,
          orderIndex: nextOrderIndex,
        });
      }

      setCarriageModalOpen(false);
      setEditingCarriage(null);
      await refreshActiveTrain(activeTrainId);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Không thể lưu toa.');
    } finally {
      setSavingCarriage(false);
    }
  };

  const openLayoutEditor = (carriage: AdminTrainDetailCarriage) => {
    setLayoutTarget(carriage);
    setLayoutModalOpen(true);
  };

  const handleSaveLayout = async (layout: TrainSeatGrid) => {
    if (!layoutTarget) {
      return;
    }

    try {
      setSavingLayout(true);
      setError(null);

      const layoutJson = trainGridToLayoutJson(layout);
      await bulkAdminCarriageSeats({
        carriageId: layoutTarget.id,
        seats: layoutJson.seats.map((seat, index) => ({
          code: seat.seatNumber,
          orderIndex: index + 1,
          price: seat.price ?? null,
        })),
        layoutJson,
      });

      setLayoutModalOpen(false);
      setLayoutTarget(null);
      await refreshActiveTrain(activeTrainId ?? undefined);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Không thể lưu layout ghế.');
    } finally {
      setSavingLayout(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);

      if (deleteTarget.kind === 'train') {
        await deleteAdminTrain(deleteTarget.id);
        if (activeTrainId === deleteTarget.id) {
          setTrainModalOpen(false);
          setActiveTrainId(null);
          setActiveTrain(null);
        }
      } else {
        await deleteAdminCarriage(deleteTarget.id);
        if (activeTrainId) {
          await loadTrainDetail(activeTrainId);
        }
      }

      setDeleteTarget(null);
      await loadTrains(page);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Không thể xóa dữ liệu.');
    } finally {
      setDeleting(false);
    }
  };

  const trainFormInitialValue = useMemo(() => {
    if (!activeTrain) {
      return null;
    }

    return {
      code: activeTrain.code,
      name: activeTrain.name,
    } satisfies TrainDraft;
  }, [activeTrain]);

  const carriageFormInitialValue = useMemo(() => {
    if (!editingCarriage) {
      return null;
    }

    return {
      code: editingCarriage.code,
      type: editingCarriage.type,
      basePrice: editingCarriage.basePrice,
    } satisfies Partial<CarriageDraft>;
  }, [editingCarriage]);

  const currentCarriages = activeTrain?.carriages ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Train className="size-4" />
            Train management
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Quản lý tàu</h1>
          <p className="max-w-2xl text-sm text-slate-300">Một tab duy nhất, table listing, CRUD bằng modal, preview tái sử dụng và bulk seat sync cho layout editor.</p>
        </div>

        <Button className="bg-white text-slate-950 hover:bg-slate-100" onClick={openCreateTrain}>
          <Plus className="mr-2 size-4" />
          Tạo tàu
        </Button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <TrainTable
        trains={trains}
        page={page}
        totalPages={totalPages}
        loading={loadingList}
        onPageChange={setPage}
        onCreate={openCreateTrain}
        onEdit={openEditTrain}
        onDelete={(trainId) => setDeleteTarget({ kind: 'train', id: trainId, title: 'Xóa tàu' })}
      />

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="size-5" />
            Tóm tắt màn hình
          </CardTitle>
          <CardDescription>Preview tổng quan để xác nhận số toa và số ghế trước khi đi vào modal chỉnh sửa.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm text-slate-600">
          <Badge variant="outline">{trains.length} tàu trên trang</Badge>
          <Badge variant="outline">{totalPages} trang</Badge>
          <Badge variant="outline">{currentCarriages.length} toa đang mở</Badge>
        </CardContent>
      </Card>

      <TrainFormModal
        open={trainModalOpen}
        mode={trainModalMode}
        initialValue={trainFormInitialValue}
        train={activeTrain}
        loading={loadingDetail}
        saving={savingTrain}
        onClose={() => setTrainModalOpen(false)}
        onSave={handleSaveTrain}
        onAddCarriage={openCreateCarriage}
        onEditCarriage={openEditCarriage}
        onDeleteCarriage={(carriageId) => setDeleteTarget({ kind: 'carriage', id: carriageId, title: 'Xóa toa' })}
        onDuplicateCarriage={async (carriageId) => {
          try {
            setError(null);
            await duplicateAdminCarriage(carriageId);
            if (activeTrainId) {
              await refreshActiveTrain(activeTrainId);
            }
          } catch (unknownError) {
            setError(unknownError instanceof Error ? unknownError.message : 'Không thể nhân bản toa.');
          }
        }}
        onOpenLayout={openLayoutEditor}
      />

      <CarriageModal
        open={carriageModalOpen}
        title={editingCarriage ? 'Sửa toa' : 'Tạo toa'}
        initialValue={carriageFormInitialValue}
        carriage={editingCarriage}
        onClose={() => {
          setCarriageModalOpen(false);
          setEditingCarriage(null);
        }}
        onSave={handleSaveCarriage}
        onDesignLayout={editingCarriage ? () => openLayoutEditor(editingCarriage) : undefined}
        saving={savingCarriage}
      />

      <SeatLayoutModal
        open={layoutModalOpen}
        title={layoutTarget ? `Thiết kế layout ghế - ${layoutTarget.code}` : 'Thiết kế layout ghế'}
        initialLayout={layoutTarget ? buildGridFromCarriage(layoutTarget) : createEmptyTrainLayout()}
        onClose={() => {
          setLayoutModalOpen(false);
          setLayoutTarget(null);
        }}
        onSave={handleSaveLayout}
        saving={savingLayout}
      />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deleteTarget?.title}</DialogTitle>
            <DialogDescription>
              Hành động này sẽ xóa dữ liệu đã chọn. Nếu tàu hoặc toa đang được tham chiếu bởi dữ liệu khác, backend sẽ từ chối.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Hủy</Button>
            <Button className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => void handleDelete()} disabled={deleting}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
