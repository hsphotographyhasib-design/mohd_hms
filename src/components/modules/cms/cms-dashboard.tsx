'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BookOpen,
  Briefcase,
  FolderKanban,
  MessageSquareQuote,
  Mail,
  FileText,
  Bell,
  Megaphone,
  LayoutDashboard,
  Activity,
  RefreshCw,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore, useAppStore } from '@/store';
import { toast } from 'sonner';

// ============ TYPES ============

interface DashboardStats {
  publishedBlogs: number;
  activeServices: number;
  activeProjects: number;
  testimonials: number;
  contactRequests: number;
  careerApplications: number;
  unreadMessages: number;
  activeAnnouncements: number;
}

interface ActivityItem {
  id: string;
  section: string;
  action: string;
  description: string;
  userId?: string;
  createdAt: string;
}

interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============ KPI CARD CONFIG ============

const KPI_CONFIG = [
  { key: 'publishedBlogs' as const, label: 'Published Blogs', icon: BookOpen, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { key: 'activeServices' as const, label: 'Active Services', icon: Briefcase, color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { key: 'activeProjects' as const, label: 'Active Projects', icon: FolderKanban, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { key: 'testimonials' as const, label: 'Testimonials', icon: MessageSquareQuote, color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { key: 'contactRequests' as const, label: 'Contact Requests', icon: Mail, color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { key: 'careerApplications' as const, label: 'Career Applications', icon: FileText, color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { key: 'unreadMessages' as const, label: 'Unread Messages', icon: Bell, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { key: 'activeAnnouncements' as const, label: 'Active Announcements', icon: Megaphone, color: 'bg-pink-100 text-pink-700 border-pink-200' },
];

// ============ HELPER ============

function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

function formatRelativeTime(dateStr: string): string {
  try {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getSectionBadgeColor(section: string): string {
  const colors: Record<string, string> = {
    blog: 'bg-emerald-100 text-emerald-700',
    service: 'bg-teal-100 text-teal-700',
    project: 'bg-amber-100 text-amber-700',
    testimonial: 'bg-rose-100 text-rose-700',
    contact: 'bg-sky-100 text-sky-700',
    career: 'bg-violet-100 text-violet-700',
    announcement: 'bg-pink-100 text-pink-700',
    media: 'bg-orange-100 text-orange-700',
    settings: 'bg-gray-100 text-gray-700',
  };
  return colors[section.toLowerCase()] || 'bg-gray-100 text-gray-700';
}

// ============ COMPONENT ============

export function CmsDashboard() {
  const { user } = useAuthStore();
  const { setView } = useAppStore();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  const [activity, setActivity] = useState<PaginatedData<ActivityItem> | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(false);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(false);
    try {
      const res = await fetch('/api/cms/dashboard', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStats(data.overview || data);
    } catch {
      setStatsError(true);
      toast.error('Failed to load dashboard stats');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchActivity = useCallback(async () => {
    setActivityLoading(true);
    setActivityError(false);
    try {
      const res = await fetch('/api/cms/activity?page=1&pageSize=10', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setActivity(data);
    } catch {
      setActivityError(true);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); fetchActivity(); }, [fetchStats, fetchActivity]);

  const handleRefresh = () => { fetchStats(); fetchActivity(); };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <LayoutDashboard className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">CMS Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {greeting()}, {user?.name || 'Admin'} — Manage your website content
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      {statsError ? (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600" />
            <p className="text-rose-700">Failed to load dashboard stats. Click refresh to try again.</p>
          </CardContent>
        </Card>
      ) : statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {KPI_CONFIG.map(({ key, label, icon: Icon, color }) => (
            <Card key={key} className={`${color} border`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium opacity-75">{label}</span>
                </div>
                <p className="text-2xl font-bold">
                  {(stats as Record<string, number>)[key] ?? 0}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              onClick={() => setView('cms-services')}
            >
              <Briefcase className="h-4 w-4" />
              Manage Services
              <ArrowRight className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              onClick={() => setView('cms-blogs')}
            >
              <BookOpen className="h-4 w-4" />
              New Blog Post
              <ArrowRight className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              onClick={() => setView('cms-contact')}
            >
              <Mail className="h-4 w-4" />
              View Contact Inbox
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              Recent Activity
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Last 10 events
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="hidden sm:table-cell">Description</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={4}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : activityError ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Failed to load activity data
                    </TableCell>
                  </TableRow>
                ) : !activity || activity.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No recent activity
                    </TableCell>
                  </TableRow>
                ) : (
                  activity.data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="outline" className={getSectionBadgeColor(item.section)}>
                          {item.section}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium capitalize">{item.action}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground max-w-xs truncate">
                        {item.description || '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(item.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
