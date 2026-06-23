'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Search, Receipt, Eye, Loader2, ChevronLeft, ChevronRight, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import type { InvoiceItem, PaginatedResponse, SelectOption } from '@/types';

function StatusBadge({ status }: { status: string }) {
  const v: Record<string, string> = {
    OPEN: 'bg-amber-100 text-amber-800', ASSIGNED: 'bg-sky-100 text-sky-800',
    IN_PROGRESS: 'bg-purple-100 text-purple-800', RESOLVED: 'bg-emerald-100 text-emerald-800',
    CLOSED: 'bg-gray-100 text-gray-600', COMPLETED: 'bg-emerald-100 text-emerald-800',
    PENDING: 'bg-amber-100 text-amber-800', PAID: 'bg-emerald-100 text-emerald-800',
    OVERDUE: 'bg-rose-100 text-rose-800', DRAFT: 'bg-gray-100 text-gray-600',
    APPROVED: 'bg-teal-100 text-teal-800', SENT: 'bg-sky-100 text-sky-800',
    REJECTED: 'bg-rose-100 text-rose-800', CANCELLED: 'bg-gray-100 text-gray-600',
    active: 'bg-emerald-100 text-emerald-800', inactive: 'bg-gray-100 text-gray-600',
    maintenance: 'bg-amber-100 text-amber-800',
  };
  return <Badge variant="outline" className={v[status] || ''}>{status.replace(/_/g, ' ')}</Badge>;
}

const token = () => localStorage.getItem('cmms_token') || '';
const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

interface LineItem { description: string; amount: string; }

export function InvoiceList() {
  const setView = useAppStore((s) => s.setView);
  const [data, setData] = useState<PaginatedResponse<InvoiceItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState<SelectOption[]>([]);
  const [form, setForm] = useState({ customerId: '', title: '', description: '', dueDate: '', items: [{ description: '', amount: '' }] as LineItem[] });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/invoices?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setData(json);
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers?pageSize=100', { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setCustomers((json.data || []).map((c: { id: string; name: string; companyName?: string }) => ({
        label: c.companyName ? `${c.name} (${c.companyName})` : c.name, value: c.id,
      })));
    } catch { /* silent */ }
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { description: '', amount: '' }] });
  const removeItem = (i: number) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateItem = (i: number, field: keyof LineItem, value: string) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    setForm({ ...form, items });
  };

  const handleSubmit = async () => {
    if (!form.title || !form.customerId) { toast.error('Title and customer are required'); return; }
    const validItems = form.items.filter((it) => it.description && it.amount);
    if (validItems.length === 0) { toast.error('Add at least one line item'); return; }
    setSubmitting(true);
    try {
      const subtotal = validItems.reduce((s, it) => s + parseFloat(it.amount || '0'), 0);
      const tax = subtotal * 0.1;
      const total = subtotal + tax;
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, items: JSON.stringify(validItems), subtotal, tax, total }),
      });
      if (!res.ok) throw new Error();
      toast.success('Invoice created');
      setDialogOpen(false);
      setForm({ customerId: '', title: '', description: '', dueDate: '', items: [{ description: '', amount: '' }] });
      fetchData();
    } catch { toast.error('Failed to create invoice'); }
    finally { setSubmitting(false); }
  };

  const invoices = data?.data || [];
  const totalAmount = invoices.reduce((s, i) => s + i.total, 0);
  const draftAmount = invoices.filter((i) => i.status === 'DRAFT').reduce((s, i) => s + i.total, 0);
  const pendingAmount = invoices.filter((i) => i.status === 'PENDING').reduce((s, i) => s + i.total, 0);
  const paidAmount = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.total, 0);
  const overdueAmount = invoices.filter((i) => i.status === 'OVERDUE').reduce((s, i) => s + i.total, 0);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Receipt className="h-5 w-5 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold">Invoices</h1>
        </div>
        <Button onClick={() => { fetchCustomers(); setDialogOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> New Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: totalAmount, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'Draft', value: draftAmount, color: 'bg-gray-50 text-gray-700 border-gray-200' },
          { label: 'Pending', value: pendingAmount, color: 'bg-amber-50 text-amber-700 border-amber-200' },
          { label: 'Paid', value: paidAmount, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'Overdue', value: overdueAmount, color: 'bg-rose-50 text-rose-700 border-rose-200' },
        ].map((s) => (
          <Card key={s.label} className={`border ${s.color}`}>
            <CardContent className="p-3">
              <p className="text-xs font-medium opacity-75">{s.label}</p>
              <p className="text-lg font-bold">{fmt(s.value)}</p>
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
              <Input placeholder="Search invoices..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table (Desktop) */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto -mx-3 sm:mx-0 max-h-96 overflow-y-auto">
            <div className="min-w-[640px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                )) : invoices.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
                ) : invoices.map((inv) => (
                  <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setView('invoice-detail', { id: inv.id })}>
                    <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{inv.title}</TableCell>
                    <TableCell>{inv.customerName || '—'}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(inv.subtotal)}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(inv.tax)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(inv.total)}</TableCell>
                    <TableCell><StatusBadge status={inv.status} /></TableCell>
                    <TableCell className="text-sm">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</TableCell>
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
          </div>
        </CardContent>
      </Card>

      {/* Invoice Cards (Mobile) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))
        ) : invoices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
              <Receipt className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">No invoices found</p>
            </CardContent>
          </Card>
        ) : (
          invoices.map((inv) => (
            <Card
              key={inv.id}
              className="cursor-pointer hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors"
              onClick={() => setView('invoice-detail', { id: inv.id })}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="font-medium text-sm">{inv.title}</span>
                    <p className="text-xs text-muted-foreground font-mono">{inv.invoiceNumber}</p>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{inv.customerName || '—'}</span>
                  <span>Due: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Subtotal: {fmt(inv.subtotal)}</span>
                  <span className="font-bold text-sm">{fmt(inv.total)}</span>
                </div>
                <div className="flex items-center justify-end pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); setView('invoice-detail', { id: inv.id }); }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between px-1 py-3">
          <p className="text-sm text-muted-foreground">Page {data.page} of {data.totalPages} ({data.total} total)</p>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* New Invoice Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Customer *</Label>
                <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>{customers.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Due Date</Label><Input type="date" className="mt-1" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
            </div>
            <div><Label>Title *</Label><Input className="mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Invoice title" /></div>
            <div><Label>Description</Label><Textarea className="mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description..." rows={2} /></div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="font-medium">Line Items *</Label>
                <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Add Item</Button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input placeholder="Description" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} className="flex-1" />
                    <Input placeholder="Amount" type="number" value={item.amount} onChange={(e) => updateItem(i, 'amount', e.target.value)} className="w-28" />
                    <Button variant="ghost" size="icon" onClick={() => removeItem(i)} disabled={form.items.length <= 1}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Subtotal: {fmt(form.items.reduce((s, it) => s + parseFloat(it.amount || '0'), 0))} (10% tax applied)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}