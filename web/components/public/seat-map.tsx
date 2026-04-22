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
  if (seats.length === 0) {
    return <p className="text-sm text-gray-500">Không có dữ liệu ghế.</p>;
  }

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

        <div className="flex gap-6 items-center justify-center">
          {/* LEFT: Train head */}
          <div className="flex flex-col items-center justify-start mt-6 mr-10">
            <div className="border-l-4 border-gray-400 h-32 relative">
              <span className="absolute top-1/2 left-1 -translate-y-1/2 text-gray-500 text-xs whitespace-nowrap">
                Đầu tàu
              </span>
            </div>
          </div>

          {/* RIGHT: Seat Grid */}
          <div className="space-y-2 flex flex-col items-center">
            {seatGrid.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-2 justify-center">
                {/* Row Number */}
                <div className="w-6 flex items-center justify-center text-xs font-semibold text-gray-500">
                  {rowIndex + 1}
                </div>

                {/* Seats */}
                <div className="flex gap-2 items-center">
                  {row.map((seat, colIndex) =>
                    seat ? (
                      (() => {
                        const isSelected = selectedSeats.includes(seat.id);
                        const styleKey = isSelected ? 'selected' : seat.status;

                        return (
                          <button
                            key={seat.id}
                            onClick={() => {
                              if (seat.status === 'available' || isSelected) {
                                onSeatSelect(seat.id);
                              }
                            }}
                            disabled={
                              seat.status === 'sold' ||
                              seat.status === 'holding' ||
                              seat.status === 'blocked'
                            }
                            className={`w-8 h-8 border rounded flex items-center justify-center text-xs font-semibold transition ${seatStatusStyles[
                              styleKey as keyof typeof seatStatusStyles
                              ]
                              }`}
                            title={`${seat.seatNumber} - ${formatCurrencyVND(seat.price)}`}
                          >
                            {isSelected ? '✓' : seat.seatNumber}
                          </button>
                        );
                      })()
                    ) : (
                      <div
                        key={`empty-${rowIndex}-${colIndex}`}
                        className="w-8 h-8"
                      ></div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
