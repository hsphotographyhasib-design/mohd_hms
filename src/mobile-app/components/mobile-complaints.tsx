'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ChevronRight, RotateCcw, AlertTriangle } from 'lucide-react';
import { useAppStore, useAuthStore } from '@/app-shell/store';
import { cn } from '@/core/utils/utils';
import { format } from 'date-fns';
import type { ComplaintItem, ComplaintStatus } from '@/core/types';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { ScrollArea, ScrollBar } from '@/shared/ui/scroll-area';

// ============ STATUS CONFIG ============

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'NEW', label: 'Open' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'PAID', label: 'Completed' },
  { key: 'CLOSED', label: 'Closed' },
] as const;

const STATUS_DOT_COLOR: Record<string, string> = {
  NEW: 'bg-red-500',
  ASSIGNED: 'bg-orange-500',
  ACCEPTED: 'bg-cyan-500',
  WORK_ORDER_CREATED: 'bg-indigo-500',
  IN_PROGRESS: 'bg-blue-500',
  WAITING_CLIENT_CONFIRMATION: 'bg-orange-400',
  CLIENT_CONFIRMED: 'bg-emerald-500',
  DRAFT_INVOICE: 'bg-violet-500',
  INVOICE_APPROVED: 'bg-purple-500',
  INVOICE_SENT: 'bg-sky-500',
  PAID: 'bg-green-500',
  CLOSED: 'bg-gray-400',
  REWORK_REQUIRED: 'bg-rose-500',
};

const STATUS_DISPLAY: Record<string, string> = {
  NEW: 'Open',
  ASSIGNED: 'Assigned',
  ACCEPTED: 'Accepted',
  WORK_ORDER_CREATED: 'WO Created',
  IN_PROGRESS: 'In Progress',
  WAITING_CLIENT_CONFIRMATION: 'Confirmation',
  CLIENT_CONFIRMED: 'Confirmed',
  DRAFT_INVOICE: 'Draft Invoice',
  INVOICE_APPROVED: 'Inv. Approved',
  INVOICE_SENT: 'Inv. Sent',
  PAID: 'Paid',
  CLOSED: 'Closed',
  REWORK_REQUIRED: 'Rework',
};

// ============ COMPONENT ============

