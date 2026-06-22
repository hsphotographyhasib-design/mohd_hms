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
import {
  Plus, Search, Package, Loader2, ChevronLeft, ChevronRight, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { InventoryItemData, PaginatedResponse } from '@/types';

const token = () => localStorage.getItem('cmms_token') || '';
const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function InventoryList() {
  const [data, setData] = useState<PaginatedResponse<InventoryItemData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', sku: '', category: '', description: '', unit: 'pcs', quantity: '', minStock: '', unitCost: '', supplier: '', location: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category', categoryFilter);
      if (lowStockOnly) params.set('lowStock', 'true');
      const res = await fetch(`/api/inventory?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setData(json);
    } catch { toast.error('Failed to load inventory'); }
    finally { setLoading(false); }
  }, [page, search, categoryFilter, lowStockOnly]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!form.name || !form.unit) { toast.error('Name and unit are required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          ...form,
          quantity: parseFloat(form.quantity) || 0,
          minStock: parseFloat(form.minStock) || 0,
          unitCost: parseFloat(form.unitCost) || 0,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Item added');
      setDialogOpen(false);
      setForm({ name: '', sku: '', category: '', description: '', unit: 'pcs', quantity: '', minStock: '', unitCost: '', supplier: '', location: '' });
      fetchData();
    } catch { toast.error('Failed to add item'); }
    finally { setSubmitting(false); }
  };

  const items = data?.data || [];
  const totalValue = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const lowStockCount = items.filter((i) => i.quantity < i.minStock).length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
            <Package className="h-5 w-5 text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold">Inventory Management</h1>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Item
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="border-emerald-200 bg-emerald-50 text-emerald-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Total Items</p>
            <p className="text-2xl font-bold">{data?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-rose-200 bg-rose-50 text-rose-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-xs font-medium opacity-75">Low Stock</p>
            </div>
            <p className="text-2xl font-bold">{lowStockCount}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 text-emerald-700 col-span-2 md:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Total Value</p>
            <p className="text-2xl font-bold">{fmt(totalValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search items..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Electrical">Electrical</SelectItem>
                <SelectItem value="Mechanical">Mechanical</SelectItem>
                <SelectItem value="Plumbing">Plumbing</SelectItem>
                <SelectItem value="HVAC">HVAC</SelectItem>
                <SelectItem value="Safety">Safety</SelectItem>
                <SelectItem value="Tools">Tools</SelectItem>
                <SelectItem value="Consumables">Consumables</SelectItem>
              </SelectContent>
            </Select>
            <Button variant={lowStockOnly ? 'default' : 'outline'} size="sm" onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1); }} className={lowStockOnly ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''}>
              <AlertTriangle className="h-4 w-4 mr-2" /> Low Stock
            </Button>
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
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Min Stock</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead>Supplier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                )) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No items found</TableCell></TableRow>
                ) : items.map((item) => {
                  const isLow = item.quantity < item.minStock;
                  return (
                    <TableRow key={item.id} className={isLow ? 'bg-rose-50/60 hover:bg-rose-50' : ''}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="font-mono text-xs">{item.sku || '—'}</TableCell>
                      <TableCell><Badge variant="outline">{item.category || '—'}</Badge></TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className={`text-right font-medium ${isLow ? 'text-rose-600' : ''}`}>{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{item.minStock}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(item.unitCost)}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(item.quantity * item.unitCost)}</TableCell>
                      <TableCell className="text-sm">{item.supplier || '—'}</TableCell>
                    </TableRow>
                  );
                })}
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

      {/* Add Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SKU</Label><Input className="mt-1" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
              <div><Label>Category</Label><Input className="mt-1" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Electrical" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Unit *</Label><Input className="mt-1" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
              <div><Label>Quantity</Label><Input type="number" className="mt-1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
              <div><Label>Min Stock</Label><Input type="number" className="mt-1" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Unit Cost</Label><Input type="number" className="mt-1" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} /></div>
              <div><Label>Supplier</Label><Input className="mt-1" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}