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
  Plus, Search, FileText, Eye, Loader2, ChevronLeft, ChevronRight, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import type { QuotationItem, PaginatedResponse, SelectOption } from '@/types';

function StatusBadge({ status }: { status: string }) {
  const v: Record<string, string> = {
    OPEN: 'bg-amber-100 text-amber-800', ASSIGNED: 'bg-sky-100 text-sky-800',
    IN_PROGRESS: 'bg-purple-100 text-purple-800', RESOLVED: 'bg-emerald-100 text-emerald-800',
    CLOSED: 'bg-gray-100 text-gray-600', COMPLETED: 'bg-emerald-100 text-emerald-800',
    PENDING: 'bg-amber-100 text-amber-800', PAID: 'bg-emerald-100 text-emerald-800',
    OVERDUE: 'bg-rose-100 text-rose-800', DRAFT: 'bg-gray-100 text-gray-600',
    APPROVED: 'bg-teal-100 text-teal-800', SENT: 'bg-sky-100 text-sky-800',
    REJECTED: 'bg-rose-100 text-rose-800', EXPIRED: 'bg-gray-100 text-gray-600',
    CANCELLED: 'bg-gray-100 text-gray-600',
    active: 'bg-emerald-100 text-emerald-800', inactive: 'bg-gray-100 text-gray-600',
    maintenance: 'bg-amber-100 text-amber-800',
  };
  return <Badge variant="outline" className={v[status] || ''}>{status.replace(/_/g, ' ')}</Badge>;
}

const token = () => localStorage.getItem('cmms_token') || '';
const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

interface LineItem { description: string; amount: string; }

export function QuotationList() {
  const setView = useAppStore((s) => s.setView);
  const [data, setData] = useState<PaginatedResponse<QuotationItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState<SelectOption[]>([]);
  const [form, setForm] = useState({
    customerId: '', title: '', description: '', validUntil: '',
    items: [{ description: '', amount: '' }] as LineItem[],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/quotations?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setData(json);
    } catch { toast.error('Failed to load quotations'); }
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
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, items: JSON.stringify(validItems), subtotal, tax, total }),
      });
      if (!res.ok) throw new Error();
      toast.success('Quotation created');
      setDialogOpen(false);
      setForm({ customerId: '', title: '', description: '', validUntil: '', items: [{ description: '', amount: '' }] });
      fetchData();
    } catch { toast.error('Failed to create quotation'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <FileText className="h-5 w-5 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold">Quotations</h1>
        </div>
        <Button onClick={() => { fetchCustomers(); setDialogOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> New Quotation
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search quotations..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                )) : (data?.data || []).length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No quotations found</TableCell></TableRow>
                ) : (data?.data || []).map((q) => (
                  <TableRow key={q.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{q.title}</TableCell>
                    <TableCell>{q.customerName || '—'}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(q.total)}</TableCell>
                    <TableCell><StatusBadge status={q.status} /></TableCell>
                    <TableCell className="text-sm">{q.validUntil ? new Date(q.validUntil).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
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

      {/* New Quotation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Quotation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Customer *</Label>
                <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>{customers.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Valid Until</Label><Input type="date" className="mt-1" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></div>
            </div>
            <div><Label>Title *</Label><Input className="mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Quotation title" /></div>
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}