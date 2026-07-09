'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import {
  Plus, Search, ChevronLeft, ChevronRight, AlertTriangle, Filter, MoreVertical,
  Package, Pencil, Trash2, Eye,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { toast } from 'sonner';
import { InventoryItemForm } from './inventory-item-form';

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

  // Form (delegates to InventoryItemForm)
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const openCreate = () => {
    setEditId(null);
    setFormOpen(true);
  };

  const openEdit = (id: string) => {
    setDetailId(null);
    setEditId(id);
    setFormOpen(true);
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

  const handleDelete = async (id: string) => {
    if (!confirm('Archive this item?')) return;
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { toast.success('Item archived'); fetchItems(); }
    } catch { toast.error('Failed to archive item'); }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3 flex-1 w-full">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search items..." className="pl-9 h-9 text-sm" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <Select value={itemType} onValueChange={(v) => { setItemType(v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="h-9 w-[140px] text-sm"><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="h-9 w-[130px] text-sm"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_approval">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button variant={lowStock ? 'default' : 'outline'} size="sm" className="h-9 text-xs" onClick={() => { setLowStock(!lowStock); setPage(1); }}>
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />Low Stock
              </Button>
            </div>
            <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-sm">
              <Plus className="h-4 w-4 mr-1.5" />Add Item
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Package className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">No items found</p>
              <p className="text-xs mt-1">Create your first inventory item to get started</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}><Plus className="h-3.5 w-3.5 mr-1.5" />Add Item</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Code</TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs text-right">Purchase</TableHead>
                    <TableHead className="text-xs text-right">Selling</TableHead>
                    <TableHead className="text-xs text-right">Stock</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(item.id)}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.itemCode || item.sku || '—'}</TableCell>
                      <TableCell className="font-medium text-sm max-w-[200px] truncate">{item.name}</TableCell>
                      <TableCell><Badge variant="secondary" className={`${TYPE_COLORS[item.itemType] || ''} text-[10px] px-1.5 py-0`}>{TYPE_LABELS[item.itemType] || item.itemType}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.category?.name || '—'}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(item.purchaseCost)}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(item.sellingPrice)}</TableCell>
                      <TableCell className="text-xs text-right">
                        <span className={item.quantity <= item.minStock ? 'text-amber-600 font-semibold' : ''}>{item.quantity} {item.unit}</span>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className={`${STATUS_COLORS[item.status] || ''} text-[10px] px-1.5 py-0`}>{item.status?.replace(/_/g, ' ')}</Badge></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetail(item.id)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(item.id)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-rose-600"><Trash2 className="h-4 w-4 mr-2" />Archive</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
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

      {/* Enterprise Add/Edit Form */}
      <InventoryItemForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditId(null); }}
        editId={editId}
        onSaved={fetchItems}
      />

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