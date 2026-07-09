'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Plus, Loader2, Pencil, Trash2,
  ChevronLeft, ChevronRight, Search,
} from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { Switch } from '@/shared/ui/switch';
import { Textarea } from '@/shared/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/shared/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/ui/select';
import { toast } from 'sonner';
import { cn } from '@/core/utils/utils';

const token = () => localStorage.getItem('cmms_token') || '';
const fmtBND = (n: number) =>
  `B$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface PriceBookEntry {
  id: string;
  serviceItemId?: string;
  pricingType?: string;
  name?: string;
  sellingPrice?: number;
  discountPercent?: number;
  taxRate?: number;
  minQuantity?: number;
  validFrom?: string;
  validTo?: string;
  customerId?: string;
  contractId?: string;
  notes?: string;
  isActive?: boolean;
}

const PRICING_TYPE_COLORS: Record<string, string> = {
  standard: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  customer_specific: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  contract: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  promotional: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
};

const emptyForm = {
  serviceItemId: '', pricingType: 'standard', name: '',
  customerId: '', contractId: '', sellingPrice: '', discountPercent: '',
  taxRate: '', validFrom: '', validTo: '', minQuantity: '',
  notes: '', isActive: true,
};

export function PriceBook() {
  const [data, setData] = useState<{ data: PriceBookEntry[]; total: number; page: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [pricingTypeFilter, setPricingTypeFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PriceBookEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<PriceBookEntry | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      if (pricingTypeFilter) params.set('pricingType', pricingTypeFilter);
      const res = await fetch(`/api/price-book?${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      setData(json);
    } catch {
      toast.error('Failed to load price book');
    } finally {
      setLoading(false);
    }
  }, [page, search, pricingTypeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
  };

  const openAdd = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (entry: PriceBookEntry) => {
    setEditing(entry);
    setForm({
      serviceItemId: entry.serviceItemId || '', pricingType: entry.pricingType || 'standard',
      name: entry.name || '', customerId: entry.customerId || '', contractId: entry.contractId || '',
      sellingPrice: String(entry.sellingPrice || ''), discountPercent: String(entry.discountPercent || ''),
      taxRate: String(entry.taxRate || ''),
      validFrom: entry.validFrom ? entry.validFrom.split('T')[0] : '',
      validTo: entry.validTo ? entry.validTo.split('T')[0] : '',
      minQuantity: String(entry.minQuantity || ''),
      notes: entry.notes || '', isActive: entry.isActive !== false,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.serviceItemId || !form.pricingType) { toast.error('Service Item ID and Pricing Type are required'); return; }
    setSubmitting(true);
    try {
      const body = {
        ...form,
        sellingPrice: parseFloat(form.sellingPrice) || 0,
        discountPercent: parseFloat(form.discountPercent) || 0,
        taxRate: parseFloat(form.taxRate) || 0,
        minQuantity: parseInt(form.minQuantity) || 0,
      };
      const url = editing ? `/api/price-book/${editing.id}` : '/api/price-book';
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(editing ? 'Price entry updated' : 'Price entry created');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch {
      toast.error(editing ? 'Failed to update' : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/price-book/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Price entry deleted');
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const items = data?.data || [];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold">Price Book</h2>
        </div>
        <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Entry
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search entries..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={pricingTypeFilter} onValueChange={(v) => { setPricingTypeFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Pricing Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="customer_specific">Customer Specific</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="promotional">Promotional</SelectItem>
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
                  <TableHead>Service Item ID</TableHead>
                  <TableHead>Pricing Type</TableHead>
                  <TableHead>Name/Label</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead className="text-right">Discount %</TableHead>
                  <TableHead className="text-right">Tax %</TableHead>
                  <TableHead className="text-right">Min Qty</TableHead>
                  <TableHead>Valid From</TableHead>
                  <TableHead>Valid To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={11}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No price book entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-xs">{entry.serviceItemId || '—'}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          'capitalize',
                          PRICING_TYPE_COLORS[entry.pricingType || ''] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        )}>
                          {entry.pricingType?.replace('_', ' ') || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{entry.name || '—'}</TableCell>
                      <TableCell className="text-right font-medium">{fmtBND(entry.sellingPrice || 0)}</TableCell>
                      <TableCell className="text-right">{entry.discountPercent ?? '—'}%</TableCell>
                      <TableCell className="text-right">{entry.taxRate ?? '—'}%</TableCell>
                      <TableCell className="text-right">{entry.minQuantity ?? '—'}</TableCell>
                      <TableCell className="text-sm">{entry.validFrom ? new Date(entry.validFrom).toLocaleDateString() : '—'}</TableCell>
                      <TableCell className="text-sm">{entry.validTo ? new Date(entry.validTo).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          entry.isActive !== false
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        )}>
                          {entry.isActive !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(entry)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setDeleteTarget(entry)}>
                            <Trash2 className="h-4 w-4" />
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
              <p className="text-sm text-muted-foreground">Page {data.page} of {data.totalPages} ({data.total} total)</p>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Price Entry' : 'Add Price Entry'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Service Item ID *</Label>
                <Input className="mt-1" value={form.serviceItemId} onChange={(e) => setForm({ ...form, serviceItemId: e.target.value })} />
              </div>
              <div>
                <Label>Pricing Type *</Label>
                <Select value={form.pricingType} onValueChange={(v) => setForm({ ...form, pricingType: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="customer_specific">Customer Specific</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Name/Label</Label>
              <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Customer ID</Label>
                <Input className="mt-1" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} />
              </div>
              <div>
                <Label>Contract ID</Label>
                <Input className="mt-1" value={form.contractId} onChange={(e) => setForm({ ...form, contractId: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Selling Price *</Label>
                <Input type="number" step="0.01" className="mt-1" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
              </div>
              <div>
                <Label>Discount %</Label>
                <Input type="number" step="0.1" className="mt-1" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} />
              </div>
              <div>
                <Label>Tax Rate %</Label>
                <Input type="number" step="0.1" className="mt-1" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valid From</Label>
                <Input type="date" className="mt-1" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
              </div>
              <div>
                <Label>Valid To</Label>
                <Input type="date" className="mt-1" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Min Quantity</Label>
              <Input type="number" className="mt-1" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: e.target.value })} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea className="mt-1" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Update' : 'Create'} Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Price Entry</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this price entry ({deleteTarget?.name || deleteTarget?.serviceItemId})? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}