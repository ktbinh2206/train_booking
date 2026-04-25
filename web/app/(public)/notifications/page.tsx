'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumb } from '@/components/shared/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from '@/lib/api';
import { getStoredAccessToken } from '@/lib/auth-storage';
import { formatDateTimeVnShort } from '@/lib/utils';
import { useAuth } from '@/components/auth/auth-provider';
import { Ticket, CreditCard, Train, AlertTriangle, RefreshCw, Trash2, Check } from 'lucide-react';

const NotificationIcons = {
  HOLD_EXPIRE: AlertTriangle,
  REMINDER_BEFORE_DEPARTURE: Train,
  PAYMENT_SUCCESS: CreditCard,
  CANCELLED: RefreshCw,
  DELAY: AlertTriangle,
  GENERAL: Ticket
};

const NotificationColors = {
  HOLD_EXPIRE: 'bg-yellow-100 text-yellow-700',
  REMINDER_BEFORE_DEPARTURE: 'bg-blue-100 text-blue-700',
  PAYMENT_SUCCESS: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  DELAY: 'bg-orange-100 text-orange-700',
  GENERAL: 'bg-gray-100 text-gray-700'
};

const PAGE_SIZE = 10;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

type UiNotification = Awaited<ReturnType<typeof listNotifications>>['data'][number];

type NotificationSseMessage = {
  type: 'CONNECTED' | 'NOTIFICATION';
  payload?: {
    id: string;
    type: string;
    title: string;
    message: string;
    createdAt: string;
    bookingId: string | null;
    read: boolean;
  };
};

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [notifications, setNotifications] = useState<UiNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const canLoadMore = page < totalPages;

  const loadPage = async (targetPage: number) => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await listNotifications({ page: targetPage, pageSize: PAGE_SIZE });
      setPage(response.page);
      setTotalPages(response.totalPages);
      setUnreadCount(response.unreadCount);

      setNotifications((previous) => {
        if (targetPage === 1) {
          return response.data;
        }

        const merged = [...previous, ...response.data];
        const dedup = new Map(merged.map((item) => [item.id, item]));
        return Array.from(dedup.values());
      });
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Could not load notifications.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadPage(1);
  }, [user]);

  useEffect(() => {
    if (!user || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting || loading || !canLoadMore) return;
        loadPage(page + 1);
      },
      { rootMargin: '120px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [user, page, loading, canLoadMore]);

  useEffect(() => {
    if (!user) return;

    const token = getStoredAccessToken();
    if (!token) return;

    const url = new URL('/api/sse/notifications', API_BASE_URL);
    url.searchParams.set('token', token);

    const eventSource = new EventSource(url.toString());

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as NotificationSseMessage;
        if (parsed.type !== 'NOTIFICATION' || !parsed.payload) return;

        const incoming: UiNotification = {
          id: parsed.payload.id,
          userId: user.id,
          bookingId: parsed.payload.bookingId,
          type: parsed.payload.type,
          title: parsed.payload.title,
          message: parsed.payload.message,
          read: parsed.payload.read,
          createdAt: parsed.payload.createdAt,
          actionUrl: parsed.payload.bookingId ? `/tickets/${parsed.payload.bookingId}` : undefined
        };

        setNotifications((previous) => {
          if (previous.some((item) => item.id === incoming.id)) {
            return previous;
          }
          return [incoming, ...previous];
        });

        if (!incoming.read) {
          setUnreadCount((previous) => previous + 1);
        }
      } catch {
        // Ignore malformed payloads.
      }
    };

    return () => eventSource.close();
  }, [user]);

  if (!authLoading && !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-700 mb-4">Vui long dang nhap de xem thong bao.</p>
        <Link href="/login">
          <Button>Dang nhap</Button>
        </Link>
      </div>
    );
  }

  const filteredNotifications = useMemo(() => {
    return activeTab === 'all'
      ? notifications
      : notifications.filter((notification) => notification.title === activeTab);
  }, [notifications, activeTab]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const result = await markNotificationRead(id) as { unreadCount?: number };
      setNotifications((previous) => previous.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)));
      if (typeof result.unreadCount === 'number') {
        setUnreadCount(result.unreadCount);
      } else {
        setUnreadCount((previous) => Math.max(0, previous - 1));
      }
    } catch {
      setError('Mark read failed.');
    }
  };

  const handleMarkAll = async () => {
    try {
      const result = await markAllNotificationsRead();
      setNotifications((previous) => previous.map((notification) => ({ ...notification, read: true })));
      setUnreadCount(result.unreadCount);
    } catch {
      setError('Mark all read failed.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteNotification(id);
      setNotifications((previous) => previous.filter((notification) => notification.id !== id));
      setUnreadCount(result.unreadCount);
    } catch {
      setError('Delete notification failed.');
    }
  };

  const handleOpenNotification = async (notification: UiNotification) => {
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }

    if (notification.bookingId) {
      router.push(`/tickets/${notification.bookingId}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb
        items={[
          { label: 'Trang chu', href: '/' },
          { label: 'Thong bao' }
        ]}
      />

      <div className="mt-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Thong bao</h1>
            <p className="text-gray-600 mt-2">
              {unreadCount > 0 ? `Ban co ${unreadCount} thong bao chua doc` : 'Ban da xem het thong bao'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAll}>
              Danh dau tat ca da doc
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="flex flex-wrap border-b border-gray-200">
          {[
            { id: 'all', label: 'Tat ca' },
            { id: 'PAYMENT_SUCCESS', label: 'Thanh toan' },
            { id: 'REMINDER_BEFORE_DEPARTURE', label: 'Nhac gio khoi hanh' },
            { id: 'HOLD_EXPIRE', label: 'Het han giu cho' },
            { id: 'CANCELLED', label: 'Da huy' },
            { id: 'DELAY', label: 'Tre chuyen' }
          ].map((tab) => (
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

      {loading && page === 1 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-600">Dang tai thong bao...</p>
        </div>
      ) : filteredNotifications.length > 0 ? (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const iconKey = (notification.title in NotificationIcons ? notification.title : 'GENERAL') as keyof typeof NotificationIcons;
            const IconComponent = NotificationIcons[iconKey];
            const colorClass = NotificationColors[iconKey];

            return (
              <div
                key={notification.id}
                className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition flex gap-4 ${
                  !notification.read ? 'border-blue-300 bg-blue-50' : ''
                }`}
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                  <IconComponent className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className={`font-semibold ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </p>

                      <button
                        type="button"
                        onClick={() => handleOpenNotification(notification)}
                        className="text-sm text-gray-600 mt-1 text-left hover:text-gray-900"
                      >
                        {notification.message}
                      </button>

                      <p className="text-xs text-gray-500 mt-2">{formatDateTimeVnShort(notification.createdAt)}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notification.read && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                      <div className="flex gap-2">
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                            title="Danh dau da doc"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                          title="Xoa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {notification.bookingId && (
                    <Link href={`/tickets/${notification.bookingId}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-3 inline-block">
                      Xem chi tiet 
                    </Link>
                  )}
                </div>
              </div>
            );
          })}

          <div ref={sentinelRef} className="h-4" />
          {loading && page > 1 && <p className="text-sm text-gray-500 text-center py-2">Dang tai them...</p>}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-600 mb-4">Khong co thong bao</p>
          <p className="text-sm text-gray-500 mb-6">
            {activeTab === 'all'
              ? 'Ban da xem het thong bao.'
              : 'Khong co thong bao cho nhom nay.'}
          </p>
          <Link href="/">
            <Button>Ve trang chu</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
