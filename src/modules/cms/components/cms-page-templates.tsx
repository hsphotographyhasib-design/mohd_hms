'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog';
import {
  LayoutTemplate,
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Copy,
  Sparkles,
  FolderOpen,
  BookOpen,
  Wrench,
  HardHat,
  Zap,
  Flame,
  Droplets,
  Building2,
  Layers,
} from 'lucide-react';
import { useAppStore } from '@/app-shell/store';
import { toast } from 'sonner';
import type { TemplateItem } from '@/modules/cms/page-builder/types';

// ============ TYPES ============

type TemplateCategory =
  | 'all'
  | 'HVAC'
  | 'Maintenance'
  | 'Construction'
  | 'Electrical'
  | 'Fire'
  | 'Cleaning'
  | 'Corporate'
  | 'Glassmorphism'
  | 'Modern';

// ============ CONSTANTS ============

const CATEGORIES: { key: TemplateCategory; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'All', icon: LayoutTemplate },
  { key: 'HVAC', label: 'HVAC', icon: Wrench },
  { key: 'Maintenance', label: 'Maintenance', icon: HardHat },
  { key: 'Construction', label: 'Construction', icon: Building2 },
  { key: 'Electrical', label: 'Electrical', icon: Zap },
  { key: 'Fire', label: 'Fire', icon: Flame },
  { key: 'Cleaning', label: 'Cleaning', icon: Droplets },
  { key: 'Corporate', label: 'Corporate', icon: Building2 },
  { key: 'Glassmorphism', label: 'Glassmorphism', icon: Layers },
  { key: 'Modern', label: 'Modern', icon: Sparkles },
];

const CATEGORY_COLORS: Record<string, string> = {
  HVAC: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Maintenance: 'bg-amber-100 text-amber-700 border-amber-200',
  Construction: 'bg-orange-100 text-orange-700 border-orange-200',
  Electrical: 'bg-sky-100 text-sky-700 border-sky-200',
  Fire: 'bg-rose-100 text-rose-700 border-rose-200',
  Cleaning: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  Corporate: 'bg-slate-100 text-slate-700 border-slate-200',
  Glassmorphism: 'bg-violet-100 text-violet-700 border-violet-200',
  Modern: 'bg-teal-100 text-teal-700 border-teal-200',
};

// Placeholder gradients per category for template thumbnails
const CATEGORY_GRADIENTS: Record<string, string> = {
  HVAC: 'from-emerald-100 to-teal-50',
  Maintenance: 'from-amber-100 to-orange-50',
  Construction: 'from-orange-100 to-amber-50',
  Electrical: 'from-sky-100 to-blue-50',
  Fire: 'from-rose-100 to-red-50',
  Cleaning: 'from-cyan-100 to-sky-50',
  Corporate: 'from-slate-100 to-gray-50',
  Glassmorphism: 'from-violet-100 to-purple-50',
  Modern: 'from-teal-100 to-emerald-50',
};

// ============ HELPERS ============

function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

// ============ COMPONENT ============

