'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Search, ClipboardList, Clock, Loader2, ChevronLeft, ChevronRight, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import type { WorkOrderItem, PaginatedResponse, SelectOption } from '@/types';

function StatusBadge({ status }: { status: string }) {
  const v: Record<string, string> = {
    OPEN: 'bg-amber-100 text-amber-800', ASSIGNED: 'bg-sky-100 text-sky-800',
    IN_PROGRESS: 'bg-purple-100 text-purple-800', RESOLVED: 'bg-emerald-100 text-emerald-800',
    CLOSED: 'bg-gray-100 text-gray-600', COMPLETED: 'bg-emerald-100 text-emerald-800',
    PENDING: 'bg-amber-100 text-amber-800', PAID: 'bg-emerald-100 text-emerald-800',
    OVERDUE: 'bg-rose-100 text-rose-800', DRAFT: 'bg-gray-100 text-gray-600',
    APPROVED: 'bg-teal-100 text-teal-800', SENT: 'bg-sky-100 text-sky-800',
    REJECTED: 'bg-rose-100 text-rose-800', CANCELLED: 'bg-gray-100 text-gray-600',
    active: 'bg-emerald-100 text-emerald-800', inactive: 'bg-gray-100 text-gray-600',
    maintenance: 'bg-amber-100 text-amber-800',
  };
  return <Badge variant="outline" className={v[status] || ''}>{status.replace(/_/g, ' ')}</Badge>;
}

function TypeBadge({ type }: { type: string }) {
  const v: Record<string, string> = {
    corrective: 'bg-amber-100 text-amber-800',
    preventive: 'bg-emerald-100 text-emerald-800',
    emergency: 'bg-rose-100 text-rose-800',
  };
  return <Badge variant="outline" className={v[type] || ''}>{type}</Badge>;
}

const token = () => localStorage.getItem('cmms_token') || '';

export function WorkOrderList() {
  const setView = useAppStore((s) => s.setView);
  const [data, setData] = useState<PaginatedResponse<WorkOrderItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', equipmentId: '', type: 'corrective', priority: 'medium', assignedToId: '', scheduledDate: '' });
  const [equipment, setEquipment] = useState<SelectOption[]>([]);
  const [technicians, setTechnicians] = useState<SelectOption[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`/api/work-orders?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      setData(json);
    } catch { toast.error('Failed to load work orders'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchDropdowns = async () => {
    try {
      const [eqRes, techRes] = await Promise.all([
        fetch('/api/equipment?pageSize=100', { headers: { Authorization: `Bearer ${token()}` } }),
        fetch('/api/employees?role=technician&pageSize=100', { headers: { Authorization: `Bearer ${token()}` } }),
      ]);
      const eqJson = await eqRes.json();
      const techJson = await techRes.json();
      setEquipment((eqJson.data || []).map((e: { id: string; name: string; assetNumber: string }) => ({ label: `${e.name} (${e.assetNumber})`, value: e.id })));
      setTechnicians((techJson.data || []).map((e: { id: string; name: string }) => ({ label: e.name, value: e.id })));
    } catch { /* silent */ }
  };

  const handleSubmit = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success('Work order created');
      setDialogOpen(false);
      setForm({ title: '', description: '', equipmentId: '', type: 'corrective', priority: 'medium', assignedToId: '', scheduledDate: '' });
      fetchData();
    } catch { toast.error('Failed to create work order'); }
    finally { setSubmitting(false); }
  };

  const stats = [
    { label: 'Total', value: data?.total ?? 0, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { label: 'Pending', value: (data?.data || []).filter((w) => w.status === 'PENDING').length, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { label: 'In Progress', value: (data?.data || []).filter((w) => w.status === 'IN_PROGRESS').length, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { label: 'Completed', value: (data?.data || []).filter((w) => w.status === 'COMPLETED').length, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold">Work Orders</h1>
        </div>
        <Button onClick={() => setView('new-work-order')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> New Work Order
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className={`border ${s.color}`}>
            <CardContent className="p-4">
              <p className="text-xs font-medium opacity-75">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search work orders..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="corrective">Corrective</SelectItem>
                <SelectItem value="preventive">Preventive</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
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
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                )) : (data?.data || []).length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No work orders found</TableCell></TableRow>
                ) : (data?.data || []).map((wo) => (
                  <TableRow key={wo.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setView('work-order-detail', { id: wo.id })}>
                    <TableCell className="font-mono text-xs">{wo.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{wo.title}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{wo.equipmentName || '—'}</TableCell>
                    <TableCell><TypeBadge type={wo.type} /></TableCell>
                    <TableCell><span className="capitalize text-sm">{wo.priority}</span></TableCell>
                    <TableCell><StatusBadge status={wo.status} /></TableCell>
                    <TableCell>{wo.assignedToName || '—'}</TableCell>
                    <TableCell className="text-sm">{wo.scheduledDate ? new Date(wo.scheduledDate).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setView('work-order-detail', { id: wo.id }); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">Page {data.page} of {data.totalPages} ({data.total} total)</p>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New WO Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Work Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Work order title" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the work..." rows={3} /></div>
            <div><Label>Equipment</Label>
              <Select value={form.equipmentId} onValueChange={(v) => setForm({ ...form, equipmentId: v })}>
                <SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger>
                <SelectContent>{equipment.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrective">Corrective</SelectItem>
                    <SelectItem value="preventive">Preventive</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Assigned To</Label>
              <Select value={form.assignedToId} onValueChange={(v) => setForm({ ...form, assignedToId: v })}>
                <SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger>
                <SelectContent>{technicians.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Scheduled Date</Label><Input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}