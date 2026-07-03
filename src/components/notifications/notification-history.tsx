'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, X, CheckCheck, Trash2, Search, Filter,
  CheckCircle2, XCircle, AlertTriangle, Info, Clock,
} from 'lucide-react';
import { useNotificationStore } from '@/lib/notifications/store';
import { NOTIFICATION_CONFIG } from '@/lib/notifications/types';
import type { NotificationType } from '@/lib/notifications/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const TYPE_ICON: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Clock,
  progress: Clock,
};

export function NotificationHistoryPanel() {
  const { history, markRead, markAllRead, clearHistory, settings } = useNotificationStore();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
  const [open, setOpen] = useState(false);

  const unreadCount = history.filter((n) => !n.read).length;

  const filtered = useMemo(() => {
    let items = [...history].reverse(); // newest first
    if (filterType !== 'all') items = items.filter((n) => n.type === filterType);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (n) => n.title.toLowerCase().includes(q) || n.description?.toLowerCase().includes(q)
      );
    }
    return items.slice(0, 50); // limit display
  }, [history, filterType, search]);

  // Mark as read when panel opens
  useEffect(() => {
    if (open && unreadCount > 0) {
      markAllRead();
    }
  }, [open, unreadCount, markAllRead]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
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
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                onClick={clearHistory}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Search & Filter */}
        {history.length > 5 && (
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
        <ScrollArea className="h-80">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-xs">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((n) => {
                const cfg = NOTIFICATION_CONFIG[n.type];
                const Icon = TYPE_ICON[n.type] || Info;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'flex items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]',
                      !n.read && 'bg-emerald-50/30 dark:bg-emerald-900/10'
                    )}
                  >
                    <div className={cn('rounded-md p-1 flex-shrink-0 mt-0.5', cfg.iconBgClass)}>
                      <Icon className={cn('h-3.5 w-3.5', cfg.textClass)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-tight truncate">{n.title}</p>
                      {n.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{n.description}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatTime(n.createdAt)}
                        {n.module && ` · ${n.module}`}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-2" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {history.length > 50 && (
          <div className="px-3 py-2 border-t text-center">
            <p className="text-[10px] text-muted-foreground">
              Showing 50 of {history.length} notifications
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}