'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Users, Search, Star, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Supplier {
  id: string; itemId: string; supplierName: string; supplierCode?: string; contactPerson?: string;
  phone?: string; email?: string; leadTimeDays: number; purchasePrice: number;
  moq: number; rating?: number; isPrimary: boolean; paymentTerms?: string;
  item?: { id: string; name: string; itemCode?: string };
}

export function InventorySuppliers({ token }: { token: string }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    itemId: '', supplierName: '', supplierCode: '', contactPerson: '',
    phone: '', email: '', leadTimeDays: '7', purchasePrice: '0',
    moq: '1', paymentTerms: '', rating: '',
  });
  const [items, setItems] = useState<{ id: string; name: string; itemCode?: string }[]>([]);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/inventory/suppliers?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      setSuppliers(json.data || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } catch { toast.error('Failed to load suppliers'); }
    finally { setLoading(false); }
  }, [page, search, token]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/inventory?pageSize=500', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const json = await res.json(); setItems((json.data || []).map((i: any) => ({ id: i.id, name: i.name, itemCode: i.itemCode }))); }
      } catch {}
    })();
  }, [token]);

  const handleSubmit = async () => {
    if (!form.supplierName || !form.itemId) { toast.error('Supplier name and item are required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/inventory/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, leadTimeDays: parseInt(form.leadTimeDays) || 0, purchasePrice: parseFloat(form.purchasePrice) || 0, moq: parseInt(form.moq) || 1, rating: form.rating ? parseInt(form.rating) : null }),
      });
      if (!res.ok) throw new Error();
      toast.success('Supplier added');
      setDialogOpen(false);
      setForm({ itemId: '', supplierName: '', supplierCode: '', contactPerson: '', phone: '', email: '', leadTimeDays: '7', purchasePrice: '0', moq: '1', paymentTerms: '', rating: '' });
      fetchSuppliers();
    } catch { toast.error('Failed to add supplier'); }
    finally { setSubmitting(false); }
  };

  const deleteSupplier = async (id: string) => {
    if (!confirm('Remove this supplier?')) return;
    try {
      const res = await fetch(`/api/inventory/suppliers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { toast.success('Supplier removed'); fetchSuppliers(); }
    } catch { toast.error('Failed to remove'); }
  };

  const f = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold">Suppliers</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" /> Add Supplier</Button>
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search suppliers..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-8 h-9 text-sm" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-gray-950 z-10"><TableRow>
                <TableHead className="text-xs">Supplier</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Item</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">Contact</TableHead>
                <TableHead className="text-xs text-right">Price</TableHead>
                <TableHead className="text-xs text-right hidden md:table-cell">MOQ</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">Lead Time</TableHead>
                <TableHead className="text-xs">Rating</TableHead>
                <TableHead className="text-xs w-10"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? Array.from({ length: 6 }).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-9 w-full" /></TableCell></TableRow>)
                  : suppliers.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground"><Users className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-sm">No suppliers yet</p></TableCell></TableRow>
                  : suppliers.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{s.supplierName}</p>
                          <div className="flex items-center gap-1.5">{s.isPrimary && <Badge className="text-[9px] px-1 bg-emerald-100 text-emerald-700">Primary</Badge>}{s.supplierCode && <span className="text-[10px] text-muted-foreground">{s.supplierCode}</span>}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm hidden md:table-cell max-w-[150px] truncate">{s.item?.name || '—'}</TableCell>
                      <TableCell className="text-xs hidden lg:table-cell">{s.contactPerson || '—'}<br />{s.phone || ''}</TableCell>
                      <TableCell className="text-right text-sm">B$ {(s.purchasePrice || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-xs hidden md:table-cell">{s.moq}</TableCell>
                      <TableCell className="text-xs hidden lg:table-cell">{s.leadTimeDays}d</TableCell>
                      <TableCell>
                        {s.rating ? (
                          <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3 w-3 ${i < (s.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />)}</div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={() => deleteSupplier(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </TableCell>
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

      {/* Add Supplier Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Supplier to Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Item *</Label>
              <Select value={form.itemId} onValueChange={v => f('itemId', v)}>
                <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.itemCode ? `[${i.itemCode}] ` : ''}{i.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Supplier Name *</Label><Input className="mt-1 h-9" value={form.supplierName} onChange={e => f('supplierName', e.target.value)} /></div>
              <div><Label className="text-xs">Supplier Code</Label><Input className="mt-1 h-9" placeholder="e.g. SUP-001" value={form.supplierCode} onChange={e => f('supplierCode', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Contact Person</Label><Input className="mt-1 h-9" value={form.contactPerson} onChange={e => f('contactPerson', e.target.value)} /></div>
              <div><Label className="text-xs">Phone</Label><Input className="mt-1 h-9" value={form.phone} onChange={e => f('phone', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Purchase Price (BND)</Label><Input type="number" className="mt-1 h-9" value={form.purchasePrice} onChange={e => f('purchasePrice', e.target.value)} /></div>
              <div><Label className="text-xs">MOQ</Label><Input type="number" className="mt-1 h-9" value={form.moq} onChange={e => f('moq', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Lead Time (days)</Label><Input type="number" className="mt-1 h-9" value={form.leadTimeDays} onChange={e => f('leadTimeDays', e.target.value)} /></div>
              <div><Label className="text-xs">Rating (1-5)</Label>
                <Select value={form.rating} onValueChange={v => f('rating', v)}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{['1','2','3','4','5'].map(r => <SelectItem key={r} value={r}>{'⭐'.repeat(parseInt(r))}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Payment Terms</Label><Input className="mt-1 h-9" placeholder="e.g. Net 30" value={form.paymentTerms} onChange={e => f('paymentTerms', e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Add Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
