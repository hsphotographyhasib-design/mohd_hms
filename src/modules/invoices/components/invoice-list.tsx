'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/ui/select';
import {
  Plus, Search, Receipt, Eye, ChevronLeft, ChevronRight,
  FileText, FileClock, FileCheck2, Send, CircleCheck, AlertTriangle, Ban, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore, useAuthStore } from '@/app-shell/store';
import { canPerformAction } from '@/core/permissions/rbac/permissions-matrix';
import type { InvoiceItem, InvoiceStatus, PaginatedResponse } from '@/core/types';

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700', icon: FileText },
  REVIEW: { label: 'Review', className: 'bg-amber-100 text-amber-800', icon: FileClock },
  APPROVED: { label: 'Approved', className: 'bg-teal-100 text-teal-800', icon: FileCheck2 },
  SENT: { label: 'Sent', className: 'bg-sky-100 text-sky-800', icon: Send },
  VIEWED: { label: 'Viewed', className: 'bg-indigo-100 text-indigo-800', icon: Eye },
  PARTIALLY_PAID: { label: 'Partial', className: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  PAID: { label: 'Paid', className: 'bg-emerald-100 text-emerald-800', icon: CircleCheck },
  OVERDUE: { label: 'Overdue', className: 'bg-rose-100 text-rose-800', icon: AlertTriangle },
  CANCELLED: { label: 'Cancelled', className: 'bg-gray-100 text-gray-500', icon: Ban },
  CLOSED: { label: 'Closed', className: 'bg-gray-100 text-gray-500', icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return <Badge variant="outline">{status}</Badge>;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`${cfg.className} gap-1 border-0`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

const fmt = (n: number, currency = 'BND') => {
  const symbols: Record<string, string> = { BND: 'BND ', USD: '$', SGD: 'S$ ', MYR: 'RM ' };
  return `${symbols[currency] || '$'}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const ALL_STATUSES: InvoiceStatus[] = ['DRAFT', 'REVIEW', 'APPROVED', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'CLOSED'];

export function InvoiceList() {
  const setView = useAppStore((s) => s.setView);
  const user = useAuthStore(s => s.user);
  const role = user?.role;
  const [data, setData] = useState<PaginatedResponse<InvoiceItem> | null>(null);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const token = localStorage.getItem('cmms_token') || '';
      const res = await fetch(`/api/invoices?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      setData(json);
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('cmms_token') || '';
      const res = await fetch('/api/invoices?stats=true', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.stats) setStats(json.stats);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchData(); fetchStats(); }, [fetchData, fetchStats]);

  const invoices = data?.data || [];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Receipt className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Invoices</h1>
            <p className="text-sm text-muted-foreground">{data?.total ?? 0} total invoices</p>
          </div>
        </div>
        {canPerformAction(role, 'invoice', 'create') && (
          <Button onClick={() => setView('new-invoice')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> New Invoice
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { label: 'Total Revenue', value: stats.totalValue ?? 0, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            { label: 'Draft', value: stats.draftCount ?? 0, color: 'bg-gray-50 text-gray-700 border-gray-200', isCount: true },
            { label: 'Pending Action', value: (stats.reviewCount ?? 0) + (stats.overdueCount ?? 0), color: 'bg-amber-50 text-amber-700 border-amber-200', isCount: true },
            { label: 'Paid', value: stats.paidCount ?? 0, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', isCount: true },
            { label: 'Overdue', value: stats.overdueCount ?? 0, color: 'bg-rose-50 text-rose-700 border-rose-200', isCount: true },
          ].map((s) => (
            <Card key={s.label} className={`border ${s.color}`}>
              <CardContent className="p-3">
                <p className="text-xs font-medium opacity-75">{s.label}</p>
                <p className="text-lg font-bold">{s.isCount ? s.value : fmt(s.value)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search invoices..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                )) : invoices.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>No invoices found</p>
                    {canPerformAction(role, 'invoice', 'create') && (
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => setView('new-invoice')}>
                        <Plus className="h-4 w-4 mr-1" /> Create your first invoice
                      </Button>
                    )}
                  </TableCell></TableRow>
                ) : invoices.map((inv) => (
                  <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setView('invoice-detail', { id: inv.id })}>
                    <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{inv.title}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{inv.customerName || '—'}</TableCell>
                    <TableCell className="text-right font-medium text-sm">{fmt(inv.total, inv.currency)}</TableCell>
                    <TableCell><StatusBadge status={inv.status} /></TableCell>
                    <TableCell className="text-sm">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setView('invoice-detail', { id: inv.id }); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">Page {data.page} of {data.totalPages} ({data.total} total)</p>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}