export function CmsPageTemplates() {
  const { setView } = useAppStore();

  // Data state
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>('all');

  // Save dialog
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveCategory, setSaveCategory] = useState('Corporate');
  const [saving, setSaving] = useState(false);

  // Use dialog
  const [useTemplateId, setUseTemplateId] = useState<string | null>(null);
  const [useTemplateName, setUseTemplateName] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [using, setUsing] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<TemplateItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ============ DATA FETCHING ============

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cms/pages/templates', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to fetch templates');
      const json = await res.json();
      setTemplates(json.templates ?? []);
    } catch {
      toast.error('Failed to load templates');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // ============ FILTERED DATA ============

  const filteredTemplates = useMemo(() => {
    let result = [...templates];

    if (activeCategory !== 'all') {
      result = result.filter((t) => t.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }

    return result;
  }, [templates, activeCategory, search]);

  // ============ ACTIONS ============

  const handleSaveTemplate = async () => {
    const name = saveName.trim();
    if (!name) return;

    setSaving(true);
    try {
      const res = await fetch('/api/cms/pages/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name,
          category: saveCategory,
          description: `Custom template: ${name}`,
        }),
      });

      if (!res.ok) throw new Error('Failed to save template');
      toast.success(`Template "${name}" saved successfully`);
      setSaveDialogOpen(false);
      setSaveName('');
      fetchTemplates();
    } catch {
      toast.error('Failed to save template. Make sure you have a page open in the builder.');
    } finally {
      setSaving(false);
    }
  };

  const handleUseTemplate = async () => {
    if (!useTemplateId || !pageTitle.trim()) return;

    setUsing(true);
    try {
      const res = await fetch('/api/cms/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          title: pageTitle.trim(),
          slug: pageTitle.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim(),
          templateId: useTemplateId,
        }),
      });

      if (!res.ok) throw new Error('Failed to create page from template');
      const data = await res.json();
      toast.success(`Page created from "${useTemplateName}" template`);
      setUseTemplateId(null);
      setUseTemplateName('');
      setPageTitle('');
      // Navigate to the builder
      setView('cms-page-builder', { id: data.page.id });
    } catch {
      toast.error('Failed to create page from template');
    } finally {
      setUsing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cms/pages/templates/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success(`Deleted template "${deleteTarget.name}"`);
      setDeleteTarget(null);
      fetchTemplates();
    } catch {
      toast.error('Failed to delete template');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenUseDialog = (template: TemplateItem) => {
    setUseTemplateId(template.id);
    setUseTemplateName(template.name);
    setPageTitle('');
  };

  // ============ RENDER ============

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <LayoutTemplate className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Templates</h1>
            <p className="text-sm text-muted-foreground">
              Start from a prebuilt template or save your own designs
            </p>
          </div>
        </div>
        <Button
          onClick={() => setSaveDialogOpen(true)}
          variant="outline"
          className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          <Sparkles className="h-4 w-4" />
          Save Current as Template
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeCategory === cat.key
                  ? 'bg-[#00A76F] text-white shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <Skeleton className="w-full h-40" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <EmptyTemplateState
          search={search}
          activeCategory={activeCategory}
          onClearSearch={() => setSearch('')}
          onClearFilter={() => setActiveCategory('all')}
          onSave={() => setSaveDialogOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onUse={handleOpenUseDialog}
              onDelete={template.isSystem ? undefined : (t) => setDeleteTarget(t)}
            />
          ))}
        </div>
      )}

      {/* Save Template Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-emerald-600" />
              </div>
              Save Current as Template
            </DialogTitle>
            <DialogDescription>
              Save the current page design as a reusable template for future pages.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Name</label>
              <Input
                placeholder="e.g. Service Landing Page"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.filter((c) => c.key !== 'all').map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setSaveCategory(cat.key)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      saveCategory === cat.key
                        ? 'bg-[#00A76F] text-white'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSaveDialogOpen(false);
                setSaveName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={!saveName.trim() || saving}
              className="bg-[#00A76F] hover:bg-[#008F5D] text-white"
            >
              {saving ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Use Template Dialog */}
      <Dialog open={!!useTemplateId} onOpenChange={(open) => !open && setUseTemplateId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Copy className="h-4 w-4 text-emerald-600" />
              </div>
              Use Template
            </DialogTitle>
            <DialogDescription>
              Create a new page from the <strong>&quot;{useTemplateName}&quot;</strong> template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Page Title</label>
              <Input
                placeholder="Enter a title for your new page"
                value={pageTitle}
                onChange={(e) => setPageTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pageTitle.trim()) handleUseTemplate();
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setUseTemplateId(null);
                setPageTitle('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUseTemplate}
              disabled={!pageTitle.trim() || using}
              className="bg-[#00A76F] hover:bg-[#008F5D] text-white"
            >
              {using ? (
                <>Creating...</>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Page
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                <Trash2 className="h-4 w-4 text-rose-600" />
              </div>
              Delete Template
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&quot;{deleteTarget?.name}&quot;</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? 'Deleting...' : 'Delete Template'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============ TEMPLATE CARD ============

function TemplateCard({
  template,
  onUse,
  onDelete,
}: {
  template: TemplateItem;
  onUse: (template: TemplateItem) => void;
  onDelete?: (template: TemplateItem) => void;
}) {
  const gradientClass = CATEGORY_GRADIENTS[template.category] || 'from-gray-100 to-gray-50';
  const categoryColor = CATEGORY_COLORS[template.category] || 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <Card className="group hover:shadow-md transition-all hover:border-emerald-200 overflow-hidden">
      {/* Thumbnail */}
      <div
        className={`w-full h-40 bg-gradient-to-br ${gradientClass} relative flex items-center justify-center`}
      >
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            {template.isSystem ? (
              <BookOpen className="h-10 w-10 text-emerald-300 mx-auto mb-1.5" />
            ) : (
              <Sparkles className="h-10 w-10 text-violet-300 mx-auto mb-1.5" />
            )}
            <p className="text-xs opacity-50 font-medium">
              {template.isSystem ? 'System Template' : 'Custom Template'}
            </p>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onUse(template);
            }}
            className="gap-1.5 bg-white text-gray-900 hover:bg-gray-100 shadow-lg"
          >
            <Copy className="h-3.5 w-3.5" />
            Use Template
          </Button>
        </div>

        {/* System badge */}
        {template.isSystem && (
          <div className="absolute top-2 left-2">
            <Badge variant="outline" className="bg-white/90 text-[10px] backdrop-blur-sm">
              <FolderOpen className="h-3 w-3 mr-1" />
              System
            </Badge>
          </div>
        )}

        {/* Delete button for custom templates */}
        {onDelete && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onUse(template)}
                  className="gap-2 text-emerald-700 focus:text-emerald-700"
                >
                  <Copy className="h-4 w-4" />
                  Use Template
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(template)}
                  className="gap-2 text-rose-600 focus:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Card Content */}
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-semibold text-sm leading-tight">{template.name}</h3>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${categoryColor}`}>
            {template.category}
          </Badge>
        </div>
        {template.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {template.description}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          onClick={() => onUse(template)}
        >
          <Copy className="h-3.5 w-3.5" />
          Use This Template
        </Button>
      </CardContent>
    </Card>
  );
}

// ============ EMPTY STATE ============

function EmptyTemplateState({
  search,
  activeCategory,
  onClearSearch,
  onClearFilter,
  onSave,
}: {
  search: string;
  activeCategory: TemplateCategory;
  onClearSearch: () => void;
  onClearFilter: () => void;
  onSave: () => void;
}) {
  const isFiltered = activeCategory !== 'all' || search.trim() !== '';

  return (
    <Card className="border-dashed">
      <CardContent className="py-16 px-6">
        <div className="flex flex-col items-center text-center max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
            {isFiltered ? (
              <Search className="h-8 w-8 text-emerald-300" />
            ) : (
              <LayoutTemplate className="h-8 w-8 text-emerald-300" />
            )}
          </div>
          <h3 className="text-lg font-semibold mb-1">
            {isFiltered ? 'No templates match your filters' : 'No templates available'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isFiltered
              ? 'Try adjusting your search or category to find what you\'re looking for.'
              : 'Save your current page design as a template to reuse it later.'}
          </p>
          <div className="flex items-center gap-2">
            {isFiltered ? (
              <>
                {search && (
                  <Button variant="outline" size="sm" onClick={onClearSearch}>
                    Clear Search
                  </Button>
                )}
                {activeCategory !== 'all' && (
                  <Button variant="outline" size="sm" onClick={onClearFilter}>
                    Show All
                  </Button>
                )}
              </>
            ) : (
              <Button
                onClick={onSave}
                className="gap-1.5 bg-[#00A76F] hover:bg-[#008F5D] text-white"
              >
                <Sparkles className="h-4 w-4" />
                Save Current as Template
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}