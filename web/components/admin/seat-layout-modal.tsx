'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { createEmptyTrainLayout, flattenLayoutSeats, resizeTrainLayout, toggleTrainSeat, type TrainSeatGrid } from '@/lib/train-management';

type Props = {
  open: boolean;
  title: string;
  initialLayout?: TrainSeatGrid | null;
  onClose: () => void;
  onSave: (layout: TrainSeatGrid) => Promise<void> | void;
  saving?: boolean;
};

export function SeatLayoutModal({
  open,
  title,
  initialLayout,
  onClose,
  onSave,
  saving,
}: Props) {
  const [layout, setLayout] = useState<TrainSeatGrid>(createEmptyTrainLayout());
  const [rows, setRows] = useState(8);
  const [cols, setCols] = useState(4);

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextLayout = initialLayout ?? createEmptyTrainLayout();
    setLayout(nextLayout);
    setRows(nextLayout.length || 8);
    setCols(nextLayout[0]?.length || 4);
  }, [initialLayout, open]);

  const seatCount = useMemo(() => layout.reduce((sum, row) => sum + row.filter(Boolean).length, 0), [layout]);

  const handleResize = () => {
    const safeRows = Math.max(1, Number(rows) || 1);
    const safeCols = Math.max(1, Number(cols) || 1);
    setLayout((current) => resizeTrainLayout(current, safeRows, safeCols));
    setRows(safeRows);
    setCols(safeCols);
  };

  const handleReset = () => {
    const next = createEmptyTrainLayout(rows, cols);
    setLayout(next);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Click để toggle ghế. Layout trả về dạng Cell[][], seatNumber auto-generate A1, A2...</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Rows</label>
              <Input type="number" min={1} value={rows} onChange={(event) => setRows(Number(event.target.value))} className="w-28" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Cols</label>
              <Input type="number" min={1} value={cols} onChange={(event) => setCols(Number(event.target.value))} className="w-28" />
            </div>
            <Button variant="outline" onClick={handleResize}>Resize</Button>
            <Button variant="outline" onClick={handleReset}>Reset</Button>
            <div className="ml-auto text-sm text-slate-500">{seatCount} seats</div>
          </div>

          <div className="overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="inline-block min-w-full">
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${cols}, 52px)` }}
              >
                {layout.map((row, rowIndex) =>
                  row.map((cell, colIndex) => (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      type="button"
                      onClick={() => setLayout((current) => toggleTrainSeat(current, rowIndex, colIndex))}
                      className={[
                        'flex h-[52px] w-[52px] items-center justify-center rounded-xl border text-[11px] font-semibold transition',
                        cell
                          ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm'
                          : 'border-dashed border-slate-200 bg-white text-slate-300 hover:border-slate-300',
                      ].join(' ')}
                      title={cell?.seatNumber ?? 'Aisle'}
                    >
                      {cell?.seatNumber ?? ''}
                    </button>
                  )),
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            Preview flatten order: {flattenLayoutSeats(layout).map((seat) => seat.code).join(', ') || 'Empty'}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button className="bg-slate-950 text-white hover:bg-slate-800" onClick={() => void onSave(layout)} disabled={saving}>
            Lưu layout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
