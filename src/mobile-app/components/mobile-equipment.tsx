'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  ChevronRight,
  Wrench,
  MonitorSmartphone,
  MapPin,
  Loader2,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { useAppStore, useAuthStore } from '@/app-shell/store';
import { cn } from '@/core/utils/utils';
import type { EquipmentItem, EquipmentStatus, EquipmentCategory } from '@/core/types';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { ScrollArea, ScrollBar } from '@/shared/ui/scroll-area';
import { format } from 'date-fns';

// --- Constants ---

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'under_maintenance', label: 'Maintenance' },
] as const;

type StatusTabKey = (typeof STATUS_TABS)[number]['key'];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  inactive: 'bg-gray-400',
  under_maintenance: 'bg-amber-500',
  decommissioned: 'bg-red-500',
};

const STATUS_LABEL_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-300',
  under_maintenance: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  decommissioned: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const STATUS_HUMAN: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  under_maintenance: 'Under Maintenance',
  decommissioned: 'Decommissioned',
};

const CATEGORY_COLORS: Record<string, string> = {
  HVAC: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  Electrical: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  Plumbing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  Generator: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  Mechanical: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  FireProtection: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 400;

// --- Helpers ---

function formatStatusLabel(status: string): string {
  return STATUS_HUMAN[status] ?? status;
}

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-gray-400';
}

function getCategoryColorClass(category: string): string {
  return CATEGORY_COLORS[category] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-300';
}

// --- Skeleton ---

function EquipmentCardSkeleton() {
  return (
    <Card className="mx-4 mb-3 overflow-hidden border border-border/60">
      <CardContent className="flex items-start gap-3 p-4">
        <Skeleton className="mt-1.5 h-3 w-3 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3.5 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3.5 w-1/3" />
        </div>
        <Skeleton className="h-5 w-5 shrink-0" />
      </CardContent>
    </Card>
  );
}

// --- Main Component ---

