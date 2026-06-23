'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus, Search, FileText, Eye, Loader2, ChevronLeft, ChevronRight,
  MoreHorizontal, ArrowUpDown, Filter, FileDown, Copy,
  FileCheck2, FileClock, FileX, FileBadge, Send, Trash2,
  DollarSign, TrendingUp, CalendarClock, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import type { QuotationItem, QuotationStatus, PaginatedResponse } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// ============ CONSTANTS ============

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100 border-gray-200', icon: FileText },
  REVIEW: { label: 'In Review', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', icon: FileClock },
  APPROVED: { label: 'Approved', color: 'text-teal-700', bgColor: 'bg-teal-50 border-teal-200', icon: FileCheck2 },
  SENT: { label: 'Sent', color: 'text-sky-700', bgColor: 'bg-sky-50 border-sky-200', icon: Send },
  ACCEPTED: { label: 'Accepted', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', color: 'text-rose-700', bgColor: 'bg-rose-50 border-rose-200', icon: FileX },
  EXPIRED: { label: 'Expired', color: 'text-gray-600', bgColor: 'bg-gray-50 border-gray-200', icon: CalendarClock },
  CONVERTED_WO: { label: 'To Work Order', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200', icon: FileBadge },
  CONVERTED_INVOICE: { label: 'To Invoice', color: 'text-indigo-700', bgColor: 'bg-indigo-50 border-indigo-200', icon: FileBadge },
  PAID: { label: 'Paid', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200', icon: DollarSign },
  CLOSED: { label: 'Closed', color: 'text-gray-600', bgColor: 'bg-gray-50 border-gray-200', icon: FileText },
};

const STATUS_TABS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'SENT', label: 'Sent' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CONVERTED_WO', label: 'To WO' },
  { value: 'CONVERTED_INVOICE', label: 'To Invoice' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CLOSED', label: 'Closed' },
];

const CURRENCY_SYMBOLS: Record<string, string> = { BND: 'BND', USD: '$', SGD: 'S$', MYR: 'RM' };

const token = () => localStorage.getItem('cmms_token') || '';
const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

function formatCurrency(amount: number, currency?: string): string {
  const sym = currency ? (CURRENCY_SYMBOLS[currency] || currency) : 'BND';
  return `${sym} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return <Badge variant="outline">{status.replace(/_/g, ' ')}</Badge>;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium border', cfg.bgColor, cfg.color)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

interface QuotationStats {
  total: number;
  totalValue: number;
  draft: number;
  pendingAction: number;
  accepted: number;
  paid: number;
}

// ============ MAIN COMPONENT ============

export function QuotationList() {
  const setView = useAppStore((s) => s.setView);

  const [data, setData] = useState<PaginatedResponse<QuotationItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState<'createdAt' | 'total' | 'quotationNo'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [stats, setStats] = useState<QuotationStats | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        sort: sortField,
        order: sortOrder,
      });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/quotations?${params}`, { headers: authHeaders() });
      const json = await res.json();
      setData(json);
    } catch {
      toast.error('Failed to load quotations');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sortField, sortOrder]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/quotations?stats=true', { headers: authHeaders() });
      if (res.ok) {
        const json = await res.json();
        setStats({
          total: json.total || 0,
          totalValue: json.totalValue || 0,
          draft: json.draft || 0,
          pendingAction: json.pendingAction || 0,
          accepted: json.accepted || 0,
          paid: json.paid || 0,
        });
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleSort = (field: 'createdAt' | 'total' | 'quotationNo') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this quotation?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      toast.success('Quotation deleted');
      fetchData();
      fetchStats();
    } catch {
      toast.error('Failed to delete quotation');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (q: QuotationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          customerId: q.customerId,
          title: q.title + ' (Copy)',
          description: q.description,
          referenceNo: q.referenceNo,
          projectName: q.projectName,
          site: q.site,
          items: q.items,
          terms: null,
          currency: q.currency || 'BND',
          taxRate: q.taxRate,
          discount: q.discount,
          shipping: q.shipping || 0,
          validUntil: q.validUntil,
          notes: q.notes,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Quotation duplicated');
      fetchData();
      fetchStats();
    } catch {
      toast.error('Failed to duplicate quotation');
    }
  };

  const statusCounts = useMemo(() => {
    if (!data) return {};
    const counts: Record<string, number> = {};
    // Note: we'd ideally get this from a separate API. For now, use what we have.
    return counts;
  }, [data]);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <FileText className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
            <p className="text-sm text-muted-foreground">Manage and track all customer quotations</p>
          </div>
        </div>
        <Button
          onClick={() => setView('new-quotation')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" /> New Quotation
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <Card className="py-0 gap-0 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Total</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.total}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="py-0 gap-0 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Total Value</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">
                    {formatCurrency(stats.totalValue)}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="py-0 gap-0 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Draft</p>
                  <p className="text-2xl font-bold text-gray-600 mt-0.5">{stats.draft}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="py-0 gap-0 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Pending</p>
                  <p className="text-2xl font-bold text-amber-600 mt-0.5">{stats.pendingAction}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                  <CalendarClock className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="py-0 gap-0 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Accepted</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-0.5">{stats.accepted}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="py-0 gap-0 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Paid</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-0.5">{stats.paid}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-emerald-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Filter Tabs */}
      <Card className="py-0 gap-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="flex items-center gap-1 px-2 py-2 border-b">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => {
                    setStatusFilter(tab.value);
                    setPage(1);
                  }}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors',
                    statusFilter === tab.value
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by quotation no, title, customer, reference..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-10"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}
          >
            <SelectTrigger className="w-40 h-10">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_TABS.filter((t) => t.value).map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>{tab.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quotations Table (Desktop) */}
      <Card className="hidden md:block py-0 gap-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto -mx-3 sm:mx-0 max-h-[480px] overflow-y-auto">
            <div className="min-w-[640px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                  <TableHead className="w-10">SL#</TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('quotationNo')}
                  >
                    <div className="flex items-center gap-1">
                      Quotation No.
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Project / Title</TableHead>
                  <TableHead className="text-right">
                    <div
                      className="flex items-center justify-end gap-1 cursor-pointer select-none"
                      onClick={() => handleSort('total')}
                    >
                      Amount
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>
                    <div
                      className="flex items-center gap-1 cursor-pointer select-none"
                      onClick={() => handleSort('createdAt')}
                    >
                      Date
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : (data?.data || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">No quotations found</p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {search || statusFilter
                              ? 'Try adjusting your filters or search query'
                              : 'Create your first quotation to get started'}
                          </p>
                        </div>
                        {!search && !statusFilter && (
                          <Button
                            size="sm"
                            onClick={() => setView('new-quotation')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Quotation
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  (data?.data || []).map((q, index) => (
                    <TableRow
                      key={q.id}
                      className="cursor-pointer hover:bg-emerald-50/30 transition-colors group"
                      onClick={() => setView('quotation-detail', { id: q.id })}
                    >
                      <TableCell className="text-muted-foreground text-xs font-mono">
                        {(data.page - 1) * data.pageSize + index + 1}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm font-semibold text-emerald-700">
                          {q.quotationNo || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{q.customerName || '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[240px]">
                            {q.projectName || q.title || '—'}
                          </p>
                          {q.site && (
                            <p className="text-xs text-muted-foreground truncate max-w-[240px]">{q.site}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(q.total, q.currency)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={q.status} />
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">
                          {q.currency || 'BND'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {format(new Date(q.createdAt), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {q.validUntil ? (
                          <span className={cn(
                            new Date(q.validUntil) < new Date() && q.status === 'SENT' ? 'text-rose-600 font-medium' : ''
                          )}>
                            {format(new Date(q.validUntil), 'dd MMM yyyy')}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setView('quotation-detail', { id: q.id }); }}>
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setView('quotation-edit', { id: q.id }); }}>
                              <FileText className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleDuplicate(q, e)}>
                              <Copy className="h-4 w-4 mr-2" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => handleDelete(q.id, e)}
                              className="text-rose-600 focus:text-rose-600"
                              disabled={deletingId === q.id}
                            >
                              {deletingId === q.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                              )}
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(data.totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (data.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= data.totalPages - 2) {
                    pageNum = data.totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? 'default' : 'outline'}
                      size="icon"
                      className={cn('h-8 w-8', page === pageNum && 'bg-emerald-600 hover:bg-emerald-700')}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        </CardContent>
      </Card>

      {/* Quotation Cards (Mobile) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))
        ) : (data?.data || []).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
              <FileText className="h-12 w-12 text-muted-foreground/30" />
              <div className="text-center">
                <p className="font-medium text-sm">No quotations found</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {search || statusFilter ? 'Try adjusting your filters' : 'Create your first quotation'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          (data?.data || []).map((q) => (
            <Card
              key={q.id}
              className="cursor-pointer hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors"
              onClick={() => setView('quotation-detail', { id: q.id })}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="font-mono text-sm font-semibold text-emerald-700">{q.quotationNo || '—'}</span>
                    <p className="text-xs text-muted-foreground truncate">{q.customerName || '—'}</p>
                  </div>
                  <StatusBadge status={q.status} />
                </div>
                <p className="text-sm font-medium truncate">{q.projectName || q.title || '—'}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{formatCurrency(q.total, q.currency)}</span>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{format(new Date(q.createdAt), 'dd MMM yyyy')}</span>
                    {q.validUntil && (
                      <span className={cn(
                        new Date(q.validUntil) < new Date() && q.status === 'SENT' ? 'text-rose-600 font-medium' : ''
                      )}>
                        → {format(new Date(q.validUntil), 'dd MMM')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end pt-2 border-t gap-1">
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); setView('quotation-detail', { id: q.id }); }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); setView('quotation-edit', { id: q.id }); }}
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => handleDelete(q.id, e)}
                    disabled={deletingId === q.id}
                  >
                    {deletingId === q.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination (Mobile) */}
      {data && data.totalPages > 1 && (
        <div className="md:hidden flex items-center justify-between px-1 py-2">
          <p className="text-xs text-muted-foreground">
            {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs px-2">{data.page} / {data.totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}