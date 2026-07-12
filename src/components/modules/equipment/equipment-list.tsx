'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  X,
  Eye,
  Pencil,
  Trash2,
  QrCode,
  Wind,
  Zap,
  Droplets,
  Battery,
  Cog,
  ShieldAlert,
  Wrench,
  Monitor,
  Layers,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore, useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import type {
  EquipmentItem,
  EquipmentCategory,
  EquipmentStatus,
  PaginatedResponse,
  CustomerData,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

// ============ HELPERS ============

const CATEGORY_OPTIONS: EquipmentCategory[] = [
  'HVAC',
  'Electrical',
  'Plumbing',
  'Generator',
  'Mechanical',
  'FireProtection',
];

const STATUS_OPTIONS: EquipmentStatus[] = [
  'active',
  'inactive',
  'under_maintenance',
  'decommissioned',
];

function CategoryIcon({ category }: { category: string }) {
  const icons: Record<string, LucideIcon> = {
    HVAC: Wind,
    Electrical: Zap,
    Plumbing: Droplets,
    Generator: Battery,
    Mechanical: Cog,
    FireProtection: ShieldAlert,
  };
  const Icon = icons[category] || Wrench;
  return <Icon className="h-4 w-4" />;
}

function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    HVAC: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    Electrical: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    Plumbing: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    Generator: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    Mechanical: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    FireProtection: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  };
  return colors[category] || 'bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300 border-gray-200 dark:border-gray-800';
}

function getStatusColor(status: EquipmentStatus) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300 border-gray-200 dark:border-gray-800',
    under_maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    decommissioned: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  };
  return colors[status] || colors.inactive;
}

function formatStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active: 'Active',
    inactive: 'Inactive',
    under_maintenance: 'Under Maintenance',
    decommissioned: 'Decommissioned',
  };
  return labels[status] || status;
}

// ============ MAIN COMPONENT ============

interface EquipmentFormData {
  name: string;
  category: EquipmentCategory;
  customerId: string;
  brand: string;
  model: string;
  serialNumber: string;
  location: string;
  status: EquipmentStatus;
  notes: string;
}

const defaultFormData: EquipmentFormData = {
  name: '',
  category: 'HVAC',
  customerId: '',
  brand: '',
  model: '',
  serialNumber: '',
  location: '',
  status: 'active',
  notes: '',
};