export function MobileComplaints() {
  const { setView, viewParams } = useAppStore();
  const { token } = useAuthStore();

  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(viewParams?.status || '');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageSize = 20;

  // Fetch complaints
  const fetchComplaints = useCallback(
    async (pageNum: number, append = false, searchQuery = search, statusFilter = activeTab) => {
      if (!token) return;

      const isFirstPage = pageNum === 1;
      if (isFirstPage) {
        if (refreshing) return; // already refreshing
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          pageSize: String(pageSize),
        });
        if (searchQuery) params.set('search', searchQuery);
        if (statusFilter) params.set('status', statusFilter);

        const res = await fetch(`/api/complaints?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('Failed to fetch complaints');

        const json = await res.json();
        const items: ComplaintItem[] = json.data || [];

        if (append) {
          setComplaints((prev) => [...prev, ...items]);
        } else {
          setComplaints(items);
        }

        setTotal(json.total || 0);
        setHasMore(json.page < json.totalPages);
        setPage(pageNum);
      } catch (err) {
        if (!append) {
          setComplaints([]);
          setFetchError(err instanceof Error ? err.message : 'Failed to load complaints');
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [token, search, activeTab, refreshing],
  );

  // Initial load
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchComplaints(1, false);
  }, [activeTab, fetchComplaints]);

  // Search debounce
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setPage(1);
      setHasMore(true);
      fetchComplaints(1, false, search, activeTab);
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search, fetchComplaints, activeTab]);

  // Pull-to-refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    fetchComplaints(1, false);
  }, [fetchComplaints]);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || loading || loadingMore || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight - scrollTop - clientHeight < 120) {
      fetchComplaints(page + 1, true);
    }
  }, [loading, loadingMore, hasMore, page, fetchComplaints]);

  // Navigate to detail
  const handleCardTap = useCallback(
    (id: string) => {
      setView('complaint-detail', { id });
    },
    [setView],
  );

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  // Touch-based pull-to-refresh
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const el = scrollContainerRef.current;
    if (!el || el.scrollTop > 0) return;
    touchStartY.current = e.touches[0].clientY;
    isPulling.current = true;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isPulling.current) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (deltaY > 80) {
      handleRefresh();
    }
    isPulling.current = false;
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900">My Complaints</h1>
          {total > 0 && (
            <Badge variant="secondary" className="text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
              {total} total
            </Badge>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search complaints..."
            className="h-10 pl-9 pr-9 rounded-xl bg-gray-50 border-gray-200 text-sm focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <span className="text-xs font-medium">✕</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b border-gray-100">
        <ScrollArea className="w-full">
          <div className="flex gap-2 px-4 py-2.5" role="tablist">
            {STATUS_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const count = tab.key === '' ? total : complaints.filter((c) => c.status === tab.key).length;
              return (
                <button
                  key={tab.key || 'all'}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setPage(1);
                    setHasMore(true);
                  }}
                  className={cn(
                    'relative flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-200',
                  )}
                >
                  {tab.label}
                  {!loading && count > 0 && (
                    <span
                      className={cn(
                        'inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full px-1 text-[10px] font-bold leading-none',
                        isActive ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-500',
                      )}
                    >
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="h-1" />
        </ScrollArea>
      </div>

      {/* Refresh Indicator */}
      {refreshing && (
        <div className="flex items-center justify-center gap-2 py-2.5 bg-white border-b border-gray-50">
          <RotateCcw className="size-3.5 text-emerald-600 animate-spin" />
          <span className="text-xs font-medium text-emerald-600">Refreshing...</span>
        </div>
      )}

      {/* Complaints List */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-y-auto"
      >
        <div className="p-3 space-y-2">
          {/* Loading skeletons */}
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={`skeleton-${i}`} className="border-gray-100 shadow-none">
                <CardContent className="flex items-center gap-3 p-3">
                  <Skeleton className="size-3 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                  </div>
                  <Skeleton className="size-4" />
                </CardContent>
              </Card>
            ))}

          {/* Error state */}
          {!loading && fetchError && complaints.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-red-50 mb-4">
                <AlertTriangle className="size-8 text-red-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-700 mb-1">Failed to load</h3>
              <p className="text-sm text-red-500 max-w-[240px] mb-4">{fetchError}</p>
              <button
                onClick={() => fetchComplaints(1, false)}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg active:bg-emerald-700"
              >
                <RotateCcw className="size-4 inline mr-1.5" />Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !fetchError && complaints.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-gray-100 mb-4">
                <AlertTriangle className="size-8 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-700 mb-1">
                {search ? 'No results found' : 'No complaints yet'}
              </h3>
              <p className="text-sm text-gray-400 max-w-[240px]">
                {search
                  ? `No complaints match "${search}". Try a different search.`
                  : 'Tap + to create your first complaint.'}
              </p>
            </div>
          )}

          {/* Complaint cards */}
          {!loading &&
            complaints.map((complaint) => {
              const dotColor = STATUS_DOT_COLOR[complaint.status] || 'bg-gray-400';
              const statusLabel = STATUS_DISPLAY[complaint.status] || complaint.status;

              return (
                <Card
                  key={complaint.id}
                  className="border-gray-100 shadow-none active:bg-gray-50 transition-colors cursor-pointer hover:bg-gray-50/50"
                  onClick={() => handleCardTap(complaint.id)}
                >
                  <CardContent className="flex items-center gap-3 p-3.5">
                    {/* Status dot */}
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <div className={cn('size-3 rounded-full shrink-0', dotColor)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate leading-tight">
                        {complaint.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {complaint.customerName && (
                          <span className="text-xs text-gray-500 truncate">
                            {complaint.customerName}
                          </span>
                        )}
                        {complaint.category && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="text-xs text-gray-500 truncate">
                              {complaint.category}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-gray-400">
                          {formatDate(complaint.createdAt)}
                        </span>
                        <Badge
                          variant="outline"
                          className="h-5 px-1.5 text-[10px] font-medium border-gray-200 text-gray-500"
                        >
                          {statusLabel}
                        </Badge>
                      </div>
                    </div>

                    {/* Chevron */}
                    <ChevronRight className="size-4 text-gray-300 shrink-0" />
                  </CardContent>
                </Card>
              );
            })}

          {/* Loading more indicator */}
          {loadingMore && (
            <div className="flex items-center justify-center gap-2 py-4">
              <div className="size-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium text-gray-500">Loading more...</span>
            </div>
          )}

          {/* End of list indicator */}
          {!loading && !loadingMore && complaints.length > 0 && !hasMore && (
            <div className="text-center py-6">
              <span className="text-xs text-gray-400">
                Showing all {complaints.length} complaints
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}