'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900">Cài đặt</h1>

      {/* Booking Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cài đặt đặt vé</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="holdTime" className="text-sm mb-2">
              Thời gian giữ ghế (phút)
            </Label>
            <Input id="holdTime" type="number" defaultValue="5" />
          </div>
          <div>
            <Label htmlFor="maxPassengers" className="text-sm mb-2">
              Số hành khách tối đa mỗi đơn
            </Label>
            <Input id="maxPassengers" type="number" defaultValue="6" />
          </div>
          <div>
            <Label htmlFor="cancellationDays" className="text-sm mb-2">
              Số ngày được hủy trước chuyến đi
            </Label>
            <Input id="cancellationDays" type="number" defaultValue="1" />
          </div>
        </div>
      </div>

      {/* Payment Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cài đặt thanh toán</h2>
        <div className="space-y-3">
          {[
            { id: 'card', label: 'Thẻ tín dụng/ghi nợ' },
            { id: 'upi', label: 'Ví điện tử' },
            { id: 'netbanking', label: 'Internet Banking' },
          ].map(method => (
            <div key={method.id} className="flex items-center">
              <Checkbox id={method.id} defaultChecked />
              <Label htmlFor={method.id} className="ml-2 cursor-pointer">
                {method.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cài đặt thông báo</h2>
        <div className="space-y-3">
          {[
            { id: 'emailNotif', label: 'Thông báo email' },
            { id: 'smsNotif', label: 'Thông báo SMS' },
            { id: 'pushNotif', label: 'Thông báo đẩy' },
          ].map(notif => (
            <div key={notif.id} className="flex items-center">
              <Checkbox id={notif.id} defaultChecked />
              <Label htmlFor={notif.id} className="ml-2 cursor-pointer">
                {notif.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-3">
        <Button className="bg-blue-600 hover:bg-blue-700">Lưu thay đổi</Button>
        <Button variant="outline">Đặt lại</Button>
      </div>
    </div>
  );
}
