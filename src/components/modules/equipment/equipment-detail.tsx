'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Edit,
  QrCode,
  Download,
  Wind,
  Zap,
  Droplets,
  Battery,
  Cog,
  ShieldAlert,
  Wrench,
  MapPin,
  Building2,
  Tag,
  Hash,
  User,
  FileText,
  Calendar,
  ClipboardList,
  Clock,
  Package,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore, useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type {
  EquipmentItem,
  EquipmentCategory,
  EquipmentStatus,
  ComplaintItem,
  WorkOrderItem,
  PmScheduleItem,
  PaginatedResponse,
  CustomerData,
} from '@/types';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

// ============ HELPERS ============

const CATEGORY_OPTIONS: EquipmentCategory[] = [
  'HVAC', 'Electrical', 'Plumbing', 'Generator', 'Mechanical', 'FireProtection',
];

const STATUS_OPTIONS: EquipmentStatus[] = [
  'active', 'inactive', 'under_maintenance', 'decommissioned',
];

function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const icons: Record<string, LucideIcon> = {
    HVAC: Wind, Electrical: Zap, Plumbing: Droplets,
    Generator: Battery, Mechanical: Cog, FireProtection: ShieldAlert,
  };
  const Icon = icons[category] || Wrench;
  return <Icon className={cn('h-5 w-5', className)} />;
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
    active: 'Active', inactive: 'Inactive',
    under_maintenance: 'Under Maintenance', decommissioned: 'Decommissioned',
  };
  return labels[status] || status;
}

function InfoField({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || '—'}</p>
      </div>
    </div>
  );
}

function ComplaintStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    OPEN: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    ASSIGNED: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    IN_PROGRESS: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    RESOLVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    CLOSED: 'bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300 border-gray-200 dark:border-gray-800',
  };
  return (
    <Badge variant="outline" className={cn('text-xs', colors[status] || '')}>
      {status}
    </Badge>
  );
}

function WoStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    IN_PROGRESS: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300 border-gray-200 dark:border-gray-800',
  };
  return (
    <Badge variant="outline" className={cn('text-xs', colors[status] || '')}>
      {status}
    </Badge>
  );
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

