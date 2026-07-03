'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAuthStore, useAppStore } from '@/store';
import type { AppView, DocumentModule } from '@/types';
import { CHUNK_SIZE, DOCUMENT_PERMISSIONS } from '@/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Upload,
  Search,
  Filter,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  File,
  FolderOpen,
  MoreVertical,
  Download,
  Eye,
  Trash2,
  Archive,
  X,
  Pause,
  Play,
  AlertCircle,
  CheckCircle2,
  HardDrive,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// ============ Types ============
interface DocumentItem {
  id: string;
  tenantId: string;
  module: string;
  referenceId?: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum?: string;
  version: number;
  folder: string;
  tags: string[];
  storagePath: string;
  virusStatus: string;
  uploadedBy?: string;
  uploadedByName?: string | null;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { versions: number; auditLogs: number };
}

interface UploadTask {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error';
  sessionId?: string;
  totalChunks: number;
  uploadedChunks: number;
  error?: string;
  abortController?: AbortController;
}

// ============ Helpers ============
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes('pdf')) return { icon: FileText, color: 'text-red-500', bg: 'bg-red-50' };
  if (mimeType.includes('word') || mimeType.includes('document')) return { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' };
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return { icon: FileSpreadsheet, color: 'text-emerald-500', bg: 'bg-emerald-50' };
  if (mimeType.includes('image')) return { icon: FileImage, color: 'text-purple-500', bg: 'bg-purple-50' };
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('compressed')) return { icon: FileArchive, color: 'text-amber-500', bg: 'bg-amber-50' };
  if (mimeType.includes('video')) return { icon: File, color: 'text-pink-500', bg: 'bg-pink-50' };
  return { icon: File, color: 'text-gray-500', bg: 'bg-gray-50' };
}

function getExt(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  return idx >= 0 ? fileName.substring(idx + 1).toUpperCase() : '?';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const MODULE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Modules' },
  { value: 'customers', label: 'Customers' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'workorders', label: 'Work Orders' },
  { value: 'quotations', label: 'Quotations' },
  { value: 'invoices', label: 'Invoices' },
  { value: 'reports', label: 'Reports' },
  { value: 'photos', label: 'Photos' },
  { value: 'archive', label: 'Archive' },
  { value: 'general', label: 'General' },
];

// ============ Auth helper ============
function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().user?.token;
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function hasPermission(action: string): boolean {
  const role = useAuthStore.getState().user?.role || '';
  return (DOCUMENT_PERMISSIONS[role] || []).includes(action);
}

