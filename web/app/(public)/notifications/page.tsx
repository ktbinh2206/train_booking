'use client';

import { useEffect, useMemo, useState } from 'react';
import { Breadcrumb } from '@/components/shared/breadcrumb';
import { Button } from '@/components/ui/button';
import { deleteNotification, listNotifications, markNotificationRead } from '@/lib/api';
import {
  Ticket,
  CreditCard,
  Train,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { VN } from '@/lib/translations';
import { formatDateTimeVn } from '@/lib/utils';
import { useAuth } from '@/components/auth/auth-provider';

const NotificationIcons = {
  booking: Ticket,
  payment: CreditCard,
  trip: Train,
  delay: AlertTriangle,
  refund: RefreshCw,
  general: Ticket,
};

const NotificationColors = {
  booking: 'bg-blue-100 text-blue-600',
  payment: 'bg-green-100 text-green-600',
  trip: 'bg-purple-100 text-purple-600',
  delay: 'bg-yellow-100 text-yellow-600',
  refund: 'bg-orange-100 text-orange-600',
  general: 'bg-gray-100 text-gray-600',
};

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Awaited<ReturnType<typeof listNotifications>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        if (!user) {
          setError('Vui lòng đăng nhập để xem thông báo.');
          return;
        }

        setLoading(true);
        setError(null);

        const data = await listNotifications();
        if (active) {
          setNotifications(data);
        }
      } catch (unknownError) {
        if (!active) return;
        const message = unknownError instanceof Error ? unknownError.message : 'Không thể tải thông báo.';
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-700 mb-4">Bạn cần đăng nhập để xem thông báo.</p>
        <Link href="/login">
          <Button>Đăng nhập</Button>
        </Link>
      </div>
    );
  }

  const filteredNotifications = useMemo(() => {
    return activeTab === 'all'
      ? notifications
      : notifications.filter((notification) => notification.type === activeTab);
  }, [notifications, activeTab]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((previous) => previous.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)));
    } catch {
      setError('Đánh dấu đã đọc thất bại.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications((previous) => previous.filter((notification) => notification.id !== id));
    } catch {
      setError('Xóa thông báo thất bại.');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Thông báo' },
        ]}
      />

      {/* Page Header */}
      <div className="mt-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Thông báo</h1>
            <p className="text-gray-600 mt-2">
              {unreadCount > 0 ? `Bạn có ${unreadCount} thông báo chưa đọc` : 'Bạn đã xem hết thông báo'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm">
              Đánh dấu tất cả đã đọc
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="flex flex-wrap border-b border-gray-200">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'booking', label: 'Đặt vé' },
            { id: 'payment', label: 'Thanh toán' },
            { id: 'trip', label: 'Cập nhật chuyến tàu' },
            { id: 'delay', label: 'Trễ chuyến' },
            { id: 'refund', label: 'Hoàn tiền' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-600">Đang tải thông báo...</p>
        </div>
      ) : filteredNotifications.length > 0 ? (
        <div className="space-y-3">
          {filteredNotifications.map(notification => {
            const IconComponent = NotificationIcons[notification.type as keyof typeof NotificationIcons];
            const colorClass = NotificationColors[notification.type as keyof typeof NotificationColors];

            return (
              <div
                key={notification.id}
                className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition flex gap-4 ${
                  !notification.read ? 'border-blue-300 bg-blue-50' : ''
                }`}
              >
                {/* Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                  <IconComponent className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className={`font-semibold ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatDateTimeVn(notification.createdAt, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {/* Status and Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                      <div className="flex gap-2">
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                            title="Đánh dấu đã đọc"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action Link */}
                  {notification.actionUrl && (
                    <Link href={notification.actionUrl} className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-3 inline-block">
                      Xem chi tiết →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-600 mb-4">Không có thông báo</p>
          <p className="text-sm text-gray-500 mb-6">
            {activeTab === 'all'
              ? 'Bạn đã xem hết thông báo!'
              : `Không có thông báo ${activeTab} vào lúc này`}
          </p>
          <Link href="/">
            <Button>Về trang chủ</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
