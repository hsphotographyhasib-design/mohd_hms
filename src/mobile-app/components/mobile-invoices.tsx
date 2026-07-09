'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  FileText,
  ChevronRight,
  X,
  Loader2,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import { cn } from '@/core/utils/utils';
import { useAppStore, useAuthStore } from '@/app-shell/store';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';
import type { InvoiceItem, InvoiceStatus, PaginatedResponse } from '@/core/types';

// ─── Constants ──────────────────────────────────────────────

type TabFilter = 'all' | 'PAID' | 'PENDING' | 'OVERDUE';

const TABS: { label: string; value: TabFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Unpaid', value: 'PENDING' },
  { label: 'Overdue', value: 'OVERDUE' },
];

const STATUS_CONFIG: Record<string, { dot: string; badge: string; label: string }> = {
  PAID: { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Paid' },
  PENDING: { dot: 'bg-red-500', badge: 'bg-red-100 text-red-700 border-red-200', label: 'Unpaid' },
  APPROVED: { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Approved' },
  OVERDUE: { dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Overdue' },
  DRAFT: { dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Draft' },
  CANCELLED: { dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-500 border-gray-200', label: 'Cancelled' },
};

function getStatusConfig(status: InvoiceStatus) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
}

function formatCurrency(amount: number, currency?: string) {
  const sym = currency === 'AED' ? 'AED ' : currency ? `${currency} ` : '';
  return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(dateStr: string) {
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
  return formatDate(dateStr);
}

// ─── Invoice Card Skeleton ──────────────────────────────────

function InvoiceCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Skeleton className="mt-1 size-2.5 rounded-full" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-5 w-2/5" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────

function EmptyState({ filter }: { filter: TabFilter }) {
  const messages: Record<TabFilter, string> = {
    all: 'No invoices found',
    PAID: 'No paid invoices',
    PENDING: 'No unpaid invoices',
    OVERDUE: 'No overdue invoices — great job!',
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-gray-100">
        <FileText className="size-7 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-500">{messages[filter]}</p>
      <p className="mt-1 text-xs text-gray-400">
        {filter === 'all' ? 'Invoices will appear here once created' : 'Try switching to a different tab'}
      </p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────

export function MobileInvoices() {
  const { setView } = useAppStore();
  const { token } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch invoices
  const fetchInvoices = useCallback(async (p: number, tab: TabFilter, search: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(p),
        pageSize: '20',
      });
      if (tab !== 'all') params.set('status', tab);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/invoices?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load invoices');
      const json: PaginatedResponse<InvoiceItem> = await res.json();
      setInvoices((prev) => (p === 1 ? json.data : [...prev, ...json.data]));
      setTotalPages(json.totalPages);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial load and tab/search changes
  useEffect(() => {
    setInvoices([]);
    fetchInvoices(1, activeTab, searchQuery);
  }, [activeTab, fetchInvoices]);

  // Debounced search
  useEffect(() => {
    if (!searchOpen) return;
    const timer = setTimeout(() => {
      setInvoices([]);
      fetchInvoices(1, activeTab, searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, fetchInvoices, searchOpen]);

  // Auto-focus search
  useEffect(() => {
    if (searchOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [searchOpen]);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < 200 && page < totalPages) {
      fetchInvoices(page + 1, activeTab, searchQuery);
    }
  }, [loading, page, totalPages, fetchInvoices, activeTab, searchQuery]);

  const handleTabChange = (tab: TabFilter) => {
    setActiveTab(tab);
  };

  const handleInvoiceTap = (invoice: InvoiceItem) => {
    setView('invoice-detail', { id: invoice.id });
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
            <h1 className="text-lg font-bold text-gray-900">My Invoices</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label="Search invoices"
          >
            {searchOpen ? <X className="size-5 text-gray-500" /> : <Search className="size-5 text-gray-500" />}
          </Button>
        </div>

        {/* Search Bar */}
        {searchOpen && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by invoice #, title..."
                className="h-9 pl-9 pr-8 text-sm bg-gray-50 border-gray-200 rounded-lg"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200" aria-label="Clear">
                  <X className="size-3.5 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tabs — horizontally scrollable */}
        <div className="flex overflow-x-auto px-4 pb-0 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={cn(
                'relative flex-shrink-0 px-4 py-2.5 text-sm font-medium transition-colors',
                activeTab === tab.value
                  ? 'text-emerald-700'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {tab.label}
              {activeTab === tab.value && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-emerald-600" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Invoice List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-3 pb-4" onScroll={handleScroll}>
        {error ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-red-50">
              <FileText className="size-7 text-red-400" />
            </div>
            <p className="text-sm font-medium text-red-600">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => fetchInvoices(1, activeTab, searchQuery)}
            >
              Retry
            </Button>
          </div>
        ) : loading && invoices.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <InvoiceCardSkeleton key={i} />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState filter={activeTab} />
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => {
              const cfg = getStatusConfig(invoice.status);
              return (
                <button
                  key={invoice.id}
                  onClick={() => handleInvoiceTap(invoice)}
                  className="w-full rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-left transition-all active:scale-[0.98] active:bg-gray-50"
                >
                  <div className="flex items-start gap-3">
                    {/* Status dot */}
                    <span className={cn('mt-1.5 size-2.5 rounded-full shrink-0', cfg.dot)} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {invoice.title || invoice.invoiceNumber}
                      </h3>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar className="size-3" />
                        <span>{formatDate(invoice.createdAt)}</span>
                        <span className="text-gray-300">·</span>
                        <span className="truncate">{invoice.customerName || 'Customer'}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-bold text-gray-900">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </p>
                    </div>

                    {/* Status badge + chevron */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', cfg.badge)}
                      >
                        {cfg.label}
                      </Badge>
                      <ChevronRight className="size-4 text-gray-300" />
                    </div>
                  </div>

                  {/* Description preview */}
                  {invoice.description && (
                    <p className="mt-2 ml-[22px] text-xs text-gray-400 line-clamp-1">
                      {invoice.description}
                    </p>
                  )}
                </button>
              );
            })}

            {/* Load more indicator */}
            {loading && invoices.length > 0 && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="size-5 text-emerald-600 animate-spin" />
                <span className="ml-2 text-xs text-gray-500">Loading more...</span>
              </div>
            )}

            {/* End of list */}
            {!loading && page >= totalPages && invoices.length > 0 && (
              <p className="py-4 text-center text-xs text-gray-400">
                {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} · End of list
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}