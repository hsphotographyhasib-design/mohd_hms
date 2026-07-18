'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File,
  Download,
  Eye,
  Filter,
  X,
  Loader2,
  FolderOpen,
  Search,
  ChevronRight,
} from 'lucide-react';
import { useAppStore, useAuthStore } from '@/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ============ TYPES ============

interface DocumentItem {
  id: string;
  name: string;
  type: 'invoice' | 'quotation' | 'report' | 'photo' | 'other';
  category: string;
  url: string;
  mimeType?: string;
  size?: number;
  createdAt: string;
  relatedId?: string;
  relatedTitle?: string;
}

// ============ HELPERS ============

function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  switch (type) {
    case 'invoice':
      return <FileText className="size-5 text-emerald-600" />;
    case 'quotation':
      return <FileSpreadsheet className="size-5 text-blue-600" />;
    case 'photo':
      return <ImageIcon className="size-5 text-purple-600" />;
    case 'report':
      return <File className="size-5 text-amber-600" />;
    default:
      return <File className="size-5 text-gray-500" />;
  }
}

const TYPE_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Invoices', value: 'invoice' },
  { label: 'Quotations', value: 'quotation' },
  { label: 'Photos', value: 'photo' },
  { label: 'Reports', value: 'report' },
];

// ============ ANIMATION VARIANTS ============

const cardVariant = (idx: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, delay: Math.min(idx * 0.03, 0.15) },
});

// ============ MAIN COMPONENT ============

export function MobileDocuments() {
  const { setView } = useAppStore();
  const { token } = useAuthStore();

  const [activeTab, setActiveTab] = useState('all');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Generate documents from available data (invoices, quotations with PDFs, and complaint photos)
  const fetchDocuments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch recent invoices as documents
      const invoiceRes = await fetch('/api/invoices?page=1&pageSize=50', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const docs: DocumentItem[] = [];

      if (invoiceRes.ok) {
        const invoiceJson = await invoiceRes.json();
        const invoices = invoiceJson.data || [];
        for (const inv of invoices) {
          docs.push({
            id: `inv-${inv.id}`,
            name: inv.invoiceNumber || 'Invoice',
            type: 'invoice',
            category: 'Invoice',
            url: inv.pdfUrl || '#',
            createdAt: inv.createdAt,
            relatedId: inv.id,
            relatedTitle: inv.title || inv.invoiceNumber,
          });
        }
      }

      // Fetch recent complaints with photos
      const complaintRes = await fetch('/api/complaints?page=1&pageSize=50', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (complaintRes.ok) {
        const complaintJson = await complaintRes.json();
        const complaints = complaintJson.data || complaintJson.complaints || [];
        for (const cmp of complaints) {
          const photos = cmp.photos ? parsePhotos(cmp.photos) : [];
          for (let i = 0; i < photos.length; i++) {
            docs.push({
              id: `photo-${cmp.id}-${i}`,
              name: `Photo — ${cmp.title || cmp.complaintNumber || 'Complaint'}`,
              type: 'photo',
              category: 'Complaint Photo',
              url: photos[i],
              createdAt: cmp.createdAt,
              relatedId: cmp.id,
              relatedTitle: cmp.title || 'Complaint',
            });
          }
        }
      }

      setDocuments(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [token]);

  function parsePhotos(photos: unknown): string[] {
    if (!photos) return [];
    if (typeof photos === 'string') {
      try {
        const parsed = JSON.parse(photos);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    if (Array.isArray(photos)) return photos;
    return [];
  }

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Auto-focus search
  useEffect(() => {
    if (searchOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [searchOpen]);

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesTab = activeTab === 'all' || doc.type === activeTab;
    const matchesSearch = !searchQuery.trim() ||
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.relatedTitle || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleDocTap = (doc: DocumentItem) => {
    if (doc.type === 'invoice') {
      setView('invoice-detail', { id: doc.relatedId! });
    } else if (doc.type === 'photo' && doc.relatedId) {
      setView('complaint-detail', { id: doc.relatedId });
    } else if (doc.url && doc.url !== '#') {
      window.open(doc.url, '_blank');
    }
  };

  // ============ LOADING STATE ============
  if (loading && documents.length === 0) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
          <div className="flex items-center gap-3 px-4 h-14">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="px-4 pt-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="size-9 -ml-1" onClick={() => setView('dashboard')} aria-label="Back">
              <ArrowLeft className="size-5 text-gray-600" />
            </Button>
            <h1 className="text-lg font-bold text-gray-900">Documents</h1>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-[11px] font-medium bg-gray-100 text-gray-600">
              {filteredDocuments.length} file{filteredDocuments.length !== 1 ? 's' : ''}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Search documents"
            >
              {searchOpen ? <X className="size-5 text-gray-500" /> : <Search className="size-5 text-gray-500" />}
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        {searchOpen && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="h-9 pl-9 pr-8 text-sm bg-gray-50 border-gray-200 rounded-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200"
                  aria-label="Clear"
                >
                  <X className="size-3.5 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex overflow-x-auto px-4 pb-0 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'relative flex-shrink-0 px-4 py-2.5 text-sm font-medium transition-colors',
                activeTab === tab.value
                  ? 'text-emerald-700'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {tab.label}
              {activeTab === tab.value && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-emerald-600" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ─── Document List ─── */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
        {error ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-red-50">
              <FileText className="size-7 text-red-400" />
            </div>
            <p className="text-sm font-medium text-red-600">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchDocuments}>
              Retry
            </Button>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-gray-100">
              <FolderOpen className="size-7 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">
              {searchQuery ? 'No matching documents' : 'No documents yet'}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {searchQuery ? 'Try a different search term' : 'Documents from invoices and complaints will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredDocuments.map((doc, idx) => (
              <motion.button
                key={doc.id}
                {...cardVariant(idx)}
                onClick={() => handleDocTap(doc)}
                className="w-full rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm text-left transition-all active:scale-[0.98] active:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  {/* File Icon */}
                  <div className="flex size-11 items-center justify-center rounded-lg bg-gray-50 shrink-0">
                    {getFileIcon(doc.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{doc.name}</h3>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="text-gray-400">{formatDate(doc.createdAt)}</span>
                      {doc.category && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span>{doc.category}</span>
                        </>
                      )}
                    </div>
                    {doc.relatedTitle && doc.relatedTitle !== doc.name && (
                      <p className="mt-0.5 text-xs text-gray-400 truncate">{doc.relatedTitle}</p>
                    )}
                  </div>

                  {/* Chevron */}
                  <ChevronRight className="size-4 text-gray-300 shrink-0" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}