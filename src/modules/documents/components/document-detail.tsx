'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore, useAppStore } from '@/app-shell/store';
import { DOCUMENT_PERMISSIONS } from '@/core/types';
import { cn } from '@/core/utils/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Separator } from '@/shared/ui/separator';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Textarea } from '@/shared/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog';
import {
  ArrowLeft,
  Download,
  Upload,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  File,
  Archive,
  Trash2,
  RotateCcw,
  Copy,
  Hash,
  FolderOpen,
  Calendar,
  User,
  HardDrive,
  Tag,
  Layers,
  Activity,
  Clock,
  Shield,
  ExternalLink,
  Edit3,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

// ============ Types ============
interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  fileName: string;
  originalName: string;
  size: number;
  checksum?: string;
  storagePath: string;
  changeNote?: string;
  createdBy?: string;
  createdByName?: string | null;
  createdAt: string;
}

interface AuditLog {
  id: string;
  tenantId: string;
  documentId?: string;
  action: string;
  fileName?: string;
  metadata: Record<string, unknown>;
  performedBy?: string;
  performedByName?: string | null;
  performedByRole?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface DocumentDetail {
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
  thumbnailPath?: string;
  virusStatus: string;
  uploadedBy?: string;
  uploadedByName?: string | null;
  isActive: boolean;
  isArchived: boolean;
  sizeFormatted?: string;
  createdAt: string;
  updatedAt: string;
  versions: DocumentVersion[];
  auditLogs: AuditLog[];
  _count?: { versions: number; auditLogs: number };
}

// ============ Helpers ============
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes('pdf')) return { icon: FileText, color: 'text-red-500', bg: 'bg-red-50' };
  if (mimeType.includes('word') || mimeType.includes('document')) return { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' };
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return { icon: FileSpreadsheet, color: 'text-emerald-500', bg: 'bg-emerald-50' };
  if (mimeType.includes('image')) return { icon: FileImage, color: 'text-purple-500', bg: 'bg-purple-50' };
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('compressed')) return { icon: FileArchive, color: 'text-amber-500', bg: 'bg-amber-50' };
  return { icon: File, color: 'text-gray-500', bg: 'bg-gray-50' };
}

function getExt(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  return idx >= 0 ? fileName.substring(idx + 1).toUpperCase() : '?';
}

const ACTION_LABELS: Record<string, string> = {
  upload: 'Uploaded',
  download: 'Downloaded',
  delete: 'Deleted',
  rename: 'Renamed',
  share: 'Shared',
  restore: 'Restored',
  move: 'Moved',
  version_change: 'Version Changed',
  archive: 'Archived',
  unarchive: 'Unarchived',
};

const ACTION_COLORS: Record<string, string> = {
  upload: 'bg-emerald-100 text-emerald-700',
  download: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  rename: 'bg-amber-100 text-amber-700',
  restore: 'bg-purple-100 text-purple-700',
  move: 'bg-cyan-100 text-cyan-700',
  version_change: 'bg-indigo-100 text-indigo-700',
  archive: 'bg-orange-100 text-orange-700',
  unarchive: 'bg-teal-100 text-teal-700',
};

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function hasPermission(action: string): boolean {
  const role = useAuthStore.getState().user?.role || '';
  return (DOCUMENT_PERMISSIONS[role] || []).includes(action);
}

