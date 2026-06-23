'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Search, History, AlertCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

// ============ TYPES ============

interface ActivityItem {
  id: string;
  section: string;
  action: string;
  user: string;
  ip: string;
  details: string;
  createdAt: string;
}

interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============ CONSTANTS ============

const SECTIONS = [
  'all', 'hero', 'services', 'industries', 'projects', 'blogs', 'testimonials',
  'careers', 'contact', 'media', 'seo', 'footer', 'announcements', 'popups', 'forms',
];

const SECTION_COLORS: Record<string, string> = {
  hero: 'bg-purple-100 text-purple-700 border-purple-200',
  services: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  industries: 'bg-sky-100 text-sky-700 border-sky-200',
  projects: 'bg-orange-100 text-orange-700 border-orange-200',
  blogs: 'bg-violet-100 text-violet-700 border-violet-200',
  testimonials: 'bg-pink-100 text-pink-700 border-pink-200',
  careers: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  contact: 'bg-teal-100 text-teal-700 border-teal-200',
  media: 'bg-rose-100 text-rose-700 border-rose-200',
  seo: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  footer: 'bg-gray-100 text-gray-700 border-gray-200',
  announcements: 'bg-red-100 text-red-700 border-red-200',
  popups: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  forms: 'bg-lime-100 text-lime-700 border-lime-200',
};

// ============ HELPERS ============

function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

function relativeTime(dateStr: string): string {
  if (!dateStr) return '—';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

// ============ COMPONENT ============

export function CmsActivity() {
  // List state
  const [data, setData] = useState<PaginatedData<ActivityItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [error, setError] = useState(false);

  // ============ FETCH ============

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      if (sectionFilter && sectionFilter !== 'all') params.set('section', sectionFilter);
      if (actionFilter && actionFilter !== 'all') params.set('action', actionFilter);
      const res = await fetch(`/api/cms/activity?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
    } catch {
      setError(true);
      toast.error('Failed to load activity log');
    } finally {
      setLoading(false);
    }
  }, [page, search, sectionFilter, actionFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ============ RENDER ============

  const items = data?.data || [];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <History className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Activity Log</h1>
            <p className="text-sm text-muted-foreground">View all CMS changes and actions</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activity..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={sectionFilter} onValueChange={(v) => { setSectionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                {SECTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === 'all' ? 'All Sections' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1 sm:flex-initial">
              <Input
                placeholder="Filter by action..."
                value={actionFilter === 'all' ? '' : actionFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setActionFilter(val || 'all');
                  setPage(1);
                }}
                className="w-full sm:w-40"
              />
              {actionFilter !== 'all' && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setActionFilter('all'); setPage(1); }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          {error ? (
            <div className="flex items-center gap-3 p-6 text-rose-600">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load activity log. Try refreshing.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="hidden sm:table-cell">User</TableHead>
                    <TableHead className="hidden md:table-cell">IP</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="hidden lg:table-cell">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No activity records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={SECTION_COLORS[item.section] || 'bg-gray-100 text-gray-700 border-gray-200'}
                          >
                            {item.section}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{item.action}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {item.user || '—'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground font-mono">
                          {item.ip || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {relativeTime(item.createdAt)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[250px] truncate">
                          {item.details || '—'}
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
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {error ? (
          <Card>
            <CardContent className="flex items-center gap-3 p-6 text-rose-600">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load activity log. Try refreshing.</p>
            </CardContent>
          </Card>
        ) : loading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mb-2" />
              <p className="text-sm">No activity records found</p>
            </CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={SECTION_COLORS[item.section] || 'bg-gray-100 text-gray-700 border-gray-200 shrink-0'}
                  >
                    {item.section}
                  </Badge>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{relativeTime(item.createdAt)}</span>
                </div>
                <p className="font-semibold text-sm">{item.action}</p>
                <div className="space-y-0.5">
                  {item.user && (
                    <p className="text-xs text-muted-foreground">User: {item.user}</p>
                  )}
                  {item.ip && (
                    <p className="text-xs text-muted-foreground font-mono">IP: {item.ip}</p>
                  )}
                  {item.details && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.details}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Mobile Pagination */}
      {data && data.totalPages > 1 && (
        <div className="md:hidden flex items-center justify-between px-1 py-2">
          <p className="text-xs text-muted-foreground">
            Page {data.page} of {data.totalPages} ({data.total} total)
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}