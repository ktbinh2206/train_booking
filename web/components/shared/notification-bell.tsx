'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from '@/lib/api';
import { getStoredAccessToken } from '@/lib/auth-storage';
import type { Notification } from '@/lib/types';
import { formatDateTimeVnShort } from '@/lib/utils';

type NotificationSseMessage = {
  type: 'NOTIFICATION' | 'CONNECTED';
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
const PAGE_SIZE = 10;

export function NotificationBell() {
  const router = useRouter();

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const canLoadMore = useMemo(() => page < totalPages, [page, totalPages]);

  // ================= LOAD PAGE =================
  const loadPage = async (targetPage: number) => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await listNotifications({ page: targetPage, pageSize: PAGE_SIZE });

      setTotalPages(response.totalPages);
      setUnreadCount(response.unreadCount);
      setPage(targetPage);

      setItems((prev) => {
        if (targetPage === 1) return response.data;

        const merged = [...prev, ...response.data];
        const map = new Map(merged.map((i) => [i.id, i]));
        return Array.from(map.values());
      });
    } finally {
      setLoading(false);
    }
  };

  // ================= INIT =================
  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const [count] = await Promise.all([
          getUnreadNotificationCount(),
          loadPage(1)
        ]);

        if (active) {
          setUnreadCount(count.unreadCount);
        }
      } catch {
        if (active) setUnreadCount(0);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, []);

  // ================= SSE =================
  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) return;

    const url = new URL('/api/sse/notifications', API_BASE_URL);
    url.searchParams.set('token', token);

    const eventSource = new EventSource(url.toString());

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as NotificationSseMessage;

        if (parsed.type !== 'NOTIFICATION' || !parsed.payload) return;

        const incoming: Notification = {
          id: parsed.payload.id,
          userId: '',
          bookingId: parsed.payload.bookingId,
          type: parsed.payload.type,
          title: parsed.payload.title,
          message: parsed.payload.message,
          read: parsed.payload.read,
          createdAt: parsed.payload.createdAt,
          actionUrl: parsed.payload.bookingId
            ? `/tickets/${parsed.payload.bookingId}`
            : undefined
        };

        setItems((prev) => {
          if (prev.some((i) => i.id === incoming.id)) return prev;
          return [incoming, ...prev];
        });

        if (!incoming.read) {
          setUnreadCount((prev) => prev + 1);
        }
      } catch { }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // ================= CLICK OUTSIDE =================
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) return;

      if (!wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // ================= ESC CLOSE =================
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  // ================= SCROLL LOAD MORE =================
  const onScroll = async () => {
    if (!listRef.current || loading || !canLoadMore) return;

    const { scrollTop, clientHeight, scrollHeight } = listRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 24) {
      await loadPage(page + 1);
    }
  };

  // ================= ACTIONS =================
  const handleMarkRead = async (id: string) => {
    const result = await markNotificationRead(id) as { unreadCount?: number };

    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, read: true } : i))
    );

    if (typeof result.unreadCount === 'number') {
      setUnreadCount(result.unreadCount);
    } else {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleMarkAll = async () => {
    const result = await markAllNotificationsRead();

    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    setUnreadCount(result.unreadCount);
  };

  const handleOpenNotification = async (n: Notification) => {
    if (!n.read) await handleMarkRead(n.id);

    setIsOpen(false);

    if (n.bookingId) {
      router.push(`/tickets/${n.bookingId}`);
    } else {
      router.push('/notifications');
    }
  };

  // ================= UI =================
  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className="relative inline-flex items-center justify-center p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
      >
        <Bell className="w-5 h-5" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[11px] leading-[18px] font-semibold text-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 mt-2 w-[360px] bg-white border border-gray-200 rounded-xl shadow-xl z-50"
        >
          {/* HEADER */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <p className="font-semibold">Thông báo</p>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAll}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Đọc tất cả
            </Button>
          </div>

          {/* LIST */}
          <div
            ref={listRef}
            onScroll={onScroll}
            className="max-h-96 overflow-y-auto"
          >
            {items.length === 0 && (
              <div className="px-4 py-8 text-sm text-center text-gray-500">
                Không có thông báo
              </div>
            )}

            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleOpenNotification(item)}
                className="w-full text-left px-4 py-3 border-b hover:bg-gray-50"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-blue-700 uppercase">
                      {item.title}
                    </p>
                    <p className="text-sm mt-1">{item.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDateTimeVnShort(item.createdAt)}
                    </p>
                  </div>

                  {!item.read && (
                    <span className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                  )}
                </div>
              </button>
            ))}

            {loading && (
              <div className="px-4 py-3 text-xs text-gray-500">
                Đang tải...
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="px-4 py-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setIsOpen(false);
                router.push('/notifications');
              }}
            >
              Xem tất cả
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}