// ============ Component ============
export function DocumentDetail({ documentId }: { documentId: string }) {
  const { setView } = useAppStore();

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [editingFolder, setEditingFolder] = useState(false);
  const [editFolder, setEditFolder] = useState('');
  const [versionUploadOpen, setVersionUploadOpen] = useState(false);
  const [versionChangeNote, setVersionChangeNote] = useState('');
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Fetch document
  const fetchDoc = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setDoc(data);
      setEditName(data.originalName);
      setEditFolder(data.folder);
    } catch {
      toast.error('Document not found');
      setView('documents');
    } finally {
      setLoading(false);
    }
  }, [documentId, setView]);

  useEffect(() => { fetchDoc(); }, [fetchDoc]);

  // Image preview
  useEffect(() => {
    if (doc && doc.mimeType.startsWith('image/')) {
      const fetchImage = async () => {
        try {
          const res = await fetch(`/api/documents/${doc.id}/download`, { headers: getAuthHeaders() });
          if (res.ok) {
            const blob = await res.blob();
            setImagePreviewUrl(URL.createObjectURL(blob));
          }
        } catch { /* silent */ }
      };
      fetchImage();
    }
    return () => { if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl); };
  }, [doc?.id, doc?.mimeType]);

  // Handlers
  const handleDownload = async () => {
    if (!doc) return;
    try {
      const res = await fetch(`/api/documents/${doc.id}/download`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = doc.originalName; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  const handleSaveName = async () => {
    if (!doc || !editName.trim()) return;
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalName: editName.trim() }),
      });
      if (res.ok) { toast.success('Name updated'); setEditingName(false); fetchDoc(); }
    } catch { toast.error('Failed to update name'); }
  };

  const handleSaveFolder = async () => {
    if (!doc || !editFolder.trim()) return;
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: editFolder.trim() }),
      });
      if (res.ok) { toast.success('Folder updated'); setEditingFolder(false); fetchDoc(); }
    } catch { toast.error('Failed to update folder'); }
  };

  const handleArchive = async () => {
    if (!doc) return;
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !doc.isArchived }),
      });
      if (res.ok) { toast.success(doc.isArchived ? 'Unarchived' : 'Archived'); fetchDoc(); }
    } catch { toast.error('Action failed'); }
  };

  const handleDelete = async () => {
    if (!doc) return;
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (res.ok) { toast.success('Document deleted'); setView('documents'); }
    } catch { toast.error('Failed to delete'); }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!doc) return;
    setRestoring(versionId);
    try {
      const res = await fetch(`/api/documents/${doc.id}/versions/${versionId}/restore`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) { toast.success('Version restored'); fetchDoc(); }
      else toast.error('Failed to restore');
    } catch { toast.error('Failed to restore'); }
    finally { setRestoring(null); }
  };

  const handleUploadVersion = async () => {
    if (!doc || !versionFile) return;
    try {
      const formData = new FormData();
      formData.append('file', versionFile);
      formData.append('changeNote', versionChangeNote);

      const res = await fetch(`/api/documents/${doc.id}/versions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      if (res.ok) {
        toast.success('New version uploaded');
        setVersionUploadOpen(false);
        setVersionFile(null);
        setVersionChangeNote('');
        fetchDoc();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Upload failed');
      }
    } catch { toast.error('Upload failed'); }
  };

  const copyChecksum = () => {
    if (doc?.checksum) {
      navigator.clipboard.writeText(doc.checksum);
      toast.success('Checksum copied');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><Skeleton className="h-96 w-full" /></div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!doc) return null;

  const fileIcon = getFileIcon(doc.mimeType);
  const IconComp = fileIcon.icon;
  const isImage = doc.mimeType.startsWith('image/');
  const isPdf = doc.mimeType.includes('pdf');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView('documents')} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', fileIcon.bg)}>
            <IconComp className={cn('h-5 w-5', fileIcon.color)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              {editingName ? (
                <div className="flex items-center gap-1">
                  <Input
                    className="h-7 w-64 text-sm font-semibold"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveName}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingName(false); setEditName(doc.originalName); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-gray-900 max-w-md truncate">{doc.originalName}</h1>
                  {hasPermission('delete') && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingName(true)}>
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs capitalize">{doc.module}</Badge>
              <Badge variant="secondary" className="text-xs">v{doc.version}</Badge>
              {doc.isArchived && (
                <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-300" variant="outline">Archived</Badge>
              )}
              <span className="text-xs text-gray-400">{getExt(doc.originalName)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownload}>
            <Download className="h-4 w-4" /> Download
          </Button>
          {hasPermission('upload') && (
            <Dialog open={versionUploadOpen} onOpenChange={setVersionUploadOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Upload className="h-4 w-4" /> New Version
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload New Version</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">File</label>
                    <Input
                      type="file"
                      onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Change Note</label>
                    <Textarea
                      placeholder="Describe what changed in this version..."
                      value={versionChangeNote}
                      onChange={(e) => setVersionChangeNote(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={!versionFile}
                    onClick={handleUploadVersion}
                  >
                    Upload Version {doc.version + 1}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleArchive}>
            <Archive className="h-4 w-4" /> {doc.isArchived ? 'Unarchive' : 'Archive'}
          </Button>
          {hasPermission('delete') && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Document</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{doc.originalName}&quot;? This action can be undone by an administrator.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Preview + Tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* File Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Eye className="h-4 w-4" /> Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isImage && imagePreviewUrl ? (
                <div className="rounded-lg overflow-hidden bg-gray-50 border flex items-center justify-center max-h-[500px]">
                  <img src={imagePreviewUrl} alt={doc.originalName} className="max-w-full max-h-[500px] object-contain" />
                </div>
              ) : isPdf ? (
                <div className="rounded-lg overflow-hidden bg-gray-50 border flex items-center justify-center h-64">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-red-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 font-medium">PDF Document</p>
                    <p className="text-xs text-gray-400 mt-1">Click Download to view the full document</p>
                    <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={handleDownload}>
                      <Download className="h-3.5 w-3.5" /> Download PDF
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 border flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className={cn('h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-3', fileIcon.bg)}>
                      <IconComp className={cn('h-8 w-8', fileIcon.color)} />
                    </div>
                    <p className="text-sm text-gray-600 font-medium">{getExt(doc.originalName)} File</p>
                    <p className="text-xs text-gray-400 mt-1">{doc.mimeType}</p>
                    <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={handleDownload}>
                      <Download className="h-3.5 w-3.5" /> Download File
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Version History & Audit Tabs */}
          <Card>
            <CardContent className="p-0">
              <Tabs defaultValue="versions">
                <TabsList className="w-full rounded-none border-b bg-transparent p-0 h-auto">
                  <TabsTrigger
                    value="versions"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                  >
                    <Layers className="h-4 w-4 mr-2" /> Versions ({doc.versions.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="audit"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                  >
                    <Activity className="h-4 w-4 mr-2" /> Audit Log ({doc._count?.auditLogs || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="versions" className="p-4">
                  {doc.versions.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No version history</p>
                  ) : (
                    <ScrollArea className="max-h-96">
                      <div className="space-y-2">
                        {doc.versions.map(v => {
                          const isCurrent = v.version === doc.version;
                          return (
                            <div
                              key={v.id}
                              className={cn(
                                'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                                isCurrent ? 'bg-emerald-50 border-emerald-200' : 'hover:bg-gray-50'
                              )}
                            >
                              <div className="h-9 w-9 rounded-lg bg-white border flex items-center justify-center shrink-0">
                                <span className={cn('text-xs font-bold', isCurrent ? 'text-emerald-600' : 'text-gray-500')}>
                                  v{v.version}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate">{v.originalName}</p>
                                  {isCurrent && <Badge className="text-[10px] h-5 bg-emerald-600">Current</Badge>}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                                  <span>{formatSize(v.size)}</span>
                                  {v.createdByName && <span>by {v.createdByName}</span>}
                                  <span>{timeAgo(v.createdAt)}</span>
                                </div>
                                {v.changeNote && (
                                  <p className="text-xs text-gray-400 mt-1 italic">&quot;{v.changeNote}&quot;</p>
                                )}
                              </div>
                              {!isCurrent && hasPermission('version_restore') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1"
                                  disabled={restoring === v.id}
                                  onClick={() => handleRestoreVersion(v.id)}
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  {restoring === v.id ? 'Restoring...' : 'Restore'}
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>

                <TabsContent value="audit" className="p-4">
                  {doc.auditLogs.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No activity recorded</p>
                  ) : (
                    <ScrollArea className="max-h-96">
                      <div className="space-y-2">
                        {doc.auditLogs.map(log => (
                          <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                            <div className="mt-0.5">
                              <Badge
                                variant="secondary"
                                className={cn('text-[10px] h-5 font-normal', ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700')}
                              >
                                {ACTION_LABELS[log.action] || log.action}
                              </Badge>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">{log.performedByName || 'System'}</span>
                                <span className="text-gray-500"> {ACTION_LABELS[log.action]?.toLowerCase() || log.action} this document</span>
                              </p>
                              {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {Object.entries(log.metadata)
                                    .filter(([k]) => !['ip', 'userAgent', 'browser'].includes(k))
                                    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
                                    .join(' • ')}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 shrink-0 text-right">
                              {timeAgo(log.createdAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar: File Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <HardDrive className="h-4 w-4" /> File Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow icon={File} label="File Name" value={doc.originalName} />
              <InfoRow icon={File} label="Stored As" value={doc.fileName} mono />
              <InfoRow icon={Layers} label="MIME Type" value={doc.mimeType} />
              <InfoRow icon={HardDrive} label="Size" value={`${formatSize(doc.size)} (${doc.size.toLocaleString()} bytes)`} />
              <InfoRow icon={Layers} label="Version" value={`v${doc.version}`} />
              {doc.checksum && (
                <div className="flex items-start gap-2">
                  <Hash className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">SHA256 Checksum</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <code className="text-xs font-mono text-gray-600 truncate">{doc.checksum.substring(0, 16)}...{doc.checksum.slice(-8)}</code>
                      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={copyChecksum}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <FolderOpen className="h-4 w-4" /> Organization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow icon={Layers} label="Module" value={doc.module} badge />
              <div className="flex items-start gap-2">
                <FolderOpen className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">Folder</p>
                  {editingFolder ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Input
                        className="h-6 text-xs w-32"
                        value={editFolder}
                        onChange={(e) => setEditFolder(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveFolder()}
                        autoFocus
                      />
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleSaveFolder}><Check className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setEditingFolder(false); setEditFolder(doc.folder); }}><X className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-0.5">
                      <p className="text-sm text-gray-700">{doc.folder}</p>
                      {hasPermission('delete') && (
                        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setEditingFolder(true)}>
                          <Edit3 className="h-2.5 w-2.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {doc.referenceId && (
                <InfoRow icon={ExternalLink} label="Reference ID" value={doc.referenceId} mono />
              )}
              {doc.tags.length > 0 && (
                <div className="flex items-start gap-2">
                  <Tag className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-1">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow icon={User} label="Uploaded By" value={doc.uploadedByName || 'Unknown'} />
              <InfoRow icon={Calendar} label="Created" value={formatDate(doc.createdAt)} />
              <InfoRow icon={Clock} label="Last Modified" value={formatDate(doc.updatedAt)} />
              <InfoRow icon={Shield} label="Virus Scan" value={
                doc.virusStatus === 'safe' ? '✓ Safe' :
                doc.virusStatus === 'infected' ? '✗ Infected' :
                doc.virusStatus === 'skipped' ? '⏭ Skipped' : '⏳ Pending'
              } />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============ Info Row Sub-component ============
function InfoRow({ icon: Icon, label, value, mono, badge }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
  badge?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        {badge ? (
          <Badge variant="outline" className="text-xs capitalize mt-0.5">{value}</Badge>
        ) : (
          <p className={cn('text-sm text-gray-700 mt-0.5 break-all', mono && 'font-mono text-xs')}>{value}</p>
        )}
      </div>
    </div>
  );
}

function Eye({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}