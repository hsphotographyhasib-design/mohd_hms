'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus, Search, Factory, Loader2, ChevronLeft, ChevronRight, Pencil, Trash2,
  AlertCircle, GripVertical, ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';

// ============ TYPES ============

interface IndustryItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  image: string;
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

const EMPTY_FORM = {
  name: '',
  description: '',
  icon: '',
  image: '',
  displayOrder: 0,
  isEnabled: true,
};

// ============ HELPERS ============

function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

// ============ COMPONENT ============

export function CmsIndustries() {
  // List state
  const [data, setData] = useState<PaginatedData<IndustryItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(false);

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
      const res = await fetch(`/api/cms/industries?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
    } catch {
      setError(true);
      toast.error('Failed to load industries');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ============ FORM HANDLERS ============

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (item: IndustryItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description,
      icon: item.icon,
      image: item.image,
      displayOrder: item.displayOrder,
      isEnabled: item.isEnabled,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name) {
      toast.error('Name is required');
      return;
    }
    setSubmitting(true);
    try {
      const isEdit = !!editingId;
      const url = isEdit ? `/api/cms/industries/${editingId}` : '/api/cms/industries';
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
      toast.success(isEdit ? 'Industry updated' : 'Industry created');
      setDialogOpen(false);
      fetchData();
    } catch {
      toast.error(`Failed to ${editingId ? 'update' : 'create'} industry`);
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
      const res = await fetch(`/api/cms/industries/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Industry deleted');
      setDeleteOpen(false);
      setDeleteId(null);
      fetchData();
    } catch {
      toast.error('Failed to delete industry');
    } finally {
      setDeleting(false);
    }
  };

  // ============ TOGGLE ENABLED ============

  const toggleEnabled = async (item: IndustryItem) => {
    try {
      const res = await fetch(`/api/cms/industries/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ ...item, isEnabled: !item.isEnabled }),
      });
      if (!res.ok) throw new Error();
      toast.success(item.isEnabled ? 'Industry disabled' : 'Industry enabled');
      fetchData();
    } catch {
      toast.error('Failed to toggle industry');
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
            <Factory className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Industries</h1>
            <p className="text-sm text-muted-foreground">Manage industries you serve</p>
          </div>
        </div>
        <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Industry
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search industries..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9"
        />
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600" />
            <p className="text-rose-700">Failed to load industries. Try refreshing the page.</p>
          </CardContent>
        </Card>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-20 mt-1" />
                  </div>
                </div>
                <Skeleton className="h-12 w-full" />
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Factory className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No industries found</p>
            <p className="text-sm mt-1">
              {search ? 'Try adjusting your search term.' : 'Click "Add Industry" to create your first industry.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Card Grid */}
      {!loading && !error && items.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <Card
                key={item.id}
                className={`transition-colors ${!item.isEnabled ? 'opacity-60' : ''}`}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Top row: icon + name + actions */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-lg border border-emerald-200">
                        {item.icon || <Factory className="h-5 w-5 text-emerald-600" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{item.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <GripVertical className="h-3 w-3" />
                          <span>Order: {item.displayOrder}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
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
                  </div>

                  {/* Description */}
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {item.description}
                    </p>
                  )}

                  {/* Image thumbnail */}
                  {item.image && (
                    <div className="rounded-lg border overflow-hidden bg-gray-50 h-24 flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}

                  {/* Bottom: enabled toggle */}
                  <div className="flex items-center justify-between pt-1 border-t">
                    <Label htmlFor={`switch-${item.id}`} className="text-xs text-muted-foreground">
                      {item.isEnabled ? 'Visible on website' : 'Hidden from website'}
                    </Label>
                    <Switch
                      id={`switch-${item.id}`}
                      checked={item.isEnabled}
                      onCheckedChange={() => toggleEnabled(item)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between">
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
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Industry' : 'Add Industry'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                className="mt-1"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Industry name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                className="mt-1"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of the industry"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Icon</Label>
                <Input
                  className="mt-1"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="e.g. 🏭 or icon name"
                />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input
                  className="mt-1"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="https://..."
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
              <p className="text-xs text-muted-foreground mt-1">
                Lower numbers appear first.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="font-medium">Enabled</Label>
                <p className="text-xs text-muted-foreground">Show this industry on the website</p>
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
              {editingId ? 'Update Industry' : 'Create Industry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Industry</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this industry? This action cannot be undone.
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
