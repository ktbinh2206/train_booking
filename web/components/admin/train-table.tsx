'use client';

import { Button } from '@/components/ui/button';
import { formatCurrencyVND } from '@/lib/utils';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import type { AdminTrain } from '@/lib/api';

export type TrainTableProps = {
  trains: AdminTrain[];
  page: number;
  totalPages: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onCreate: () => void;
  onEdit: (trainId: string) => void;
  onDelete: (trainId: string) => void;
};

export function TrainTable({
  trains,
  page,
  totalPages,
  loading,
  onPageChange,
  onCreate,
  onEdit,
  onDelete,
}: TrainTableProps) {
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Danh sách tàu</h2>
          <p className="text-sm text-slate-500">Server-side pagination, thao tác qua modal.</p>
        </div>
        <Button className="bg-slate-950 text-white hover:bg-slate-800" onClick={onCreate}>
          <Plus className="mr-2 size-4" />
          Tạo tàu
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Train code</th>
              <th className="px-4 py-3">Train name</th>
              <th className="px-4 py-3">Số toa</th>
              <th className="px-4 py-3">Tổng số ghế</th>
              <th className="px-4 py-3">Tổng giá min/max</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trains.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={6}>
                  {loading ? 'Đang tải dữ liệu...' : 'Chưa có tàu nào.'}
                </td>
              </tr>
            ) : trains.map((train) => (
              <tr key={train.id} className="text-sm text-slate-700">
                <td className="px-4 py-3 font-semibold text-slate-950">{train.code}</td>
                <td className="px-4 py-3">{train.name}</td>
                <td className="px-4 py-3">{train.carriageCount}</td>
                <td className="px-4 py-3">{train.seatCount}</td>
                <td className="px-4 py-3">{train.minCarriagePrice != null && train.maxCarriagePrice != null ? `${formatCurrencyVND(train.minCarriagePrice)} - ${formatCurrencyVND(train.maxCarriagePrice)}` : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(train.id)}>
                      <Edit3 className="mr-2 size-4" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => onDelete(train.id)}>
                      <Trash2 className="mr-2 size-4" />
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
        <span className="text-slate-500">Trang {page} / {totalPages}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={loading || page <= 1} onClick={() => onPageChange(page - 1)}>Prev</Button>
          <Button variant="outline" size="sm" disabled={loading || page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
