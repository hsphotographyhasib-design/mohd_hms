'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/app-shell/store';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Input } from '@/shared/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/shared/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/shared/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/ui/tooltip';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/shared/ui/collapsible';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  Bug,
  RefreshCw,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Copy,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Types
// ============================================================

interface ErrorLog {
  id: string;
  errorRef: string;
  category: string;
  message: string;
  stack?: string | null;
  statusCode?: number | null;
  errorCode?: string | null;
  module?: string | null;
  apiEndpoint?: string | null;
  method?: string | null;
  userId?: string | null;
  userName?: string | null;
  requestId?: string | null;
  requestBody?: unknown;
  responseBody?: unknown;
  duration?: number | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

interface PaginatedResponse {
  data: ErrorLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================
// Constants
// ============================================================

const ERROR_CATEGORIES = {
  database: { label: 'Database', color: 'red' },
  api: { label: 'API', color: 'orange' },
  auth: { label: 'Auth', color: 'red' },
  permission: { label: 'Permission', color: 'amber' },
  validation: { label: 'Validation', color: 'yellow' },
  network: { label: 'Network', color: 'gray' },
  timeout: { label: 'Timeout', color: 'orange' },
  firebase: { label: 'Firebase', color: 'amber' },
  brevo: { label: 'Brevo', color: 'blue' },
  redis: { label: 'Redis', color: 'red' },
  supabase: { label: 'Supabase', color: 'green' },
  prisma: { label: 'Prisma', color: 'purple' },
  unknown: { label: 'Unknown', color: 'gray' },
  frontend: { label: 'Frontend', color: 'red' },
  upload: { label: 'Upload', color: 'orange' },
  authentication: { label: 'Authentication', color: 'red' },
} as const;

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  ...Object.entries(ERROR_CATEGORIES).map(([key, val]) => ({
    value: key,
    label: val.label,
  })),
];

const PAGE_SIZE = 50;

// ============================================================
// Category Color Mapping (Tailwind classes)
// ============================================================

const CATEGORY_BADGE_CLASSES: Record<string, string> = {
  database: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
  auth: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
  redis: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
  frontend: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
  api: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  timeout: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  upload: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  permission: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  firebase: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  validation: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  network: 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  unknown: 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  supabase: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  prisma: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  brevo: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  authentication: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
};

function getCategoryBadgeClass(category: string): string {
  return CATEGORY_BADGE_CLASSES[category] ?? CATEGORY_BADGE_CLASSES['unknown'];
}

// ============================================================
// Status Code Color Mapping
// ============================================================

function getStatusBadgeClass(status: number | null | undefined): string {
  if (status == null) return 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400';
  if (status >= 500) return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
  if (status >= 400) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
  if (status >= 300) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
  return 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400';
}

// ============================================================
// timeAgo Utility
// ============================================================

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (weeks < 5) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

// ============================================================
// Component
// ============================================================

export function ErrorHistoryView() {
  const { user, token } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';

  // ---- Filter State ----
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // ---- Data State ----
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // ---- Detail Dialog State ----
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // ---- Collapsible State ----
  const [reqBodyOpen, setReqBodyOpen] = useState(false);
  const [resBodyOpen, setResBodyOpen] = useState(false);

  // ---- Refs ----
  const abortRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Debounce search ----
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [search]);

  // ---- Fetch error logs ----
  const fetchErrorLogs = useCallback(async () => {
    if (!token || !isSuperAdmin) return;

    // Cancel any pending request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (category !== 'all') params.set('category', category);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/error-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch error logs (${res.status})`);
      }

      const json: PaginatedResponse = await res.json();
      setErrorLogs(json.data);
      setTotalPages(json.pagination.totalPages);
      setTotal(json.pagination.total);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      toast.error('Failed to load error logs');
      console.error(err);
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [token, isSuperAdmin, page, debouncedSearch, category, startDate, endDate]);

