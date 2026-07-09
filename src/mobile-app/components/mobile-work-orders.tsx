'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  ChevronRight,
  RotateCcw,
  Wrench,
  Loader2,
  Calendar,
  Clock,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { useAppStore, useAuthStore } from '@/app-shell/store';
import { cn } from '@/core/utils/utils';
import type { WorkOrderItem, WorkOrderStatus } from '@/core/types';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { ScrollArea, ScrollBar } from '@/shared/ui/scroll-area';
import { format } from 'date-fns';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS: { label: string; value: string | null }[] = [
  { label: 'All', value: null },
  { label: 'Pending', value: 'PENDING' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
];

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 400;
const PULL_THRESHOLD = 80;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusConfig: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  PENDING: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-400',
    label: 'Pending',
  },
  IN_PROGRESS: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    label: 'In Progress',
  },
  COMPLETED: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    label: 'Completed',
  },
  CANCELLED: {
    bg: 'bg-gray-100 dark:bg-gray-900/30',
    text: 'text-gray-600 dark:text-gray-400',
    label: 'Cancelled',
  },
};

const priorityConfig: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  critical: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    label: 'Critical',
  },
  high: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-400',
    label: 'High',
  },
  medium: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-400',
    label: 'Medium',
  },
  low: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    label: 'Low',
  },
};

const typeConfig: Record<
  string,
  { bg: string; text: string; label: string; icon: typeof Wrench }
> = {
  corrective: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    label: 'Corrective',
    icon: Wrench,
  },
  preventive: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    label: 'Preventive',
    icon: Clock,
  },
  emergency: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    label: 'Emergency',
    icon: AlertTriangle,
  },
};

function getStatusStyle(status: string) {
  return statusConfig[status] ?? statusConfig.PENDING;
}

function getPriorityStyle(priority: string) {
  return priorityConfig[priority] ?? priorityConfig.medium;
}

