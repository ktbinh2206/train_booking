'use client';

import { useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/shared/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Lock, Bell, LogOut, Edit2, Save } from 'lucide-react';
import { VN } from '@/lib/translations';
import { getCurrentUser } from '@/lib/api';
import { useAuth } from '@/components/auth/auth-provider';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalBookings: 0, totalTickets: 0 });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        if (!user) {
          setError('Vui lòng đăng nhập để xem hồ sơ.');
          return;
        }

        setLoading(true);
        setError(null);
        const userData = await getCurrentUser();
        if (!active) return;

        setFormData({
          name: userData.name,
          email: userData.email,
          phone: userData.phone
        });
        setStats({
          totalBookings: userData.totalBookings,
          totalTickets: userData.totalTickets
        });
      } catch (unknownError) {
        if (!active) return;
        const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải hồ sơ.';
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [user]);

  if (!authLoading && !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-700 mb-4">Bạn cần đăng nhập để xem hồ sơ.</p>
        <Link href="/login">
          <Button>Đăng nhập</Button>
        </Link>
      </div>
    );
  }

  const handleSave = () => {
    setIsEditing(false);
    // API call would go here
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: VN.nav.home, href: '/' },
          { label: VN.profile.myProfile },
        ]}
      />

      {/* Page Header */}
      <div className="mt-8 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Hồ sơ của tôi</h1>
        <p className="text-gray-600 mt-2">Quản lý cài đặt và tùy chọn tài khoản</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">{error}</div>
      )}

      {loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 text-sm text-gray-600">Đang tải hồ sơ...</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-20">
            <nav className="space-y-2">
              {[
                { icon: User, label: 'Thông tin cá nhân', active: true },
                { icon: Lock, label: 'Bảo mật', active: false },
                { icon: Bell, label: 'Thông báo', active: false },
              ].map((item, index) => (
                <button
                  key={index}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left transition ${
                    item.active
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Thông tin cá nhân</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-2"
              >
                {isEditing ? (
                  <>
                    <Save className="w-4 h-4" />
                    Xong
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4" />
                    Chỉnh sửa
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-4">
              {isEditing ? (
                <>
                  <div>
                    <Label htmlFor="name" className="text-sm mb-2">
                      Họ và tên
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm mb-2">
                      Địa chỉ email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-sm mb-2">
                      Số điện thoại
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={handleSave}
                  >
                    Lưu thay đổi
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Họ và tên</p>
                    <p className="font-semibold text-gray-900">{formData.name}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Địa chỉ email</p>
                    <p className="font-semibold text-gray-900">{formData.email}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Số điện thoại</p>
                    <p className="font-semibold text-gray-900">{formData.phone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Account Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-2">Tổng số đơn đặt vé</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalBookings}</p>
              <p className="text-xs text-gray-600 mt-2">Tính đến hiện tại</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-2">Tổng số vé</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalTickets}</p>
              <p className="text-xs text-gray-600 mt-2">Toàn bộ hành khách</p>
            </div>
          </div>

          {/* Security */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bảo mật</h2>
            <Button variant="outline" className="w-full flex items-center gap-2 justify-center">
              <Lock className="w-4 h-4" />
              Đổi mật khẩu
            </Button>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 mb-4">Vùng nguy hiểm</h2>
            <Button
              variant="outline"
              className="w-full text-red-600 hover:text-red-700 border-red-300 flex items-center gap-2 justify-center"
              onClick={logout}
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