  // Reset page on filter change (except page itself)
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, startDate, endDate]);

  useEffect(() => {
    fetchErrorLogs();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchErrorLogs]);

  // ---- Refresh ----
  const handleRefresh = () => {
    fetchErrorLogs();
  };

  // ---- Clear filters ----
  const handleClearFilters = () => {
    setSearch('');
    setCategory('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasActiveFilters = search || category !== 'all' || startDate || endDate;

  // ---- View detail ----
  const handleViewDetail = async (errorLog: ErrorLog) => {
    setSelectedError(errorLog);
    setDialogOpen(true);
    setReqBodyOpen(false);
    setResBodyOpen(false);

    // Try fetching full detail
    if (!token || !isSuperAdmin) return;
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/error-logs/${errorLog.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const full: ErrorLog = await res.json();
        setSelectedError(full);
      }
    } catch {
      // Use the list data we already have
    } finally {
      setDetailLoading(false);
    }
  };

  // ---- Copy full error details ----
  const handleCopyDetails = () => {
    if (!selectedError) return;
    const text = [
      `Reference: ${selectedError.errorRef}`,
      `Category: ${selectedError.category}`,
      `Message: ${selectedError.message}`,
      `Status: ${selectedError.statusCode ?? 'N/A'}`,
      `Error Code: ${selectedError.errorCode ?? 'N/A'}`,
      `Module: ${selectedError.module ?? 'N/A'}`,
      `Endpoint: ${selectedError.method ?? ''} ${selectedError.apiEndpoint ?? 'N/A'}`,
      `Request ID: ${selectedError.requestId ?? 'N/A'}`,
      `User: ${selectedError.userName ?? 'N/A'} (${selectedError.userId ?? 'N/A'})`,
      `Duration: ${selectedError.duration != null ? `${selectedError.duration}ms` : 'N/A'}`,
      `IP: ${selectedError.ip ?? 'N/A'}`,
      `User Agent: ${selectedError.userAgent ?? 'N/A'}`,
      `Time: ${selectedError.createdAt}`,
      selectedError.requestBody != null ? `\nRequest Body:\n${JSON.stringify(selectedError.requestBody, null, 2)}` : '',
      selectedError.responseBody != null ? `\nResponse Body:\n${JSON.stringify(selectedError.responseBody, null, 2)}` : '',
      selectedError.stack ? `\nStack Trace:\n${selectedError.stack}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(text).then(
      () => toast.success('Error details copied to clipboard'),
      () => toast.error('Failed to copy'),
    );
  };

  // ---- Truncate helper ----
  const truncate = (str: string | null | undefined, maxLen: number) => {
    if (!str) return '—';
    return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
  };

  // ============================================================
  // Guard: Super Admin only
  // ============================================================
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Bug className="size-12 mb-4 opacity-30" />
        <p className="text-sm">Access restricted to Super Admin</p>
      </div>
    );
  }

  // ============================================================
  // Render: Loading Skeleton
  // ============================================================
  if (loading && errorLogs.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        {/* Filter skeleton */}
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
        {/* Table skeleton */}
        <div className="rounded-2xl border border-gray-200/80 bg-white dark:border-white/10 dark:bg-gray-900 p-4">
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // Render: Main
  // ============================================================
  return (
    <div className="space-y-6">
      {/* ============ Header ============ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Bug className="size-6 text-red-500" />
            <h2 className="text-xl font-semibold text-foreground">Error History</h2>
            {total > 0 && (
              <Badge variant="secondary" className="text-xs">
                {total.toLocaleString()}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Monitor and debug application errors
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ============ Filters Bar ============ */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search errors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        {/* Category Select */}
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Start Date */}
        <div className="space-y-1">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 w-[160px]"
            placeholder="Start date"
          />
        </div>

        {/* End Date */}
        <div className="space-y-1">
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 w-[160px]"
            placeholder="End date"
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-9">
            <X className="size-4" />
            Clear
          </Button>
        )}
      </div>

      {/* ============ Table ============ */}
      {errorLogs.length === 0 && !loading ? (
        /* ---- Empty State ---- */
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <CheckCircle2 className="size-12 mb-4 text-emerald-500" />
          <p className="text-base font-medium">No errors found</p>
          <p className="text-sm mt-1">
            {hasActiveFilters
              ? 'Try adjusting your filters'
              : 'Everything looks good!'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Time
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Reference
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Category
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Module
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Endpoint
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Error Code
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    User
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                    Duration
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={`skel-${i}`}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <TableCell key={j} className="px-3 py-2">
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : errorLogs.map((log) => (
                      <TableRow
                        key={log.id}
                        className="cursor-pointer transition-colors"
                        onClick={() => handleViewDetail(log)}
                      >
                        {/* Time */}
                        <TableCell className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>{timeAgo(log.createdAt)}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {new Date(log.createdAt).toLocaleString()}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>

                        {/* Reference */}
                        <TableCell className="px-3 py-2.5">
                          <span className="font-mono text-xs font-medium text-foreground hover:underline">
                            {log.errorRef}
                          </span>
                        </TableCell>

                        {/* Category */}
                        <TableCell className="px-3 py-2.5">
                          <Badge
                            variant="outline"
                            className={`text-[11px] ${getCategoryBadgeClass(log.category)}`}
                          >
                            {ERROR_CATEGORIES[log.category as keyof typeof ERROR_CATEGORIES]?.label ?? log.category}
                          </Badge>
                        </TableCell>

                        {/* Module */}
                        <TableCell className="px-3 py-2.5 text-xs text-muted-foreground">
                          {log.module ?? '—'}
                        </TableCell>

                        {/* Endpoint */}
                        <TableCell className="px-3 py-2.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-muted-foreground font-mono max-w-[140px] block truncate">
                                {log.apiEndpoint ?? '—'}
                              </span>
                            </TooltipTrigger>
                            {log.apiEndpoint && (
                              <TooltipContent className="max-w-xs break-all">
                                {log.method ? `${log.method} ` : ''}
                                {log.apiEndpoint}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="px-3 py-2.5">
                          {log.statusCode != null ? (
                            <Badge
                              variant="outline"
                              className={`text-[11px] font-mono ${getStatusBadgeClass(log.statusCode)}`}
                            >
                              {log.statusCode}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* Error Code */}
                        <TableCell className="px-3 py-2.5">
                          <span className="font-mono text-xs text-muted-foreground">
                            {log.errorCode ?? '—'}
                          </span>
                        </TableCell>

                        {/* User */}
                        <TableCell className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {log.userName ?? '—'}
                        </TableCell>

                        {/* Duration */}
                        <TableCell className="px-3 py-2.5 text-xs text-muted-foreground text-right font-mono whitespace-nowrap">
                          {log.duration != null ? `${log.duration}ms` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>

          {/* ============ Pagination ============ */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page <span className="font-medium text-foreground">{page}</span> of{' '}
                <span className="font-medium text-foreground">{totalPages}</span>
                <span className="ml-2">
                  ({total.toLocaleString()} total error{total !== 1 ? 's' : ''})
                </span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============ Error Detail Dialog ============ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="size-5 text-red-500" />
              {selectedError?.errorRef}
            </DialogTitle>
            <DialogDescription>
              {selectedError
                ? new Date(selectedError.createdAt).toLocaleString()
                : ''}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedError ? (
            <div className="space-y-4">
              {/* Key Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Category
                  </span>
                  <div>
                    <Badge
                      variant="outline"
                      className={getCategoryBadgeClass(selectedError.category)}
                    >
                      {ERROR_CATEGORIES[selectedError.category as keyof typeof ERROR_CATEGORIES]?.label ?? selectedError.category}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status Code
                  </span>
                  <div>
                    {selectedError.statusCode != null ? (
                      <Badge
                        variant="outline"
                        className={`font-mono ${getStatusBadgeClass(selectedError.statusCode)}`}
                      >
                        {selectedError.statusCode}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Error Code
                  </span>
                  <p className="font-mono text-foreground">{selectedError.errorCode ?? 'N/A'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Module
                  </span>
                  <p className="text-foreground">{selectedError.module ?? 'N/A'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Endpoint
                  </span>
                  <p className="font-mono text-foreground text-xs break-all">
                    {selectedError.method
                      ? `${selectedError.method.toUpperCase()} `
                      : ''}
                    {selectedError.apiEndpoint ?? 'N/A'}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Request ID
                  </span>
                  <p className="font-mono text-foreground text-xs">
                    {selectedError.requestId ?? 'N/A'}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    User
                  </span>
                  <p className="text-foreground">
                    {selectedError.userName ?? 'N/A'}
                    {selectedError.userId && (
                      <span className="text-xs text-muted-foreground ml-1.5">
                        ({selectedError.userId})
                      </span>
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Duration
                  </span>
                  <p className="font-mono text-foreground">
                    {selectedError.duration != null ? `${selectedError.duration}ms` : 'N/A'}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    IP Address
                  </span>
                  <p className="font-mono text-foreground text-xs">{selectedError.ip ?? 'N/A'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    User Agent
                  </span>
                  <p className="text-foreground text-xs break-all line-clamp-2">
                    {selectedError.userAgent ?? 'N/A'}
                  </p>
                </div>
              </div>

              {/* Error Message */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Message
                </span>
                <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg p-3 break-words">
                  {selectedError.message}
                </p>
              </div>

              {/* Stack Trace */}
              {selectedError.stack && (
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Stack Trace
                  </span>
                  <pre className="bg-gray-950 dark:bg-gray-950 text-gray-300 rounded-lg p-3 text-xs font-mono overflow-auto max-h-64 whitespace-pre-wrap break-words leading-relaxed">
                    {selectedError.stack}
                  </pre>
                </div>
              )}

              {/* Request Body (Collapsible) */}
              {selectedError.requestBody != null && (
                <Collapsible open={reqBodyOpen} onOpenChange={setReqBodyOpen}>
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline w-full">
                    {reqBodyOpen ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                    Request Body
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <pre className="bg-gray-950 dark:bg-gray-950 text-gray-300 rounded-lg p-3 text-xs font-mono overflow-auto max-h-48 whitespace-pre-wrap break-words">
                      {JSON.stringify(selectedError.requestBody, null, 2)}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Response Body (Collapsible) */}
              {selectedError.responseBody != null && (
                <Collapsible open={resBodyOpen} onOpenChange={setResBodyOpen}>
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline w-full">
                    {resBodyOpen ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                    Response Body
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <pre className="bg-gray-950 dark:bg-gray-950 text-gray-300 rounded-lg p-3 text-xs font-mono overflow-auto max-h-48 whitespace-pre-wrap break-words">
                      {JSON.stringify(selectedError.responseBody, null, 2)}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={handleCopyDetails}>
                  <Copy className="size-4" />
                  Copy Details
                </Button>
                <Button variant="default" size="sm" onClick={() => setDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}