function getTypeStyle(type: string) {
  return typeConfig[type] ?? typeConfig.corrective;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MobileWorkOrders() {
  const setView = useAppStore((s) => s.setView);

  // State
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Pull-to-refresh
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when tab or search changes
  useEffect(() => {
    setPage(1);
    setWorkOrders([]);
  }, [activeTab, debouncedSearch]);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------
  const fetchWorkOrders = useCallback(
    async (
      currentPage: number,
      status: string | null,
      query: string,
      isRefresh = false,
    ) => {
      const token = localStorage.getItem('cmms_token');
      if (!token) return;

      if (isRefresh) {
        setRefreshing(true);
      } else if (currentPage === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const params = new URLSearchParams();
        params.set('page', String(currentPage));
        params.set('pageSize', String(PAGE_SIZE));
        if (status) params.set('status', status);
        if (query) params.set('search', query);

        const res = await fetch(`/api/work-orders?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) throw new Error('Failed to fetch work orders');

        const data = await res.json();
        const items: WorkOrderItem[] = data.items ?? data.data ?? data.workOrders ?? [];
        const totalCount: number = data.total ?? data.totalCount ?? 0;

        if (isRefresh || currentPage === 1) {
          setWorkOrders(items);
        } else {
          setWorkOrders((prev) => [...prev, ...items]);
        }

        setTotal(totalCount);
      } catch {
        // Silently handle – empty state will show
        if (isRefresh || currentPage === 1) {
          setWorkOrders([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [],
  );

  // Fetch on tab / search / page change
  useEffect(() => {
    fetchWorkOrders(page, activeTab, debouncedSearch);
  }, [page, activeTab, debouncedSearch, fetchWorkOrders]);

  // ---------------------------------------------------------------------------
  // Infinite scroll
  // ---------------------------------------------------------------------------
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 200;
    const hasMore = workOrders.length < total;

    if (nearBottom && hasMore && !loading && !loadingMore) {
      setPage((p) => p + 1);
    }
  }, [workOrders.length, total, loading, loadingMore]);

  // ---------------------------------------------------------------------------
  // Pull-to-refresh (touch)
  // ---------------------------------------------------------------------------
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (container.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta > 0) {
        setPullDistance(Math.min(delta * 0.5, PULL_THRESHOLD));
      }
    },
    [isPulling],
  );

  const handleTouchEnd = useCallback(() => {
    if (pullDistance >= PULL_THRESHOLD) {
      setPage(1);
      fetchWorkOrders(1, activeTab, debouncedSearch, true);
    }
    setPullDistance(0);
    setIsPulling(false);
  }, [pullDistance, activeTab, debouncedSearch, fetchWorkOrders]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const hasMore = workOrders.length < total;
  const showSkeleton = loading;
  const showEmpty = !loading && workOrders.length === 0;
  const showList = !loading && workOrders.length > 0;

  return (
    <div className="flex h-full flex-col bg-background">
      {/* ---- Header ---- */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background px-4 py-3">
        <button
          onClick={() => setView('dashboard')}
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex flex-1 items-center gap-2">
          <h1 className="text-lg font-semibold">Work Orders</h1>
          {!loading && (
            <Badge
              variant="secondary"
              className="h-5 min-w-5 justify-center rounded-full px-1.5 text-xs"
            >
              {total}
            </Badge>
          )}
        </div>
      </header>

      {/* ---- Search ---- */}
      <div className="border-b px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search work orders…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* ---- Tabs ---- */}
      <ScrollArea className="shrink-0">
        <div className="flex gap-1 px-4 py-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value ?? 'all'}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* ---- Pull-to-refresh indicator ---- */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: pullDistance }}
      >
        {pullDistance > 0 && (
          <RotateCcw
            className={cn(
              'h-5 w-5 text-muted-foreground transition-transform',
              pullDistance >= PULL_THRESHOLD && 'animate-spin',
            )}
          />
        )}
      </div>

      {/* ---- Content ---- */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea
          className="h-full"
          onScrollCapture={handleScroll}
          ref={scrollContainerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="space-y-3 p-4">
            {/* Loading skeletons */}
            {showSkeleton &&
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={`skeleton-${i}`} className="overflow-hidden">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-20 rounded-full" />
                      <Skeleton className="h-4 w-20 rounded-full" />
                      <Skeleton className="h-4 w-24 rounded-full" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              ))}

            {/* Empty state */}
            {showEmpty && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Wrench className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    No work orders found
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {debouncedSearch
                      ? `No results for "${debouncedSearch}". Try a different search.`
                      : activeTab
                        ? `No ${statusConfig[activeTab]?.label?.toLowerCase() ?? ''} work orders yet.`
                        : 'Work orders will appear here once they are created.'}
                  </p>
                </div>
              </div>
            )}

            {/* Work order cards */}
            {showList &&
              workOrders.map((wo) => {
                const sStyle = getStatusStyle(wo.status);
                const pStyle = getPriorityStyle(wo.priority);
                const tStyle = getTypeStyle(wo.type);
                const TypeIcon = tStyle.icon;

                return (
                  <Card
                    key={wo.id}
                    className="cursor-pointer overflow-hidden transition-colors hover:bg-accent/50 active:bg-accent"
                    onClick={() =>
                      setView('work-order-detail', { id: wo.id })
                    }
                    role="button"
                    tabIndex={0}
                    aria-label={`View work order: ${wo.title}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setView('work-order-detail', { id: wo.id });
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      {/* Row 1: Title + Status */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-1 text-sm font-semibold leading-snug">
                          {wo.title}
                        </h3>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'shrink-0 rounded-full text-[11px] font-medium',
                            sStyle.bg,
                            sStyle.text,
                          )}
                        >
                          {sStyle.label}
                        </Badge>
                      </div>

                      {/* Row 2: Equipment */}
                      {wo.equipmentName && (
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                          {wo.equipmentName}
                        </p>
                      )}

                      {/* Row 3: Badges */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {/* Type badge */}
                        <Badge
                          variant="secondary"
                          className={cn(
                            'gap-1 rounded-full text-[11px] font-medium',
                            tStyle.bg,
                            tStyle.text,
                          )}
                        >
                          <TypeIcon className="h-3 w-3" />
                          {tStyle.label}
                        </Badge>

                        {/* Priority badge */}
                        <Badge
                          variant="secondary"
                          className={cn(
                            'rounded-full text-[11px] font-medium',
                            pStyle.bg,
                            pStyle.text,
                          )}
                        >
                          {pStyle.label}
                        </Badge>
                      </div>

                      {/* Row 4: Meta info */}
                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {wo.assignedToName && (
                            <span className="flex items-center gap-1">
                              <Wrench className="h-3 w-3" />
                              <span className="line-clamp-1 max-w-24">
                                {wo.assignedToName}
                              </span>
                            </span>
                          )}
                          {wo.scheduledDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(wo.scheduledDate), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

            {/* Load more indicator */}
            {loadingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading more…
                </span>
              </div>
            )}

            {/* Refreshing indicator */}
            {refreshing && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Refreshing…
                </span>
              </div>
            )}

            {/* End of list */}
            {!hasMore && showList && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                You&apos;ve reached the end of the list
              </p>
            )}
          </div>
          <ScrollBar />
        </ScrollArea>
      </div>
    </div>
  );
}