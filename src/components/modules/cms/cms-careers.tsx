'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Plus, Search, UserCog, Loader2, ChevronLeft, ChevronRight, Pencil, Trash2,
  AlertCircle, Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';

// ============ TYPES ============

interface CareerItem {
  id: string;
  title: string;
  department: string;
  description: string;
  requirements: string;
  salary: string;
  status: string;
  applicationDeadline: string;
  location: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============ CONSTANTS ============

const STATUS_OPTIONS = ['open', 'closed', 'filled'];
const TYPE_OPTIONS = ['fulltime', 'parttime', 'contract'];

const EMPTY_FORM = {
  title: '',
  department: '',
  description: '',
  requirements: '',
  salary: '',
  status: 'open',
  applicationDeadline: '',
  location: '',
  type: 'fulltime',
};

// ============ HELPERS ============

function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

function getStatusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    open: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    closed: 'bg-red-100 text-red-700 border-red-200',
    filled: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
}

function getTypeBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    fulltime: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    parttime: 'bg-amber-100 text-amber-700 border-amber-200',
    contract: 'bg-violet-100 text-violet-700 border-violet-200',
  };
  return colors[type] || 'bg-gray-100 text-gray-700 border-gray-200';
}

function formatTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    fulltime: 'Full-time',
    parttime: 'Part-time',
    contract: 'Contract',
  };
  return labels[type] || type;
}

function formatDeadline(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ============ COMPONENT ============

export function CmsCareers() {
  // List state
  const [data, setData] = useState<PaginatedData<CareerItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [error, setError] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, open: 0, closed: 0, filled: 0 });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ============ FETCH ============

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      if (departmentFilter && departmentFilter !== 'all') params.set('department', departmentFilter);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter);
      const res = await fetch(`/api/cms/careers?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
      // Compute stats
      const allItems = json.data as CareerItem[];
      setStats({
        total: json.total,
        open: allItems.filter((s) => s.status === 'open').length,
        closed: allItems.filter((s) => s.status === 'closed').length,
        filled: allItems.filter((s) => s.status === 'filled').length,
      });
    } catch {
      setError(true);
      toast.error('Failed to load careers');
    } finally {
      setLoading(false);
    }
  }, [page, search, departmentFilter, statusFilter, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ============ FORM HANDLERS ============

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (item: CareerItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      department: item.department,
      description: item.description,
      requirements: item.requirements,
      salary: item.salary,
      status: item.status,
      applicationDeadline: item.applicationDeadline ? item.applicationDeadline.slice(0, 16) : '',
      location: item.location,
      type: item.type,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.department) {
      toast.error('Title and department are required');
      return;
    }
    setSubmitting(true);
    try {
      const isEdit = !!editingId;
      const url = isEdit ? `/api/cms/careers/${editingId}` : '/api/cms/careers';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          ...form,
          applicationDeadline: form.applicationDeadline || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(isEdit ? 'Position updated' : 'Position created');
      setDialogOpen(false);
      fetchData();
    } catch {
      toast.error(`Failed to ${editingId ? 'update' : 'create'} position`);
    } finally {
      setSubmitting(false);
    }
  };

  // ============ DELETE ============

  const openDelete = (id: string) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cms/careers/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Position deleted');
      setDeleteOpen(false);
      setDeleteId(null);
      fetchData();
    } catch {
      toast.error('Failed to delete position');
    } finally {
      setDeleting(false);
    }
  };

  // ============ RENDER ============

  const items = data?.data || [];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Career Management</h1>
            <p className="text-sm text-muted-foreground">Manage job listings and applications</p>
          </div>
        </div>
        <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Position
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-emerald-200 bg-emerald-50 text-emerald-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Total</p>
            <p className="text-2xl font-bold">{data?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50 text-green-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Open</p>
            <p className="text-2xl font-bold">{stats.open}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 text-red-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Closed</p>
            <p className="text-2xl font-bold">{stats.closed}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50 text-blue-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Filled</p>
            <p className="text-2xl font-bold">{stats.filled}</p>
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
                placeholder="Search positions..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Input
              placeholder="Department filter..."
              value={departmentFilter === 'all' ? '' : departmentFilter}
              onChange={(e) => { setDepartmentFilter(e.target.value || 'all'); setPage(1); }}
              className="w-full sm:w-44"
            />
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>{formatTypeLabel(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          {error ? (
            <div className="flex items-center gap-3 p-6 text-rose-600">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load positions. Try refreshing.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Salary</TableHead>
                    <TableHead className="hidden sm:table-cell">Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No positions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.location}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{item.department}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getTypeBadgeColor(item.type)}>
                            {formatTypeLabel(item.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm">{item.salary || '—'}</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm">{formatDeadline(item.applicationDeadline)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusBadgeColor(item.status)}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => openDelete(item.id)}
                            >
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
          )}

        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {error ? (
          <Card className="border-rose-200 bg-rose-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <p className="text-rose-700">Failed to load positions. Try refreshing.</p>
            </CardContent>
          </Card>
        ) : loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p className="font-medium">No positions found</p>
            </CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm leading-tight">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.location || '—'} · {item.department}</p>
                  </div>
                  <Badge variant="outline" className={getStatusBadgeColor(item.status) + ' shrink-0'}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className={getTypeBadgeColor(item.type)}>
                    {formatTypeLabel(item.type)}
                  </Badge>
                  {item.salary && <span>{item.salary}</span>}
                  {item.applicationDeadline && <span>Due {formatDeadline(item.applicationDeadline)}</span>}
                </div>
                <div className="flex items-center justify-end gap-1 pt-2 border-t">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => openDelete(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <Card>
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {data.page} of {data.totalPages} ({data.total} total)
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Position' : 'Add Position'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                className="mt-1"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Job title"
              />
            </div>
            <div>
              <Label>Department *</Label>
              <Input
                className="mt-1"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="e.g. Engineering, Marketing"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                className="mt-1"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Job description"
                rows={3}
              />
            </div>
            <div>
              <Label>Requirements</Label>
              <Textarea
                className="mt-1"
                value={form.requirements}
                onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                placeholder="Comma-separated list or JSON array"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter requirements as a comma-separated list or JSON array
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Salary</Label>
                <Input
                  className="mt-1"
                  value={form.salary}
                  onChange={(e) => setForm({ ...form, salary: e.target.value })}
                  placeholder="e.g. $60k - $80k"
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  className="mt-1"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Remote, New York"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{formatTypeLabel(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Application Deadline</Label>
              <Input
                type="datetime-local"
                className="mt-1"
                value={form.applicationDeadline}
                onChange={(e) => setForm({ ...form, applicationDeadline: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Update Position' : 'Create Position'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Position</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this position? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}