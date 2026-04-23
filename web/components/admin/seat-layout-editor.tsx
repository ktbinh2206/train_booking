'use client';

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createEmptyTrainLayout, resizeTrainLayout, toggleTrainSeat, type TrainSeatGrid } from '@/lib/train-management';

type Props = {
  layout: TrainSeatGrid;
  rows: number;
  cols: number;
  readOnly?: boolean;
  onRowsChange: (value: number) => void;
  onColsChange: (value: number) => void;
  onChange: (value: TrainSeatGrid) => void;
};

export const SeatLayoutEditor = memo(function SeatLayoutEditor({
  layout,
  rows,
  cols,
  readOnly = false,
  onRowsChange,
  onColsChange,
  onChange
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <p className="text-xs text-slate-500">Rows</p>
          <Input type="number" min={1} value={rows} onChange={(event) => onRowsChange(Number(event.target.value || 1))} className="w-24" disabled={readOnly} />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-slate-500">Cols</p>
          <Input type="number" min={1} value={cols} onChange={(event) => onColsChange(Number(event.target.value || 1))} className="w-24" disabled={readOnly} />
        </div>
        <Button variant="outline" onClick={() => onChange(resizeTrainLayout(layout, Math.max(1, rows), Math.max(1, cols)))} disabled={readOnly}>
          Resize
        </Button>
        <Button variant="outline" onClick={() => onChange(createEmptyTrainLayout(Math.max(1, rows), Math.max(1, cols)))} disabled={readOnly}>
          Reset
        </Button>
      </div>

      <div className="overflow-auto rounded-xl border p-3">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(1, cols)}, 42px)` }}>
          {layout.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                type="button"
                onClick={() => !readOnly && onChange(toggleTrainSeat(layout, rowIndex, colIndex))}
                className={cell ? 'h-10 w-10 rounded border bg-emerald-500 text-xs font-semibold text-white' : 'h-10 w-10 rounded border border-dashed text-xs text-slate-300'}
                title={cell?.seatNumber ?? 'Aisle'}
                disabled={readOnly}
              >
                {cell?.seatNumber ?? ''}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
});
