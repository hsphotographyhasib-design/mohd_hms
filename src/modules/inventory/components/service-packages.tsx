'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Plus, Search, Loader2, Pencil, Trash2, Package,
  XCircle, ChevronLeft, ChevronRight, DollarSign,
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

interface ServicePackageItem {
  serviceItemId: string;
  quantity: number;
  sortOrder: number;
}

interface ServicePackage {
  id: string;
  name: string;
  packageCode?: string;
  description?: string;
  pricingModel?: string;
  costPrice?: number;
  sellingPrice?: number;
  discountPercent?: number;
  taxRate?: number;
  isActive?: boolean;
  items?: ServicePackageItem[];
  itemCount?: number;
}

interface ServiceItemOption {
  id: string;
  name: string;
  serviceCode?: string;
}

const emptyForm = {
  name: '', packageCode: '', description: '', pricingModel: 'fixed',
  costPrice: '', sellingPrice: '', discountPercent: '', taxRate: '', isActive: true,
};

export function ServicePackages() {
  const [data, setData] = useState<{ data: ServicePackage[]; total: number; page: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServicePackage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [packageItems, setPackageItems] = useState<Array<{ serviceItemId: string; quantity: string; sortOrder: string }>>([]);
  const [serviceItemOptions, setServiceItemOptions] = useState<ServiceItemOption[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ServicePackage | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/service-packages?${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      setData(json);
    } catch {
      toast.error('Failed to load service packages');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const fetchServiceItems = useCallback(async () => {
    try {
      const res = await fetch('/api/service-items?pageSize=100', {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      if (json.data) setServiceItemOptions(json.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchServiceItems(); }, [fetchServiceItems]);

  const resetForm = () => {
    setForm(emptyForm);
    setPackageItems([]);
    setEditing(null);
  };

  const openAdd = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (pkg: ServicePackage) => {
    setEditing(pkg);
    setForm({
      name: pkg.name || '', packageCode: pkg.packageCode || '', description: pkg.description || '',
      pricingModel: pkg.pricingModel || 'fixed', costPrice: String(pkg.costPrice || ''),
      sellingPrice: String(pkg.sellingPrice || ''), discountPercent: String(pkg.discountPercent || ''),
      taxRate: String(pkg.taxRate || ''), isActive: pkg.isActive !== false,
    });
    setPackageItems((pkg.items || []).map(it => ({
      serviceItemId: it.serviceItemId, quantity: String(it.quantity),
      sortOrder: String(it.sortOrder),
    })));
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Name is required'); return; }
    setSubmitting(true);
    try {
      const body = {
        ...form,
        costPrice: parseFloat(form.costPrice) || 0,
        sellingPrice: parseFloat(form.sellingPrice) || 0,
        discountPercent: parseFloat(form.discountPercent) || 0,
        taxRate: parseFloat(form.taxRate) || 0,
        items: packageItems.map((it, idx) => ({
          serviceItemId: it.serviceItemId,
          quantity: parseFloat(it.quantity) || 1,
          sortOrder: parseInt(it.sortOrder) || idx,
        })),
      };
      const url = editing ? `/api/service-packages/${editing.id}` : '/api/service-packages';
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(editing ? 'Package updated' : 'Package created');
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
      const res = await fetch(`/api/service-packages/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Package deleted');
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const packages = data?.data || [];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <Box className="h-5 w-5 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold">Service Packages</h2>
        </div>
        <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Package
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search packages..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9"
        />
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : packages.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">No service packages found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Create your first package to bundle services together</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <Card key={pkg.id} className="bg-white dark:bg-gray-900 hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-lg truncate">{pkg.name}</h3>
                      {pkg.packageCode && (
                        <p className="font-mono text-xs text-muted-foreground">{pkg.packageCode}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0 ml-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(pkg)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setDeleteTarget(pkg)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {pkg.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{pkg.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                    <span className="text-2xl font-bold text-emerald-600">{fmtBND(pkg.sellingPrice || 0)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pkg.itemCount !== undefined && (
                      <Badge variant="secondary">
                        <Package className="h-3 w-3 mr-1" /> {pkg.itemCount} items
                      </Badge>
                    )}
                    {pkg.pricingModel && (
                      <Badge variant="outline" className="capitalize">{pkg.pricingModel}</Badge>
                    )}
                    <Badge className={cn(
                      pkg.isActive !== false
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    )}>
                      {pkg.isActive !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between">
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
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Package' : 'Add Package'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea className="mt-1" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Package Code</Label>
                <Input className="mt-1" value={form.packageCode} onChange={(e) => setForm({ ...form, packageCode: e.target.value })} />
              </div>
              <div>
                <Label>Pricing Model</Label>
                <Select value={form.pricingModel} onValueChange={(v) => setForm({ ...form, pricingModel: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cost Price</Label>
                <Input type="number" step="0.01" className="mt-1" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
              </div>
              <div>
                <Label>Selling Price</Label>
                <Input type="number" step="0.01" className="mt-1" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Discount %</Label>
                <Input type="number" step="0.1" className="mt-1" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} />
              </div>
              <div>
                <Label>Tax Rate %</Label>
                <Input type="number" step="0.1" className="mt-1" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
              <Label>Active</Label>
            </div>

            {/* Package Items */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="font-semibold">Package Items</Label>
              {packageItems.map((item, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select value={item.serviceItemId} onValueChange={(v) => { const arr = [...packageItems]; arr[i] = { ...arr[i], serviceItemId: v }; setPackageItems(arr); }}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Service Item" /></SelectTrigger>
                      <SelectContent>
                        {serviceItemOptions.map(si => (
                          <SelectItem key={si.id} value={si.id}>
                            {si.name} {si.serviceCode ? `(${si.serviceCode})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20">
                    <Input type="number" className="h-9 text-sm" placeholder="Qty" value={item.quantity} onChange={(e) => { const arr = [...packageItems]; arr[i] = { ...arr[i], quantity: e.target.value }; setPackageItems(arr); }} />
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-red-500" onClick={() => setPackageItems(packageItems.filter((_, j) => j !== i))}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full" onClick={() => setPackageItems([...packageItems, { serviceItemId: '', quantity: '1', sortOrder: String(packageItems.length) }])}>
                <Plus className="h-4 w-4 mr-2" /> Add Item
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Update' : 'Create'} Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Package</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
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