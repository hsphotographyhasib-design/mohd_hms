'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Plus, Search, ChevronLeft, ChevronRight, AlertTriangle, Filter, MoreVertical,
  Package, Loader2, Pencil, Trash2, Eye,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const fmt = (n: number) => `B$ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TYPE_COLORS: Record<string, string> = {
  inventory: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  spare_part: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  consumable: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  service: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  manpower: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  equipment_package: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  supply_only: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  supply_install: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  rental: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
};
const TYPE_LABELS: Record<string, string> = {
  inventory: 'Inventory', spare_part: 'Spare Part', consumable: 'Consumable', service: 'Service',
  manpower: 'Manpower', equipment_package: 'Svc Package', supply_only: 'Supply Only', supply_install: 'Supply+Install', rental: 'Rental',
};
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700', active: 'bg-emerald-100 text-emerald-700', pending_approval: 'bg-amber-100 text-amber-700',
  inactive: 'bg-rose-100 text-rose-700', archived: 'bg-slate-100 text-slate-700', discontinued: 'bg-red-100 text-red-700',
};

interface Category { id: string; name: string; code: string; color: string; }
interface Subcategory { id: string; name: string; code: string; }
interface Item {
  id: string; itemCode?: string; sku?: string; name: string; itemType: string; status: string;
  category?: Category | null; subcategory?: Subcategory | null;
  unit: string; quantity: number; minStock: number; averageCost: number; purchaseCost: number; sellingPrice: number;
  brand?: string; description?: string;
}

export function InventoryItems({ token }: { token: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [itemType, setItemType] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [lowStock, setLowStock] = useState(false);

  // Form
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Categories for dropdowns
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  // Form state
  const [form, setForm] = useState<any>({});

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      if (itemType) params.set('itemType', itemType);
      if (status) params.set('status', status);
      if (categoryId) params.set('categoryId', categoryId);
      if (lowStock) params.set('lowStock', 'true');
      const res = await fetch(`/api/inventory?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      setItems(json.data || []);
      setTotalPages(json.totalPages || 1);
      setTotal(json.total || 0);
    } catch { toast.error('Failed to load items'); }
    finally { setLoading(false); }
  }, [page, search, itemType, status, categoryId, lowStock, token]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/inventory/categories', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const json = await res.json(); setCategories(json.data || json || []); }
      } catch {}
    })();
  }, [token]);

  useEffect(() => {
    if (!form.categoryId) { setSubcategories([]); return; }
    (async () => {
      try {
        const res = await fetch(`/api/inventory/subcategories?categoryId=${form.categoryId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const json = await res.json(); setSubcategories(json.data || json || []); }
      } catch {}
    })();
  }, [form.categoryId, token]);

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', sku: '', itemType: 'inventory', unit: 'pcs', quantity: 0, minStock: 0, purchaseCost: 0, averageCost: 0, sellingPrice: 0, status: 'draft', currency: 'BND', approvalStatus: 'pending' });
    setFormOpen(true);
  };

  const openEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const item = await res.json();
        setEditId(id);
        setForm(item);
        setFormOpen(true);
      }
    } catch { toast.error('Failed to load item'); }
  };

  const openDetail = async (id: string) => {
    setDetailId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/inventory/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setDetailItem(await res.json());
    } catch {}
    finally { setDetailLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Item name is required'); return; }
    setSubmitting(true);
    try {
      const url = editId ? `/api/inventory/${editId}` : '/api/inventory';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(editId ? 'Item updated' : 'Item created');
      setFormOpen(false);
      fetchItems();
    } catch { toast.error('Failed to save item'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Archive this item?')) return;
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { toast.success('Item archived'); fetchItems(); }
    } catch { toast.error('Failed to archive item'); }
  };

  const f = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));
  const fv = (field: string) => form[field];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Item Master</h2>
          <p className="text-sm text-muted-foreground">{total} items</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> New Item
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, SKU, code..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-8 h-9 text-sm" />
            </div>
            <Select value={itemType} onValueChange={v => { setItemType(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-sm"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryId} onValueChange={v => { setCategoryId(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={v => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-32 h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_approval">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant={lowStock ? 'default' : 'outline'} size="sm" onClick={() => { setLowStock(!lowStock); setPage(1); }} className={lowStock ? 'bg-rose-600 hover:bg-rose-700 text-white h-9' : 'h-9'}>
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Low Stock
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-gray-950 z-10">
                <TableRow>
                  <TableHead className="text-xs">Code</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Category</TableHead>
                  <TableHead className="text-xs text-right">Qty</TableHead>
                  <TableHead className="text-xs text-right hidden lg:table-cell">Min</TableHead>
                  <TableHead className="text-xs text-right">Avg Cost</TableHead>
                  <TableHead className="text-xs text-right hidden lg:table-cell">Value</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? Array.from({ length: 8 }).map((_, i) => <TableRow key={i}><TableCell colSpan={10}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
                  : items.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground"><Package className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>No items found</p></TableCell></TableRow>
                  : items.map(item => {
                    const isLow = item.quantity <= item.minStock && item.quantity > 0;
                    const isOut = item.quantity === 0;
                    return (
                      <TableRow key={item.id} className={`cursor-pointer ${isLow ? 'bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-50' : isOut ? 'bg-rose-50/40 dark:bg-rose-900/10 hover:bg-rose-50' : ''}`} onClick={() => openDetail(item.id)}>
                        <TableCell className="font-mono text-xs">{item.itemCode || '—'}</TableCell>
                        <TableCell className="font-medium text-sm max-w-[200px] truncate">{item.name}</TableCell>
                        <TableCell><Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${TYPE_COLORS[item.itemType] || ''}`}>{TYPE_LABELS[item.itemType] || item.itemType}</Badge></TableCell>
                        <TableCell className="text-xs hidden md:table-cell">{item.category?.name || '—'}</TableCell>
                        <TableCell className={`text-right text-sm font-medium ${isLow ? 'text-amber-600' : isOut ? 'text-rose-600' : ''}`}>{item.quantity}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground hidden lg:table-cell">{item.minStock}</TableCell>
                        <TableCell className="text-right text-xs">{fmt(item.averageCost || item.purchaseCost)}</TableCell>
                        <TableCell className="text-right text-xs font-medium hidden lg:table-cell">{fmt(item.quantity * (item.averageCost || item.purchaseCost))}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[item.status] || ''}`}>{item.status?.replace('_', ' ')}</Badge></TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(item.id)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDetail(item.id)}><Eye className="h-3.5 w-3.5 mr-2" />View</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-rose-600"><Trash2 className="h-3.5 w-3.5 mr-2" />Archive</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-2.5">
              <p className="text-xs text-muted-foreground">Page {page} of {totalPages} ({total} items)</p>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Sheet */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>{editId ? 'Edit Item' : 'New Item'}</SheetTitle></SheetHeader>
          <div className="mt-6 space-y-6 pr-4">
            {/* Basic Info */}
            <section>
              <h3 className="text-sm font-semibold mb-3 text-emerald-700">Basic Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Item Code</Label><Input className="mt-1 h-9 text-sm bg-gray-50" value={fv('itemCode') || 'Auto-generated'} readOnly /></div>
                <div><Label className="text-xs">SKU</Label><Input className="mt-1 h-9 text-sm" placeholder="e.g. COP-001" value={fv('sku') || ''} onChange={e => f('sku', e.target.value)} /></div>
                <div className="col-span-2"><Label className="text-xs">Name *</Label><Input className="mt-1 h-9 text-sm" value={fv('name') || ''} onChange={e => f('name', e.target.value)} /></div>
                <div className="col-span-2"><Label className="text-xs">Short Name</Label><Input className="mt-1 h-9 text-sm" placeholder="Abbreviated name" value={fv('shortName') || ''} onChange={e => f('shortName', e.target.value)} /></div>
                <div className="col-span-2"><Label className="text-xs">Description</Label><Textarea className="mt-1 text-sm min-h-[60px]" value={fv('description') || ''} onChange={e => f('description', e.target.value)} /></div>
              </div>
            </section>

            {/* Classification */}
            <section>
              <h3 className="text-sm font-semibold mb-3 text-emerald-700">Classification</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Item Type</Label>
                  <Select value={fv('itemType') || 'inventory'} onValueChange={v => f('itemType', v)}>
                    <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Unit</Label>
                  <Select value={fv('unit') || 'pcs'} onValueChange={v => f('unit', v)}>
                    <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['pcs', 'kg', 'meter', 'liter', 'set', 'box', 'roll', 'pair', 'lot', 'unit', 'piece', 'sqm', 'foot', 'bundle', 'pack', 'dozen', 'hour', 'day', 'month'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Category</Label>
                  <Select value={fv('categoryId') || ''} onValueChange={v => f('categoryId', v || null)}>
                    <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Subcategory</Label>
                  <Select value={fv('subcategoryId') || ''} onValueChange={v => f('subcategoryId', v || null)}>
                    <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{subcategories.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Brand</Label><Input className="mt-1 h-9 text-sm" value={fv('brand') || ''} onChange={e => f('brand', e.target.value)} /></div>
                <div><Label className="text-xs">Model</Label><Input className="mt-1 h-9 text-sm" value={fv('model') || ''} onChange={e => f('model', e.target.value)} /></div>
                <div><Label className="text-xs">Part Number</Label><Input className="mt-1 h-9 text-sm" value={fv('partNumber') || ''} onChange={e => f('partNumber', e.target.value)} /></div>
                <div><Label className="text-xs">Manufacturer</Label><Input className="mt-1 h-9 text-sm" value={fv('manufacturer') || ''} onChange={e => f('manufacturer', e.target.value)} /></div>
              </div>
            </section>

            {/* Pricing */}
            <section>
              <h3 className="text-sm font-semibold mb-3 text-emerald-700">Pricing (BND)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div><Label className="text-xs">Purchase Cost</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('purchaseCost') || ''} onChange={e => f('purchaseCost', parseFloat(e.target.value) || 0)} /></div>
                <div><Label className="text-xs">Average Cost</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('averageCost') || ''} onChange={e => f('averageCost', parseFloat(e.target.value) || 0)} /></div>
                <div><Label className="text-xs">Selling Price</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('sellingPrice') || ''} onChange={e => f('sellingPrice', parseFloat(e.target.value) || 0)} /></div>
                <div><Label className="text-xs">Dealer Price</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('dealerPrice') || ''} onChange={e => f('dealerPrice', parseFloat(e.target.value) || 0)} /></div>
                <div><Label className="text-xs">Contractor Price</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('contractorPrice') || ''} onChange={e => f('contractorPrice', parseFloat(e.target.value) || 0)} /></div>
                <div><Label className="text-xs">Customer Price</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('customerPrice') || ''} onChange={e => f('customerPrice', parseFloat(e.target.value) || 0)} /></div>
                <div><Label className="text-xs">VIP Price</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('vipPrice') || ''} onChange={e => f('vipPrice', parseFloat(e.target.value) || 0)} /></div>
                <div><Label className="text-xs">Labour Cost</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('labourCost') || ''} onChange={e => f('labourCost', parseFloat(e.target.value) || 0)} /></div>
                <div><Label className="text-xs">Installation Cost</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('installationCost') || ''} onChange={e => f('installationCost', parseFloat(e.target.value) || 0)} /></div>
                <div><Label className="text-xs">Service Cost</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('serviceCost') || ''} onChange={e => f('serviceCost', parseFloat(e.target.value) || 0)} /></div>
                <div><Label className="text-xs">Transportation</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('transportationCost') || ''} onChange={e => f('transportationCost', parseFloat(e.target.value) || 0)} /></div>
                <div><Label className="text-xs">Emergency Call Out</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('emergencyCallOut') || ''} onChange={e => f('emergencyCallOut', parseFloat(e.target.value) || 0)} /></div>
              </div>
            </section>

            {/* Stock Control */}
            <section>
              <h3 className="text-sm font-semibold mb-3 text-emerald-700">Stock Control</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div><Label className="text-xs">Quantity</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('quantity') ?? ''} onChange={e => f('quantity', parseInt(e.target.value) || 0)} /></div>
                <div><Label className="text-xs">Min Stock</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('minStock') ?? ''} onChange={e => f('minStock', parseInt(e.target.value) || 0)} /></div>
                <div><Label className="text-xs">Max Stock</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('maxStock') ?? ''} onChange={e => f('maxStock', parseInt(e.target.value) || null)} /></div>
                <div><Label className="text-xs">Reorder Level</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('reorderLevel') ?? ''} onChange={e => f('reorderLevel', parseInt(e.target.value) || 0)} /></div>
                <div><Label className="text-xs">Safety Stock</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('safetyStock') ?? ''} onChange={e => f('safetyStock', parseInt(e.target.value) || 0)} /></div>
              </div>
            </section>

            {/* Manpower Rates (conditional) */}
            {(fv('itemType') === 'manpower') && (
              <section>
                <h3 className="text-sm font-semibold mb-3 text-teal-700">Manpower Rates (BND)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><Label className="text-xs">Hourly Rate</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('hourlyRate') || ''} onChange={e => f('hourlyRate', parseFloat(e.target.value) || null)} /></div>
                  <div><Label className="text-xs">Daily Rate</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('dailyRate') || ''} onChange={e => f('dailyRate', parseFloat(e.target.value) || null)} /></div>
                  <div><Label className="text-xs">Overtime Rate</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('overtimeRate') || ''} onChange={e => f('overtimeRate', parseFloat(e.target.value) || null)} /></div>
                  <div><Label className="text-xs">Weekend Rate</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('weekendRate') || ''} onChange={e => f('weekendRate', parseFloat(e.target.value) || null)} /></div>
                  <div><Label className="text-xs">Public Holiday Rate</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('publicHolidayRate') || ''} onChange={e => f('publicHolidayRate', parseFloat(e.target.value) || null)} /></div>
                </div>
              </section>
            )}

            {/* Rental Rates (conditional) */}
            {(fv('itemType') === 'rental') && (
              <section>
                <h3 className="text-sm font-semibold mb-3 text-cyan-700">Rental Rates (BND)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Daily Rental Rate</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('dailyRentalRate') || ''} onChange={e => f('dailyRentalRate', parseFloat(e.target.value) || null)} /></div>
                  <div><Label className="text-xs">Monthly Rental Rate</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('monthlyRentalRate') || ''} onChange={e => f('monthlyRentalRate', parseFloat(e.target.value) || null)} /></div>
                </div>
              </section>
            )}

            {/* Service Package (conditional) */}
            {(fv('itemType') === 'equipment_package') && (
              <section>
                <h3 className="text-sm font-semibold mb-3 text-indigo-700">Service Package</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Estimated Hours</Label><Input type="number" className="mt-1 h-9 text-sm" value={fv('estimatedHours') || ''} onChange={e => f('estimatedHours', parseFloat(e.target.value) || null)} /></div>
                  <div><Label className="text-xs">Required Skills</Label><Input className="mt-1 h-9 text-sm" placeholder="e.g. HVAC, Electrical" value={fv('requiredSkills') || ''} onChange={e => f('requiredSkills', e.target.value)} /></div>
                  <div className="col-span-2"><Label className="text-xs">SOP</Label><Textarea className="mt-1 text-sm min-h-[60px]" value={fv('sop') || ''} onChange={e => f('sop', e.target.value)} /></div>
                </div>
              </section>
            )}

            {/* Additional */}
            <section>
              <h3 className="text-sm font-semibold mb-3 text-emerald-700">Additional</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Warranty</Label><Input className="mt-1 h-9 text-sm" placeholder="e.g. 12 months" value={fv('warranty') || ''} onChange={e => f('warranty', e.target.value)} /></div>
                <div><Label className="text-xs">Country of Origin</Label><Input className="mt-1 h-9 text-sm" value={fv('countryOfOrigin') || ''} onChange={e => f('countryOfOrigin', e.target.value)} /></div>
                <div><Label className="text-xs">HS Code</Label><Input className="mt-1 h-9 text-sm" value={fv('hsCode') || ''} onChange={e => f('hsCode', e.target.value)} /></div>
                <div><Label className="text-xs">Status</Label>
                  <Select value={fv('status') || 'draft'} onValueChange={v => f('status', v)}>
                    <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending_approval">Pending Approval</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label className="text-xs">Remarks</Label><Textarea className="mt-1 text-sm min-h-[50px]" value={fv('remarks') || ''} onChange={e => f('remarks', e.target.value)} /></div>
              </div>
            </section>
          </div>
          <SheetFooter className="mt-6 border-t pt-4 px-4">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editId ? 'Update' : 'Create'} Item
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Detail Sheet */}
      <Sheet open={!!detailId} onOpenChange={() => { setDetailId(null); setDetailItem(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>Item Details</SheetTitle></SheetHeader>
          {detailLoading ? <div className="mt-6 space-y-3"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
            : detailItem && (
              <div className="mt-6 space-y-5 pr-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold">{detailItem.name}</p>
                    <p className="text-sm text-muted-foreground font-mono">{detailItem.itemCode}</p>
                  </div>
                  <Badge variant="secondary" className={TYPE_COLORS[detailItem.itemType] || ''}>{TYPE_LABELS[detailItem.itemType] || detailItem.itemType}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <DetailField label="SKU" value={detailItem.sku} />
                  <DetailField label="Brand" value={detailItem.brand} />
                  <DetailField label="Category" value={detailItem.category?.name} />
                  <DetailField label="Subcategory" value={detailItem.subcategory?.name} />
                  <DetailField label="Unit" value={detailItem.unit} />
                  <DetailField label="Model" value={detailItem.model} />
                  <DetailField label="Part Number" value={detailItem.partNumber} />
                  <DetailField label="Manufacturer" value={detailItem.manufacturer} />
                </div>
                {detailItem.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{detailItem.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Purchase Cost" value={fmt(detailItem.purchaseCost)} />
                  <MiniStat label="Average Cost" value={fmt(detailItem.averageCost)} />
                  <MiniStat label="Selling Price" value={fmt(detailItem.sellingPrice)} />
                  <MiniStat label="Stock Qty" value={`${detailItem.quantity} ${detailItem.unit}`} highlight={detailItem.quantity <= detailItem.minStock} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1" onClick={() => { setDetailId(null); openEdit(detailItem.id); }}><Pencil className="h-3.5 w-3.5 mr-1.5" />Edit</Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { setDetailId(null); handleDelete(detailItem.id); }}><Trash2 className="h-3.5 w-3.5 mr-1.5" />Archive</Button>
                </div>
              </div>
            )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p><p className="text-sm font-medium">{value || '—'}</p></div>;
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-2.5 rounded-lg border ${highlight ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800' : 'border-gray-100 dark:border-gray-800'}`}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? 'text-amber-700 dark:text-amber-400' : ''}`}>{value}</p>
    </div>
  );
}