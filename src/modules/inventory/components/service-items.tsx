'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Wrench, Plus, Search, Loader2, ChevronLeft, ChevronRight,
  Pencil, Trash2, DollarSign, CheckCircle, XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { Switch } from '@/shared/ui/switch';
import { Textarea } from '@/shared/ui/textarea';
import { Checkbox } from '@/shared/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/shared/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/core/utils/utils';

const token = () => localStorage.getItem('cmms_token') || '';
const fmtBND = (n: number) =>
  `B$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface ServiceItem {
  id: string;
  serviceCode: string;
  name: string;
  shortName?: string;
  description?: string;
  categoryId?: string;
  category?: string;
  subcategoryId?: string;
  subcategory?: string;
  department?: string;
  unitOfMeasure?: string;
  pricingModel?: string;
  costPrice?: number;
  sellingPrice?: number;
  discountPercent?: number;
  taxRate?: number;
  currency?: string;
  standardDuration?: number;
  labourHours?: number;
  techniciansRequired?: number;
  skillLevel?: string;
  technicianGrade?: string;
  overtimeEligible?: boolean;
  weekendRate?: number;
  holidayRate?: number;
  materials?: Array<{ materialName: string; quantity: number; unit: string; estimatedConsumption: number; isMandatory: boolean }>;
  equipment?: Array<{ equipmentName: string; quantity: number; isMandatory: boolean; calibrationRequired: boolean }>;
  checklist?: Array<{ task: string; description: string; sortOrder: number }>;
  isActive?: boolean;
}

interface Category { id: string; name: string; }
interface Subcategory { id: string; name: string; categoryId: string; }

const emptyForm = {
  name: '', shortName: '', description: '', categoryId: '', subcategoryId: '',
  department: '', unitOfMeasure: 'job', pricingModel: 'fixed',
  costPrice: '', sellingPrice: '', discountPercent: '', taxRate: '', currency: 'BND',
  standardDuration: '', labourHours: '', techniciansRequired: '', skillLevel: 'intermediate',
  technicianGrade: '', overtimeEligible: false, weekendRate: '', holidayRate: '',
  isActive: true,
};

export function ServiceItems() {
  const [data, setData] = useState<{ data: ServiceItem[]; total: number; page: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [pricingModelFilter, setPricingModelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [materials, setMaterials] = useState<Array<{ materialName: string; quantity: string; unit: string; estimatedConsumption: string; isMandatory: boolean }>>([]);
  const [equipment, setEquipment] = useState<Array<{ equipmentName: string; quantity: string; isMandatory: boolean; calibrationRequired: boolean }>>([]);
  const [checklist, setChecklist] = useState<Array<{ task: string; description: string; sortOrder: string }>>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category', categoryFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (pricingModelFilter) params.set('pricingModel', pricingModelFilter);
      const res = await fetch(`/api/service-items?${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      setData(json);
    } catch {
      toast.error('Failed to load service items');
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, statusFilter, pricingModelFilter]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/service-categories', {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      if (json.data) setCategories(json.data);
    } catch { /* silent */ }
  }, []);

  const fetchSubcategories = useCallback(async (catId: string) => {
    if (!catId) { setSubcategories([]); return; }
    try {
      const res = await fetch(`/api/service-categories`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      const cat = (json.data || []).find((c: Category & { subcategories?: string }) => c.id === catId);
      if (cat?.subcategories) {
        const subs = JSON.parse(cat.subcategories);
        setSubcategories(subs.map((s: string, i: number) => ({ id: `sub-${i}`, name: s, categoryId: catId })));
      } else {
        setSubcategories([]);
      }
    } catch { setSubcategories([]); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const resetForm = () => {
    setForm(emptyForm);
    setMaterials([]);
    setEquipment([]);
    setChecklist([]);
    setSubcategories([]);
    setEditing(null);
  };

  const openAdd = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (item: ServiceItem) => {
    setEditing(item);
    setForm({
      name: item.name || '', shortName: item.shortName || '', description: item.description || '',
      categoryId: item.categoryId || '', subcategoryId: item.subcategoryId || '',
      department: item.department || '', unitOfMeasure: item.unitOfMeasure || 'job',
      pricingModel: item.pricingModel || 'fixed', costPrice: String(item.costPrice || ''),
      sellingPrice: String(item.sellingPrice || ''), discountPercent: String(item.discountPercent || ''),
      taxRate: String(item.taxRate || ''), currency: item.currency || 'BND',
      standardDuration: String(item.standardDuration || ''), labourHours: String(item.labourHours || ''),
      techniciansRequired: String(item.techniciansRequired || ''), skillLevel: item.skillLevel || 'intermediate',
      technicianGrade: item.technicianGrade || '', overtimeEligible: item.overtimeEligible || false,
      weekendRate: String(item.weekendRate || ''), holidayRate: String(item.holidayRate || ''),
      isActive: item.isActive !== false,
    });
    setMaterials((item.materials || []).map(m => ({
      materialName: m.materialName, quantity: String(m.quantity), unit: m.unit,
      estimatedConsumption: String(m.estimatedConsumption), isMandatory: m.isMandatory,
    })));
    setEquipment((item.equipment || []).map(e => ({
      equipmentName: e.equipmentName, quantity: String(e.quantity),
      isMandatory: e.isMandatory, calibrationRequired: e.calibrationRequired,
    })));
    setChecklist((item.checklist || []).map(c => ({
      task: c.task, description: c.description, sortOrder: String(c.sortOrder),
    })));
    if (item.categoryId) fetchSubcategories(item.categoryId);
    setDialogOpen(true);
  };

  const handleCategoryChange = (catId: string) => {
    setForm(f => ({ ...f, categoryId: catId, subcategoryId: '' }));
    fetchSubcategories(catId);
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
        standardDuration: parseFloat(form.standardDuration) || 0,
        labourHours: parseFloat(form.labourHours) || 0,
        techniciansRequired: parseInt(form.techniciansRequired) || 0,
        weekendRate: parseFloat(form.weekendRate) || 0,
        holidayRate: parseFloat(form.holidayRate) || 0,
        materials: materials.map(m => ({
          materialName: m.materialName, quantity: parseFloat(m.quantity) || 0,
          unit: m.unit, estimatedConsumption: parseFloat(m.estimatedConsumption) || 0,
          isMandatory: m.isMandatory,
        })),
        equipment: equipment.map(e => ({
          equipmentName: e.equipmentName, quantity: parseFloat(e.quantity) || 0,
          isMandatory: e.isMandatory, calibrationRequired: e.calibrationRequired,
        })),
        checklist: checklist.map(c => ({
          task: c.task, description: c.description, sortOrder: parseInt(c.sortOrder) || 0,
        })),
      };
      const url = editing ? `/api/service-items/${editing.id}` : '/api/service-items';
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(editing ? 'Service item updated' : 'Service item created');
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
      const res = await fetch(`/api/service-items/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Service item deleted');
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const items = data?.data || [];
  const totalItems = data?.total || 0;
  const activeCount = items.filter(i => i.isActive !== false).length;
  const inactiveCount = totalItems - activeCount;
  const avgPrice = items.length > 0
    ? items.reduce((s, i) => s + (i.sellingPrice || 0), 0) / items.length : 0;

  const profitMargin = (() => {
    const sp = parseFloat(form.sellingPrice) || 0;
    const cp = parseFloat(form.costPrice) || 0;
    if (sp <= 0) return '0.0%';
    return ((sp - cp) / sp * 100).toFixed(1) + '%';
  })();

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <Wrench className="h-5 w-5 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold">Service Items</h2>
        </div>
        <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Service Item
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Total Services</p>
            <p className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-16 inline-block" /> : totalItems}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/40 dark:border-green-800">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Active</p>
            <p className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-16 inline-block" /> : activeCount}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50 dark:bg-gray-800/40 dark:border-gray-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Inactive</p>
            <p className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-16 inline-block" /> : inactiveCount}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Avg Price</p>
            <p className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-24 inline-block" /> : fmtBND(avgPrice)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search service items..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={pricingModelFilter} onValueChange={(v) => { setPricingModelFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Pricing Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Models</SelectItem>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Active</Label>
              <Switch
                checked={statusFilter !== 'inactive'}
                onCheckedChange={(checked) => {
                  setStatusFilter(checked ? (statusFilter === '' ? '' : 'active') : 'inactive');
                  setPage(1);
                }}
              />
            </div>
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
                  <TableHead>Service Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Pricing Model</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead className="text-right">Duration (hrs)</TableHead>
                  <TableHead className="text-right">Labour (hrs)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No service items found
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.serviceCode || '—'}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category || '—'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{item.pricingModel || 'fixed'}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{fmtBND(item.sellingPrice || 0)}</TableCell>
                      <TableCell className="text-right">{item.standardDuration ?? '—'}</TableCell>
                      <TableCell className="text-right">{item.labourHours ?? '—'}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          item.isActive !== false
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        )}>
                          {item.isActive !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setDeleteTarget(item)}>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Service Item' : 'Add Service Item'}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="w-full flex flex-wrap">
              <TabsTrigger value="general" className="flex-1 text-xs">General</TabsTrigger>
              <TabsTrigger value="pricing" className="flex-1 text-xs">Pricing</TabsTrigger>
              <TabsTrigger value="labour" className="flex-1 text-xs">Labour</TabsTrigger>
              <TabsTrigger value="materials" className="flex-1 text-xs">Materials</TabsTrigger>
              <TabsTrigger value="equipment" className="flex-1 text-xs">Equipment</TabsTrigger>
              <TabsTrigger value="checklist" className="flex-1 text-xs">Checklist</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-3 mt-3">
              <div>
                <Label>Name *</Label>
                <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Short Name</Label>
                  <Input className="mt-1" value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} />
                </div>
                <div>
                  <Label>Department</Label>
                  <Input className="mt-1" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea className="mt-1" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={form.categoryId} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subcategory</Label>
                  <Select value={form.subcategoryId} onValueChange={(v) => setForm({ ...form, subcategoryId: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select subcategory" /></SelectTrigger>
                    <SelectContent>
                      {subcategories.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Unit of Measure</Label>
                  <Select value={form.unitOfMeasure} onValueChange={(v) => setForm({ ...form, unitOfMeasure: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="job">Job</SelectItem>
                      <SelectItem value="hour">Hour</SelectItem>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="visit">Visit</SelectItem>
                    </SelectContent>
                  </Select>
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
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
                <Label>Active</Label>
              </div>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="space-y-3 mt-3">
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Currency</Label>
                  <Input className="mt-1" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
                </div>
                <div>
                  <Label>Profit Margin</Label>
                  <Input className="mt-1 bg-muted" value={profitMargin} readOnly />
                </div>
              </div>
            </TabsContent>

            {/* Labour Tab */}
            <TabsContent value="labour" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Standard Duration (hrs)</Label>
                  <Input type="number" step="0.5" className="mt-1" value={form.standardDuration} onChange={(e) => setForm({ ...form, standardDuration: e.target.value })} />
                </div>
                <div>
                  <Label>Labour Hours</Label>
                  <Input type="number" step="0.5" className="mt-1" value={form.labourHours} onChange={(e) => setForm({ ...form, labourHours: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Technicians Required</Label>
                  <Input type="number" className="mt-1" value={form.techniciansRequired} onChange={(e) => setForm({ ...form, techniciansRequired: e.target.value })} />
                </div>
                <div>
                  <Label>Skill Level</Label>
                  <Select value={form.skillLevel} onValueChange={(v) => setForm({ ...form, skillLevel: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="junior">Junior</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="specialist">Specialist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Technician Grade</Label>
                  <Input className="mt-1" value={form.technicianGrade} onChange={(e) => setForm({ ...form, technicianGrade: e.target.value })} />
                </div>
                <div className="flex items-end gap-3 pb-1">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.overtimeEligible} onCheckedChange={(checked) => setForm({ ...form, overtimeEligible: checked })} />
                    <Label>Overtime Eligible</Label>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Weekend Rate</Label>
                  <Input type="number" step="0.01" className="mt-1" value={form.weekendRate} onChange={(e) => setForm({ ...form, weekendRate: e.target.value })} />
                </div>
                <div>
                  <Label>Holiday Rate</Label>
                  <Input type="number" step="0.01" className="mt-1" value={form.holidayRate} onChange={(e) => setForm({ ...form, holidayRate: e.target.value })} />
                </div>
              </div>
            </TabsContent>

            {/* Materials Tab */}
            <TabsContent value="materials" className="space-y-3 mt-3">
              {materials.map((m, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-3">
                    {i === 0 && <Label className="text-xs">Material Name</Label>}
                    <Input className="mt-1" value={m.materialName} onChange={(e) => { const arr = [...materials]; arr[i] = { ...arr[i], materialName: e.target.value }; setMaterials(arr); }} />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <Label className="text-xs">Qty</Label>}
                    <Input type="number" className="mt-1" value={m.quantity} onChange={(e) => { const arr = [...materials]; arr[i] = { ...arr[i], quantity: e.target.value }; setMaterials(arr); }} />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <Label className="text-xs">Unit</Label>}
                    <Input className="mt-1" value={m.unit} onChange={(e) => { const arr = [...materials]; arr[i] = { ...arr[i], unit: e.target.value }; setMaterials(arr); }} />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <Label className="text-xs">Consumption</Label>}
                    <Input type="number" className="mt-1" value={m.estimatedConsumption} onChange={(e) => { const arr = [...materials]; arr[i] = { ...arr[i], estimatedConsumption: e.target.value }; setMaterials(arr); }} />
                  </div>
                  <div className="col-span-2 flex items-end gap-2 pb-1">
                    <div className="flex items-center gap-1">
                      <Checkbox checked={m.isMandatory} onCheckedChange={(checked) => { const arr = [...materials]; arr[i] = { ...arr[i], isMandatory: !!checked }; setMaterials(arr); }} />
                      <span className="text-xs">Req</span>
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-end pb-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setMaterials(materials.filter((_, j) => j !== i))}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full" onClick={() => setMaterials([...materials, { materialName: '', quantity: '', unit: '', estimatedConsumption: '', isMandatory: false }])}>
                <Plus className="h-4 w-4 mr-2" /> Add Material
              </Button>
            </TabsContent>

            {/* Equipment Tab */}
            <TabsContent value="equipment" className="space-y-3 mt-3">
              {equipment.map((eq, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    {i === 0 && <Label className="text-xs">Equipment Name</Label>}
                    <Input className="mt-1" value={eq.equipmentName} onChange={(e) => { const arr = [...equipment]; arr[i] = { ...arr[i], equipmentName: e.target.value }; setEquipment(arr); }} />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <Label className="text-xs">Qty</Label>}
                    <Input type="number" className="mt-1" value={eq.quantity} onChange={(e) => { const arr = [...equipment]; arr[i] = { ...arr[i], quantity: e.target.value }; setEquipment(arr); }} />
                  </div>
                  <div className="col-span-2 flex items-end gap-2 pb-1">
                    <div className="flex items-center gap-1">
                      <Checkbox checked={eq.isMandatory} onCheckedChange={(checked) => { const arr = [...equipment]; arr[i] = { ...arr[i], isMandatory: !!checked }; setEquipment(arr); }} />
                      <span className="text-xs">Req</span>
                    </div>
                  </div>
                  <div className="col-span-3 flex items-end gap-2 pb-1">
                    <div className="flex items-center gap-1">
                      <Checkbox checked={eq.calibrationRequired} onCheckedChange={(checked) => { const arr = [...equipment]; arr[i] = { ...arr[i], calibrationRequired: !!checked }; setEquipment(arr); }} />
                      <span className="text-xs">Calibration</span>
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-end pb-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setEquipment(equipment.filter((_, j) => j !== i))}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full" onClick={() => setEquipment([...equipment, { equipmentName: '', quantity: '', isMandatory: false, calibrationRequired: false }])}>
                <Plus className="h-4 w-4 mr-2" /> Add Equipment
              </Button>
            </TabsContent>

            {/* Checklist Tab */}
            <TabsContent value="checklist" className="space-y-3 mt-3">
              {checklist.map((c, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    {i === 0 && <Label className="text-xs">Task</Label>}
                    <Input className="mt-1" value={c.task} onChange={(e) => { const arr = [...checklist]; arr[i] = { ...arr[i], task: e.target.value }; setChecklist(arr); }} />
                  </div>
                  <div className="col-span-5">
                    {i === 0 && <Label className="text-xs">Description</Label>}
                    <Input className="mt-1" value={c.description} onChange={(e) => { const arr = [...checklist]; arr[i] = { ...arr[i], description: e.target.value }; setChecklist(arr); }} />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <Label className="text-xs">Sort Order</Label>}
                    <Input type="number" className="mt-1" value={c.sortOrder} onChange={(e) => { const arr = [...checklist]; arr[i] = { ...arr[i], sortOrder: e.target.value }; setChecklist(arr); }} />
                  </div>
                  <div className="col-span-1 flex justify-end pb-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setChecklist(checklist.filter((_, j) => j !== i))}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full" onClick={() => setChecklist([...checklist, { task: '', description: '', sortOrder: String(checklist.length) }])}>
                <Plus className="h-4 w-4 mr-2" /> Add Task
              </Button>
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Update' : 'Create'} Service Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Service Item</DialogTitle>
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