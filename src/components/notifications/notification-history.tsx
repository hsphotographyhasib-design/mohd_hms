'use client';

import React, { useState, useMemo } from 'react';
import {
  Bell, Trash2, Search,
  CheckCircle2, XCircle, AlertTriangle, Info, Clock,
  Wifi, WifiOff, Zap, Settings, Loader2,
} from 'lucide-react';
import { useNotificationStore } from '@/lib/notifications/store';
import { NOTIFICATION_CONFIG } from '@/lib/notifications/types';
import type { NotificationType } from '@/lib/notifications/types';
import { useFcm } from '@/hooks/use-fcm';
import { useAuthStore } from '@/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAppStore } from '@/store';

const TYPE_ICON: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Clock,
  progress: Clock,
};

export function NotificationHistoryPanel() {
  const { dbNotifications, unreadCount, markAllAsRead, settings, fetchNotifications } = useNotificationStore();
  const setView = useAppStore((s) => s.setView);
  const { user } = useAuthStore();
  const { isSupported, isRegistered, permissionStatus } = useFcm();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  // Fetch notifications when popover opens
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen && dbNotifications.length === 0) {
      fetchNotifications();
    }
  };

  const filtered = useMemo(() => {
    let items = [...dbNotifications].reverse(); // newest first
    if (filterType !== 'all') items = items.filter((n) => n.type === filterType);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (n) => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
      );
    }
    return items.slice(0, 50);
  }, [dbNotifications, filterType, search]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString();
  };

  const handleClick = (n: typeof dbNotifications[0]) => {
    if (n.actionUrl) {
      setView(n.actionUrl as Parameters<typeof setView>[0], n.relatedEntityId ? { id: n.relatedEntityId } : {});
      setOpen(false);
    } else if (n.relatedEntityType && n.relatedEntityId) {
      const viewMap: Record<string, string> = {
        complaint: 'complaint-detail',
        work_order: 'work-order-detail',
        invoice: 'invoice-detail',
        equipment: 'equipment-detail',
        quotation: 'quotation-detail',
      };
      const view = viewMap[n.relatedEntityType];
      if (view) {
        setView(view as Parameters<typeof setView>[0], { id: n.relatedEntityId });
        setOpen(false);
      }
    }
  };

  const handleTestNotification = async () => {
    setSendingTest(true);
    setTestResult('idle');
    try {
      const token = localStorage.getItem('cmms_token');
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      setTestResult(data.success ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setSendingTest(false);
      setTimeout(() => setTestResult('idle'), 3000);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <span className={cn(
              'absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white',
              'bg-rose-500 animate-in zoom-in-50 duration-200'
            )}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-96 max-w-[calc(100vw-2rem)] p-0 rounded-xl shadow-xl border bg-popover"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                onClick={() => markAllAsRead()}
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* FCM Push Status */}
        {isSupported && (
          <div className="px-3 py-2 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              {permissionStatus === 'granted' ? (
                <Wifi className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="text-[11px] text-muted-foreground">
                {permissionStatus === 'granted'
                  ? isRegistered
                    ? 'Push notifications active'
                    : 'Registering push device...'
                  : permissionStatus === 'denied'
                    ? 'Push notifications blocked by browser'
                    : 'Push notifications not enabled'
                }
              </span>
            </div>
          </div>
        )}

        {/* Search & Filter */}
        {dbNotifications.length > 5 && (
          <div className="px-3 py-2 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {(['all', 'success', 'error', 'warning', 'info'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={cn(
                    'flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors',
                    filterType === t
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-black/5 text-muted-foreground hover:bg-black/10 dark:bg-white/5'
                  )}
                >
                  {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* List */}
        <ScrollArea className="h-72">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-xs font-medium">No notifications</p>
              <p className="text-[11px] mt-0.5 opacity-60">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((n) => {
                const mappedType = n.type === 'error' ? 'error' : n.type === 'warning' ? 'warning' : n.type === 'success' ? 'success' : 'info';
                const cfg = NOTIFICATION_CONFIG[mappedType as NotificationType] || NOTIFICATION_CONFIG.info;
                const Icon = TYPE_ICON[mappedType as NotificationType] || Info;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={cn(
                      'flex items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer',
                      !n.isRead && 'bg-emerald-50/30 dark:bg-emerald-900/10'
                    )}
                  >
                    <div className={cn('rounded-md p-1 flex-shrink-0 mt-0.5', cfg.iconBgClass)}>
                      <Icon className={cn('h-3.5 w-3.5', cfg.textClass)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-tight truncate">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatTime(n.createdAt)}
                      </p>
                    </div>
                    {!n.isRead && (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-2" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t">
          {/* Admin test notification */}
          {isAdmin && (
            <div className="px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTestNotification}
                disabled={sendingTest}
                className="w-full justify-start gap-2 h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                {sendingTest ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : testResult === 'success' ? (
                  <span className="text-emerald-500">✓</span>
                ) : testResult === 'error' ? (
                  <span className="text-rose-500">✗</span>
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}
                {testResult === 'success'
                  ? 'Test notification sent!'
                  : testResult === 'error'
                    ? 'Failed to send test'
                    : 'Send Test Notification'
                }
              </Button>
            </div>
          )}

          <Separator />

          <div className="px-3 py-2 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => { setView('notifications'); setOpen(false); }}
            >
              View all notifications
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => { setView('settings'); setOpen(false); }}
            >
              <Settings className="h-3.5 w-3.5 mr-1" />
              Settings
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}