export function EquipmentDetail() {
  const { user } = useAuthStore();
  const { viewParams, setView } = useAppStore();
  const token = typeof window !== 'undefined' ? localStorage.getItem('cmms_token') : null;
  const equipmentId = viewParams?.id;

  const [item, setItem] = useState<EquipmentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>([]);
  const [pmSchedules, setPmSchedules] = useState<PmScheduleItem[]>([]);

  // Edit dialog
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<EquipmentFormData>({
    name: '', category: 'HVAC', customerId: '', brand: '', model: '',
    serialNumber: '', location: '', status: 'active', notes: '',
  });
  const [formSaving, setFormSaving] = useState(false);
  const [customers, setCustomers] = useState<CustomerData[]>([]);

  // QR dialog
  const [qrOpen, setQrOpen] = useState(false);

  const canEdit = user?.role && ['super_admin', 'admin', 'manager'].includes(user.role);

  // Fetch equipment
  const fetchEquipment = useCallback(async () => {
    if (!token || !equipmentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/equipment/${equipmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setItem(data);
    } catch {
      toast.error('Failed to load equipment');
      setView('equipment');
    } finally {
      setLoading(false);
    }
  }, [token, equipmentId, setView]);

  // Fetch complaints for this equipment
  const fetchComplaints = useCallback(async () => {
    if (!token || !equipmentId) return;
    try {
      const res = await fetch(`/api/complaints?equipmentId=${equipmentId}&pageSize=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: PaginatedResponse<ComplaintItem> = await res.json();
      if (data.data) setComplaints(data.data);
    } catch {
      // ignore
    }
  }, [token, equipmentId]);

  // Fetch work orders for this equipment
  const fetchWorkOrders = useCallback(async () => {
    if (!token || !equipmentId) return;
    try {
      const res = await fetch(`/api/work-orders?equipmentId=${equipmentId}&pageSize=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: PaginatedResponse<WorkOrderItem> = await res.json();
      if (data.data) setWorkOrders(data.data);
    } catch {
      // ignore
    }
  }, [token, equipmentId]);

  // Fetch PM schedules for this equipment
  const fetchPmSchedules = useCallback(async () => {
    if (!token || !equipmentId) return;
    try {
      const res = await fetch(`/api/pm?equipmentId=${equipmentId}&pageSize=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: PaginatedResponse<PmScheduleItem> = await res.json();
      if (data.data) setPmSchedules(data.data);
    } catch {
      // ignore
    }
  }, [token, equipmentId]);

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

  useEffect(() => {
    fetchEquipment();
    fetchComplaints();
    fetchWorkOrders();
    fetchPmSchedules();
    fetchCustomers();
  }, [fetchEquipment, fetchComplaints, fetchWorkOrders, fetchPmSchedules, fetchCustomers]);

  const openEditForm = () => {
    if (!item) return;
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
    if (!token || !item || !formData.name.trim()) {
      toast.error('Equipment name is required');
      return;
    }
    setFormSaving(true);
    try {
      const res = await fetch(`/api/equipment/${item.id}`, {
        method: 'PUT',
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
        throw new Error(err.error || 'Failed to update');
      }
      toast.success('Equipment updated');
      setFormOpen(false);
      fetchEquipment();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setFormSaving(false);
    }
  };

  // Parse specifications
  let parsedSpecs: Record<string, string> | null = null;
  if (item?.specifications) {
    try {
      parsedSpecs = JSON.parse(item.specifications);
    } catch {
      parsedSpecs = null;
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => setView('equipment')} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Equipment
      </Button>

      {/* Equipment Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                <CategoryIcon category={item.category} className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold">{item.name}</h1>
                  <Badge variant="outline" className={cn('text-xs', getCategoryColor(item.category))}>
                    {item.category}
                  </Badge>
                  <Badge variant="outline" className={cn('text-xs', getStatusColor(item.status))}>
                    {formatStatusLabel(item.status)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground font-mono">{item.assetNumber}</p>
                {item.customerName && (
                  <p className="text-sm text-muted-foreground">{item.customerName}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>
                <QrCode className="h-4 w-4" />
                QR Code
              </Button>
              {canEdit && (
                <Button size="sm" onClick={openEditForm}>
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            QR Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-52 h-52 bg-white dark:bg-gray-900 border-2 border-dashed border-muted-foreground/20 rounded-xl flex items-center justify-center p-6">
              <div className="text-center space-y-3">
                <QrCode className="h-20 w-20 mx-auto text-emerald-600 dark:text-emerald-400" />
                <p className="text-xs font-mono font-medium break-all leading-tight">{item.qrCode || item.assetNumber}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const text = item.qrCode || item.assetNumber;
                navigator.clipboard.writeText(text).then(
                  () => toast.success('QR code text copied'),
                  () => toast.error('Failed to copy')
                );
              }}
            >
              <Download className="h-4 w-4" />
              Copy QR Code Text
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Brand, Model, Serial, Location */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-2">Equipment Details</h3>
            <Separator className="mb-3" />
            <InfoField icon={Tag} label="Brand" value={item.brand} />
            <InfoField icon={Hash} label="Model" value={item.model} />
            <InfoField icon={Hash} label="Serial Number" value={item.serialNumber} />
            <InfoField icon={MapPin} label="Location" value={item.location} />
          </CardContent>
        </Card>

        {/* Customer, Install Date, Warranty, Specifications */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-2">Service Information</h3>
            <Separator className="mb-3" />
            <InfoField icon={Building2} label="Customer" value={item.customerName} />
            <InfoField
              icon={Calendar}
              label="Install Date"
              value={item.installDate ? format(new Date(item.installDate), 'MMM d, yyyy') : undefined}
            />
            <InfoField
              icon={Clock}
              label="Warranty Expiry"
              value={item.warrantyExpiry ? format(new Date(item.warrantyExpiry), 'MMM d, yyyy') : undefined}
            />
          </CardContent>
        </Card>

        {/* Specifications */}
        {parsedSpecs && Object.keys(parsedSpecs).length > 0 && (
          <Card className="md:col-span-2">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2">Specifications</h3>
              <Separator className="mb-3" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Object.entries(parsedSpecs).map(([key, val]) => (
                  <div key={key} className="space-y-1">
                    <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                    <p className="text-sm font-medium">{String(val)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {item.notes && (
          <Card className="md:col-span-2">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </h3>
              <Separator className="mb-3" />
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Related Complaints */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Related Complaints ({complaints.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {complaints.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No complaints found for this equipment</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complaints.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => setView('complaint-detail', { id: c.id })}
                    >
                      <TableCell className="font-mono text-xs">{c.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-medium text-sm">{c.title}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            c.priority === 'critical'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              : c.priority === 'high'
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800'
                                : c.priority === 'medium'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300 border-gray-200 dark:border-gray-800'
                          )}
                        >
                          {c.priority}
                        </Badge>
                      </TableCell>
                      <TableCell><ComplaintStatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.createdAt ? format(new Date(c.createdAt), 'MMM d, yyyy') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Related Work Orders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Related Work Orders ({workOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {workOrders.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No work orders found for this equipment</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workOrders.map((wo) => (
                    <TableRow
                      key={wo.id}
                      className="cursor-pointer"
                      onClick={() => setView('work-order-detail', { id: wo.id })}
                    >
                      <TableCell className="font-mono text-xs">{wo.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-medium text-sm">{wo.title}</TableCell>
                      <TableCell className="text-sm capitalize">{wo.type}</TableCell>
                      <TableCell><WoStatusBadge status={wo.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {wo.assignedToName || 'Unassigned'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PM History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            PM Schedules ({pmSchedules.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pmSchedules.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No PM schedules for this equipment</p>
          ) : (
            <div className="divide-y">
              {pmSchedules.map((pm) => (
                <div key={pm.id} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{pm.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Frequency: {pm.frequency}
                      {pm.customDays ? ` (${pm.customDays} days)` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Next Due</p>
                    <p className="text-sm font-medium">
                      {pm.nextDueDate ? format(new Date(pm.nextDueDate), 'MMM d, yyyy') : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Equipment</DialogTitle>
            <DialogDescription>Update equipment details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                placeholder="Equipment name"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData((f) => ({ ...f, category: v as EquipmentCategory }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData((f) => ({ ...f, status: v as EquipmentStatus }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Customer</Label>
              <Select
                value={formData.customerId}
                onValueChange={(v) => setFormData((f) => ({ ...f, customerId: v === 'none' ? '' : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
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
                <Label>Brand</Label>
                <Input
                  placeholder="Brand"
                  value={formData.brand}
                  onChange={(e) => setFormData((f) => ({ ...f, brand: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Model</Label>
                <Input
                  placeholder="Model"
                  value={formData.model}
                  onChange={(e) => setFormData((f) => ({ ...f, model: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Serial Number</Label>
                <Input
                  placeholder="Serial number"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData((f) => ({ ...f, serialNumber: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Location</Label>
                <Input
                  placeholder="Location"
                  value={formData.location}
                  onChange={(e) => setFormData((f) => ({ ...f, location: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
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
              {formSaving ? 'Saving...' : 'Update Equipment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
            <DialogDescription>Scan this code to identify the equipment</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-48 h-48 bg-white dark:bg-gray-900 border-2 border-dashed border-muted-foreground/30 rounded-xl flex items-center justify-center p-4">
              <div className="text-center space-y-2">
                <QrCode className="h-16 w-16 mx-auto text-emerald-600 dark:text-emerald-400" />
                <p className="text-xs font-mono font-medium break-all">{item.qrCode || item.assetNumber}</p>
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium text-sm">{item.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{item.assetNumber}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
