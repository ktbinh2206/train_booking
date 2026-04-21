'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { TrainPreview } from '@/components/admin/train-preview';
import type { AdminTrainDetail, AdminTrainDetailCarriage } from '@/lib/api';
import { createEmptyTrainLayout, layoutJsonToTrainGrid, type TrainSeatGrid } from '@/lib/train-management';
import { Copy, Edit3, LayoutGrid, Plus, Save, Trash2 } from 'lucide-react';

export type TrainDraft = {
  code: string;
  name: string;
};

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  initialValue?: Partial<TrainDraft> | null;
  train?: AdminTrainDetail | null;
  loading?: boolean;
  saving?: boolean;
  onClose: () => void;
  onSave: (value: TrainDraft) => Promise<void> | void;
  onAddCarriage: () => void;
  onEditCarriage: (carriage: AdminTrainDetailCarriage) => void;
  onDeleteCarriage: (carriageId: string) => void;
  onDuplicateCarriage: (carriageId: string) => void;
  onOpenLayout: (carriage: AdminTrainDetailCarriage) => void;
};

export function TrainFormModal({
  open,
  mode,
  initialValue,
  train,
  loading,
  saving,
  onClose,
  onSave,
  onAddCarriage,
  onEditCarriage,
  onDeleteCarriage,
  onDuplicateCarriage,
  onOpenLayout,
}: Props) {
  const [draft, setDraft] = useState<TrainDraft>({ code: '', name: '' });

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraft({
      code: initialValue?.code ?? train?.code ?? '',
      name: initialValue?.name ?? train?.name ?? '',
    });
  }, [initialValue, open, train]);

  const carriages = train?.carriages ?? [];

  const carriagePreviewLayout = (carriage: AdminTrainDetailCarriage): TrainSeatGrid => {
    if (carriage.layoutJson) {
      return layoutJsonToTrainGrid(carriage.layoutJson);
    }

    const rows = Math.max(1, Math.ceil(Math.max(carriage.seatCount, carriage.seats.length) / 4));
    const cols = 4;
    const layout = createEmptyTrainLayout(rows, cols);

    carriage.seats.forEach((seat, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      if (layout[row] && layout[row][col] !== undefined) {
        layout[row][col] = {
          seatId: seat.id,
          seatNumber: seat.code,
          price: seat.price,
        };
      }
    });

    return layout;
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-7xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Tạo tàu' : 'Sửa tàu'}</DialogTitle>
          <DialogDescription>Toàn bộ flow quản lý tàu nằm trong một modal duy nhất.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Thông tin tàu</CardTitle>
              <CardDescription>Chỉ sửa code và name ở đây.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Code</label>
                <Input value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))} placeholder="SE1" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Name</label>
                <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Tàu Thống Nhất" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Danh sách toa</CardTitle>
                <CardDescription>Hiển thị dạng card, mọi thao tác CRUD đều qua modal.</CardDescription>
              </div>
              <Button className="bg-slate-950 text-white hover:bg-slate-800" onClick={onAddCarriage} disabled={!train}>
                <Plus className="mr-2 size-4" />
                Add carriage
              </Button>
            </CardHeader>
            <CardContent>
              {carriages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Chưa có toa nào trong tàu này.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {carriages.map((carriage) => (
                    <Card key={carriage.id} className="border-slate-200 shadow-none">
                      <CardHeader className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-base">{carriage.code}</CardTitle>
                          <Badge variant="secondary">{carriage.type}</Badge>
                        </div>
                        <CardDescription>
                          {carriage.seatCount} ghế - {carriage.basePrice.toLocaleString('vi-VN')} đ
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid gap-2 text-sm text-slate-600">
                          <div className="flex items-center justify-between">
                            <span>Code</span>
                            <span className="font-medium text-slate-950">{carriage.code}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Type</span>
                            <span className="font-medium text-slate-950">{carriage.type}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Base price</span>
                            <span className="font-medium text-slate-950">{carriage.basePrice.toLocaleString('vi-VN')} đ</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Số ghế</span>
                            <span className="font-medium text-slate-950">{carriage.seatCount}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" size="sm" onClick={() => onEditCarriage(carriage)}>
                            <Edit3 className="mr-2 size-4" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => onOpenLayout(carriage)}>
                            <LayoutGrid className="mr-2 size-4" />
                            Layout
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => onDuplicateCarriage(carriage.id)}>
                            <Copy className="mr-2 size-4" />
                            Duplicate
                          </Button>
                          <Button variant="outline" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => onDeleteCarriage(carriage.id)}>
                            <Trash2 className="mr-2 size-4" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>Reuse component này ở trang user booking sau này.</CardDescription>
            </CardHeader>
            <CardContent>
              <TrainPreview
                carriages={carriages.map((carriage) => ({
                  id: carriage.id,
                  code: carriage.code,
                  type: carriage.type,
                  basePrice: carriage.basePrice,
                  layout: carriagePreviewLayout(carriage),
                }))}
              />
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button className="bg-slate-950 text-white hover:bg-slate-800" onClick={() => void onSave(draft)} disabled={saving}>
            <Save className="mr-2 size-4" />
            Lưu tàu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
