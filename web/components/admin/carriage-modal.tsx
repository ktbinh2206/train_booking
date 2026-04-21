'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { AdminTrainDetailCarriage } from '@/lib/api';
import { Train, LayoutGrid } from 'lucide-react';

export type CarriageDraft = {
  code: string;
  type: 'SOFT_SEAT' | 'HARD_SEAT' | 'SLEEPER';
  basePrice: number;
};

type Props = {
  open: boolean;
  title: string;
  initialValue?: Partial<CarriageDraft> & { id?: string } | null;
  onClose: () => void;
  onSave: (value: CarriageDraft) => Promise<void> | void;
  onDesignLayout?: () => void;
  carriage?: AdminTrainDetailCarriage | null;
  saving?: boolean;
};

const defaultValue: CarriageDraft = {
  code: '',
  type: 'SOFT_SEAT',
  basePrice: 0,
};

export function CarriageModal({
  open,
  title,
  initialValue,
  onClose,
  onSave,
  onDesignLayout,
  carriage,
  saving,
}: Props) {
  const [draft, setDraft] = useState<CarriageDraft>(defaultValue);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraft({
      code: initialValue?.code ?? carriage?.code ?? '',
      type: initialValue?.type ?? carriage?.type ?? 'SOFT_SEAT',
      basePrice: initialValue?.basePrice ?? carriage?.basePrice ?? 0,
    });
  }, [carriage, initialValue, open]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Toa được CRUD hoàn toàn qua modal, không dùng inline form.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Code</label>
            <Input value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))} placeholder="A1" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Type</label>
            <select
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={draft.type}
              onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as CarriageDraft['type'] }))}
            >
              <option value="SOFT_SEAT">SOFT_SEAT</option>
              <option value="HARD_SEAT">HARD_SEAT</option>
              <option value="SLEEPER">SLEEPER</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Base price</label>
            <Input
              type="number"
              min={0}
              value={draft.basePrice}
              onChange={(event) => setDraft((current) => ({ ...current, basePrice: Number(event.target.value) }))}
            />
          </div>
        </div>

        <DialogFooter className="mt-2">
          {carriage ? (
            <Button variant="outline" onClick={onDesignLayout} disabled={!onDesignLayout || saving}>
              <LayoutGrid className="mr-2 size-4" />
              Thiết kế layout ghế
            </Button>
          ) : null}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>
            <Button className="bg-slate-950 text-white hover:bg-slate-800" onClick={() => void onSave(draft)} disabled={saving}>
              <Train className="mr-2 size-4" />
              Lưu toa
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
