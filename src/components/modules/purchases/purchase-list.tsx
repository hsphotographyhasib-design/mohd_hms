'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ShoppingCart, Plus, Search, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import { format } from 'date-fns';
import type { PurchaseOrderData, PaginatedResponse } from '@/types';

function StatusBadge({ status }: { status: string }) {
  const v: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600', SENT: 'bg-sky-100 text-sky-800',
    APPROVED: 'bg-teal-100 text-teal-800', RECEIVED: 'bg-emerald-100 text-emerald-800',
    CANCELLED: 'bg-rose-100 text-rose-800', active: 'bg-emerald-100 text-emerald-800',
    inactive: 'bg-gray-100 text-gray-600', maintenance: 'bg-amber-100 text-amber-800',
  };
  return <Badge variant="outline" className={v[status] || ''}>{status.replace(/_/g, ' ')}</Badge>;
}

const token = () => localStorage.getItem('cmms_token') || '';
const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function PurchaseList() {
  const [data, setData] = useState<PaginatedResponse<PurchaseOrderData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    supplier: '', supplierContact: '', items: '', expectedDate: '', notes: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/purchases?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setData(json);
    } catch {
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = {
    total: data?.total || 0,
    draft: (data?.data || []).filter((p) => p.status === 'DRAFT').length,
    sent: (data?.data || []).filter((p) => p.status === 'SENT').length,
    received: (data?.data || []).filter((p) => p.status === 'RECEIVED').length,
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this purchase order?')) return;
    try {
      const res = await fetch(`/api/purchases/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Purchase order deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete purchase order');
    }
  };

  const handleSubmit = async () => {
    if (!form.supplier) { toast.error('Supplier name is required'); return; }
    setSubmitting(true);
    try {
      const itemsParsed: { description: string; quantity: number; unitCost: number }[] = [];
      if (form.items.trim()) {
        try {
          const parsed = JSON.parse(form.items);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              itemsParsed.push({
                description: item.description || item.name || '',
                quantity: Number(item.quantity) || 1,
                unitCost: Number(item.unitCost || item.cost || item.price || 0),
              });
            }
          }
        } catch {
          toast.error('Items must be valid JSON array');
          setSubmitting(false);
          return;
        }
      }
      const subtotal = itemsParsed.reduce((s, it) => s + it.quantity * it.unitCost, 0);
      const tax = subtotal * 0.1;
      const total = subtotal + tax;
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          ...form,
          items: JSON.stringify(itemsParsed),
          subtotal,
          tax,
          total,
          expectedDate: form.expectedDate || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Purchase order created');
      setDialogOpen(false);
      setForm({ supplier: '', supplierContact: '', items: '', expectedDate: '', notes: '' });
      fetchData();
    } catch {
      toast.error('Failed to create purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> New Purchase Order
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total POs', value: stats.total, color: 'text-foreground' },
          { label: 'Draft', value: stats.draft, color: 'text-gray-600' },
          { label: 'Sent', value: stats.sent, color: 'text-sky-600' },
          { label: 'Received', value: stats.received, color: 'text-emerald-600' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search purchase orders..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-96 overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expected Date</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : (data?.data || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No purchase orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  (data?.data || []).map((po) => (
                    <TableRow key={po.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{po.poNumber}</TableCell>
                      <TableCell>{po.supplier}</TableCell>
                      <TableCell className="text-right">{fmt(po.subtotal)}</TableCell>
                      <TableCell className="text-right">{fmt(po.tax)}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(po.total)}</TableCell>
                      <TableCell><StatusBadge status={po.status} /></TableCell>
                      <TableCell className="text-sm">
                        {po.expectedDate ? format(new Date(po.expectedDate), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(po.id)}>
                            <Trash2 className="h-4 w-4 text-rose-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages} ({data.total} total)
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New PO Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Supplier Name *</Label>
                <Input
                  className="mt-1"
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                  placeholder="Supplier name"
                />
              </div>
              <div>
                <Label>Supplier Contact</Label>
                <Input
                  className="mt-1"
                  value={form.supplierContact}
                  onChange={(e) => setForm({ ...form, supplierContact: e.target.value })}
                  placeholder="Contact person"
                />
              </div>
            </div>
            <div>
              <Label>Items (JSON array)</Label>
              <Textarea
                className="mt-1 font-mono text-sm"
                rows={5}
                value={form.items}
                onChange={(e) => setForm({ ...form, items: e.target.value })}
                placeholder={'[{"description":"Item A","quantity":2,"unitCost":50}]'}
              />
            </div>
            <div>
              <Label>Expected Date</Label>
              <Input
                type="date"
                className="mt-1"
                value={form.expectedDate}
                onChange={(e) => setForm({ ...form, expectedDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}