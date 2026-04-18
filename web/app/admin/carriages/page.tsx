'use client';

import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CarriagesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý toa tàu và ghế</h1>
        <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Thêm toa
        </Button>
      </div>

      <Tabs defaultValue="carriages">
        <TabsList>
          <TabsTrigger value="carriages">Toa tàu</TabsTrigger>
          <TabsTrigger value="seats">Ghế</TabsTrigger>
        </TabsList>

        <TabsContent value="carriages" className="mt-6">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Toa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Loại</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Tổng ghế</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Còn trống</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    { id: 1, name: 'Toa 1', type: 'Phổ thông', total: 72, available: 45 },
                    { id: 2, name: 'Toa 2', type: 'Phổ thông', total: 72, available: 28 },
                    { id: 3, name: 'Toa 3', type: 'Thương gia', total: 48, available: 32 },
                    { id: 4, name: 'Toa 4', type: 'Hạng nhất', total: 32, available: 18 },
                  ].map(carriage => (
                    <tr key={carriage.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">{carriage.name}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{carriage.type}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{carriage.total}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{carriage.available}</td>
                      <td className="px-6 py-3 flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit2 className="w-4 h-4" />
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
        </TabsContent>

        <TabsContent value="seats" className="mt-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-gray-600 mb-4">Quản lý tình trạng và giá ghế</p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Khóa ghế
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
