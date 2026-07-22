'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Filter,
  Eye,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Inbox,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/app-shell/store';
import { canPerformAction } from '@/core/permissions/rbac/permissions-matrix';
import { useInspectionStore } from '../lib/store';
import { STATUS_STYLES, PRIORITY_STYLES, RESULT_STYLES, formatDate } from './shared';
import type { InspectionItem, InspectionListResponse } from '../lib';
import { INSPECTION_TYPES } from '../lib';

interface InspectionsTabProps {
  searchQuery: string;
}

const PAGE_SIZE = 20;

export default function InspectionsTab({ searchQuery }: InspectionsTabProps) {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  const [inspections, setInspections] = useState<InspectionItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    type: '',
    priority: 'medium',
    equipmentId: '',
    assignedToId: '',
    templateId: '',
    scheduledDate: '',
    description: '',
  });
  const [creating, setCreating] = useState(false);

  // Listen for external create dialog trigger (from header button)
  const showCreateDialog = useInspectionStore((s) => s.showCreateDialog);
  const setShowCreateDialog = useInspectionStore((s) => s.setShowCreateDialog);
  useEffect(() => {
    if (showCreateDialog) {
      setCreateOpen(true);
      setShowCreateDialog(false);
    }
  }, [showCreateDialog, setShowCreateDialog]);

  const canCreate = role ? canPerformAction(role, 'inspection', 'create') : false;
  const canComplete = role ? canPerformAction(role, 'inspection', 'complete') : false;

  const loadInspections = useCallback(async () => {
    setLoading(true);
    try {
      const token = useAuthStore.getState().token;
      const h: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) h['Authorization'] = `Bearer ${token}`;

      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (searchQuery) params.set('q', searchQuery);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterPriority !== 'all') params.set('priority', filterPriority);
      if (filterType !== 'all') params.set('type', filterType);

      const res = await fetch(`/api/irms/inspections?${params}`, { headers: h });
      if (res.ok) {
        const data: InspectionListResponse = await res.json();
        setInspections(data.items ?? []);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, filterStatus, filterPriority, filterType]);

  useEffect(() => {
    loadInspections();
  }, [loadInspections]);

  const handleCreate = useCallback(async () => {
    if (!createForm.title || !createForm.scheduledDate) return;
    setCreating(true);
    try {
      const token = useAuthStore.getState().token;
      const h: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) h['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/irms/inspections', {
        method: 'POST',
        headers: h,
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        toast.success('Inspection created successfully');
        setCreateOpen(false);
        setCreateForm({ title: '', type: '', priority: 'medium', equipmentId: '', assignedToId: '', templateId: '', scheduledDate: '', description: '' });
        loadInspections();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to create inspection');
      }
    } catch {
      toast.error('Failed to create inspection');
    } finally {
      setCreating(false);
    }
  }, [createForm, loadInspections]);

  const statusOptions = ['all', 'scheduled', 'in_progress', 'completed', 'failed', 'overdue', 'cancelled'];
  const priorityOptions = ['all', 'low', 'medium', 'high', 'critical'];

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={showFilters ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
        >
          <Filter className="h-4 w-4" />
          Filters
        </Button>

        {canCreate && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="h-4 w-4" />
                Create Inspection
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Inspection</DialogTitle>
                <DialogDescription>Schedule a new equipment inspection.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="insp-title">Title *</Label>
                  <Input
                    id="insp-title"
                    placeholder="e.g. Monthly HVAC Inspection"
                    value={createForm.title}
                    onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Type</Label>
                    <Select value={createForm.type} onValueChange={(v) => setCreateForm((f) => ({ ...f, type: v }))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {INSPECTION_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Priority *</Label>
                    <Select value={createForm.priority} onValueChange={(v) => setCreateForm((f) => ({ ...f, priority: v }))}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.filter((p) => p !== 'all').map((p) => (
                          <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Equipment</Label>
                    <Input placeholder="Search equipment..." value={createForm.equipmentId} onChange={(e) => setCreateForm((f) => ({ ...f, equipmentId: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Assigned To</Label>
                    <Input placeholder="Search technician..." value={createForm.assignedToId} onChange={(e) => setCreateForm((f) => ({ ...f, assignedToId: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Template</Label>
                    <Input placeholder="Select template..." value={createForm.templateId} onChange={(e) => setCreateForm((f) => ({ ...f, templateId: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Scheduled Date *</Label>
                    <Input
                      type="date"
                      value={createForm.scheduledDate}
                      onChange={(e) => setCreateForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Add notes or description..."
                    rows={3}
                    value={createForm.description}
                    onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={creating || !createForm.title || !createForm.scheduledDate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Expandable filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
            <SelectTrigger size="sm" className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s === 'all' ? 'All Statuses' : s.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={(v) => { setFilterPriority(v); setPage(1); }}>
            <SelectTrigger size="sm" className="w-[130px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">{p === 'all' ? 'All Priorities' : p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
            <SelectTrigger size="sm" className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {INSPECTION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterStatus !== 'all' || filterPriority !== 'all' || filterType !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterStatus('all'); setFilterPriority('all'); setFilterType('all'); setPage(1); }}>
              Clear all
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : inspections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-600">
          <Inbox className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-sm font-medium">No inspections found</p>
          <p className="text-xs mt-1">Try adjusting your filters or create a new inspection</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Equipment</TableHead>
                <TableHead className="hidden lg:table-cell">Assigned To</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inspections.map((item) => (
                <TableRow key={item.id} className="cursor-pointer">
                  <TableCell className="font-mono text-xs text-gray-400">
                    {item.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {item.title}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-gray-500 max-w-[140px] truncate">
                    {item.equipmentName ?? '—'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-gray-500 max-w-[120px] truncate">
                    {item.assignedToName ?? '—'}
                  </TableCell>
                  <TableCell className="text-gray-500 text-xs">
                    {formatDate(item.scheduledDate)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`${STATUS_STYLES[item.status] ?? ''} text-[10px] px-1.5 py-0`}>
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`${PRIORITY_STYLES[item.priority] ?? ''} text-[10px] px-1.5 py-0 capitalize`}>
                      {item.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.result ? (
                      <Badge variant="secondary" className={`${RESULT_STYLES[item.result] ?? ''} text-[10px] px-1.5 py-0`}>
                        {item.result.toUpperCase()}
                      </Badge>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {canComplete && item.status === 'in_progress' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle complete
                          }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}