// ============ Component ============
export function DocumentList() {
  const { setView } = useAppStore();

  // Data state
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [thisMonthCount, setThisMonthCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [modFilter, setModFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Upload
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [uploadModule, setUploadModule] = useState('general');
  const [uploadFolder, setUploadFolder] = useState('general');
  const [uploadTags, setUploadTags] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTasksRef = useRef<UploadTask[]>([]);

  // Sync ref
  useEffect(() => { uploadTasksRef.current = uploadTasks; }, [uploadTasks]);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
        status: statusFilter,
      });
      if (search) params.set('search', search);
      if (modFilter) params.set('module', modFilter);

      const res = await fetch(`/api/documents?${params}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDocuments(data.documents);
      setTotal(data.pagination.total);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [page, search, modFilter, statusFilter, sortBy, sortOrder]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const [activeRes, archivedRes] = await Promise.all([
        fetch('/api/documents?limit=1&status=active', { headers: getAuthHeaders() }),
        fetch('/api/documents?limit=1&status=all', { headers: getAuthHeaders() }),
      ]);
      if (activeRes.ok) {
        const activeData = await activeRes.json();
        setTotalSize(activeData.documents?.reduce?.((sum: number, d: DocumentItem) => sum + d.size, 0) || 0);
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const thisMonth = (activeData.documents || []).filter((d: DocumentItem) => d.createdAt >= monthStart);
        setThisMonthCount(thisMonth.length);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, modFilter, statusFilter, sortBy, sortOrder]);

  // ============ Chunk Upload ============
  const processFile = useCallback(async (task: UploadTask) => {
    try {
      // Update status
      setUploadTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'uploading' } : t));

      // Step 1: Init session
      const initRes = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: task.file.name,
          fileSize: task.file.size,
          mimeType: task.file.type || 'application/octet-stream',
          module: uploadModule,
          folder: uploadFolder,
          tags: uploadTags ? uploadTags.split(',').map(t => t.trim()).filter(Boolean) : [],
        }),
      });

      if (!initRes.ok) {
        const err = await initRes.json();
        throw new Error(err.error || 'Failed to init upload');
      }

      const { sessionId, totalChunks } = await initRes.json();
      setUploadTasks(prev => prev.map(t => t.id === task.id ? { ...t, sessionId, totalChunks } : t));

      // Step 2: Upload chunks
      const chunks: { index: number; blob: Blob }[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, task.file.size);
        chunks.push({ index: i, blob: task.file.slice(start, end) });
      }

      let uploaded = 0;
      for (const chunk of chunks) {
        // Check if cancelled
        const current = uploadTasksRef.current.find(t => t.id === task.id);
        if (!current || current.status === 'paused' || current.abortController?.signal.aborted) {
          return; // Stop processing
        }

        const formData = new FormData();
        formData.append('sessionId', sessionId);
        formData.append('chunkIndex', String(chunk.index));
        formData.append('chunk', chunk.blob, `chunk_${chunk.index}`);

        const chunkRes = await fetch('/api/documents/upload/chunk', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData,
        });

        if (!chunkRes.ok) {
          throw new Error(`Chunk ${chunk.index} failed`);
        }

        uploaded++;
        const progress = Math.round((uploaded / totalChunks) * 100);
        setUploadTasks(prev => prev.map(t => t.id === task.id ? { ...t, progress, uploadedChunks: uploaded } : t));
      }

      // Step 3: Complete upload
      const completeRes = await fetch('/api/documents/upload/complete', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!completeRes.ok) {
        const err = await completeRes.json();
        throw new Error(err.error || 'Failed to complete upload');
      }

      setUploadTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'completed', progress: 100 } : t));
      toast.success(`${task.file.name} uploaded successfully`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'error', error: msg } : t));
      toast.error(`${task.file.name}: ${msg}`);
    }
  }, [uploadModule, uploadFolder, uploadTags]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newTasks: UploadTask[] = Array.from(files).map(file => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: 'pending' as const,
      totalChunks: Math.ceil(file.size / CHUNK_SIZE),
      uploadedChunks: 0,
      abortController: new AbortController(),
    }));
    setUploadTasks(prev => [...prev, ...newTasks]);
  }, []);

  // Process pending tasks (max 3 concurrent)
  useEffect(() => {
    const pending = uploadTasks.filter(t => t.status === 'pending').slice(0, 3);
    pending.forEach(t => processFile(t));
  }, [uploadTasks.filter(t => t.status === 'pending').length, processFile]);

  const removeTask = (id: string) => {
    setUploadTasks(prev => prev.filter(t => t.id !== id));
  };

  const cancelTask = (id: string) => {
    const task = uploadTasks.find(t => t.id === id);
    if (task?.abortController) task.abortController.abort();
    if (task?.sessionId) {
      fetch(`/api/documents/upload/${task.sessionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }).catch(() => {});
    }
    setUploadTasks(prev => prev.filter(t => t.id !== id));
  };

  // ============ Actions ============
  const handleDownload = async (doc: DocumentItem) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/download`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast.success('Document deleted');
        fetchDocuments();
      } else {
        toast.error('Failed to delete');
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleArchive = async (doc: DocumentItem) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !doc.isArchived }),
      });
      if (res.ok) {
        toast.success(doc.isArchived ? 'Document unarchived' : 'Document archived');
        fetchDocuments();
      }
    } catch {
      toast.error('Action failed');
    }
  };

  // Drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
      setUploadOpen(true);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const activeTasks = uploadTasks.filter(t => t.status !== 'completed');

  return (
    <div className="space-y-6"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Global Drag Overlay */}
      <AnimatePresence>
        {dragOver && !uploadOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-white rounded-2xl p-12 text-center shadow-2xl border-2 border-dashed border-emerald-500">
              <Upload className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-900">Drop files to upload</p>
              <p className="text-sm text-gray-500 mt-1">Files will be added to the upload queue</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <FolderOpen className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
            <p className="text-sm text-gray-500">{total} documents in total</p>
          </div>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Upload className="h-4 w-4" />
              Upload Files
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-emerald-600" />
                Upload Documents
              </DialogTitle>
            </DialogHeader>

            {/* Upload settings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Module</label>
                <Select value={uploadModule} onValueChange={setUploadModule}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULE_OPTIONS.filter(m => m.value).map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Folder</label>
                <Input
                  className="h-9"
                  placeholder="general"
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Tags (comma-separated)</label>
                <Input
                  className="h-9"
                  placeholder="tag1, tag2"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* Drop zone */}
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer',
                dragOver ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Drag & drop files here, or <span className="text-emerald-600 font-medium">browse</span></p>
              <p className="text-xs text-gray-400 mt-1">Max 100MB per file • All common formats supported</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }}
              />
            </div>

            {/* Upload queue */}
            {uploadTasks.length > 0 && (
              <ScrollArea className="flex-1 -mx-1">
                <div className="space-y-2 py-2 px-1">
                  {uploadTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                      <div className="shrink-0">
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : task.status === 'error' ? (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <File className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.file.name}</p>
                        <p className="text-xs text-gray-500">{formatSize(task.file.size)}</p>
                        {(task.status === 'uploading' || task.status === 'completed') && (
                          <Progress value={task.progress} className="h-1.5 mt-1" />
                        )}
                        {task.status === 'error' && task.error && (
                          <p className="text-xs text-red-500 mt-0.5">{task.error}</p>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 w-10 text-right shrink-0">
                        {task.progress}%
                      </div>
                      {task.status !== 'completed' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={(e) => { e.stopPropagation(); cancelTask(task.id); }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-500">
                {activeTasks.length > 0 ? `${activeTasks.length} file(s) uploading...` : `${uploadTasks.length} file(s) processed`}
              </p>
              {uploadTasks.some(t => t.status === 'completed') && (
                <Button variant="outline" size="sm" onClick={() => { setUploadTasks([]); fetchDocuments(); setUploadOpen(false); }}>
                  Done
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Documents</p>
                <p className="text-xl font-bold">{total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <HardDrive className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Size</p>
                <p className="text-xl font-bold">{formatSize(totalSize)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">This Month</p>
                <p className="text-xl font-bold">{thisMonthCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center">
                <Upload className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Active Uploads</p>
                <p className="text-xl font-bold">{activeTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search documents by name..."
                className="pl-9 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={modFilter} onValueChange={(v) => setModFilter(v === '_all' ? '' : v)}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  {MODULE_OPTIONS.map(m => (
                    <SelectItem key={m.value || '_all'} value={m.value || '_all'}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Date</SelectItem>
                  <SelectItem value="originalName">Name</SelectItem>
                  <SelectItem value="size">Size</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
                title={sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
              >
                {sortOrder === 'desc' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <FolderOpen className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No documents found</h3>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                {search || modFilter || statusFilter !== 'active'
                  ? 'Try adjusting your filters'
                  : 'Upload your first document to get started'}
              </p>
              {!search && !modFilter && statusFilter === 'active' && (
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => setUploadOpen(true)}>
                  <Plus className="h-4 w-4" /> Upload Document
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px] pl-4">
                      <Checkbox disabled />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Module</TableHead>
                    <TableHead className="hidden sm:table-cell">Size</TableHead>
                    <TableHead className="hidden lg:table-cell">Version</TableHead>
                    <TableHead className="hidden lg:table-cell">Uploaded By</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="w-[60px] pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map(doc => {
                    const fileIcon = getFileIcon(doc.mimeType);
                    const IconComp = fileIcon.icon;
                    return (
                      <TableRow
                        key={doc.id}
                        className="cursor-pointer hover:bg-gray-50/80"
                        onClick={() => setView('document-detail', { id: doc.id })}
                      >
                        <TableCell className="pl-4">
                          <Checkbox disabled />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', fileIcon.bg)}>
                              <IconComp className={cn('h-4 w-4', fileIcon.color)} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate max-w-[240px]">{doc.originalName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-400">{getExt(doc.originalName)}</span>
                                {doc.tags.length > 0 && (
                                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{doc.tags[0]}</Badge>
                                )}
                                {doc.isArchived && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-amber-600 border-amber-300">Archived</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="text-xs capitalize">{doc.module}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-gray-600">
                          {formatSize(doc.size)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="secondary" className="text-xs">v{doc.version}</Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-gray-600">
                          {doc.uploadedByName || 'Unknown'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                          {timeAgo(doc.createdAt)}
                        </TableCell>
                        <TableCell className="pr-4" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => handleDownload(doc)}>
                                <Download className="h-4 w-4 mr-2" /> Download
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setView('document-detail', { id: doc.id })}>
                                <Eye className="h-4 w-4 mr-2" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleArchive(doc)}>
                                <Archive className="h-4 w-4 mr-2" />
                                {doc.isArchived ? 'Unarchive' : 'Archive'}
                              </DropdownMenuItem>
                              {hasPermission('delete') && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => handleDelete(doc)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                      if (pageNum < 1 || pageNum > totalPages) return null;
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? 'default' : 'outline'}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={page >= totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}