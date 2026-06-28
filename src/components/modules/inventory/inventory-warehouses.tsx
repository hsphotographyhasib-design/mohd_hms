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
import { Plus, Warehouse as WarehouseIcon, MapPin, Pencil, Trash2, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n: number) => `B$ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const WAREHOUSE_TYPE_LABELS: Record<string, string> = {
  main: 'Main Warehouse', sub_warehouse: 'Sub Warehouse', vehicle: 'Vehicle Stock',
  technician: 'Technician Stock', project: 'Project Stock', temporary: 'Temporary',
};

interface WarehouseData { id: string; name: string; code?: string; type: string; address?: string; manager?: string; phone?: string; _count?: { stocks: number }; }

export function InventoryWarehouses({ token }: { token: string }) {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [stockLoading, setStockLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', type: 'main', address: '', manager: '', phone: '' });

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/warehouses', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const json = await res.json(); setWarehouses(json.data || json || []); }
    } catch { toast.error('Failed to load warehouses'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);

  const fetchStock = useCallback(async (warehouseId: string) => {
    setStockLoading(true);
    try {
      const res = await fetch(`/api/inventory/warehouses/${warehouseId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const json = await res.json(); setStockItems(json.stocks || []); }
    } catch {}
    finally { setStockLoading(false); }
  }, [token]);

  useEffect(() => {
    if (selected) fetchStock(selected);
    else setStockItems([]);
  }, [selected, fetchStock]);

  const openCreate = () => { setEditId(null); setForm({ name: '', code: '', type: 'main', address: '', manager: '', phone: '' }); setDialogOpen(true); };
  const openEdit = (w: WarehouseData) => { setEditId(w.id); setForm({ name: w.name, code: w.code || '', type: w.type, address: w.address || '', manager: w.manager || '', phone: w.phone || '' }); setDialogOpen(true); };

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Name is required'); return; }
    setSubmitting(true);
    try {
      const url = editId ? `/api/inventory/warehouses/${editId}` : '/api/inventory/warehouses';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success(editId ? 'Warehouse updated' : 'Warehouse created');
      setDialogOpen(false);
      fetchWarehouses();
    } catch { toast.error('Failed to save warehouse'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this warehouse?')) return;
    try {
      const res = await fetch(`/api/inventory/warehouses/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { toast.success('Warehouse deleted'); fetchWarehouses(); if (selected === id) setSelected(null); }
    } catch { toast.error('Failed to delete'); }
  };

  const f = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Warehouses</h2>
        <Button size="sm" onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1.5" /> Warehouse</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Warehouse List */}
        <div className="lg:col-span-2 space-y-2">
          {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            : warehouses.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground"><WarehouseIcon className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-sm">No warehouses yet</p></CardContent></Card>
            : warehouses.map(w => (
              <Card
                key={w.id}
                className={`cursor-pointer transition-all hover:shadow-md ${selected === w.id ? 'ring-2 ring-emerald-500 border-emerald-300' : ''}`}
                onClick={() => setSelected(selected === w.id ? null : w.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <WarehouseIcon className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{w.name}</p>
                        <p className="text-xs text-muted-foreground">{WAREHOUSE_TYPE_LABELS[w.type] || w.type} · {w._count?.stocks || 0} items</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEdit(w); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={e => { e.stopPropagation(); handleDelete(w.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  {w.address && <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{w.address}</div>}
                </CardContent>
              </Card>
            ))}
        </div>

        {/* Stock in Warehouse */}
        <Card className="lg:col-span-3">
          <CardContent className="p-3">
            <h3 className="text-sm font-semibold mb-3">{selected ? 'Warehouse Stock' : 'Select a warehouse'}</h3>
            {!selected ? (
              <div className="py-12 text-center text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Click a warehouse to view its stock</p>
              </div>
            ) : stockLoading ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              : stockItems.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No stock items</p>
              : (
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white dark:bg-gray-950"><TableRow>
                      <TableHead className="text-xs">Item</TableHead>
                      <TableHead className="text-xs text-right">Qty</TableHead>
                      <TableHead className="text-xs text-right">Reserved</TableHead>
                      <TableHead className="text-xs text-right">Damaged</TableHead>
                      <TableHead className="text-xs text-right">Available</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {stockItems.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-sm font-medium">{s.item?.name || 'Unknown'}</TableCell>
                          <TableCell className="text-right text-sm">{s.quantity}</TableCell>
                          <TableCell className="text-right text-sm text-amber-600">{s.reserved}</TableCell>
                          <TableCell className="text-right text-sm text-rose-600">{s.damaged}</TableCell>
                          <TableCell className="text-right text-sm font-medium text-emerald-600">{s.quantity - s.reserved - s.damaged}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editId ? 'Edit Warehouse' : 'New Warehouse'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Name *</Label><Input className="mt-1 h-9" value={form.name} onChange={e => f('name', e.target.value)} /></div>
            <div><Label className="text-xs">Code</Label><Input className="mt-1 h-9" placeholder="e.g. WH-01" value={form.code} onChange={e => f('code', e.target.value)} /></div>
            <div><Label className="text-xs">Type</Label>
              <Select value={form.type} onValueChange={v => f('type', v)}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(WAREHOUSE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Address</Label><Input className="mt-1 h-9" value={form.address} onChange={e => f('address', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Manager</Label><Input className="mt-1 h-9" value={form.manager} onChange={e => f('manager', e.target.value)} /></div>
              <div><Label className="text-xs">Phone</Label><Input className="mt-1 h-9" value={form.phone} onChange={e => f('phone', e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}