export function MobileEquipment() {
  const setView = useAppStore((s) => s.setView);
  const token = useAuthStore((s) => s.token);

  const [activeTab, setActiveTab] = useState<StatusTabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // --- Debounce search input ---
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // --- Fetch data ---
  const fetchEquipment = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!token) return;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('page', String(pageNum));
        params.set('pageSize', String(PAGE_SIZE));
        if (activeTab !== 'all') {
          params.set('status', activeTab);
        }
        if (debouncedQuery.trim()) {
          params.set('search', debouncedQuery.trim());
        }

        const res = await fetch(`/api/equipment?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch equipment (${res.status})`);
        }

        const data = await res.json();

        const items: EquipmentItem[] = data.items ?? data.data ?? data.equipment ?? [];
        const count: number = data.total ?? data.totalCount ?? 0;

        if (append) {
          setEquipment((prev) => [...prev, ...items]);
        } else {
          setEquipment(items);
        }

        setTotalCount(count);
        setHasMore(items.length === PAGE_SIZE);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
        if (!append) {
          setEquipment([]);
          setTotalCount(0);
        }
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [token, activeTab, debouncedQuery],
  );

  // --- Reset & fetch when tab or search changes ---
  useEffect(() => {
    setPage(1);
    setEquipment([]);
    setHasMore(true);
    fetchEquipment(1, false);
  }, [activeTab, debouncedQuery, fetchEquipment]);

  // --- Infinite scroll observer ---
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (!hasMore || loading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchEquipment(nextPage, true);
        }
      },
      { threshold: 0.1, rootMargin: '200px' },
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, page, fetchEquipment]);

  // --- Handlers ---
  const handleTabChange = (tab: StatusTabKey) => {
    setActiveTab(tab);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleCardTap = (eq: EquipmentItem) => {
    setView('equipment-detail', { id: eq.id });
  };

  const handleBack = () => {
    setView('dashboard');
  };

  // --- Render ---
  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <button
          onClick={handleBack}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-accent"
          aria-label="Go back to dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Equipment</h1>
          {totalCount > 0 && (
            <Badge variant="secondary" className="font-medium tabular-nums">
              {totalCount}
            </Badge>
          )}
        </div>
      </header>

      {/* Search Bar */}
      <div className="border-b px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, asset #, brand, model..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="h-10 pl-9 pr-4"
          />
        </div>
      </div>

      {/* Status Tabs */}
      <ScrollArea className="w-full shrink-0 border-b">
        <div className="flex gap-1 px-4 py-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Content Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {/* Initial Loading Skeletons */}
        {initialLoading && (
          <div className="py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <EquipmentCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error State */}
        {!initialLoading && error && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <p className="text-sm font-medium text-foreground">Failed to load equipment</p>
            <p className="max-w-xs text-xs text-muted-foreground">{error}</p>
            <button
              onClick={() => fetchEquipment(1, false)}
              className="mt-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!initialLoading && !error && equipment.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <MonitorSmartphone className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No equipment found</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              {debouncedQuery.trim()
                ? `No results for "${debouncedQuery.trim()}". Try a different search term.`
                : activeTab !== 'all'
                  ? `No ${formatStatusLabel(activeTab).toLowerCase()} equipment at the moment.`
                  : 'Equipment will appear here once they are added to the system.'}
            </p>
          </div>
        )}

        {/* Equipment List */}
        {!initialLoading && !error && equipment.length > 0 && (
          <>
            {equipment.map((eq) => (
              <Card
                key={eq.id}
                className="mx-4 mb-3 cursor-pointer overflow-hidden border border-border/60 transition-colors active:bg-accent/50"
                onClick={() => handleCardTap(eq)}
                role="button"
                tabIndex={0}
                aria-label={`View details for ${eq.name}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardTap(eq);
                  }
                }}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  {/* Status Dot */}
                  <div className="mt-2 shrink-0">
                    <span
                      className={cn(
                        'inline-block h-3 w-3 rounded-full ring-2 ring-offset-2 ring-offset-background',
                        getStatusColor(eq.status),
                        eq.status === 'active' && 'ring-green-200 dark:ring-green-900',
                        eq.status === 'inactive' && 'ring-gray-200 dark:ring-gray-800',
                        eq.status === 'under_maintenance' && 'ring-amber-200 dark:ring-amber-900',
                        eq.status === 'decommissioned' && 'ring-red-200 dark:ring-red-900',
                      )}
                    />
                  </div>

                  {/* Main Content */}
                  <div className="min-w-0 flex-1">
                    {/* Name */}
                    <p className="truncate text-sm font-semibold text-foreground">{eq.name}</p>

                    {/* Asset Number */}
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {eq.assetNumber}
                    </p>

                    {/* Category Badge + Status Badge */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {eq.category && (
                        <Badge
                          variant="secondary"
                          className={cn('h-5 text-[11px] font-medium', getCategoryColorClass(eq.category))}
                        >
                          {eq.category}
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className={cn('h-5 text-[11px] font-medium', STATUS_LABEL_COLORS[eq.status] ?? '')}
                      >
                        {formatStatusLabel(eq.status)}
                      </Badge>
                    </div>

                    {/* Location */}
                    {eq.location && (
                      <div className="mt-2 flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate text-xs text-muted-foreground">{eq.location}</span>
                      </div>
                    )}

                    {/* Brand · Model */}
                    {(eq.brand || eq.model) && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {[eq.brand, eq.model].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>

                  {/* Right Side: Chevron + Counts */}
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60" />

                    {/* Complaint & Work Order Counts */}
                    <div className="flex flex-col items-end gap-0.5">
                      {eq._count && typeof eq._count.complaints === 'number' && eq._count.complaints > 0 && (
                        <span className="flex items-center gap-0.5 text-[11px] text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          {eq._count.complaints}
                        </span>
                      )}
                      {eq._count && typeof eq._count.workOrders === 'number' && eq._count.workOrders > 0 && (
                        <span className="flex items-center gap-0.5 text-[11px] text-blue-600 dark:text-blue-400">
                          <Wrench className="h-3 w-3" />
                          {eq._count.workOrders}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Infinite Scroll Sentinel */}
            <div ref={sentinelRef} className="h-4" />

            {/* Loading More Indicator */}
            {loading && !initialLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-xs text-muted-foreground">Loading more...</span>
              </div>
            )}

            {/* End of List */}
            {!hasMore && equipment.length > 0 && !loading && (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Showing all {equipment.length} equipment
                {totalCount > equipment.length ? ` of ${totalCount}` : ''}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}