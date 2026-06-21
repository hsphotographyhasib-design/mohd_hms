'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
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
  Globe,
  TrendingUp,
  FileEdit,
  Image as ImageIcon,
  Users,
  ExternalLink,
  CheckCircle2,
  Clock,
  Eye,
} from 'lucide-react';
import { useAuthStore, useAppStore } from '@/store';
import { toast } from 'sonner';

// ============ TYPES ============

interface DashboardStats {
  publishedBlogs: number;
  activeServices: number;
  activeProjects: number;
  activeTestimonials: number;
  contactRequests: number;
  careerApplications: number;
  unreadMessages: number;
  announcements: number;
}

interface QuickStats {
  draftBlogs: number;
  totalBlogs: number;
  totalProjects: number;
  totalMedia: number;
  activeCareers: number;
}

interface ActivityItem {
  id: string;
  section: string;
  action: string;
  description: string;
  userId?: string;
  createdAt: string;
}

interface DashboardResponse {
  overview: DashboardStats;
  quickStats: QuickStats;
  recentActivity: ActivityItem[];
}

// ============ KPI CARD CONFIG ============

const KPI_CONFIG = [
  { key: 'publishedBlogs' as const, label: 'Published Blogs', icon: BookOpen, color: 'bg-emerald-100 text-emerald-700 border-emerald-200', viewKey: 'cms-blogs' },
  { key: 'activeServices' as const, label: 'Active Services', icon: Briefcase, color: 'bg-teal-100 text-teal-700 border-teal-200', viewKey: 'cms-services' },
  { key: 'activeProjects' as const, label: 'Active Projects', icon: FolderKanban, color: 'bg-amber-100 text-amber-700 border-amber-200', viewKey: 'cms-projects' },
  { key: 'activeTestimonials' as const, label: 'Testimonials', icon: MessageSquareQuote, color: 'bg-rose-100 text-rose-700 border-rose-200', viewKey: 'cms-testimonials' },
  { key: 'contactRequests' as const, label: 'Contact Requests', icon: Mail, color: 'bg-sky-100 text-sky-700 border-sky-200', viewKey: 'cms-contact' },
  { key: 'careerApplications' as const, label: 'Career Applications', icon: FileText, color: 'bg-violet-100 text-violet-700 border-violet-200', viewKey: 'cms-careers' },
  { key: 'unreadMessages' as const, label: 'Unread Messages', icon: Bell, color: 'bg-orange-100 text-orange-700 border-orange-200', viewKey: 'cms-contact' },
  { key: 'announcements' as const, label: 'Active Announcements', icon: Megaphone, color: 'bg-pink-100 text-pink-700 border-pink-200', viewKey: 'cms-announcements' },
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
    hero: 'bg-indigo-100 text-indigo-700',
  };
  return colors[section?.toLowerCase()] || 'bg-gray-100 text-gray-700';
}

function getActionIcon(action: string) {
  switch (action?.toLowerCase()) {
    case 'published': return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
    case 'created': return <FileEdit className="h-3.5 w-3.5 text-blue-600" />;
    case 'updated': return <RefreshCw className="h-3.5 w-3.5 text-amber-600" />;
    case 'deleted': return <AlertCircle className="h-3.5 w-3.5 text-rose-600" />;
    case 'received': return <Mail className="h-3.5 w-3.5 text-sky-600" />;
    default: return <Activity className="h-3.5 w-3.5 text-gray-500" />;
  }
}

// ============ COMPONENT ============

export function CmsDashboard() {
  const { user } = useAuthStore();
  const { setView } = useAppStore();

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/cms/dashboard', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
    } catch {
      setError(true);
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const overview = data?.overview;
  const quickStats = data?.quickStats;
  const activityItems = data?.recentActivity ?? [];
  const totalContent = overview
    ? Object.values(overview).reduce((sum, v) => sum + (v as number), 0)
    : 0;

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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.open('/landing.html', '_blank');
            }}
            className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Preview Site
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600" />
            <p className="text-rose-700">Failed to load dashboard stats. Click refresh to try again.</p>
          </CardContent>
        </Card>
      ) : loading ? (
        /* Loading Skeleton */
        <>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {KPI_CONFIG.map(({ key, label, icon: Icon, color, viewKey }) => (
              <Card
                key={key}
                className={`${color} border cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]`}
                onClick={() => setView(viewKey)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium opacity-75">{label}</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {(overview as Record<string, number>)?.[key] ?? 0}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Quick Stats + Landing Page Status ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Content Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  Content Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Content Items</span>
                  <span className="font-semibold text-lg">{totalContent}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" /> Blogs
                    </span>
                    <span className="font-medium">{quickStats?.totalBlogs ?? 0}
                      <span className="text-muted-foreground font-normal"> ({quickStats?.draftBlogs ?? 0} draft)</span>
                    </span>
                  </div>
                  <Progress
                    value={quickStats?.totalBlogs ? ((quickStats.publishedBlogs ?? 0) / (quickStats.totalBlogs || 1)) * 100 : 0}
                    className="h-1.5"
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" /> Media Files
                  </span>
                  <span className="font-medium">{quickStats?.totalMedia ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Open Positions
                  </span>
                  <span className="font-medium">{quickStats?.activeCareers ?? 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* Landing Page Connection Status */}
            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-emerald-600" />
                  Landing Page Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${totalContent > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="font-medium">{totalContent > 0 ? 'Content Connected' : 'Needs Setup'}</span>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {overview?.activeServices ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Clock className="h-3.5 w-3.5 text-amber-500" />}
                    <span>{overview?.activeServices ?? 0} services live on site</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {overview?.publishedBlogs ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Clock className="h-3.5 w-3.5 text-amber-500" />}
                    <span>{overview?.publishedBlogs ?? 0} blog posts published</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {overview?.activeTestimonials ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Clock className="h-3.5 w-3.5 text-amber-500" />}
                    <span>{overview?.activeTestimonials ?? 0} testimonials displayed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {overview?.announcements ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Clock className="h-3.5 w-3.5 text-amber-500" />}
                    <span>{overview?.announcements ?? 0} announcements active</span>
                  </div>
                </div>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => setView('cms-hero')}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Manage Landing Page
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => setView('cms-services')}
                >
                  <Briefcase className="h-4 w-4" />
                  Manage Services
                  <ArrowRight className="h-3 w-3 ml-auto" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => setView('cms-blogs')}
                >
                  <BookOpen className="h-4 w-4" />
                  New Blog Post
                  <ArrowRight className="h-3 w-3 ml-auto" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => setView('cms-contact')}
                >
                  <Mail className="h-4 w-4" />
                  {overview?.unreadMessages
                    ? `View Inbox (${overview.unreadMessages} new)`
                    : 'View Contact Inbox'}
                  <ArrowRight className="h-3 w-3 ml-auto" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => setView('cms-hero')}
                >
                  <Globe className="h-4 w-4" />
                  Edit Landing Page
                  <ArrowRight className="h-3 w-3 ml-auto" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ── Recent Activity ── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  Recent Activity
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {activityItems.length} events
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setView('cms-activity')}
                  >
                    View All
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="hidden sm:table-cell">Description</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Activity className="h-8 w-8 opacity-30" />
                            <p>No recent activity</p>
                            <p className="text-xs">Start managing your content to see activity here</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      activityItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="px-3">
                            {getActionIcon(item.action)}
                          </TableCell>
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
        </>
      )}
    </div>
  );
}