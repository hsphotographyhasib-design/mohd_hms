'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, FolderTree, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface Category { id: string; name: string; code: string; description?: string; color?: string; isActive: boolean; _count?: { items: number; subcategories: number } }
interface Subcategory { id: string; name: string; code?: string; description?: string; categoryId: string; _count?: { items: number } }

export function InventoryCategories({ token }: { token: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  // Category dialog
  const [catDialog, setCatDialog] = useState(false);
  const [catEdit, setCatEdit] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ name: '', code: '', description: '', color: '#10b981' });
  const [catSubmitting, setCatSubmitting] = useState(false);

  // Subcategory dialog
  const [subDialog, setSubDialog] = useState(false);
  const [subEdit, setSubEdit] = useState<Subcategory | null>(null);
  const [subForm, setSubForm] = useState({ name: '', code: '', description: '' });
  const [subSubmitting, setSubSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/categories', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const json = await res.json(); setCategories(json.data || json || []); }
    } catch { toast.error('Failed to load categories'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const fetchSubcategories = useCallback(async (catId: string) => {
    try {
      const res = await fetch(`/api/inventory/subcategories?categoryId=${catId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const json = await res.json(); setSubcategories(json.data || json || []); }
    } catch {}
  }, [token]);

  useEffect(() => {
    if (selectedId) fetchSubcategories(selectedId);
    else setSubcategories([]);
  }, [selectedId, fetchSubcategories]);

  const openCatCreate = () => { setCatEdit(null); setCatForm({ name: '', code: '', description: '', color: '#10b981' }); setCatDialog(true); };
  const openCatEdit = (cat: Category) => { setCatEdit(cat); setCatForm({ name: cat.name, code: cat.code || '', description: cat.description || '', color: cat.color || '#10b981' }); setCatDialog(true); };

  const submitCat = async () => {
    if (!catForm.name) { toast.error('Name is required'); return; }
    setCatSubmitting(true);
    try {
      const url = catEdit ? `/api/inventory/categories/${catEdit.id}` : '/api/inventory/categories';
      const method = catEdit ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(catForm) });
      if (!res.ok) throw new Error();
      toast.success(catEdit ? 'Category updated' : 'Category created');
      setCatDialog(false);
      fetchCategories();
    } catch { toast.error('Failed to save category'); }
    finally { setCatSubmitting(false); }
  };

  const deleteCat = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      const res = await fetch(`/api/inventory/categories/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { toast.success('Category deleted'); fetchCategories(); if (selectedId === id) setSelectedId(null); }
      else { const json = await res.json(); toast.error(json.error || 'Delete failed'); }
    } catch { toast.error('Failed to delete'); }
  };

  const openSubCreate = () => { setSubEdit(null); setSubForm({ name: '', code: '', description: '' }); setSubDialog(true); };

  const submitSub = async () => {
    if (!subForm.name || !selectedId) { toast.error('Name is required'); return; }
    setSubSubmitting(true);
    try {
      const res = await fetch('/api/inventory/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...subForm, categoryId: selectedId }),
      });
      if (!res.ok) throw new Error();
      toast.success(subEdit ? 'Subcategory updated' : 'Subcategory created');
      setSubDialog(false);
      fetchSubcategories(selectedId);
      fetchCategories();
    } catch { toast.error('Failed to save subcategory'); }
    finally { setSubSubmitting(false); }
  };

  const deleteSub = async (id: string) => {
    if (!confirm('Delete this subcategory?')) return;
    try {
      const res = await fetch(`/api/inventory/subcategories/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { toast.success('Subcategory deleted'); fetchSubcategories(selectedId!); fetchCategories(); }
    } catch { toast.error('Failed to delete'); }
  };

  const selectedCat = categories.find(c => c.id === selectedId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Categories & Subcategories</h2>
        <Button size="sm" onClick={openCatCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-1.5" /> Category
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Categories List */}
        <Card className="lg:col-span-2">
          <CardContent className="p-3">
            <h3 className="text-sm font-semibold mb-3">Categories ({categories.length})</h3>
            {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 mb-2 rounded-lg" />)
              : categories.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No categories yet</p>
              : <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedId(cat.id === selectedId ? null : cat.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors text-sm ${selectedId === cat.id ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'hover:bg-gray-50 dark:hover:bg-gray-900 border border-transparent'}`}
                    >
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color || '#10b981' }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">{cat.code || '—'} · {cat._count?.items || 0} items · {cat._count?.subcategories || 0} sub</p>
                      </div>
                      <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${selectedId === cat.id ? 'rotate-90' : ''}`} />
                    </button>
                  ))}
                </div>
            }
          </CardContent>
        </Card>

        {/* Subcategories */}
        <Card className="lg:col-span-3">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">
                {selectedCat ? `${selectedCat.name} — Subcategories` : 'Select a category'}
              </h3>
              {selectedId && (
                <Button size="sm" variant="outline" onClick={openSubCreate} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Subcategory
                </Button>
              )}
            </div>
            {!selectedId ? (
              <div className="py-12 text-center text-muted-foreground">
                <FolderTree className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Select a category to view subcategories</p>
              </div>
            ) : subcategories.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p className="text-sm">No subcategories yet</p>
                <Button size="sm" variant="outline" onClick={openSubCreate} className="mt-2">
                  <Plus className="h-3 w-3 mr-1" /> Add Subcategory
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {subcategories.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                    <div>
                      <p className="text-sm font-medium">{sub.name}</p>
                      <p className="text-xs text-muted-foreground">{sub.code || '—'} · {sub._count?.items || 0} items</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSubEdit(sub); setSubForm({ name: sub.name, code: sub.code || '', description: sub.description || '' }); setSubDialog(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={() => deleteSub(sub.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Dialog */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{catEdit ? 'Edit Category' : 'New Category'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Name *</Label><Input className="mt-1 h-9" value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label className="text-xs">Code</Label><Input className="mt-1 h-9" placeholder="e.g. HVAC" value={catForm.code} onChange={e => setCatForm(p => ({ ...p, code: e.target.value }))} /></div>
            <div><Label className="text-xs">Color</Label><div className="mt-1 flex items-center gap-2"><input type="color" value={catForm.color} onChange={e => setCatForm(p => ({ ...p, color: e.target.value }))} className="h-9 w-12 rounded cursor-pointer" /><Input className="h-9 flex-1" value={catForm.color} onChange={e => setCatForm(p => ({ ...p, color: e.target.value }))} /></div></div>
            <div><Label className="text-xs">Description</Label><Input className="mt-1 h-9" value={catForm.description} onChange={e => setCatForm(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          {catEdit && (
            <div className="flex justify-end">
              <Button variant="destructive" size="sm" onClick={() => { deleteCat(catEdit.id); setCatDialog(false); }}><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</Button>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(false)}>Cancel</Button>
            <Button onClick={submitCat} disabled={catSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">{catEdit ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subcategory Dialog */}
      <Dialog open={subDialog} onOpenChange={setSubDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{subEdit ? 'Edit Subcategory' : 'New Subcategory'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Name *</Label><Input className="mt-1 h-9" value={subForm.name} onChange={e => setSubForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label className="text-xs">Code</Label><Input className="mt-1 h-9" placeholder="e.g. SPLIT" value={subForm.code} onChange={e => setSubForm(p => ({ ...p, code: e.target.value }))} /></div>
            <div><Label className="text-xs">Description</Label><Input className="mt-1 h-9" value={subForm.description} onChange={e => setSubForm(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubDialog(false)}>Cancel</Button>
            <Button onClick={submitSub} disabled={subSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">{subEdit ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}