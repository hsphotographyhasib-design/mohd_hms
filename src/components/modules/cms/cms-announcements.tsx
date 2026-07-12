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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, Search, Megaphone, Loader2, ChevronLeft, ChevronRight, Pencil, Trash2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// ============ TYPES ============

interface AnnouncementItem {
  id: string;
  text: string;
  type: string;
  link: string;
  isEnabled: boolean;
  scheduledFrom: string;
  scheduledTo: string;
  displayOrder: number;
  createdAt: string;
}

interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============ CONSTANTS ============

const TYPES = ['maintenance', 'holiday', 'emergency', 'info'];

const TYPE_COLORS: Record<string, string> = {
  maintenance: 'bg-orange-100 text-orange-700 border-orange-200',
  holiday: 'bg-blue-100 text-blue-700 border-blue-200',
  emergency: 'bg-red-100 text-red-700 border-red-200',
  info: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const EMPTY_FORM = {
  text: '',
  type: 'info',
  link: '',
  isEnabled: true,
  scheduledFrom: '',
  scheduledTo: '',
  displayOrder: 0,
};

// ============ HELPERS ============

function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

function getAnnouncementStatus(item: AnnouncementItem): string {
  const now = new Date();
  const from = item.scheduledFrom ? new Date(item.scheduledFrom) : null;
  const to = item.scheduledTo ? new Date(item.scheduledTo) : null;
  if (from && now < from) return 'scheduled';
  if (to && now > to) return 'expired';
  return 'active';
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-700 border-green-200';
    case 'scheduled': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'expired': return 'bg-gray-100 text-gray-500 border-gray-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function toDatetimeLocal(val: string): string {
  if (!val) return '';
  const d = new Date(val);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ============ COMPONENT ============

export function CmsAnnouncements() {
  // List state
  const [data, setData] = useState<PaginatedData<AnnouncementItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [enabledFilter, setEnabledFilter] = useState('all');
  const [error, setError] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, scheduled: 0, expired: 0 });

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
      if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter);
      if (enabledFilter === 'enabled') params.set('isEnabled', 'true');
      if (enabledFilter === 'disabled') params.set('isEnabled', 'false');
      const res = await fetch(`/api/cms/announcements?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
      const allItems = json.data as AnnouncementItem[];
      const now = new Date();
      setStats({
        total: json.total,
        active: allItems.filter((a) => {
          const from = a.scheduledFrom ? new Date(a.scheduledFrom) : null;
          const to = a.scheduledTo ? new Date(a.scheduledTo) : null;
          return (!from || now >= from) && (!to || now <= to);
        }).length,
        scheduled: allItems.filter((a) => a.scheduledFrom && new Date(a.scheduledFrom) > now).length,
        expired: allItems.filter((a) => a.scheduledTo && new Date(a.scheduledTo) < now).length,
      });
    } catch {
      setError(true);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, enabledFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ============ FORM HANDLERS ============

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (item: AnnouncementItem) => {
    setEditingId(item.id);
    setForm({
      text: item.text,
      type: item.type,
      link: item.link,
      isEnabled: item.isEnabled,
      scheduledFrom: toDatetimeLocal(item.scheduledFrom),
      scheduledTo: toDatetimeLocal(item.scheduledTo),
      displayOrder: item.displayOrder,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.text) {
      toast.error('Text is required');
      return;
    }
    setSubmitting(true);
    try {
      const isEdit = !!editingId;
      const url = isEdit ? `/api/cms/announcements/${editingId}` : '/api/cms/announcements';
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
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(isEdit ? 'Announcement updated' : 'Announcement created');
      setDialogOpen(false);
      fetchData();
    } catch {
      toast.error(`Failed to ${editingId ? 'update' : 'create'} announcement`);
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
      const res = await fetch(`/api/cms/announcements/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Announcement deleted');
      setDeleteOpen(false);
      setDeleteId(null);
      fetchData();
    } catch {
      toast.error('Failed to delete announcement');
    } finally {
      setDeleting(false);
    }
  };

  // ============ TOGGLE ENABLED ============

  const toggleEnabled = async (item: AnnouncementItem) => {
    try {
      const res = await fetch(`/api/cms/announcements/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ ...item, isEnabled: !item.isEnabled }),
      });
      if (!res.ok) throw new Error();
      toast.success(item.isEnabled ? 'Announcement disabled' : 'Announcement enabled');
      fetchData();
    } catch {
      toast.error('Failed to toggle announcement');
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
            <Megaphone className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Announcement Bar</h1>
            <p className="text-sm text-muted-foreground">Manage website announcement banners</p>
          </div>
        </div>
        <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Announcement
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
            <p className="text-xs font-medium opacity-75">Active</p>
            <p className="text-2xl font-bold">{stats.active}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50 text-yellow-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Scheduled</p>
            <p className="text-2xl font-bold">{stats.scheduled}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50 text-gray-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Expired</p>
            <p className="text-2xl font-bold">{stats.expired}</p>
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
                placeholder="Search announcements..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={enabledFilter} onValueChange={(v) => { setEnabledFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Enabled" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {error ? (
            <div className="flex items-center gap-3 p-6 text-rose-600">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load announcements. Try refreshing.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Text</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Schedule</TableHead>
                    <TableHead className="text-center">Enabled</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No announcements found
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => {
                      const status = getAnnouncementStatus(item);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="max-w-[200px] truncate">{item.text}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={TYPE_COLORS[item.type] || 'bg-gray-100 text-gray-700 border-gray-200'}>
                              {item.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusColor(status)}>
                              {status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {item.scheduledFrom && item.scheduledTo
                              ? `${new Date(item.scheduledFrom).toLocaleDateString()} → ${new Date(item.scheduledTo).toLocaleDateString()}`
                              : '—'}
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
                      );
                    })
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Announcement' : 'Add Announcement'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Text *</Label>
              <Textarea
                className="mt-1"
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                placeholder="Announcement text"
                rows={3}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Link</Label>
              <Input
                className="mt-1"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="font-medium">Enabled</Label>
                <p className="text-xs text-muted-foreground">Show this announcement</p>
              </div>
              <Switch
                checked={form.isEnabled}
                onCheckedChange={(checked) => setForm({ ...form, isEnabled: checked })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Scheduled From</Label>
                <Input
                  type="datetime-local"
                  className="mt-1"
                  value={form.scheduledFrom}
                  onChange={(e) => setForm({ ...form, scheduledFrom: e.target.value })}
                />
              </div>
              <div>
                <Label>Scheduled To</Label>
                <Input
                  type="datetime-local"
                  className="mt-1"
                  value={form.scheduledTo}
                  onChange={(e) => setForm({ ...form, scheduledTo: e.target.value })}
                />
              </div>
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
              {editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this announcement? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
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