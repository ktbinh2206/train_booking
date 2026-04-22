'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrencyVND } from '@/lib/utils';
import type { TrainPreviewCarriage } from '@/lib/train-management';

type Props = {
  carriages: TrainPreviewCarriage[];
  className?: string;
};

function SeatCell({
  seatNumber,
  empty,
  finalPrice,
}: {
  seatNumber?: string;
  empty?: boolean;
  finalPrice: number;
}) {
  return (
    <div
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-xl border text-[11px] font-semibold transition',
        empty
          ? 'border-dashed border-slate-200 bg-white text-slate-300'
          : 'border-slate-200 bg-white text-slate-950 shadow-sm',
      )}
      title={empty ? 'Lối đi' : `${seatNumber} - ${formatCurrencyVND(finalPrice)}`}
    >
      {empty ? '' : seatNumber}
    </div>
  );
}

export const TrainPreview = memo(function TrainPreview({ carriages, className }: Props) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <div className="flex min-w-max gap-4 pb-2">
        {carriages.map((carriage) => {
          const rows = carriage.layout.length;
          const cols = carriage.layout[0]?.length ?? 0;

          return (
            <section key={`${carriage.id ?? carriage.code}`} className="w-[280px] shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-950">{carriage.code}</h4>
                    <p className="text-xs text-slate-500">{carriage.type ?? 'Carriage'}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>{rows} x {cols}</div>
                    <div>{formatCurrencyVND(carriage.basePrice)}</div>
                  </div>
                </div>
              </div>

              <div className="max-h-[320px] overflow-auto p-4">
                <div className="space-y-2">
                  {carriage.layout.slice(0, 500).map((row, rowIndex) => (
                    <div key={`${carriage.code}-${rowIndex}`} className="flex items-center gap-2">
                      <div className="w-5 text-center text-[10px] font-medium text-slate-400">{rowIndex + 1}</div>
                      <div className="flex items-center gap-2">
                        {row.map((cell, cellIndex) => (
                          <SeatCell
                            key={`${carriage.code}-${rowIndex}-${cellIndex}`}
                            seatNumber={cell?.seatNumber}
                            empty={!cell}
                            finalPrice={cell?.price ?? carriage.basePrice}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
});
