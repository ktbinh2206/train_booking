'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Train,
  Tickets,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';

const adminNavItems = [
  {
    icon: LayoutDashboard,
    label: 'Bảng điều khiển',
    href: '/admin/dashboard',
  },
  {
    icon: Train,
    label: 'Quản lý chuyến tàu',
    href: '/admin/trips',
  },
  {
    icon: Zap,
    label: 'Toa tàu và ghế',
    href: '/admin/carriages',
  },
  {
    icon: Tickets,
    label: 'Quản lý vé',
    href: '/admin/tickets',
  },
  {
    icon: Users,
    label: 'Người dùng',
    href: '/admin/users',
  },
  {
    icon: BarChart3,
    label: 'Báo cáo',
    href: '/admin/reports',
  },
  {
    icon: Settings,
    label: 'Cài đặt',
    href: '/admin/settings',
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (!loading && (!user || user.role !== 'ADMIN')) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`fixed lg:relative inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-4 border-b border-gray-800">
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">🚂</span>
              </div>
              <span className="font-bold text-lg">RailAdmin</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <div className="space-y-1 px-3">
              {adminNavItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-800">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-gray-300 border-gray-700 hover:bg-gray-800 flex items-center gap-2 justify-center"
              onClick={() => {
                logout();
                router.push('/login');
              }}
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          <div className="flex-1 px-4 hidden sm:block">
            <p className="text-sm text-gray-600">Trang quản trị</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold">👤</span>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}
