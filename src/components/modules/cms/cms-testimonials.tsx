'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, Search, MessageSquareQuote, Loader2, ChevronLeft, ChevronRight, Pencil, Trash2,
  AlertCircle, GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';

// ============ TYPES ============

interface TestimonialItem {
  id: string;
  customerName: string;
  company: string;
  photo: string;
  rating: number;
  comment: string;
  status: string;
  displayOrder: number;
  isEnabled: boolean;
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

const STATUS_OPTIONS = ['active', 'draft'] as const;

const RATING_OPTIONS = [1, 2, 3, 4, 5] as const;

const EMPTY_FORM = {
  customerName: '',
  company: '',
  photo: '',
  rating: 5,
  comment: '',
  status: 'active',
  displayOrder: 0,
  isEnabled: true,
};

// ============ HELPERS ============

function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

function getStatusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    draft: 'bg-amber-100 text-amber-700 border-amber-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
}

function renderStars(rating: number) {
  return (
    <span className="text-amber-400 tracking-wide">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

// ============ COMPONENT ============

export function CmsTestimonials() {
  // List state
  const [data, setData] = useState<PaginatedData<TestimonialItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, draft: 0 });

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

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/cms/testimonials?pageSize=1', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setStats({
        total: json.total || 0,
        active: json.active || 0,
        draft: json.draft || 0,
      });
    } catch {
      // silent
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/cms/testimonials?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
    } catch {
      setError(true);
      toast.error('Failed to load testimonials');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchData(); fetchStats(); }, [fetchData, fetchStats]);

  // ============ FORM HANDLERS ============

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (item: TestimonialItem) => {
    setEditingId(item.id);
    setForm({
      customerName: item.customerName,
      company: item.company,
      photo: item.photo || '',
      rating: item.rating,
      comment: item.comment,
      status: item.status,
      displayOrder: item.displayOrder,
      isEnabled: item.isEnabled,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.customerName) {
      toast.error('Customer name is required');
      return;
    }
    setSubmitting(true);
    try {
      const isEdit = !!editingId;
      const url = isEdit ? `/api/cms/testimonials/${editingId}` : '/api/cms/testimonials';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          ...form,
          displayOrder: Number(form.displayOrder) || 0,
          rating: Number(form.rating) || 5,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(isEdit ? 'Testimonial updated' : 'Testimonial created');
      setDialogOpen(false);
      fetchData();
      fetchStats();
    } catch {
      toast.error(`Failed to ${editingId ? 'update' : 'create'} testimonial`);
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
      const res = await fetch(`/api/cms/testimonials/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Testimonial deleted');
      setDeleteOpen(false);
      setDeleteId(null);
      fetchData();
      fetchStats();
    } catch {
      toast.error('Failed to delete testimonial');
    } finally {
      setDeleting(false);
    }
  };

  // ============ TOGGLE ENABLED ============

  const toggleEnabled = async (item: TestimonialItem) => {
    try {
      const res = await fetch(`/api/cms/testimonials/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ ...item, isEnabled: !item.isEnabled }),
      });
      if (!res.ok) throw new Error();
      toast.success(item.isEnabled ? 'Testimonial disabled' : 'Testimonial enabled');
      fetchData();
      fetchStats();
    } catch {
      toast.error('Failed to toggle testimonial');
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
            <MessageSquareQuote className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Testimonial Management</h1>
            <p className="text-sm text-muted-foreground">Manage customer testimonials</p>
          </div>
        </div>
        <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Testimonial
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-emerald-200 bg-emerald-50 text-emerald-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50 text-green-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Active</p>
            <p className="text-2xl font-bold">{stats.active}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50 text-yellow-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Draft</p>
            <p className="text-2xl font-bold">{stats.draft}</p>
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
                placeholder="Search testimonials..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          {error ? (
            <div className="flex items-center gap-3 p-6 text-rose-600">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load testimonials. Try refreshing.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="hidden md:table-cell">Comment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Order</TableHead>
                    <TableHead className="text-center">Enabled</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={8}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No testimonials found
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {item.photo && (
                              <img
                                src={item.photo}
                                alt={item.customerName}
                                className="h-8 w-8 rounded-full object-cover bg-muted"
                              />
                            )}
                            <span className="font-medium">{item.customerName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.company || '—'}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{renderStars(item.rating)}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-48 truncate text-sm text-muted-foreground">
                          {item.comment.length > 50 ? `${item.comment.slice(0, 50)}…` : item.comment}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusBadgeColor(item.status)}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <GripVertical className="h-3 w-3" />
                            <span className="text-sm">{item.displayOrder}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={item.isEnabled}
                            onCheckedChange={() => toggleEnabled(item)}
                          />
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

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages} ({data.total} total)
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
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
              <p className="text-rose-700 text-sm">Failed to load testimonials. Try refreshing.</p>
            </CardContent>
          </Card>
        ) : loading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <MessageSquareQuote className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No testimonials found</p>
            </CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.photo && (
                      <img src={item.photo} alt={item.customerName} className="h-8 w-8 rounded-full object-cover bg-muted shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{item.customerName}</p>
                      {item.company && <p className="text-xs text-muted-foreground truncate">{item.company}</p>}
                    </div>
                  </div>
                  <Badge variant="outline" className={getStatusBadgeColor(item.status) + ' shrink-0'}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Badge>
                </div>
                <div className="text-sm">{renderStars(item.rating)}</div>
                {item.comment && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.comment}</p>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <GripVertical className="h-3 w-3" />
                    <span>Order: {item.displayOrder}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{item.isEnabled ? 'Enabled' : 'Disabled'}</span>
                    <Switch checked={item.isEnabled} onCheckedChange={() => toggleEnabled(item)} />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1 pt-2 border-t">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => openDelete(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Mobile Pagination */}
      {data && data.totalPages > 1 && (
        <div className="md:hidden flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
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
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Testimonial' : 'Add Testimonial'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Customer Name *</Label>
              <Input
                className="mt-1"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                placeholder="Customer name"
              />
            </div>
            <div>
              <Label>Company</Label>
              <Input
                className="mt-1"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Company name"
              />
            </div>
            <div>
              <Label>Photo URL</Label>
              <Input
                className="mt-1"
                value={form.photo}
                onChange={(e) => setForm({ ...form, photo: e.target.value })}
                placeholder="https://example.com/photo.jpg"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rating</Label>
                <Select
                  value={String(form.rating)}
                  onValueChange={(v) => setForm({ ...form, rating: Number(v) })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RATING_OPTIONS.map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {'★'.repeat(r)}{'☆'.repeat(5 - r)} ({r}/5)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            </div>
            <div>
              <Label>Comment</Label>
              <Textarea
                className="mt-1"
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                placeholder="Customer testimonial"
                rows={4}
              />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                className="mt-1"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="font-medium">Enabled</Label>
                <p className="text-xs text-muted-foreground">Show this testimonial on the website</p>
              </div>
              <Switch
                checked={form.isEnabled}
                onCheckedChange={(checked) => setForm({ ...form, isEnabled: checked })}
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
              {editingId ? 'Update Testimonial' : 'Create Testimonial'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Testimonial</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this testimonial? This action cannot be undone.
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