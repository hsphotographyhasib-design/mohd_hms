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
  Plus, Search, FileText, Loader2, ChevronLeft, ChevronRight, Pencil, Trash2,
  AlertCircle, Star, Eye,
} from 'lucide-react';
import { toast } from 'sonner';

// ============ TYPES ============

interface BlogItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  categoryId: string;
  status: string;
  isFeatured: boolean;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  featuredImage: string;
  scheduledAt: string;
  views: number;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============ CONSTANTS ============

const STATUS_OPTIONS = ['draft', 'published', 'scheduled'] as const;

const EMPTY_FORM = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  categoryId: '',
  status: 'draft',
  isFeatured: false,
  seoTitle: '',
  seoDescription: '',
  seoKeywords: '',
  featuredImage: '',
  scheduledAt: '',
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
    draft: 'bg-amber-100 text-amber-700 border-amber-200',
    published: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ============ COMPONENT ============

export function CmsBlogs() {
  // List state
  const [data, setData] = useState<PaginatedData<BlogItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [error, setError] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0, featured: 0 });

  // Categories
  const [categories, setCategories] = useState<CategoryOption[]>([]);

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

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/cms/blogs/categories', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setCategories(Array.isArray(json) ? json : json.data || []);
    } catch {
      // silent
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/cms/blogs?pageSize=1', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setStats({
        total: json.total || 0,
        published: json.published || 0,
        draft: json.draft || 0,
        featured: json.featured || 0,
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
      if (categoryFilter && categoryFilter !== 'all') params.set('categoryId', categoryFilter);
      const res = await fetch(`/api/cms/blogs?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
    } catch {
      setError(true);
      toast.error('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, categoryFilter]);

  useEffect(() => { fetchData(); fetchStats(); fetchCategories(); }, [fetchData, fetchStats, fetchCategories]);

  // ============ FORM HANDLERS ============

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (item: BlogItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt,
      content: item.content,
      categoryId: item.categoryId || '',
      status: item.status,
      isFeatured: item.isFeatured,
      seoTitle: item.seoTitle || '',
      seoDescription: item.seoDescription || '',
      seoKeywords: item.seoKeywords || '',
      featuredImage: item.featuredImage || '',
      scheduledAt: item.scheduledAt ? item.scheduledAt.slice(0, 16) : '',
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
      const url = isEdit ? `/api/cms/blogs/${editingId}` : '/api/cms/blogs';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          ...form,
          slug: form.slug || slugify(form.title),
          scheduledAt: form.scheduledAt || null,
          views: undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(isEdit ? 'Blog post updated' : 'Blog post created');
      setDialogOpen(false);
      fetchData();
      fetchStats();
    } catch {
      toast.error(`Failed to ${editingId ? 'update' : 'create'} blog post`);
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
      const res = await fetch(`/api/cms/blogs/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Blog post deleted');
      setDeleteOpen(false);
      setDeleteId(null);
      fetchData();
      fetchStats();
    } catch {
      toast.error('Failed to delete blog post');
    } finally {
      setDeleting(false);
    }
  };

  // ============ TOGGLE FEATURED ============

  const toggleFeatured = async (item: BlogItem) => {
    try {
      const res = await fetch(`/api/cms/blogs/${item.id}`, {
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
  const categoryName = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : catId || '—';
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <FileText className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Blog Management</h1>
            <p className="text-sm text-muted-foreground">Manage your blog posts</p>
          </div>
        </div>
        <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> New Post
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
        <Card className="border-green-200 bg-green-50 text-green-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Published</p>
            <p className="text-2xl font-bold">{stats.published}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50 text-yellow-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Draft</p>
            <p className="text-2xl font-bold">{stats.draft}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50 text-amber-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Featured</p>
            <p className="text-2xl font-bold">{stats.featured}</p>
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
                placeholder="Search posts..."
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
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
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
              <p>Failed to load blog posts. Try refreshing.</p>
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
                    <TableHead className="hidden sm:table-cell">Views</TableHead>
                    <TableHead className="hidden md:table-cell">Published</TableHead>
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
                        No blog posts found
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
                            {categoryName(item.categoryId)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusBadgeColor(item.status)}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
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
                            <Eye className="h-3 w-3" />
                            <span className="text-sm">{item.views || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {formatDate(item.publishedAt)}
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
            <DialogTitle>{editingId ? 'Edit Post' : 'New Post'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                className="mt-1"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Post title"
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
              <Label>Excerpt</Label>
              <Textarea
                className="mt-1"
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                placeholder="Brief summary of the post"
                rows={3}
              />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea
                className="mt-1"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Full post content (supports markdown)"
                rows={8}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(v) => setForm({ ...form, categoryId: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
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
            {form.status === 'scheduled' && (
              <div>
                <Label>Scheduled At</Label>
                <Input
                  type="datetime-local"
                  className="mt-1"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                />
              </div>
            )}
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
                <p className="text-xs text-muted-foreground">Show this post as featured</p>
              </div>
              <Switch
                checked={form.isFeatured}
                onCheckedChange={(checked) => setForm({ ...form, isFeatured: checked })}
              />
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">SEO Settings</p>
              <div className="space-y-4">
                <div>
                  <Label>SEO Title</Label>
                  <Input
                    className="mt-1"
                    value={form.seoTitle}
                    onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                    placeholder="Meta title for search engines"
                  />
                </div>
                <div>
                  <Label>SEO Description</Label>
                  <Textarea
                    className="mt-1"
                    value={form.seoDescription}
                    onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
                    placeholder="Meta description for search engines"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>SEO Keywords</Label>
                  <Input
                    className="mt-1"
                    value={form.seoKeywords}
                    onChange={(e) => setForm({ ...form, seoKeywords: e.target.value })}
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>
              </div>
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
              {editingId ? 'Update Post' : 'Create Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this blog post? This action cannot be undone.
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