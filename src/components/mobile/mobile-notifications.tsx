'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  ArrowLeft,
  CheckCheck,
  AlertTriangle,
  Wrench,
  Receipt,
  Settings,
  Clock,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, useAuthStore, useNotificationStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import type { NotificationItem, AppView } from '@/types';

// ─── Constants ──────────────────────────────────────────────

type NotificationCategory = 'complaint' | 'work_order' | 'invoice' | 'system' | 'general';

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  complaint: { icon: AlertTriangle, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Complaint' },
  work_order: { icon: Wrench, color: 'text-emerald-600', bgColor: 'bg-emerald-100', label: 'Work Order' },
  invoice: { icon: Receipt, color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'Invoice' },
  system: { icon: Settings, color: 'text-gray-500', bgColor: 'bg-gray-100', label: 'System' },
  general: { icon: Bell, color: 'text-gray-500', bgColor: 'bg-gray-100', label: 'General' },
};

const CATEGORY_ORDER: string[] = ['complaint', 'work_order', 'invoice', 'system', 'general'];

function getCategoryConfig(type: string) {
  // Map notification types to categories
  const t = (type || '').toLowerCase();
  if (t.includes('complaint') || t.includes('cmp')) return CATEGORY_CONFIG.complaint;
  if (t.includes('work_order') || t.includes('work-order') || t.includes('wo')) return CATEGORY_CONFIG.work_order;
  if (t.includes('invoice') || t.includes('inv') || t.includes('payment')) return CATEGORY_CONFIG.invoice;
  return CATEGORY_CONFIG.system;
}

function getCategoryFromType(type: string): string {
  const t = (type || '').toLowerCase();
  if (t.includes('complaint') || t.includes('cmp')) return 'complaint';
  if (t.includes('work_order') || t.includes('work-order') || t.includes('wo')) return 'work_order';
  if (t.includes('invoice') || t.includes('inv') || t.includes('payment')) return 'invoice';
  if (t.includes('system') || t.includes('maintenance') || t.includes('update')) return 'system';
  return 'general';
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

// ─── Notification Skeleton ──────────────────────────────────

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <Skeleton className="size-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────

export function MobileNotifications() {
  const { setView } = useAppStore();
  const { token } = useAuthStore();
  const { setNotifications, setUnreadCount, markAllAsRead, markAsRead } = useNotificationStore();

  const [notifications, setLocalNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/notifications?page=1&pageSize=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load notifications');
      const json = await res.json();
      const items: NotificationItem[] = json.data || [];
      setLocalNotifications(items);
      setNotifications(items);
      if (typeof json.unreadCount === 'number') {
        setUnreadCount(json.unreadCount);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [token, setNotifications, setUnreadCount]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark single as read
  const handleMarkRead = useCallback(async (notif: NotificationItem) => {
    if (notif.isRead || !token) return;
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: notif.id }),
      });
      setLocalNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
      );
      markAsRead(notif.id);
    } catch {
      // Silent fail — user can still read
    }
  }, [token, markAsRead]);

  // Mark all as read
  const handleMarkAllRead = useCallback(async () => {
    if (!token || markingAll) return;
    setMarkingAll(true);
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ markAllRead: true }),
      });
      setLocalNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      markAllAsRead();
    } catch {
      // Silent fail
    } finally {
      setMarkingAll(false);
    }
  }, [token, markingAll, markAllAsRead]);

  // Group notifications by category
  const grouped = notifications.reduce<Record<string, NotificationItem[]>>((acc, notif) => {
    const cat = getCategoryFromType(notif.type);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(notif);
    return acc;
  }, {});

  // Sort groups by CATEGORY_ORDER
  const sortedGroups = Object.entries(grouped).sort(
    ([a], [b]) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b),
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Handle notification tap — navigate if related entity exists
  const handleNotifTap = (notif: NotificationItem) => {
    handleMarkRead(notif);
    if (!notif.relatedEntityType || !notif.relatedEntityId) return;
    const map: Record<string, string> = {
      complaint: 'complaint-detail',
      work_order: 'work-order-detail',
      invoice: 'invoice-detail',
      equipment: 'equipment-detail',
    };
    const view = map[notif.relatedEntityType];
    if (view) {
      setView(view as AppView, { id: notif.relatedEntityId });
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="size-9 -ml-1" onClick={() => setView('dashboard')} aria-label="Back">
              <ArrowLeft className="size-5 text-gray-600" />
            </Button>
            <h1 className="text-lg font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <span className="flex items-center justify-center size-5 rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 gap-1.5"
              onClick={handleMarkAllRead}
              disabled={markingAll}
            >
              {markingAll ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCheck className="size-3.5" />
              )}
              Mark all read
            </Button>
          )}
        </div>
      </header>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto">
        {error ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-red-50">
              <Bell className="size-7 text-red-400" />
            </div>
            <p className="text-sm font-medium text-red-600">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchNotifications}>
              <RefreshCw className="size-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        ) : loading ? (
          <div className="bg-white mt-3 mx-4 rounded-xl">
            {Array.from({ length: 6 }).map((_, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Separator />}
                <NotificationSkeleton />
              </React.Fragment>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-gray-100">
              <Bell className="size-7 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">No notifications</p>
            <p className="mt-1 text-xs text-gray-400">You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="mt-3 mx-4 space-y-3 pb-4">
            {sortedGroups.map(([category, items]) => {
              const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general;
              const Icon = config.icon;

              return (
                <div key={category} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                  {/* Category header */}
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50/70 border-b border-gray-100">
                    <div className={cn('flex size-6 items-center justify-center rounded-md', config.bgColor)}>
                      <Icon className={cn('size-3.5', config.color)} />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {config.label}
                    </span>
                    <span className="ml-auto text-[10px] text-gray-400">
                      {items.length} item{items.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Items */}
                  {items.map((notif, idx) => {
                    const catCfg = getCategoryConfig(notif.type);
                    const CatIcon = catCfg.icon;

                    return (
                      <React.Fragment key={notif.id}>
                        {idx > 0 && <Separator className="opacity-50" />}
                        <button
                          onClick={() => handleNotifTap(notif)}
                          className={cn(
                            'flex items-start gap-3 w-full px-4 py-3.5 text-left transition-colors active:bg-gray-50',
                            !notif.isRead && 'bg-emerald-50/40',
                          )}
                        >
                          {/* Category icon */}
                          <div className={cn('flex size-9 items-center justify-center rounded-full shrink-0 mt-0.5', catCfg.bgColor)}>
                            <CatIcon className={cn('size-4', catCfg.color)} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className={cn(
                                'text-sm leading-snug',
                                !notif.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700',
                              )}>
                                {notif.title}
                              </h3>
                              {/* Unread dot */}
                              {!notif.isRead && (
                                <span className="mt-1.5 size-2 rounded-full bg-blue-500 shrink-0" />
                              )}
                            </div>
                            <p className={cn(
                              'mt-0.5 text-xs leading-relaxed line-clamp-2',
                              !notif.isRead ? 'text-gray-600' : 'text-gray-400',
                            )}>
                              {notif.message}
                            </p>
                            <div className="flex items-center gap-1 mt-1.5">
                              <Clock className="size-3 text-gray-400" />
                              <span className="text-[11px] text-gray-400">{timeAgo(notif.createdAt)}</span>
                            </div>
                          </div>
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

