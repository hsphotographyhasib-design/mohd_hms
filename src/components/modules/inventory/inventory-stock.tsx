'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ArrowLeftRight, Loader2, Search, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_COLORS: Record<string, string> = {
  stock_in: 'bg-emerald-100 text-emerald-700', stock_out: 'bg-rose-100 text-rose-700',
  adjustment: 'bg-amber-100 text-amber-700', transfer: 'bg-blue-100 text-blue-700',
  return: 'bg-teal-100 text-teal-700', damage: 'bg-red-100 text-red-700',
};

export function InventoryStockMovements({ token }: { token: string }) {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ type: 'stock_in', itemId: '', warehouseId: '', quantity: '', reason: '', referenceNo: '', referenceType: '', notes: '' });

  // Dropdown data
  const [items, setItems] = useState<{ id: string; name: string; itemCode?: string; unit: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`/api/inventory/stock?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      setMovements(json.data || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } catch { toast.error('Failed to load movements'); }
    finally { setLoading(false); }
  }, [page, search, typeFilter, token]);

  useEffect(() => { fetchMovements(); }, [fetchMovements]);

  useEffect(() => {
    (async () => {
      try {
        const [itemsRes, whRes] = await Promise.all([
          fetch('/api/inventory?pageSize=200', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/inventory/warehouses', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (itemsRes.ok) { const json = await itemsRes.json(); setItems((json.data || []).map((i: any) => ({ id: i.id, name: i.name, itemCode: i.itemCode, unit: i.unit }))); }
        if (whRes.ok) { const json = await whRes.json(); setWarehouses(json.data || json || []); }
      } catch {}
    })();
  }, [token]);

  const handleSubmit = async () => {
    if (!form.itemId || !form.quantity) { toast.error('Item and quantity are required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/inventory/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, quantity: parseInt(form.quantity) }),
      });
      if (!res.ok) throw new Error();
      toast.success('Stock movement recorded');
      setDialogOpen(false);
      setForm({ type: 'stock_in', itemId: '', warehouseId: '', quantity: '', reason: '', referenceNo: '', referenceType: '', notes: '' });
      fetchMovements();
    } catch { toast.error('Failed to record movement'); }
    finally { setSubmitting(false); }
  };

  const f = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold">Stock Movements</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-1.5" /> Record Movement
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search items..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-8 h-9 text-sm" />
            </div>
            <Select value={typeFilter} onValueChange={v => { setTypeFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40 h-9 text-sm"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="stock_in">Stock In</SelectItem>
                <SelectItem value="stock_out">Stock Out</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="return">Return</SelectItem>
                <SelectItem value="damage">Damage</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-gray-950 z-10"><TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Item</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs text-right">Qty</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Warehouse</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">Reference</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">Reason</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? Array.from({ length: 6 }).map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-9 w-full" /></TableCell></TableRow>)
                  : movements.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground"><ArrowLeftRight className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-sm">No movements recorded</p></TableCell></TableRow>
                  : movements.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm font-medium">{m.item?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] px-1.5 ${TYPE_COLORS[m.type] || ''}`}>
                          {m.type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right text-sm font-medium ${['stock_in', 'return'].includes(m.type) ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {['stock_in', 'return'].includes(m.type) ? '+' : '-'}{m.quantity}
                      </TableCell>
                      <TableCell className="text-xs hidden md:table-cell">{m.warehouse?.name || '—'}</TableCell>
                      <TableCell className="text-xs hidden lg:table-cell">{m.referenceNo || '—'}</TableCell>
                      <TableCell className="text-xs hidden lg:table-cell max-w-[150px] truncate">{m.reason || '—'}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-2.5">
              <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>&lt;</Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>&gt;</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Movement Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Stock Movement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Movement Type *</Label>
              <Select value={form.type} onValueChange={v => f('type', v)}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock_in">Stock In</SelectItem>
                  <SelectItem value="stock_out">Stock Out</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="return">Return</SelectItem>
                  <SelectItem value="damage">Damage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Item *</Label>
              <Select value={form.itemId} onValueChange={v => f('itemId', v)}>
                <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.itemCode ? `[${i.itemCode}] ` : ''}{i.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Warehouse</Label>
              <Select value={form.warehouseId} onValueChange={v => f('warehouseId', v)}>
                <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Quantity *</Label><Input type="number" className="mt-1 h-9" value={form.quantity} onChange={e => f('quantity', e.target.value)} /></div>
            <div><Label className="text-xs">Reference No</Label><Input className="mt-1 h-9" placeholder="e.g. PO-001, WO-001" value={form.referenceNo} onChange={e => f('referenceNo', e.target.value)} /></div>
            <div><Label className="text-xs">Reason</Label><Input className="mt-1 h-9" value={form.reason} onChange={e => f('reason', e.target.value)} /></div>
            <div><Label className="text-xs">Notes</Label><Textarea className="mt-1 text-sm min-h-[50px]" value={form.notes} onChange={e => f('notes', e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}