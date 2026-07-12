'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Search, Inbox, Loader2, ChevronLeft, ChevronRight,
  AlertCircle, Mail, Send,
} from 'lucide-react';
import { toast } from 'sonner';

// ============ TYPES ============

interface ContactItem {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  source: string;
  status: string;
  reply: string | null;
  assignedToId: string | null;
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

const SOURCE_OPTIONS = ['website', 'whatsapp', 'email', 'emergency'];
const STATUS_OPTIONS = ['new', 'read', 'replied', 'archived'];

// ============ HELPERS ============

function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

function getSourceBadgeColor(source: string): string {
  const colors: Record<string, string> = {
    website: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    whatsapp: 'bg-green-100 text-green-700 border-green-200',
    email: 'bg-sky-100 text-sky-700 border-sky-200',
    emergency: 'bg-red-100 text-red-700 border-red-200',
  };
  return colors[source] || 'bg-gray-100 text-gray-700 border-gray-200';
}

function getStatusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700 border-blue-200',
    read: 'bg-gray-100 text-gray-600 border-gray-200',
    replied: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    archived: 'bg-amber-100 text-amber-700 border-amber-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// ============ COMPONENT ============

export function CmsContact() {
  // List state
  const [data, setData] = useState<PaginatedData<ContactItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, new: 0, read: 0, replied: 0, archived: 0 });

  // Detail dialog state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<ContactItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [detailStatus, setDetailStatus] = useState('new');
  const [assignedToId, setAssignedToId] = useState('');
  const [saving, setSaving] = useState(false);

  // ============ FETCH ============

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      if (sourceFilter && sourceFilter !== 'all') params.set('source', sourceFilter);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/cms/contact?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
      // Compute stats
      const allItems = json.data as ContactItem[];
      setStats({
        total: json.total,
        new: allItems.filter((s) => s.status === 'new').length,
        read: allItems.filter((s) => s.status === 'read').length,
        replied: allItems.filter((s) => s.status === 'replied').length,
        archived: allItems.filter((s) => s.status === 'archived').length,
      });
    } catch {
      setError(true);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [page, search, sourceFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ============ DETAIL HANDLERS ============

  const openDetail = (item: ContactItem) => {
    setDetailItem(item);
    setReplyText(item.reply || '');
    setDetailStatus(item.status);
    setAssignedToId(item.assignedToId || '');
    setDetailOpen(true);
  };

  const handleSave = async () => {
    if (!detailItem) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/cms/contact/${detailItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          status: detailStatus,
          reply: replyText || null,
          assignedToId: assignedToId || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Message updated');
      setDetailOpen(false);
      fetchData();
    } catch {
      toast.error('Failed to update message');
    } finally {
      setSaving(false);
    }
  };

  // ============ RENDER ============

  const items = data?.data || [];
  const unreadCount = stats.new;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Inbox className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Contact Inbox</h1>
              {unreadCount > 0 && (
                <Badge className="bg-rose-500 text-white border-rose-500">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Manage incoming messages</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-emerald-200 bg-emerald-50 text-emerald-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Total</p>
            <p className="text-2xl font-bold">{data?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50 text-blue-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">New</p>
            <p className="text-2xl font-bold">{stats.new}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50 text-gray-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Read</p>
            <p className="text-2xl font-bold">{stats.read}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50 text-green-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Replied</p>
            <p className="text-2xl font-bold">{stats.replied}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50 text-amber-700">
          <CardContent className="p-4">
            <p className="text-xs font-medium opacity-75">Archived</p>
            <p className="text-2xl font-bold">{stats.archived}</p>
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
                placeholder="Search messages..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {SOURCE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {error ? (
            <div className="flex items-center gap-3 p-6 text-rose-600">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load messages. Try refreshing.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="hidden md:table-cell">Subject</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No messages found
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer hover:bg-emerald-50/50 transition-colors"
                        onClick={() => openDetail(item)}
                      >
                        <TableCell>
                          <p className="font-medium">{item.name}</p>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{item.email}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm truncate max-w-48 block">{item.subject}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getSourceBadgeColor(item.source)}>
                            {item.source.charAt(0).toUpperCase() + item.source.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusBadgeColor(item.status)}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm text-muted-foreground">{formatDate(item.createdAt)}</span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
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
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              {/* Message Info */}
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-semibold text-lg">{detailItem.name}</p>
                    <p className="text-sm text-muted-foreground">{detailItem.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className={getSourceBadgeColor(detailItem.source)}>
                      {detailItem.source}
                    </Badge>
                    <Badge variant="outline" className={getStatusBadgeColor(detailItem.status)}>
                      {detailItem.status}
                    </Badge>
                  </div>
                </div>
                {detailItem.subject && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Subject</p>
                    <p className="text-sm">{detailItem.subject}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Message</p>
                  <p className="text-sm whitespace-pre-wrap">{detailItem.message}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Received: {formatDate(detailItem.createdAt)}
                </p>
              </div>

              {/* Reply */}
              <div>
                <Label>Reply</Label>
                <Textarea
                  className="mt-1"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  rows={3}
                />
              </div>

              {/* Status & Assign */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select
                    value={detailStatus}
                    onValueChange={setDetailStatus}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Assign to Employee</Label>
                  <Input
                    className="mt-1"
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    placeholder="Employee ID or name"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}