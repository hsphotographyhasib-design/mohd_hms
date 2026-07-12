'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Plus, Search, FileText, Eye, Copy, Trash2, Globe, Paintbrush, LayoutTemplate,
  MoreHorizontal, Pencil, FileCode, Palette, Settings, Clock, Check
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface CmsPage {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  schema: string;
  templateId: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  publishedBy: string | null;
  createdById: string;
  tenantId: string;
}

interface CmsTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnail: string | null;
  schema: string;
  isSystem: boolean;
  tenantId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ThemeSettings {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    accent: string;
    text: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
  };
  borderRadius: string;
  shadow: string;
  spacing: string;
  darkMode: boolean;
  customCss: string;
}

// ============================================================================
// Helpers
// ============================================================================

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cmms_token') : null;
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  return `${diffMonth}mo ago`;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; dotClass: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
    dotClass: 'bg-gray-400',
  },
  published: {
    label: 'Published',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  archived: {
    label: 'Archived',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
};

const TEMPLATE_CATEGORIES = [
  'All',
  'HVAC',
  'Maintenance',
  'Construction',
  'Electrical',
  'Fire Protection',
  'Cleaning',
  'Corporate',
  'Glassmorphism',
  'Modern',
  'Custom',
];

const CATEGORY_COLORS: Record<string, string> = {
  HVAC: 'bg-blue-100 text-blue-700',
  Maintenance: 'bg-orange-100 text-orange-700',
  Construction: 'bg-yellow-100 text-yellow-800',
  Electrical: 'bg-purple-100 text-purple-700',
  'Fire Protection': 'bg-red-100 text-red-700',
  Cleaning: 'bg-cyan-100 text-cyan-700',
  Corporate: 'bg-emerald-100 text-emerald-700',
  Glassmorphism: 'bg-pink-100 text-pink-700',
  Modern: 'bg-indigo-100 text-indigo-700',
  Custom: 'bg-gray-100 text-gray-700',
};

const DEFAULT_THEME: ThemeSettings = {
  colors: {
    primary: '#00A76F',
    secondary: '#111827',
    background: '#FFFFFF',
    accent: '#F59E0B',
    text: '#1F2937',
  },
  typography: {
    headingFont: 'Poppins',
    bodyFont: 'Inter',
  },
  borderRadius: '8px',
  shadow: '0 1px 3px rgba(0,0,0,0.1)',
  spacing: '24px',
  darkMode: false,
  customCss: '',
};

// ============================================================================
// Component
// ============================================================================

export function PageList() {
  // ── Data State ─────────────────────────────────────────────────────────
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [templates, setTemplates] = useState<CmsTemplate[]>([]);
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  // ── Filter State ───────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // ── Dialog State ───────────────────────────────────────────────────────
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showThemeDialog, setShowThemeDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewPage, setPreviewPage] = useState<CmsPage | null>(null);
  const [deletePageId, setDeletePageId] = useState<string | null>(null);

  // ── Create Form State ──────────────────────────────────────────────────
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newTemplateId, setNewTemplateId] = useState('blank');

  // ── Theme Form State ───────────────────────────────────────────────────
  const [themeForm, setThemeForm] = useState<ThemeSettings>(DEFAULT_THEME);
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  // ── Template Gallery State ─────────────────────────────────────────────
  const [templateCategory, setTemplateCategory] = useState('All');
  const [isCreatingFromTemplate, setIsCreatingFromTemplate] = useState(false);

  // ── Actions ────────────────────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ============================================================================
  // API Functions
  // ============================================================================

  const fetchPages = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/cms/builder/pages?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch pages');
      const data = await res.json();
      setPages(data.pages || data.data || (Array.isArray(data) ? data : []));
    } catch {
      toast.error('Failed to load pages');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  const fetchTemplates = useCallback(async (category?: string) => {
    try {
      const params = new URLSearchParams();
      if (category && category !== 'All') params.set('category', category);
      const res = await fetch(`/api/cms/builder/templates?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data = await res.json();
      setTemplates(data.templates || data.data || (Array.isArray(data) ? data : []));
    } catch {
      setTemplates([]);
    }
  }, []);

  const fetchTheme = useCallback(async () => {
    try {
      const res = await fetch('/api/cms/builder/theme', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch theme');
      const data = await res.json();
      if (data.theme) {
        const parsed = typeof data.theme.settings === 'string'
          ? JSON.parse(data.theme.settings)
          : data.theme.settings;
        setTheme(parsed);
        setThemeForm(parsed);
      }
    } catch {
      // Use defaults
    }
  }, []);

  // ── Effects ────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  useEffect(() => {
    if (showTemplateDialog) {
      fetchTemplates(templateCategory);
    }
  }, [showTemplateDialog, templateCategory, fetchTemplates]);

  useEffect(() => {
    if (showThemeDialog) {
      fetchTheme();
    }
  }, [showThemeDialog, fetchTheme]);

  // Auto-generate slug from title
  useEffect(() => {
    if (newTitle && !newSlug) {
      setNewSlug(slugify(newTitle));
    }
  }, [newTitle, newSlug]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleCreatePage = async () => {
    if (!newTitle.trim()) {
      toast.error('Page title is required');
      return;
    }
    try {
      const body: Record<string, string> = {
        title: newTitle.trim(),
        slug: newSlug.trim() || slugify(newTitle),
      };
      if (newTemplateId && newTemplateId !== 'blank') {
        body.templateId = newTemplateId;
      }
      const res = await fetch('/api/cms/builder/pages', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create page');
      }
      const data = await res.json();
      toast.success('Page created successfully');
      setShowCreateDialog(false);
      setNewTitle('');
      setNewSlug('');
      setNewTemplateId('blank');
      fetchPages();
      // Navigate to builder
      if (data.page?.id) {
        useAppStore.getState().setView('cms-page-builder', { id: data.page.id });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create page');
    }
  };

  const handleCreateFromTemplate = async (template: CmsTemplate) => {
    setIsCreatingFromTemplate(true);
    try {
      const res = await fetch('/api/cms/builder/pages', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: `${template.name} Page`,
          slug: slugify(template.name),
          templateId: template.id,
        }),
      });
      if (!res.ok) throw new Error('Failed to create from template');
      const data = await res.json();
      toast.success(`Page created from "${template.name}" template`);
      setShowTemplateDialog(false);
      fetchPages();
      if (data.page?.id) {
        useAppStore.getState().setView('cms-page-builder', { id: data.page.id });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create from template');
    } finally {
      setIsCreatingFromTemplate(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePageId) return;
    setActionLoading(deletePageId);
    try {
      const res = await fetch(`/api/cms/builder/pages/${deletePageId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete page');
      toast.success('Page deleted successfully');
      setDeletePageId(null);
      fetchPages();
    } catch {
      toast.error('Failed to delete page');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async (page: CmsPage) => {
    setActionLoading(page.id);
    try {
      const res = await fetch(`/api/cms/builder/pages/${page.id}/duplicate`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to duplicate page');
      toast.success('Page duplicated successfully');
      fetchPages();
    } catch {
      toast.error('Failed to duplicate page');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublishToggle = async (page: CmsPage) => {
    setActionLoading(page.id);
    try {
      if (page.status === 'published') {
        // Unpublish by updating status to draft
        const res = await fetch(`/api/cms/builder/pages/${page.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status: 'draft' }),
        });
        if (!res.ok) throw new Error('Failed to unpublish');
        toast.success('Page unpublished');
      } else {
        const res = await fetch(`/api/cms/builder/pages/${page.id}/publish`, {
          method: 'POST',
          headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to publish');
        toast.success('Page published successfully');
      }
      fetchPages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSeedTemplates = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch('/api/cms/builder/seed-templates', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to seed templates');
      const data = await res.json();
      toast.success(data.message || 'System templates seeded successfully');
      if (showTemplateDialog) {
        fetchTemplates(templateCategory);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to seed templates');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSaveTheme = async () => {
    setIsSavingTheme(true);
    try {
      const res = await fetch('/api/cms/builder/theme', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(themeForm),
      });
      if (!res.ok) throw new Error('Failed to save theme');
      setTheme(themeForm);
      toast.success('Theme settings saved');
      setShowThemeDialog(false);
    } catch {
      toast.error('Failed to save theme');
    } finally {
      setIsSavingTheme(false);
    }
  };

  const handlePreview = (page: CmsPage) => {
    setPreviewPage(page);
    setShowPreviewDialog(true);
  };

  const handleEdit = (page: CmsPage) => {
    useAppStore.getState().setView('cms-page-builder', { id: page.id });
  };

  // ── Filtered templates ─────────────────────────────────────────────────
  const filteredTemplates = templateCategory === 'All'
    ? templates
    : templates.filter((t) => t.category === templateCategory);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#00A76F' }}>
              <LayoutTemplate className="w-5 h-5 text-white" />
            </div>
            Page Builder
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Visual page editor for MOHD.HMS ENTERPRISE
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSeedTemplates}
            disabled={isSeeding}
            className="text-gray-500 hover:text-gray-700"
          >
            {isSeeding ? (
              <Settings className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <FileCode className="w-3.5 h-3.5 mr-1.5" />
            )}
            Seed Templates
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowThemeDialog(true)}
          >
            <Palette className="w-4 h-4 mr-1.5" />
            Theme Settings
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplateDialog(true)}
          >
            <Paintbrush className="w-4 h-4 mr-1.5" />
            Templates
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            className="text-white shadow-sm"
            style={{ backgroundColor: '#00A76F', borderColor: '#00A76F' }}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Page
          </Button>
        </div>
      </div>

      {/* ── Filter / Search Bar ─────────────────────────────────────────── */}
      <Card className="border-gray-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search pages by title or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="h-9 bg-gray-100 p-1">
                <TabsTrigger value="all" className="text-xs px-3 h-7 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">
                  All
                </TabsTrigger>
                <TabsTrigger value="draft" className="text-xs px-3 h-7 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">
                  Draft
                </TabsTrigger>
                <TabsTrigger value="published" className="text-xs px-3 h-7 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">
                  Published
                </TabsTrigger>
                <TabsTrigger value="archived" className="text-xs px-3 h-7 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">
                  Archived
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* ── Page Table ──────────────────────────────────────────────────── */}
      <Card className="border-gray-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <FileText className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-gray-900 font-semibold text-lg">No pages yet</h3>
            <p className="text-gray-500 text-sm mt-1 mb-4 text-center max-w-sm">
              Create your first page or start from a template to begin building your website.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTemplateDialog(true)}
              >
                <Paintbrush className="w-4 h-4 mr-1.5" />
                Browse Templates
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCreateDialog(true)}
                className="text-white"
                style={{ backgroundColor: '#00A76F', borderColor: '#00A76F' }}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Create Page
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-200/60">
                    <TableHead className="pl-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Title</TableHead>
                    <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Slug</TableHead>
                    <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Last Modified</TableHead>
                    <TableHead className="text-right pr-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map((page) => {
                    const statusCfg = STATUS_CONFIG[page.status] || STATUS_CONFIG.draft;
                    return (
                      <TableRow key={page.id} className="border-b border-gray-100 group">
                        {/* Title with status dot */}
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${statusCfg.dotClass}`} />
                            <div className="min-w-0">
                              <button
                                onClick={() => handleEdit(page)}
                                className="font-medium text-gray-900 hover:text-emerald-600 transition-colors text-left truncate block max-w-[240px] text-sm"
                                title={page.title}
                              >
                                {page.title}
                              </button>
                              {page.templateId && (
                                <span className="text-[11px] text-gray-400 mt-0.5 block">From template</span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Slug */}
                        <TableCell>
                          <code className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md font-mono border border-gray-100">
                            /{page.slug}
                          </code>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusCfg.className}`}
                          >
                            {page.status === 'published' && <Globe className="w-3 h-3 mr-1" />}
                            {statusCfg.label}
                          </Badge>
                        </TableCell>

                        {/* Last Modified */}
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span>{relativeTime(page.updatedAt)}</span>
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                              onClick={() => handleEdit(page)}
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                              onClick={() => handlePreview(page)}
                              title="Preview"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                  disabled={actionLoading === page.id}
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleEdit(page)}>
                                  <Pencil className="w-4 h-4 mr-2 text-gray-400" />
                                  Edit Page
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handlePreview(page)}>
                                  <Eye className="w-4 h-4 mr-2 text-gray-400" />
                                  Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(page)}>
                                  <Copy className="w-4 h-4 mr-2 text-gray-400" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handlePublishToggle(page)}>
                                  {page.status === 'published' ? (
                                    <>
                                      <FileText className="w-4 h-4 mr-2 text-gray-400" />
                                      Unpublish
                                    </>
                                  ) : (
                                    <>
                                      <Globe className="w-4 h-4 mr-2 text-gray-400" />
                                      Publish
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeletePageId(page.id)}
                                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {/* Footer count */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-500">
                {pages.length} {pages.length === 1 ? 'page' : 'pages'}
                {statusFilter !== 'all' && ` in "${statusFilter}"`}
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            </div>
          </>
        )}
      </Card>

      {/* ================================================================== */}
      {/* CREATE PAGE DIALOG                                                  */}
      {/* ================================================================== */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#00A76F' }}>
                <Plus className="w-4 h-4 text-white" />
              </div>
              Create New Page
            </DialogTitle>
            <DialogDescription>
              Create a blank page or start from an existing template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="page-title">Page Title</Label>
              <Input
                id="page-title"
                placeholder="e.g. About Us, Services, Contact"
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  if (!newSlug || slugify(newTitle) === newSlug) {
                    setNewSlug(slugify(e.target.value));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreatePage();
                }}
                autoFocus
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="page-slug">URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 font-mono">/</span>
                <Input
                  id="page-slug"
                  placeholder="about-us"
                  value={newSlug}
                  onChange={(e) => setNewSlug(slugify(e.target.value))}
                  className="font-mono text-sm"
                />
              </div>
              <p className="text-[11px] text-gray-400">
                Auto-generated from title. Edit to customize the URL.
              </p>
            </div>

            {/* Template selector */}
            <div className="space-y-2">
              <Label htmlFor="page-template">Starting Template</Label>
              <Select value={newTemplateId} onValueChange={setNewTemplateId}>
                <SelectTrigger id="page-template">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blank">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      Blank Page
                    </div>
                  </SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <LayoutTemplate className="w-4 h-4 text-gray-400" />
                        <span>{t.name}</span>
                        {t.isSystem && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">
                            System
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-gray-400">
                Choose a template to pre-populate your page with content.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePage}
              className="text-white"
              style={{ backgroundColor: '#00A76F', borderColor: '#00A76F' }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* TEMPLATE GALLERY DIALOG                                             */}
      {/* ================================================================== */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="sm:max-w-[720px] max-h-[85vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#00A76F' }}>
                <Paintbrush className="w-4 h-4 text-white" />
              </div>
              Template Gallery
            </DialogTitle>
            <DialogDescription>
              Choose a template to create a new page with pre-built content and layout.
            </DialogDescription>
          </DialogHeader>

          {/* Category filter */}
          <div className="px-6 pt-4">
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  variant={templateCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  className={`h-7 text-xs px-2.5 ${
                    templateCategory === cat
                      ? 'text-white'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  style={
                    templateCategory === cat
                      ? { backgroundColor: '#00A76F', borderColor: '#00A76F' }
                      : undefined
                  }
                  onClick={() => setTemplateCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          {/* Template grid */}
          <ScrollArea className="max-h-[55vh] px-6 py-4">
            {filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                  <LayoutTemplate className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">No templates found</p>
                <p className="text-gray-400 text-sm mt-1 mb-3">
                  {templateCategory === 'All'
                    ? 'Seed system templates to get started'
                    : `No templates in "${templateCategory}" category`}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSeedTemplates}
                  disabled={isSeeding}
                >
                  {isSeeding ? (
                    <Settings className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <FileCode className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Seed System Templates
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((tpl) => (
                  <Card
                    key={tpl.id}
                    className="group cursor-pointer hover:shadow-md transition-all duration-200 border-gray-200/80 overflow-hidden hover:border-emerald-200"
                    onClick={() => handleCreateFromTemplate(tpl)}
                  >
                    {/* Thumbnail placeholder */}
                    <div className="relative h-32 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border-b border-gray-100 overflow-hidden">
                      {tpl.thumbnail ? (
                        <img
                          src={tpl.thumbnail}
                          alt={tpl.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-300">
                          <LayoutTemplate className="w-10 h-10" />
                          <span className="text-[10px] font-medium uppercase tracking-wider">Preview</span>
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <Button
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs"
                          style={{ backgroundColor: '#00A76F' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateFromTemplate(tpl);
                          }}
                        >
                          Use Template
                        </Button>
                      </div>
                      {/* System badge */}
                      {tpl.isSystem && (
                        <Badge className="absolute top-2 right-2 text-[10px] px-1.5 py-0 bg-black/60 text-white border-0">
                          System
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm text-gray-900 truncate">
                          {tpl.name}
                        </h4>
                      </div>
                      {tpl.category && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 rounded-full border ${
                            CATEGORY_COLORS[tpl.category] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {tpl.category}
                        </Badge>
                      )}
                      {tpl.description && (
                        <p className="text-[11px] text-gray-400 mt-1.5 line-clamp-2">
                          {tpl.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          <Separator />
          <div className="px-6 pb-4 pt-2 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
            </p>
            <Button variant="outline" size="sm" onClick={() => setShowTemplateDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* THEME SETTINGS DIALOG                                               */}
      {/* ================================================================== */}
      <Dialog open={showThemeDialog} onOpenChange={setShowThemeDialog}>
        <DialogContent className="sm:max-w-[580px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#00A76F' }}>
                <Palette className="w-4 h-4 text-white" />
              </div>
              Theme Settings
            </DialogTitle>
            <DialogDescription>
              Customize the global theme and styling for all CMS pages.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-2">
            <div className="space-y-6 py-2">
              {/* Global Colors */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full" style={{ backgroundColor: '#00A76F' }} />
                  Global Colors
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'primary', label: 'Primary', defaultVal: '#00A76F' },
                    { key: 'secondary', label: 'Secondary', defaultVal: '#111827' },
                    { key: 'background', label: 'Background', defaultVal: '#FFFFFF' },
                    { key: 'accent', label: 'Accent', defaultVal: '#F59E0B' },
                    { key: 'text', label: 'Text Color', defaultVal: '#1F2937' },
                  ].map(({ key, label, defaultVal }) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-xs text-gray-600">{label}</Label>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <input
                            type="color"
                            value={themeForm.colors[key as keyof typeof themeForm.colors] || defaultVal}
                            onChange={(e) =>
                              setThemeForm((prev) => ({
                                ...prev,
                                colors: { ...prev.colors, [key]: e.target.value },
                              }))
                            }
                            className="w-8 h-8 rounded-md border border-gray-200 cursor-pointer p-0.5"
                          />
                        </div>
                        <Input
                          value={themeForm.colors[key as keyof typeof themeForm.colors] || defaultVal}
                          onChange={(e) =>
                            setThemeForm((prev) => ({
                              ...prev,
                              colors: { ...prev.colors, [key]: e.target.value },
                            }))
                          }
                          className="h-8 text-xs font-mono flex-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Typography */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full" style={{ backgroundColor: '#00A76F' }} />
                  Typography
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Heading Font</Label>
                    <Select
                      value={themeForm.typography.headingFont}
                      onValueChange={(val) =>
                        setThemeForm((prev) => ({
                          ...prev,
                          typography: { ...prev.typography, headingFont: val },
                        }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['Poppins', 'Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Playfair Display', 'Lato', 'Nunito'].map(
                          (font) => (
                            <SelectItem key={font} value={font}>
                              {font}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Body Font</Label>
                    <Select
                      value={themeForm.typography.bodyFont}
                      onValueChange={(val) =>
                        setThemeForm((prev) => ({
                          ...prev,
                          typography: { ...prev.typography, bodyFont: val },
                        }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['Inter', 'Roboto', 'Open Sans', 'Poppins', 'Lato', 'Nunito', 'Source Sans Pro', 'Raleway'].map(
                          (font) => (
                            <SelectItem key={font} value={font}>
                              {font}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Layout Settings */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full" style={{ backgroundColor: '#00A76F' }} />
                  Layout
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-600">Border Radius</Label>
                      <Select
                        value={themeForm.borderRadius}
                        onValueChange={(val) =>
                          setThemeForm((prev) => ({ ...prev, borderRadius: val }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['0px', '4px', '8px', '12px', '16px', '24px', '9999px'].map((val) => (
                            <SelectItem key={val} value={val}>
                              {val === '9999px' ? 'Pill (9999px)' : val}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-600">Spacing</Label>
                      <Select
                        value={themeForm.spacing}
                        onValueChange={(val) =>
                          setThemeForm((prev) => ({ ...prev, spacing: val }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['16px', '24px', '32px', '48px', '64px'].map((val) => (
                            <SelectItem key={val} value={val}>
                              {val}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Box Shadow</Label>
                    <Select
                      value={themeForm.shadow}
                      onValueChange={(val) =>
                        setThemeForm((prev) => ({ ...prev, shadow: val }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          { label: 'None', value: 'none' },
                          { label: 'Small', value: '0 1px 3px rgba(0,0,0,0.1)' },
                          { label: 'Medium', value: '0 4px 6px rgba(0,0,0,0.1)' },
                          { label: 'Large', value: '0 10px 25px rgba(0,0,0,0.15)' },
                          { label: 'XL', value: '0 20px 40px rgba(0,0,0,0.2)' },
                        ].map(({ label, value }) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Dark Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-900">Dark Mode</Label>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Enable dark mode theme for all pages
                  </p>
                </div>
                <Switch
                  checked={themeForm.darkMode}
                  onCheckedChange={(checked) =>
                    setThemeForm((prev) => ({ ...prev, darkMode: checked }))
                  }
                />
              </div>

              <Separator />

              {/* Custom CSS */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full" style={{ backgroundColor: '#00A76F' }} />
                  Custom CSS
                </h3>
                <Textarea
                  placeholder="/* Add your custom CSS here */&#10;.my-class {&#10;  color: #00A76F;&#10;}"
                  value={themeForm.customCss}
                  onChange={(e) =>
                    setThemeForm((prev) => ({ ...prev, customCss: e.target.value }))
                  }
                  className="min-h-[120px] font-mono text-xs"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Custom CSS will be applied to all CMS pages globally.
                </p>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" onClick={() => setShowThemeDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTheme}
              disabled={isSavingTheme}
              className="text-white"
              style={{ backgroundColor: '#00A76F', borderColor: '#00A76F' }}
            >
              {isSavingTheme ? (
                <Settings className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-1.5" />
              )}
              Save Theme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* DELETE CONFIRMATION                                                  */}
      {/* ================================================================== */}
      <AlertDialog open={!!deletePageId} onOpenChange={(open) => !open && setDeletePageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              Delete Page
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this page? This action cannot be undone.
              All page content, revisions, and settings will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!!actionLoading}
              className="bg-red-600 text-white hover:bg-red-700 border-red-600"
            >
              {actionLoading === deletePageId ? (
                <Settings className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1.5" />
              )}
              Delete Page
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ================================================================== */}
      {/* PREVIEW DIALOG                                                       */}
      {/* ================================================================== */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-gray-500" />
                  Page Preview
                </DialogTitle>
                <DialogDescription>
                  {previewPage?.title} — /{previewPage?.slug}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {previewPage && (
                  <Badge
                    variant="outline"
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                      STATUS_CONFIG[previewPage.status]?.className || STATUS_CONFIG.draft.className
                    }`}
                  >
                    {STATUS_CONFIG[previewPage.status]?.label || 'Draft'}
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (previewPage) {
                      setShowPreviewDialog(false);
                      handleEdit(previewPage);
                    }
                  }}
                  className="text-xs"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Edit
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden p-6">
            <div className="w-full h-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-inner">
              {previewPage ? (
                (() => {
                  try {
                    const schema = typeof previewPage.schema === 'string'
                      ? JSON.parse(previewPage.schema)
                      : previewPage.schema;
                    if (schema?.sections && schema.sections.length > 0) {
                      return (
                        <ScrollArea className="h-full">
                          <div className="p-0">
                            {schema.sections.map((section: { id: string; props?: { background?: string; padding?: string; maxWidth?: string }; columns?: { id: string; width: number; widgets: unknown[] }[] }) => (
                              <div
                                key={section.id}
                                style={{
                                  background: section.props?.background || 'transparent',
                                  padding: section.props?.padding || '40px 0',
                                }}
                              >
                                <div
                                  style={{
                                    maxWidth: section.props?.maxWidth || '1200px',
                                    margin: '0 auto',
                                    padding: '0 24px',
                                  }}
                                >
                                  <p className="text-xs text-gray-400 font-mono mb-2">
                                    Section: {section.id.slice(0, 16)}...
                                  </p>
                                  <div className="grid gap-4" style={{
                                    gridTemplateColumns: (section.columns || []).map((c: { width: number }) => `${c.width}%`).join(' '),
                                  }}>
                                    {(section.columns || []).map((col: { id: string; width: number; widgets: { id: string; type: string; name: string }[] }) => (
                                      <div key={col.id} className="min-h-[60px]">
                                        {col.widgets.length === 0 ? (
                                          <p className="text-[11px] text-gray-300 italic">Empty column</p>
                                        ) : (
                                          col.widgets.map((w: { id: string; type: string; name: string }) => (
                                            <div
                                              key={w.id}
                                              className="p-3 mb-2 bg-gray-50 rounded-lg border border-gray-100"
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">
                                                  {w.type}
                                                </span>
                                                <span className="text-xs text-gray-600">{w.name}</span>
                                              </div>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      );
                    }
                    return (
                      <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <FileText className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">Empty Page</p>
                        <p className="text-gray-400 text-sm mt-1">
                          This page has no content yet. Click Edit to start building.
                        </p>
                      </div>
                    );
                  } catch {
                    return (
                      <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <FileText className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">Invalid Schema</p>
                        <p className="text-gray-400 text-sm mt-1">
                          Unable to parse page schema for preview.
                        </p>
                      </div>
                    );
                  }
                })()
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}