export function EquipmentList() {
  const { user } = useAuthStore();
  const { setView } = useAppStore();
  const token = typeof window !== 'undefined' ? localStorage.getItem('cmms_token') : null;

  // Data state
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, underMaintenance: 0, inactive: 0 });

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EquipmentFormData>(defaultFormData);
  const [formSaving, setFormSaving] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // QR dialog
  const [qrOpen, setQrOpen] = useState(false);
  const [qrItem, setQrItem] = useState<EquipmentItem | null>(null);

  // Customers
  const [customers, setCustomers] = useState<CustomerData[]>([]);

  const canAdd = user?.role && ['super_admin', 'admin', 'manager'].includes(user.role);

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/customers?pageSize=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: PaginatedResponse<CustomerData> = await res.json();
      if (data.data) setCustomers(data.data);
    } catch {
      // ignore
    }
  }, [token]);

  // Fetch equipment
  const fetchEquipment = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category', categoryFilter);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/equipment?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: PaginatedResponse<EquipmentItem> = await res.json();
      if (data.data) {
        setEquipment(data.data);
        setTotal(data.total);
      }
    } catch {
      toast.error('Failed to load equipment');
    } finally {
      setLoading(false);
    }
  }, [token, page, pageSize, search, categoryFilter, statusFilter]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const resTotal = await fetch('/api/equipment?pageSize=1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dTotal = await resTotal.json();
      const total = dTotal.total || 0;

      const resActive = await fetch('/api/equipment?status=active&pageSize=1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dActive = await resActive.json();

      const resMaint = await fetch('/api/equipment?status=under_maintenance&pageSize=1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dMaint = await resMaint.json();

      const resInactive = await fetch('/api/equipment?status=inactive&pageSize=1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dInactive = await resInactive.json();

      setStats({
        total,
        active: dActive.total || 0,
        underMaintenance: dMaint.total || 0,
        inactive: dInactive.total || 0,
      });
    } catch {
      // ignore
    }
  }, [token]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  useEffect(() => {
    fetchStats();
    fetchCustomers();
  }, [fetchStats, fetchCustomers]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, statusFilter]);

  const totalPages = Math.ceil(total / pageSize);

  // Form handlers
  const openAddForm = () => {
    setEditingId(null);
    setFormData(defaultFormData);
    setFormOpen(true);
  };

  const openEditForm = (item: EquipmentItem) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      category: item.category,
      customerId: item.customerId || '',
      brand: item.brand || '',
      model: item.model || '',
      serialNumber: item.serialNumber || '',
      location: item.location || '',
      status: item.status,
      notes: item.notes || '',
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!token || !formData.name.trim()) {
      toast.error('Equipment name is required');
      return;
    }
    setFormSaving(true);
    try {
      const url = editingId ? `/api/equipment/${editingId}` : '/api/equipment';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          customerId: formData.customerId || undefined,
          brand: formData.brand || undefined,
          model: formData.model || undefined,
          serialNumber: formData.serialNumber || undefined,
          location: formData.location || undefined,
          status: formData.status,
          notes: formData.notes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save equipment');
      }
      toast.success(editingId ? 'Equipment updated' : 'Equipment created');
      setFormOpen(false);
      fetchEquipment();
      fetchStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save equipment');
    } finally {
      setFormSaving(false);
    }
  };

  const openDelete = (item: EquipmentItem) => {
    setDeletingId(item.id);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!token || !deletingId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/equipment/${deletingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Equipment deleted');
      setDeleteOpen(false);
      setDeletingId(null);
      fetchEquipment();
      fetchStats();
    } catch {
      toast.error('Failed to delete equipment');
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const hasFilters = search || categoryFilter || statusFilter;

  // ============ RENDER ============

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipment Registry</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage and track all equipment assets across your facilities
          </p>
        </div>
        {canAdd && (
          <Button onClick={openAddForm} className="shrink-0">
            <Plus className="h-4 w-4" />
            Add Equipment
          </Button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                <Monitor className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Equipment</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                <Layers className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.underMaintenance}</p>
                <p className="text-xs text-muted-foreground">Under Maintenance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inactive}</p>
                <p className="text-xs text-muted-foreground">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, asset number, brand, model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORY_OPTIONS.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-[170px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {formatStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters} className="shrink-0">
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Equipment Table (Desktop) */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : equipment.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Monitor className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">No equipment found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Complaints</TableHead>
                  <TableHead className="text-center">WOs</TableHead>
                  <TableHead>QR</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => setView('equipment-detail', { id: item.id })}
                  >
                    <TableCell className="font-mono text-xs">{item.assetNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CategoryIcon category={item.category} />
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs', getCategoryColor(item.category))}>
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.customerName || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{item.location || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs', getStatusColor(item.status))}>
                        {formatStatusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{item._count?.complaints || 0}</TableCell>
                    <TableCell className="text-center">{item._count?.workOrders || 0}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQrItem(item);
                          setQrOpen(true);
                        }}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setView('equipment-detail', { id: item.id });
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canAdd && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditForm(item);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDelete(item);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Equipment Cards (Mobile) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))
        ) : equipment.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
              <Monitor className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">No equipment found</p>
            </CardContent>
          </Card>
        ) : (
          equipment.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors"
              onClick={() => setView('equipment-detail', { id: item.id })}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CategoryIcon category={item.category} />
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{item.assetNumber}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className={cn('text-xs', getCategoryColor(item.category))}>
                      {item.category}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {item.location || 'No location'}
                  </div>
                  <Badge variant="outline" className={cn('text-xs', getStatusColor(item.status))}>
                    {formatStatusLabel(item.status)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{item._count?.complaints || 0} complaints</span>
                    <span>{item._count?.workOrders || 0} WOs</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQrItem(item);
                        setQrOpen(true);
                      }}
                    >
                      <QrCode className="h-3.5 w-3.5" />
                    </Button>
                    {canAdd && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditForm(item);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDelete(item);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page <= 1}
            onClick={() => setPage(1)}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-3">
            Page {page} of {totalPages} ({total} items)
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page >= totalPages}
            onClick={() => setPage(totalPages)}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Add/Edit Equipment Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Equipment' : 'Add New Equipment'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update equipment details below.' : 'Fill in the details to register new equipment.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="eq-name">Name *</Label>
              <Input
                id="eq-name"
                placeholder="Equipment name"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="eq-category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData((f) => ({ ...f, category: v as EquipmentCategory }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="eq-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData((f) => ({ ...f, status: v as EquipmentStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="eq-customer">Customer</Label>
              <Select
                value={formData.customerId}
                onValueChange={(v) => setFormData((f) => ({ ...f, customerId: v === 'none' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="eq-brand">Brand</Label>
                <Input
                  id="eq-brand"
                  placeholder="Brand"
                  value={formData.brand}
                  onChange={(e) => setFormData((f) => ({ ...f, brand: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="eq-model">Model</Label>
                <Input
                  id="eq-model"
                  placeholder="Model"
                  value={formData.model}
                  onChange={(e) => setFormData((f) => ({ ...f, model: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="eq-serial">Serial Number</Label>
                <Input
                  id="eq-serial"
                  placeholder="Serial number"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData((f) => ({ ...f, serialNumber: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="eq-location">Location</Label>
                <Input
                  id="eq-location"
                  placeholder="Location / Site"
                  value={formData.location}
                  onChange={(e) => setFormData((f) => ({ ...f, location: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="eq-notes">Notes</Label>
              <Textarea
                id="eq-notes"
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={formSaving}>
              {formSaving ? 'Saving...' : editingId ? 'Update Equipment' : 'Create Equipment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Equipment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this equipment? This action cannot be undone. All related complaints and work orders will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Code Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
            <DialogDescription>
              Scan this code to identify the equipment
            </DialogDescription>
          </DialogHeader>
          {qrItem && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-48 h-48 bg-white dark:bg-gray-900 border-2 border-dashed border-muted-foreground/30 rounded-xl flex items-center justify-center p-4">
                <div className="text-center space-y-2">
                  <QrCode className="h-16 w-16 mx-auto text-emerald-600 dark:text-emerald-400" />
                  <p className="text-xs font-mono font-medium break-all">{qrItem.qrCode || qrItem.assetNumber}</p>
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium text-sm">{qrItem.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{qrItem.assetNumber}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
