'use client';

import { Input } from '@/components/ui/input';
import { Search, Edit2, Lock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Quản lý người dùng</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input placeholder="Tìm theo tên hoặc email..." className="pl-10" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Họ tên</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Số lần đặt</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Ngày tham gia</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[
                { id: 1, name: 'Nguyen Van A', email: 'nguyen.a@example.com', bookings: 8, joined: '2023-01-15' },
                { id: 2, name: 'Tran Thi B', email: 'tran.b@example.com', bookings: 5, joined: '2023-02-20' },
                { id: 3, name: 'Le Van C', email: 'le.c@example.com', bookings: 12, joined: '2022-12-10' },
                { id: 4, name: 'Pham Thi D', email: 'pham.d@example.com', bookings: 3, joined: '2024-01-05' },
              ].map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{user.bookings}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{user.joined}</td>
                  <td className="px-6 py-3 flex gap-2">
                    <Button variant="outline" size="sm">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Lock className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
