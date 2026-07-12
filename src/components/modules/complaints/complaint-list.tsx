'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, X, Eye, AlertTriangle, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight,
  MessageSquare, CircleDot, UserCheck, Play, CheckCircle2, XCircle, Circle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore, useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type {
  ComplaintItem, ComplaintStatus, ComplaintPriority, PaginatedResponse, CustomerData, EquipmentItem,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// ============ HELPERS ============

const STATUS_PIPELINE: ComplaintStatus[] = [
  'NEW', 'ASSIGNED', 'ACCEPTED', 'WORK_ORDER_CREATED', 'IN_PROGRESS',
  'WAITING_CLIENT_CONFIRMATION', 'CLIENT_CONFIRMED', 'DRAFT_INVOICE',
  'INVOICE_APPROVED', 'INVOICE_SENT', 'PAID', 'CLOSED', 'REWORK_REQUIRED',
];

const PRIORITY_OPTIONS: ComplaintPriority[] = ['low', 'medium', 'high', 'critical'];

function getPriorityColor(priority: ComplaintPriority) {
  const colors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    critical: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  };
  return colors[priority] || colors.low;
}

function getStatusColor(status: ComplaintStatus) {
  const colors: Record<string, string> = {
    NEW: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    ASSIGNED: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    ACCEPTED: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    WORK_ORDER_CREATED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    WAITING_CLIENT_CONFIRMATION: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    CLIENT_CONFIRMED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    DRAFT_INVOICE: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 border-violet-200 dark:border-violet-800',
    INVOICE_APPROVED: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    INVOICE_SENT: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    PAID: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800',
    CLOSED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
    REWORK_REQUIRED: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  };
  return colors[status] || '';
}

function getStatusIcon(status: ComplaintStatus) {
  const icons: Record<string, typeof Circle> = {
    NEW: CircleDot,
    ASSIGNED: UserCheck,
    ACCEPTED: CheckCircle2,
    WORK_ORDER_CREATED: Circle,
    IN_PROGRESS: Play,
    WAITING_CLIENT_CONFIRMATION: Circle,
    CLIENT_CONFIRMED: CheckCircle2,
    DRAFT_INVOICE: Circle,
    INVOICE_APPROVED: Circle,
    INVOICE_SENT: Circle,
    PAID: CheckCircle2,
    CLOSED: XCircle,
    REWORK_REQUIRED: Circle,
  };
  return icons[status] || Circle;
}

const SHORT_STATUS: Record<string, string> = {
  NEW: 'New', ASSIGNED: 'Assigned', ACCEPTED: 'Accepted',
  WORK_ORDER_CREATED: 'WO Created', IN_PROGRESS: 'In Progress',
  WAITING_CLIENT_CONFIRMATION: 'Confirmation', CLIENT_CONFIRMED: 'Confirmed',
  DRAFT_INVOICE: 'Draft Inv.', INVOICE_APPROVED: 'Inv. Approved',
  INVOICE_SENT: 'Inv. Sent', PAID: 'Paid', CLOSED: 'Closed',
  REWORK_REQUIRED: 'Rework',
};

function getStatusBgColor(status: string) {
  const colors: Record<string, string> = {
    NEW: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
    ASSIGNED: 'bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800',
    ACCEPTED: 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200 dark:border-cyan-800',
    WORK_ORDER_CREATED: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800',
    IN_PROGRESS: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
    WAITING_CLIENT_CONFIRMATION: 'bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800',
    CLIENT_CONFIRMED: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
    DRAFT_INVOICE: 'bg-violet-50 dark:bg-violet-950/50 border-violet-200 dark:border-violet-800',
    INVOICE_APPROVED: 'bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800',
    INVOICE_SENT: 'bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800',
    PAID: 'bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800',
    CLOSED: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
    REWORK_REQUIRED: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800',
  };
  return colors[status] || 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700';
}

function getStatusActiveBg(status: string, isActive: boolean) {
  if (!isActive) return 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700';
  return getStatusBgColor(status);
}

// ============ MAIN COMPONENT ============

