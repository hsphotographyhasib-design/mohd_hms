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
  Plus, Search, FolderKanban, Loader2, ChevronLeft, ChevronRight, Pencil, Trash2,
  AlertCircle, GripVertical, Star,
} from 'lucide-react';
import { toast } from 'sonner';

// ============ TYPES ============

interface ProjectItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  status: string;
  isFeatured: boolean;
  displayOrder: number;
  featuredImage: string;
  completionStatus: string;
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

const STATUS_OPTIONS = ['planned', 'in_progress', 'completed'] as const;

const COMPLETION_OPTIONS = ['not_started', 'in_progress', 'on_hold', 'completed', 'cancelled'] as const;

const EMPTY_FORM = {
  title: '',
  slug: '',
  description: '',
  category: '',
  status: 'planned',
  isFeatured: false,
  displayOrder: 0,
  featuredImage: '',
  completionStatus: 'not_started',
};

// ============ HELPERS ============

function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function getStatusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    planned: 'bg-amber-100 text-amber-700 border-amber-200',
    in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
}

function formatStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    planned: 'Planned',
    in_progress: 'In Progress',
    completed: 'Completed',
  };
  return labels[status] || status;
}

// ============ COMPONENT ============

export function CmsProjects() {
  // List state
  const [data, setData] = useState<PaginatedData<ProjectItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, featured: 0, inProgress: 0, completed: 0 });

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
      const res = await fetch('/api/cms/projects?pageSize=1', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setStats({
        total: json.total || 0,
        featured: json.featured || 0,
        inProgress: json.inProgress || 0,
        completed: json.completed || 0,
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
      if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/cms/projects?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
    } catch {
      setError(true);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, statusFilter]);

  useEffect(() => { fetchData(); fetchStats(); }, [fetchData, fetchStats]);

  // ============ FORM HANDLERS ============

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (item: ProjectItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      slug: item.slug,
      description: item.description,
      category: item.category,
      status: item.status,
      isFeatured: item.isFeatured,
      displayOrder: item.displayOrder,
      featuredImage: item.featuredImage || '',
      completionStatus: item.completionStatus || 'not_started',
    });
    setDialogOpen(true);
  };

  const handleTitleChange = (title: string) => {
    setForm((prev) => ({
      ...prev,
      title,
      slug: editingId ? prev.slug : slugify(title),
    }));
  };

  const handleSubmit = async () => {
    if (!form.title) {
      toast.error('Title is required');
      return;
    }
    setSubmitting(true);
    try {
      const isEdit = !!editingId;
      const url = isEdit ? `/api/cms/projects/${editingId}` : '/api/cms/projects';
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
          slug: form.slug || slugify(form.title),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(isEdit ? 'Project updated' : 'Project created');
      setDialogOpen(false);
      fetchData();
      fetchStats();
    } catch {
      toast.error(`Failed to ${editingId ? 'update' : 'create'} project`);
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
      const res = await fetch(`/api/cms/projects/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Project deleted');
      setDeleteOpen(false);
      setDeleteId(null);
      fetchData();
      fetchStats();
    } catch {
      toast.error('Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  // ============ TOGGLE FEATURED ============

  const toggleFeatured = async (item: ProjectItem) => {
    try {
      const res = await fetch(`/api/cms/projects/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ ...item, isFeatured: !item.isFeatured }),
      });
      if (!res.ok) throw new Error();
      toast.success(item.isFeatured ? 'Removed from featured' : 'Added to featured');
      fetchData();
      fetchStats();
    } catch {
      toast.error('Failed to toggle featured');
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
            <FolderKanban className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Project Management</h1>
            <p className="text-sm text-muted-foreground">Manage your portfolio projects</p>
          </div>
        </div>
        <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Project
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-emerald-200 bg-emerald-50 text-emerald-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50 text-yellow-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Featured</p>
            <p className="text-2xl font-bold">{stats.featured}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50 text-blue-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">In Progress</p>
            <p className="text-2xl font-bold">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50 text-green-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Completed</p>
            <p className="text-2xl font-bold">{stats.completed}</p>
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
                placeholder="Search projects..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Input
              placeholder="Filter by category..."
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="w-full sm:w-48"
            />
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>
                ))}
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
              <p>Failed to load projects. Try refreshing.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Featured</TableHead>
                    <TableHead className="hidden sm:table-cell">Order</TableHead>
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
                        No projects found
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground font-mono">{item.slug}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
                            {item.category || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusBadgeColor(item.status)}>
                            {formatStatusLabel(item.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleFeatured(item)}
                          >
                            <Star
                              className={`h-4 w-4 ${
                                item.isFeatured
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-muted-foreground'
                              }`}
                            />
                          </Button>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <GripVertical className="h-3 w-3" />
                            <span className="text-sm">{item.displayOrder}</span>
                          </div>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Project' : 'Add Project'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                className="mt-1"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Project title"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                className="mt-1"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="auto-generated-from-title"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-generated from title. Edit if needed.
              </p>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                className="mt-1"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Project description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Input
                  className="mt-1"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Web Development"
                />
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
                      <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <Label>Completion Status</Label>
                <Select
                  value={form.completionStatus}
                  onValueChange={(v) => setForm({ ...form, completionStatus: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPLETION_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Featured Image URL</Label>
              <Input
                className="mt-1"
                value={form.featuredImage}
                onChange={(e) => setForm({ ...form, featuredImage: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="font-medium">Featured</Label>
                <p className="text-xs text-muted-foreground">Show this project as featured</p>
              </div>
              <Switch
                checked={form.isFeatured}
                onCheckedChange={(checked) => setForm({ ...form, isFeatured: checked })}
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
              {editingId ? 'Update Project' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this project? This action cannot be undone.
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