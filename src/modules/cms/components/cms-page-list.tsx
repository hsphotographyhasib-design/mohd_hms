'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import {
  Plus,
  Search,
  FileText,
  MoreHorizontal,
  Pencil,
  Eye,
  Copy,
  Globe,
  GlobeLock,
  Trash2,
  LayoutGrid,
  List,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { useAppStore } from '@/app-shell/store';
import { toast } from 'sonner';
import type { PageListItem, PageStatus } from '@/modules/cms/page-builder/types';

// ============ TYPES ============

type FilterTab = 'all' | 'published' | 'draft' | 'archived';
type SortField = 'title' | 'updatedAt' | 'version' | 'status';
type SortDir = 'asc' | 'desc';

// ============ CONSTANTS ============

const FILTER_TABS: { key: FilterTab; label: string; count?: number }[] = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Published' },
  { key: 'draft', label: 'Draft' },
  { key: 'archived', label: 'Archived' },
];

const STATUS_CONFIG: Record<PageStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; className: string }> = {
  published: { label: 'Published', variant: 'default', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200' },
  draft: { label: 'Draft', variant: 'secondary', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200' },
  archived: { label: 'Archived', variant: 'outline', className: 'bg-gray-100 text-gray-500 hover:bg-gray-100 border-gray-200' },
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

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ============ COMPONENT ============

export function CmsPageList() {
  const { setView } = useAppStore();

  // Data state
  const [pages, setPages] = useState<PageListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [creating, setCreating] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<PageListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Action loading states
  const [actionLoading, setActionLoading] = useState<Record<string, string | null>>({});

  // ============ DATA FETCHING ============

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cms/pages', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to fetch pages');
      const json = await res.json();
      setPages(json.pages ?? []);
    } catch {
      toast.error('Failed to load pages');
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  // ============ FILTERED / SORTED DATA ============

  const filteredPages = useMemo(() => {
    let result = [...pages];

    // Filter by tab
    if (activeTab !== 'all') {
      result = result.filter((p) => p.status === activeTab);
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'updatedAt':
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'version':
          cmp = a.version - b.version;
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [pages, activeTab, search, sortField, sortDir]);

  const tabCounts = useMemo(() => ({
    all: pages.length,
    published: pages.filter((p) => p.status === 'published').length,
    draft: pages.filter((p) => p.status === 'draft').length,
    archived: pages.filter((p) => p.status === 'archived').length,
  }), [pages]);

  // ============ ACTIONS ============

  const handleCreatePage = async () => {
    const title = newPageTitle.trim();
    if (!title) return;

    setCreating(true);
    try {
      const res = await fetch('/api/cms/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ title, slug: slugify(title) }),
      });

      if (!res.ok) throw new Error('Failed to create page');
      const data = await res.json();
      toast.success(`Page "${title}" created successfully`);
      setCreateDialogOpen(false);
      setNewPageTitle('');
      // Navigate to the builder
      setView('cms-page-builder', { id: data.page.id });
    } catch {
      toast.error('Failed to create page. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (page: PageListItem) => {
    setActionLoading((prev) => ({ ...prev, [page.id]: 'duplicate' }));
    try {
      const res = await fetch('/api/cms/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          title: `${page.title} (Copy)`,
          slug: `${page.slug}-copy-${Date.now().toString(36)}`,
          duplicateFrom: page.id,
        }),
      });
      if (!res.ok) throw new Error('Failed to duplicate');
      toast.success(`Duplicated "${page.title}"`);
      fetchPages();
    } catch {
      toast.error('Failed to duplicate page');
    } finally {
      setActionLoading((prev) => ({ ...prev, [page.id]: null }));
    }
  };

  const handleTogglePublish = async (page: PageListItem) => {
    const newStatus: PageStatus = page.status === 'published' ? 'draft' : 'published';
    const action = newStatus === 'published' ? 'Publish' : 'Unpublish';
    setActionLoading((prev) => ({ ...prev, [page.id]: 'publish' }));
    try {
      const res = await fetch(`/api/cms/pages/${page.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`Failed to ${action.toLowerCase()}`);
      toast.success(`${action}ed "${page.title}"`);
      fetchPages();
    } catch {
      toast.error(`Failed to ${action.toLowerCase()} page`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [page.id]: null }));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cms/pages/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success(`Deleted "${deleteTarget.title}"`);
      setDeleteTarget(null);
      fetchPages();
    } catch {
      toast.error('Failed to delete page');
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // ============ RENDER ============

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Layers className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Pages</h1>
            <p className="text-sm text-muted-foreground">
              Manage your website pages with the visual builder
            </p>
          </div>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="gap-2 bg-[#00A76F] hover:bg-[#008F5D] text-white"
        >
          <Plus className="h-4 w-4" />
          Create New Page
        </Button>
      </div>

      {/* Search + View Toggle + Sort */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
            className="gap-1.5"
          >
            {viewMode === 'table' ? (
              <><LayoutGrid className="h-3.5 w-3.5" /> Grid</>
            ) : (
              <><List className="h-3.5 w-3.5" /> Table</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('updatedAt')}
            className="gap-1.5"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortField === 'updatedAt'
              ? (sortDir === 'desc' ? 'Newest' : 'Oldest')
              : 'Sort'}
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === tab.key
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            <span className={`text-xs tabular-nums ${activeTab === tab.key ? 'text-emerald-600' : 'text-muted-foreground/60'}`}>
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton viewMode={viewMode} />
      ) : filteredPages.length === 0 ? (
        <EmptyState
          search={search}
          activeTab={activeTab}
          onClearSearch={() => setSearch('')}
          onClearFilter={() => setActiveTab('all')}
          onCreate={() => setCreateDialogOpen(true)}
        />
      ) : viewMode === 'table' ? (
        <TableView
          pages={filteredPages}
          sortField={sortField}
          sortDir={sortDir}
          actionLoading={actionLoading}
          onSort={handleSort}
          onEdit={(page) => setView('cms-page-builder', { id: page.id })}
          onPreview={(page) => toast.info(`Preview: ${page.title}`)}
          onDuplicate={handleDuplicate}
          onTogglePublish={handleTogglePublish}
          onDelete={(page) => setDeleteTarget(page)}
        />
      ) : (
        <GridView
          pages={filteredPages}
          actionLoading={actionLoading}
          onEdit={(page) => setView('cms-page-builder', { id: page.id })}
          onPreview={(page) => toast.info(`Preview: ${page.title}`)}
          onDuplicate={handleDuplicate}
          onTogglePublish={handleTogglePublish}
          onDelete={(page) => setDeleteTarget(page)}
        />
      )}

      {/* Create Page Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Plus className="h-4 w-4 text-emerald-600" />
              </div>
              Create New Page
            </DialogTitle>
            <DialogDescription>
              Enter a title for your new page. A URL slug will be generated automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Page Title</label>
              <Input
                placeholder="e.g. About Our Services"
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPageTitle.trim()) handleCreatePage();
                }}
                autoFocus
              />
            </div>
            {newPageTitle.trim() && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Slug:</span>
                <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono">
                  /{slugify(newPageTitle)}
                </code>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setNewPageTitle('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePage}
              disabled={!newPageTitle.trim() || creating}
              className="bg-[#00A76F] hover:bg-[#008F5D] text-white"
            >
              {creating ? (
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                <Trash2 className="h-4 w-4 text-rose-600" />
              </div>
              Delete Page
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&quot;{deleteTarget?.title}&quot;</strong>?
              This action cannot be undone. All sections, widgets, and content will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? 'Deleting...' : 'Delete Page'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============ TABLE VIEW ============

function TableView({
  pages,
  sortField,
  sortDir,
  actionLoading,
  onSort,
  onEdit,
  onPreview,
  onDuplicate,
  onTogglePublish,
  onDelete,
}: {
  pages: PageListItem[];
  sortField: SortField;
  sortDir: SortDir;
  actionLoading: Record<string, string | null>;
  onSort: (field: SortField) => void;
  onEdit: (page: PageListItem) => void;
  onPreview: (page: PageListItem) => void;
  onDuplicate: (page: PageListItem) => void;
  onTogglePublish: (page: PageListItem) => void;
  onDelete: (page: PageListItem) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => onSort('title')}
                >
                  <span className="flex items-center gap-1">
                    Title
                    {sortField === 'title' && (
                      <ArrowUpDown className="h-3 w-3 text-emerald-600" />
                    )}
                  </span>
                </TableHead>
                <TableHead className="hidden md:table-cell">Slug</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => onSort('status')}
                >
                  <span className="flex items-center gap-1">
                    Status
                    {sortField === 'status' && (
                      <ArrowUpDown className="h-3 w-3 text-emerald-600" />
                    )}
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hidden sm:table-cell"
                  onClick={() => onSort('version')}
                >
                  <span className="flex items-center gap-1">
                    Version
                    {sortField === 'version' && (
                      <ArrowUpDown className="h-3 w-3 text-emerald-600" />
                    )}
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => onSort('updatedAt')}
                >
                  <span className="flex items-center gap-1">
                    Last Modified
                    {sortField === 'updatedAt' && (
                      <ArrowUpDown className="h-3 w-3 text-emerald-600" />
                    )}
                  </span>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="font-medium truncate cursor-pointer hover:text-[#00A76F] transition-colors"
                          onClick={() => onEdit(page)}
                        >
                          {page.title}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
                      {page.slug}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_CONFIG[page.status].className}>
                      {STATUS_CONFIG[page.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-sm text-muted-foreground">v{page.version}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(page.updatedAt)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <PageActions
                      page={page}
                      actionLoading={actionLoading[page.id]}
                      onEdit={onEdit}
                      onPreview={onPreview}
                      onDuplicate={onDuplicate}
                      onTogglePublish={onTogglePublish}
                      onDelete={onDelete}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ GRID VIEW ============

function GridView({
  pages,
  actionLoading,
  onEdit,
  onPreview,
  onDuplicate,
  onTogglePublish,
  onDelete,
}: {
  pages: PageListItem[];
  actionLoading: Record<string, string | null>;
  onEdit: (page: PageListItem) => void;
  onPreview: (page: PageListItem) => void;
  onDuplicate: (page: PageListItem) => void;
  onTogglePublish: (page: PageListItem) => void;
  onDelete: (page: PageListItem) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {pages.map((page) => (
        <Card
          key={page.id}
          className="group hover:shadow-md transition-all hover:border-emerald-200 cursor-pointer"
          onClick={() => onEdit(page)}
        >
          <CardContent className="p-4">
            {/* Thumbnail Placeholder */}
            <div className="w-full h-32 rounded-lg bg-gradient-to-br from-emerald-50 to-white border border-dashed border-emerald-200 mb-4 flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-8 w-8 text-emerald-300 mx-auto mb-1" />
                <p className="text-xs text-emerald-400">Page Preview</p>
              </div>
            </div>

            {/* Content */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-sm leading-tight line-clamp-1">
                {page.title}
              </h3>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${STATUS_CONFIG[page.status].className}`}>
                {STATUS_CONFIG[page.status].label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <code className="font-mono bg-muted px-1.5 py-0.5 rounded truncate">
                {page.slug}
              </code>
              <span>·</span>
              <span>v{page.version}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatDate(page.updatedAt)}
              </span>
              <div onClick={(e) => e.stopPropagation()}>
                <PageActions
                  page={page}
                  actionLoading={actionLoading[page.id]}
                  onEdit={onEdit}
                  onPreview={onPreview}
                  onDuplicate={onDuplicate}
                  onTogglePublish={onTogglePublish}
                  onDelete={onDelete}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============ PAGE ACTIONS ============

function PageActions({
  page,
  actionLoading,
  onEdit,
  onPreview,
  onDuplicate,
  onTogglePublish,
  onDelete,
}: {
  page: PageListItem;
  actionLoading: string | null;
  onEdit: (page: PageListItem) => void;
  onPreview: (page: PageListItem) => void;
  onDuplicate: (page: PageListItem) => void;
  onTogglePublish: (page: PageListItem) => void;
  onDelete: (page: PageListItem) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => onEdit(page)}
          className="gap-2 text-emerald-700 focus:text-emerald-700"
        >
          <Pencil className="h-4 w-4" />
          Edit in Builder
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPreview(page)} className="gap-2">
          <Eye className="h-4 w-4" />
          Preview
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDuplicate(page)}
          disabled={actionLoading === 'duplicate'}
          className="gap-2"
        >
          <Copy className="h-4 w-4" />
          {actionLoading === 'duplicate' ? 'Duplicating...' : 'Duplicate'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onTogglePublish(page)}
          disabled={actionLoading === 'publish'}
          className="gap-2"
        >
          {page.status === 'published' ? (
            <>
              <GlobeLock className="h-4 w-4" />
              Unpublish
            </>
          ) : (
            <>
              <Globe className="h-4 w-4 text-emerald-600" />
              <span className="text-emerald-700">Publish</span>
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(page)}
          className="gap-2 text-rose-600 focus:text-rose-600"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============ LOADING SKELETON ============

function LoadingSkeleton({ viewMode }: { viewMode: 'table' | 'grid' }) {
  if (viewMode === 'table') {
    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Version</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-8 rounded ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="w-full h-32 rounded-lg mb-4" />
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-24 mb-3" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============ EMPTY STATE ============

function EmptyState({
  search,
  activeTab,
  onClearSearch,
  onClearFilter,
  onCreate,
}: {
  search: string;
  activeTab: FilterTab;
  onClearSearch: () => void;
  onClearFilter: () => void;
  onCreate: () => void;
}) {
  const isFiltered = activeTab !== 'all' || search.trim() !== '';

  return (
    <Card className="border-dashed">
      <CardContent className="py-16 px-6">
        <div className="flex flex-col items-center text-center max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
            {isFiltered ? (
              <Search className="h-8 w-8 text-emerald-300" />
            ) : (
              <FileText className="h-8 w-8 text-emerald-300" />
            )}
          </div>
          <h3 className="text-lg font-semibold mb-1">
            {isFiltered ? 'No pages match your filters' : 'No pages yet'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isFiltered
              ? 'Try adjusting your search or filter to find what you\'re looking for.'
              : 'Create your first page using the visual page builder. Start from scratch or use a template.'}
          </p>
          <div className="flex items-center gap-2">
            {isFiltered ? (
              <>
                {search && (
                  <Button variant="outline" size="sm" onClick={onClearSearch} className="gap-1.5">
                    Clear Search
                  </Button>
                )}
                {activeTab !== 'all' && (
                  <Button variant="outline" size="sm" onClick={onClearFilter} className="gap-1.5">
                    Show All
                  </Button>
                )}
              </>
            ) : (
              <Button
                onClick={onCreate}
                className="gap-1.5 bg-[#00A76F] hover:bg-[#008F5D] text-white"
              >
                <Plus className="h-4 w-4" />
                Create First Page
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}