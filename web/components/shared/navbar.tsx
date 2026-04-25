'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { VN } from '@/lib/translations';
import { useAuth } from '@/components/auth/auth-provider';
import { NotificationBell } from '@/components/shared/notification-bell';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, loading, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="hidden sm:inline font-bold text-2xl text-gray-900">{VN.nav.logo}</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 transition font-medium text-sm"
            >
              {VN.nav.home}
            </Link>
            <Link
              href="/search"
              className="text-gray-600 hover:text-gray-900 transition font-medium text-sm"
            >
              {VN.nav.bookTickets}
            </Link>
            <Link
              href="/tickets"
              className="text-gray-600 hover:text-gray-900 transition font-medium text-sm"
            >
              {VN.nav.myTickets}
            </Link>
            <Link
              href="/notifications"
              className="text-gray-600 hover:text-gray-900 transition font-medium text-sm"
            >
              {VN.nav.notifications}
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {user && <NotificationBell />}
            {loading ? (
              <span className="text-sm text-gray-500">Đang tải...</span>
            ) : user ? (
              <>
                <Link href="/profile">
                  <Button variant="outline" size="sm" className="border-gray-200">
                    {user.name}
                  </Button>
                </Link>
                {user.role === 'ADMIN' && (
                  <Link href="/admin/dashboard">
                    <Button variant="outline" size="sm" className="border-gray-200">
                      Admin
                    </Button>
                  </Link>
                )}
                <Button size="sm" variant="outline" onClick={logout}>
                  Đăng xuất
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline" size="sm" className="border-gray-200">
                    {VN.nav.signIn}
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    {VN.nav.signUp}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 border-t border-gray-200">
            <Link
              href="/"
              className="block px-4 py-2 text-gray-600 hover:bg-gray-50"
            >
              {VN.nav.home}
            </Link>
            <Link
              href="/search"
              className="block px-4 py-2 text-gray-600 hover:bg-gray-50"
            >
              {VN.nav.bookTickets}
            </Link>
            <Link
              href="/tickets"
              className="block px-4 py-2 text-gray-600 hover:bg-gray-50"
            >
              {VN.nav.myTickets}
            </Link>
            <Link
              href="/notifications"
              className="block px-4 py-2 text-gray-600 hover:bg-gray-50"
            >
              {VN.nav.notifications}
            </Link>
            <Link
              href="/profile"
              className="block px-4 py-2 text-gray-600 hover:bg-gray-50"
            >
              {VN.nav.profile}
            </Link>
            {user ? (
              <button
                className="block w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-50"
                onClick={logout}
              >
                Đăng xuất
              </button>
            ) : (
              <>
                <Link href="/login" className="block px-4 py-2 text-gray-600 hover:bg-gray-50">
                  {VN.nav.signIn}
                </Link>
                <Link href="/signup" className="block px-4 py-2 text-gray-600 hover:bg-gray-50">
                  {VN.nav.signUp}
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
