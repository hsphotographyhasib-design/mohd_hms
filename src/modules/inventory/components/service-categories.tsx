'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FolderTree, Plus, Loader2, Pencil, Trash2,
  ChevronDown, ChevronUp, XCircle, Tag, Layers,
} from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { Switch } from '@/shared/ui/switch';
import { Textarea } from '@/shared/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/shared/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/core/utils/utils';

const token = () => localStorage.getItem('cmms_token') || '';

interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  subcategories?: string;
  isActive?: boolean;
}

const emptyForm = {
  name: '', description: '', icon: '', isActive: true,
};

export function ServiceCategories() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceCategory | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceCategory | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/service-categories', {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      setCategories(json.data || []);
    } catch {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setForm(emptyForm);
    setSubcategories([]);
    setEditing(null);
  };

  const openAdd = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (cat: ServiceCategory) => {
    setEditing(cat);
    setForm({
      name: cat.name || '', description: cat.description || '',
      icon: cat.icon || '', isActive: cat.isActive !== false,
    });
    try {
      setSubcategories(JSON.parse(cat.subcategories || '[]'));
    } catch {
      setSubcategories([]);
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Name is required'); return; }
    setSubmitting(true);
    try {
      const body = {
        ...form,
        subcategories: JSON.stringify(subcategories),
      };
      const url = editing ? `/api/service-categories/${editing.id}` : '/api/service-categories';
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(editing ? 'Category updated' : 'Category created');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch {
      toast.error(editing ? 'Failed to update' : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/service-categories/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Category deleted');
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <FolderTree className="h-5 w-5 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold">Service Categories</h2>
        </div>
        <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Category
        </Button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <FolderTree className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">No categories found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Create categories to organize your service items</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            let subs: string[] = [];
            try { subs = JSON.parse(cat.subcategories || '[]'); } catch { subs = []; }
            const isExpanded = expandedId === cat.id;

            return (
              <Card key={cat.id} className="bg-white dark:bg-gray-900 hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-lg">{cat.name}</h3>
                      {cat.icon && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          <Tag className="h-3 w-3 mr-1" /> {cat.icon}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0 ml-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setDeleteTarget(cat)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {cat.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{cat.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {subs.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => toggleExpanded(cat.id)}
                      >
                        <Layers className="h-3 w-3 mr-1" />
                        {subs.length} subcategor{subs.length === 1 ? 'y' : 'ies'}
                        {isExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                      </Button>
                    )}
                    <Badge className={cn(
                      cat.isActive !== false
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    )}>
                      {cat.isActive !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {isExpanded && subs.length > 0 && (
                    <ul className="mt-2 space-y-1 border-t pt-2">
                      {subs.map((sub, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          {sub}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea className="mt-1" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Icon (Lucide icon name, e.g. &quot;Thermometer&quot;)</Label>
              <Input className="mt-1" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Thermometer" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
              <Label>Active</Label>
            </div>

            {/* Subcategories */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="font-semibold">Subcategories</Label>
              {subcategories.map((sub, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    className="h-9"
                    value={sub}
                    onChange={(e) => { const arr = [...subcategories]; arr[i] = e.target.value; setSubcategories(arr); }}
                    placeholder={`Subcategory ${i + 1}`}
                  />
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-red-500" onClick={() => setSubcategories(subcategories.filter((_, j) => j !== i))}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full" onClick={() => setSubcategories([...subcategories, ''])}>
                <Plus className="h-4 w-4 mr-2" /> Add Subcategory
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Update' : 'Create'} Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}