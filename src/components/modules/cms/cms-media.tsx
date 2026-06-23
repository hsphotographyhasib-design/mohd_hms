'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus, Search, ImageIcon, Loader2, ChevronLeft, ChevronRight,
  AlertCircle, Trash2, Upload, FileVideo, FileText, FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';

// ============ TYPES ============

interface MediaItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  folder: string;
  category: string;
  alt: string;
  url: string;
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

// ============ HELPERS ============

function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${size} ${units[i]}`;
}

function formatTotalSize(items: MediaItem[]): string {
  const total = items.reduce((sum, item) => sum + (item.fileSize || 0), 0);
  return formatFileSize(total);
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType.startsWith('video/')) return FileVideo;
  return FileText;
}

function isImageType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function isVideoType(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

// ============ CONSTANTS ============

const EMPTY_FORM = {
  file: null as File | null,
  folder: '',
  category: '',
  alt: '',
};

// ============ COMPONENT ============

export function CmsMedia() {
  // List state
  const [data, setData] = useState<PaginatedData<MediaItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [error, setError] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    images: 0,
    videos: 0,
    documents: 0,
    totalSize: '0 B',
  });

  // Upload dialog state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<{ file: File | null; folder: string; category: string; alt: string }>({ ...EMPTY_FORM });

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
      if (folderFilter) params.set('folder', folderFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      const res = await fetch(`/api/cms/media?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
      // Compute stats
      const allItems = json.data as MediaItem[];
      setStats({
        total: json.total,
        images: allItems.filter((m) => isImageType(m.mimeType)).length,
        videos: allItems.filter((m) => isVideoType(m.mimeType)).length,
        documents: allItems.filter((m) => !isImageType(m.mimeType) && !isVideoType(m.mimeType)).length,
        totalSize: formatTotalSize(allItems),
      });
    } catch {
      setError(true);
      toast.error('Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [page, search, folderFilter, categoryFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ============ UPLOAD HANDLER ============

  const openUpload = () => {
    setForm({ ...EMPTY_FORM });
    setUploadOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.file) {
      toast.error('Please select a file');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/cms/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          fileName: form.file.name,
          fileSize: form.file.size,
          mimeType: form.file.type,
          url: `/uploads/placeholder/${form.file.name}`,
          folder: form.folder,
          category: form.category,
          alt: form.alt,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Media uploaded');
      setUploadOpen(false);
      fetchData();
    } catch {
      toast.error('Failed to upload media');
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
      const res = await fetch(`/api/cms/media/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Media deleted');
      setDeleteOpen(false);
      setDeleteId(null);
      fetchData();
    } catch {
      toast.error('Failed to delete media');
    } finally {
      setDeleting(false);
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
            <ImageIcon className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Media Library</h1>
            <p className="text-sm text-muted-foreground">Manage uploaded files and media</p>
          </div>
        </div>
        <Button onClick={openUpload} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Upload className="h-4 w-4 mr-2" /> Upload Media
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-emerald-200 bg-emerald-50 text-emerald-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Total Files</p>
            <p className="text-2xl font-bold">{data?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50 text-blue-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Images</p>
            <p className="text-2xl font-bold">{stats.images}</p>
          </CardContent>
        </Card>
        <Card className="border-violet-200 bg-violet-50 text-violet-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Videos</p>
            <p className="text-2xl font-bold">{stats.videos}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50 text-amber-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Documents</p>
            <p className="text-2xl font-bold">{stats.documents}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50 text-gray-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Total Size</p>
            <p className="text-2xl font-bold">{stats.totalSize}</p>
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
                placeholder="Search files..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <div className="relative">
              <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Folder filter..."
                value={folderFilter}
                onChange={(e) => { setFolderFilter(e.target.value); setPage(1); }}
                className="pl-9 w-full sm:w-44"
              />
            </div>
            <Input
              placeholder="Category filter..."
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="w-full sm:w-44"
            />
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      {error ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-rose-600">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load media. Try refreshing.</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-32 w-full rounded-md mb-3" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No media files found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => {
            const FileIcon = getFileIcon(item.mimeType);
            return (
              <Card key={item.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  {/* Thumbnail */}
                  <div className="h-32 w-full rounded-md bg-muted flex items-center justify-center mb-3 overflow-hidden">
                    {isImageType(item.mimeType) ? (
                      <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                    ) : isVideoType(item.mimeType) ? (
                      <FileVideo className="h-10 w-10 text-muted-foreground/40" />
                    ) : (
                      <FileText className="h-10 w-10 text-muted-foreground/40" />
                    )}
                  </div>

                  {/* File Info */}
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium truncate" title={item.fileName}>
                      {item.fileName}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {formatFileSize(item.fileSize)}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        {item.mimeType}
                      </span>
                    </div>
                    {item.folder && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FolderOpen className="h-3 w-3" />
                        <span>{item.folder}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }) : '—'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end mt-3 pt-3 border-t">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => openDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Media</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>File *</Label>
              <Input
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                className="mt-1"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setForm({ ...form, file });
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Accepts images, videos, PDFs, and documents
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Folder</Label>
                <Input
                  className="mt-1"
                  value={form.folder}
                  onChange={(e) => setForm({ ...form, folder: e.target.value })}
                  placeholder="e.g. gallery, blog"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Input
                  className="mt-1"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. hero, product"
                />
              </div>
            </div>
            <div>
              <Label>Alt Text</Label>
              <Input
                className="mt-1"
                value={form.alt}
                onChange={(e) => setForm({ ...form, alt: e.target.value })}
                placeholder="Describe the image for accessibility"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Media</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this file? This action cannot be undone.
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