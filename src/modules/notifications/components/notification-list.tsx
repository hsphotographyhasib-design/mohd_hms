'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { Bell, Info, CalendarClock, DollarSign, MapPin, CheckCheck, Loader2 } from 'lucide-react';
import { useNotificationStore } from '@/modules/notifications/services/store';
import { useAppStore } from '@/app-shell/store';
import type { NotificationItem } from '@/modules/notifications/services/store';

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''} ago`;
}

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case 'status_update': return <Info className="h-5 w-5 text-sky-500" />;
    case 'pm_reminder': return <CalendarClock className="h-5 w-5 text-amber-500" />;
    case 'invoice_reminder': return <DollarSign className="h-5 w-5 text-emerald-500" />;
    case 'eta_update': return <MapPin className="h-5 w-5 text-rose-500" />;
    default: return <Bell className="h-5 w-5 text-gray-400" />;
  }
}

export function NotificationList() {
  const setView = useAppStore((s) => s.setView);
  const { dbNotifications, fetchNotifications, markAsRead, markAllAsRead, deleteNotification, isLoading } = useNotificationStore();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllAsRead();
    } finally {
      setMarkingAll(false);
    }
  };

  const handleClick = (n: NotificationItem) => {
    if (!n.isRead) markAsRead(n.id);
    if (n.actionUrl) {
      setView(n.actionUrl as Parameters<typeof setView>[0], n.relatedEntityId ? { id: n.relatedEntityId } : {});
    } else if (n.relatedEntityType && n.relatedEntityId) {
      const viewMap: Record<string, string> = {
        complaint: 'complaint-detail',
        work_order: 'work-order-detail',
        invoice: 'invoice-detail',
      };
      const view = viewMap[n.relatedEntityType];
      if (view) {
        setView(view as 'complaint-detail', { id: n.relatedEntityId });
      }
    }
  };

  const filtered = filter === 'unread'
    ? dbNotifications.filter((n) => !n.isRead)
    : dbNotifications;

  const unreadLocalCount = dbNotifications.filter((n) => !n.isRead).length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Bell className="h-5 w-5 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadLocalCount > 0 && (
            <span className="bg-rose-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
              {unreadLocalCount}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          onClick={handleMarkAllRead}
          disabled={markingAll || unreadLocalCount === 0}
        >
          {markingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCheck className="h-4 w-4 mr-2" />}
          Mark All Read
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
        >
          All ({dbNotifications.length})
        </Button>
        <Button
          variant={filter === 'unread' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('unread')}
          className={filter === 'unread' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
        >
          Unread ({unreadLocalCount})
        </Button>
      </div>

      {/* Notification List */}
      <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-muted-foreground font-medium">No notifications</p>
            <p className="text-sm text-muted-foreground mt-1">
              {filter === 'unread' ? 'All caught up!' : 'Notifications will appear here'}
            </p>
          </div>
        ) : (
          filtered.map((n) => (
            <Card
              key={n.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 border-l-4 ${
                !n.isRead ? 'border-l-emerald-500 bg-emerald-50/5' : 'border-l-transparent'
              }`}
              onClick={() => handleClick(n)}
            >
              <CardContent className="p-4 flex gap-3">
                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  !n.isRead ? 'bg-emerald-100' : 'bg-gray-100'
                }`}>
                  <NotificationIcon type={n.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${!n.isRead ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{relativeTime(n.createdAt)}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}