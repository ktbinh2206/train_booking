'use client';

import { Seat } from '@/lib/types';
import { useState } from 'react';
import { formatCurrencyVND } from '@/lib/utils';

interface SeatMapProps {
  seats: Seat[];
  selectedSeats: string[];
  onSeatSelect: (seatId: string) => void;
}

export function SeatMap({ seats, selectedSeats, onSeatSelect }: SeatMapProps) {
  const maxRow = Math.max(...seats.map(s => s.row));
  const maxCol = Math.max(...seats.map(s => s.column));

  const seatStatusStyles = {
    available: 'bg-white border-gray-300 hover:bg-blue-50 cursor-pointer',
    selected: 'bg-blue-600 border-blue-700 text-white cursor-pointer',
    sold: 'bg-gray-400 border-gray-500 cursor-not-allowed',
    holding: 'bg-yellow-200 border-yellow-400 cursor-not-allowed',
    blocked: 'bg-red-200 border-red-400 cursor-not-allowed',
  };

  const seatGrid: (Seat | null)[][] = Array(maxRow)
    .fill(null)
    .map(() => Array(maxCol).fill(null));

  seats.forEach(seat => {
    seatGrid[seat.row - 1][seat.column - 1] = seat;
  });

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full p-4">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border border-gray-300 bg-white rounded"></div>
            <span className="text-gray-600">Còn trống</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border border-blue-700 bg-blue-600 rounded text-white text-xs flex items-center justify-center">
              ✓
            </div>
            <span className="text-gray-600">Đã chọn</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border border-gray-500 bg-gray-400 rounded"></div>
            <span className="text-gray-600">Đã bán</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border border-yellow-400 bg-yellow-200 rounded"></div>
            <span className="text-gray-600">Đang giữ chỗ</span>
          </div>
        </div>

        {/* Seat Grid */}
        <div className="space-y-2 flex flex-col items-center">
          {seatGrid.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-2 justify-center">
              {/* Row Number */}
              <div className="w-6 flex items-center justify-center text-xs font-semibold text-gray-500">
                {rowIndex + 1}
              </div>

              {/* Aisle space */}
              <div className="flex gap-2 items-center">
                {row.slice(0, 3).map((seat, colIndex) =>
                  seat ? (
                    <button
                      key={seat.id}
                      onClick={() => {
                        if (seat.status === 'available' || seat.status === 'selected') {
                          onSeatSelect(seat.id);
                        }
                      }}
                      disabled={seat.status === 'sold' || seat.status === 'holding' || seat.status === 'blocked'}
                      className={`w-8 h-8 border rounded flex items-center justify-center text-xs font-semibold transition ${
                        seatStatusStyles[seat.status as keyof typeof seatStatusStyles]
                      }`}
                      title={`${seat.seatNumber} - ${formatCurrencyVND(seat.price)}`}
                    >
                      {selectedSeats.includes(seat.id) ? '✓' : seat.seatNumber.slice(-1)}
                    </button>
                  ) : (
                    <div key={`empty-${rowIndex}-${colIndex}`} className="w-8 h-8"></div>
                  )
                )}
              </div>

              {/* Aisle */}
              <div className="w-4 text-center text-xs text-gray-400">|</div>

              {/* Right side seats */}
              <div className="flex gap-2 items-center">
                {row.slice(3).map((seat, colIndex) =>
                  seat ? (
                    <button
                      key={seat.id}
                      onClick={() => {
                        if (seat.status === 'available' || seat.status === 'selected') {
                          onSeatSelect(seat.id);
                        }
                      }}
                      disabled={seat.status === 'sold' || seat.status === 'holding' || seat.status === 'blocked'}
                      className={`w-8 h-8 border rounded flex items-center justify-center text-xs font-semibold transition ${
                        seatStatusStyles[seat.status as keyof typeof seatStatusStyles]
                      }`}
                      title={`${seat.seatNumber} - ${formatCurrencyVND(seat.price)}`}
                    >
                      {selectedSeats.includes(seat.id) ? '✓' : seat.seatNumber.slice(-1)}
                    </button>
                  ) : (
                    <div key={`empty-${rowIndex}-${colIndex}`} className="w-8 h-8"></div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Screen indicator */}
        <div className="mt-6 text-center">
          <div className="inline-block border-t-4 border-gray-400 w-32 h-2 text-gray-500 text-xs relative">
            <span className="absolute -top-6 left-1/2 -translate-x-1/2">Đầu tàu</span>
          </div>
        </div>
      </div>
    </div>
  );
}
