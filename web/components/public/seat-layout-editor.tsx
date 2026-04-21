'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Cell =
  | {
      seatId: string;
      seatNumber: string;
    }
  | null;

type Props = {
  initialLayout?: Cell[][];
  onSave?: (layout: Cell[][]) => void;
};

export default function SeatLayoutEditor({ initialLayout, onSave }: Props) {
  const defaultRows = initialLayout?.length || 8;
  const defaultCols = initialLayout?.[0]?.length || 5;

  const [rows, setRows] = useState(defaultRows);
  const [cols, setCols] = useState(defaultCols);
  const [layout, setLayout] = useState<Cell[][]>(
    initialLayout ||
      Array.from({ length: defaultRows }, () =>
        Array.from({ length: defaultCols }, () => null)
      )
  );

  // Tạo seatId
  const createSeatId = () => `seat_${Date.now()}_${Math.random()}`;

  // Convert row -> A, B, C...
  const getRowLabel = (row: number) =>
    String.fromCharCode(65 + row); // 0 -> A

  // Generate seat number (A1, A2...)
  const generateSeatNumber = (r: number, c: number) => {
    return `${getRowLabel(r)}${c + 1}`;
  };

  const updateLayout = (newLayout: Cell[][]) => {
    setLayout(newLayout.map((row) => [...row]));
  };

  // 👉 CLICK: toggle seat
  const handleClick = (r: number, c: number) => {
    const newLayout = layout.map((row) => [...row]);
    const cell = newLayout[r][c];

    if (cell) {
      // ❌ Remove seat
      newLayout[r][c] = null;
    } else {
      // ✅ Add seat
      newLayout[r][c] = {
        seatId: createSeatId(),
        seatNumber: generateSeatNumber(r, c)
      };
    }

    updateLayout(newLayout);
  };

  // Resize grid
  const resize = (newRows: number, newCols: number) => {
    const newLayout: Cell[][] = Array.from({ length: newRows }, (_, r) =>
      Array.from({ length: newCols }, (_, c) => layout[r]?.[c] || null)
    );

    setRows(newRows);
    setCols(newCols);
    setLayout(newLayout);
  };

  const resetLayout = () => {
    setLayout(
      Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => null)
      )
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Sơ đồ ghế (Click để thêm/xóa)</h2>
        <Button variant="outline" onClick={resetLayout}>
          🔄 Reset
        </Button>
      </div>

      {/* Resize */}
      <div className="flex gap-4 items-center">
        <div>
          <label className="text-sm text-gray-600">Rows</label>
          <input
            type="number"
            value={rows}
            min={1}
            className="border px-2 py-1 w-16 ml-2"
            onChange={(e) => resize(Number(e.target.value), cols)}
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Cols</label>
          <input
            type="number"
            value={cols}
            min={1}
            className="border px-2 py-1 w-16 ml-2"
            onChange={(e) => resize(rows, Number(e.target.value))}
          />
        </div>
      </div>

      {/* Grid */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, 50px)` }}
      >
        {layout.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              onClick={() => handleClick(r, c)}
              className={cn(
                'w-12 h-12 border rounded flex flex-col items-center justify-center cursor-pointer text-xs font-medium',
                cell
                  ? 'bg-green-400 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              )}
            >
              {cell ? (
                <>
                  🪑
                  <span>{cell.seatNumber}</span>
                </>
              ) : (
                ''
              )}
            </div>
          ))
        )}
      </div>

      {/* Save */}
      <Button
        className="bg-green-600 hover:bg-green-700"
        onClick={() => onSave?.(layout)}
      >
        💾 Lưu layout
      </Button>
    </div>
  );
}