interface ComplaintFormData {
  title: string;
  description: string;
  priority: ComplaintPriority;
  category: string;
  customerId: string;
  equipmentId: string;
}

const defaultFormData: ComplaintFormData = {
  title: '',
  description: '',
  priority: 'medium',
  category: '',
  customerId: '',
  equipmentId: '',
};

export function ComplaintList() {
  const { user } = useAuthStore();
  const { setView } = useAppStore();
  const token = typeof window !== 'undefined' ? localStorage.getItem('cmms_token') : null;

  // Data state
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Status counts
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
    NEW: 0, ASSIGNED: 0, ACCEPTED: 0, WORK_ORDER_CREATED: 0, IN_PROGRESS: 0, WAITING_CLIENT_CONFIRMATION: 0, CLIENT_CONFIRMED: 0, DRAFT_INVOICE: 0, INVOICE_APPROVED: 0, INVOICE_SENT: 0, PAID: 0, CLOSED: 0, REWORK_REQUIRED: 0,
  });

  // New complaint dialog
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<ComplaintFormData>(defaultFormData);
  const [formSaving, setFormSaving] = useState(false);

  // Customers & Equipment
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);

  const canAdd = user?.role && ['super_admin', 'admin', 'manager', 'supervisor', 'customer'].includes(user.role);
  const canManage = user?.role && ['super_admin', 'admin', 'manager', 'supervisor'].includes(user.role);

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

  // Fetch complaints
  const fetchComplaints = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);

      const res = await fetch(`/api/complaints?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: PaginatedResponse<ComplaintItem> = await res.json();
      if (data.data) {
        setComplaints(data.data);
        setTotal(data.total);
      }
    } catch {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  }, [token, page, pageSize, search, statusFilter, priorityFilter]);

  // Fetch status counts
  const fetchStatusCounts = useCallback(async () => {
    if (!token) return;
    try {
      const counts: Record<string, number> = {};
      for (const status of STATUS_PIPELINE) {
        const res = await fetch(`/api/complaints?status=${status}&pageSize=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        counts[status] = data.total || 0;
      }
      setStatusCounts(counts);
    } catch {
      // ignore
    }
  }, [token]);

  // Fetch equipment for selected customer
  const fetchEquipmentForCustomer = useCallback(async (customerId: string) => {
    if (!token || !customerId) {
      setEquipmentList([]);
      return;
    }
    try {
      const res = await fetch(`/api/equipment?customerId=${customerId}&pageSize=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: PaginatedResponse<EquipmentItem> = await res.json();
      if (data.data) setEquipmentList(data.data);
    } catch {
      setEquipmentList([]);
    }
  }, [token]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  useEffect(() => {
    fetchStatusCounts();
    fetchCustomers();
  }, [fetchStatusCounts, fetchCustomers]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, priorityFilter]);

  const totalPages = Math.ceil(total / pageSize);

  const openAddForm = () => {
    setView('new-complaint');
  };

  const handleSubmit = async () => {
    if (!token || !formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setFormSaving(true);
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || undefined,
          priority: formData.priority,
          category: formData.category || undefined,
          customerId: formData.customerId || undefined,
          equipmentId: formData.equipmentId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create complaint');
      }
      toast.success('Complaint created');
      setFormOpen(false);
      fetchComplaints();
      fetchStatusCounts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create complaint');
    } finally {
      setFormSaving(false);
    }
  };

  const handleCustomerChange = (val: string) => {
    const customerId = val === 'none' ? '' : val;
    setFormData((f) => ({ ...f, customerId, equipmentId: '' }));
    fetchEquipmentForCustomer(customerId);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setPage(1);
  };

  const hasFilters = search || statusFilter || priorityFilter;

  // ============ RENDER ============

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Complaint Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track and manage customer complaints and service requests
          </p>
        </div>
        {canAdd && (
          <Button onClick={openAddForm} className="shrink-0">
            <Plus className="h-4 w-4" />
            New Complaint
          </Button>
        )}
      </div>

      {/* Status Pipeline */}
      <Card>
        <CardContent className="p-4">
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-2 min-w-max">
              <button
                onClick={() => setStatusFilter('')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all text-left shrink-0',
                  !statusFilter
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50'
                    : 'border-transparent bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <MessageSquare className={cn('h-4 w-4', !statusFilter ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')} />
                <div>
                  <p className="text-xs font-medium">All</p>
                  <p className="text-lg font-bold leading-tight">{Object.values(statusCounts).reduce((a, b) => a + b, 0)}</p>
                </div>
              </button>
              {STATUS_PIPELINE.map((status) => {
                const Icon = getStatusIcon(status);
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status === statusFilter ? '' : status)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all text-left shrink-0',
                      statusFilter === status
                        ? getStatusBgColor(status).replace('border-', 'border-emerald-500 border-2 ')
                        : 'border-transparent bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <Icon className={cn(
                      'h-4 w-4',
                      statusFilter === status ? 'text-foreground' : 'text-muted-foreground'
                    )} />
                    <div>
                      <p className="text-xs font-medium">{status.replace(/_/g, ' ')}</p>
                      <p className="text-lg font-bold leading-tight">{statusCounts[status] || 0}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Search & Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search complaints..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {PRIORITY_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
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

      {/* Complaints Table (Desktop) */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : complaints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertTriangle className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">No complaints found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => setView('complaint-detail', { id: item.id })}
                  >
                    <TableCell className="font-mono text-xs">{item.id.slice(0, 8)}...</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate max-w-[200px]">{item.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.customerName || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.equipmentName || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs', getPriorityColor(item.priority))}>
                        {item.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs', getStatusColor(item.status))}>
                        {SHORT_STATUS[item.status] || item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.assignedToName || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.createdAt ? format(new Date(item.createdAt), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setView('complaint-detail', { id: item.id });
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Complaints Cards (Mobile) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))
        ) : complaints.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
              <AlertTriangle className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">No complaints found</p>
            </CardContent>
          </Card>
        ) : (
          complaints.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors"
              onClick={() => setView('complaint-detail', { id: item.id })}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.customerName || 'No customer'}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className={cn('text-xs', getPriorityColor(item.priority))}>
                      {item.priority}
                    </Badge>
                    <Badge variant="outline" className={cn('text-xs', getStatusColor(item.status))}>
                      {SHORT_STATUS[item.status] || item.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {item.equipmentName && <span>{item.equipmentName}</span>}
                    <span className="font-mono">{item.id.slice(0, 8)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.createdAt ? format(new Date(item.createdAt), 'MMM d, yyyy') : ''}
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

      {/* New Complaint Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Complaint</DialogTitle>
            <DialogDescription>Submit a new complaint or service request.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="comp-title">Title *</Label>
              <Input
                id="comp-title"
                placeholder="Brief title for the complaint"
                value={formData.title}
                onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="comp-desc">Description</Label>
              <Textarea
                id="comp-desc"
                placeholder="Describe the issue in detail..."
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) => setFormData((f) => ({ ...f, priority: v as ComplaintPriority }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData((f) => ({ ...f, category: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="HVAC">HVAC</SelectItem>
                    <SelectItem value="Electrical">Electrical</SelectItem>
                    <SelectItem value="Plumbing">Plumbing</SelectItem>
                    <SelectItem value="Generator">Generator</SelectItem>
                    <SelectItem value="Mechanical">Mechanical</SelectItem>
                    <SelectItem value="FireProtection">Fire Protection</SelectItem>
                    <SelectItem value="General">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Customer</Label>
              <Select value={formData.customerId} onValueChange={handleCustomerChange}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.customerId && equipmentList.length > 0 && (
              <div className="grid gap-2">
                <Label>Equipment</Label>
                <Select
                  value={formData.equipmentId}
                  onValueChange={(v) => setFormData((f) => ({ ...f, equipmentId: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {equipmentList.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.name} ({eq.assetNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={formSaving}>
              {formSaving ? 'Submitting...' : 'Submit Complaint'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
