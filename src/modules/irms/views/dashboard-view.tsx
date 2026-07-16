'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck,
  CheckCircle,
  Clock,
  AlertTriangle,
  FolderKanban,
  Wrench,
  Camera,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useIrmStore, REPORT_STATUSES, type DashboardData, type IrmReport } from '@/modules/irms/lib';
import { toast } from 'sonner';

const PIE_COLORS = ['#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#b45309', '#64748b'];

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  accent: string;
  iconBg: string;
  loading?: boolean;
  onClick?: () => void;
}

function KpiCard({ title, value, icon: Icon, accent, iconBg, loading, onClick }: KpiCardProps) {
  return (
    <Card
      className="hover:-translate-y-0.5 transition-all duration-200 cursor-pointer backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${iconBg}`}>
            <Icon className={`h-5 w-5 ${accent}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground truncate">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const setView = useIrmStore((s) => s.setView);
  const setReportsFilter = useIrmStore((s) => s.setReportsFilter);
  const setSelectedReportId = useIrmStore((s) => s.setSelectedReportId);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/irms/dashboard');
      if (!res.ok) throw new Error('Failed to load dashboard');
      const json = await res.json();
      setData(json);
    } catch {
      toast.error('Failed to load dashboard data');
      setData({
        todayInspections: 0,
        completedReports: 0,
        pendingReports: 0,
        overdueReports: 0,
        activeProjects: 0,
        activeWorkOrders: 0,
        photosUploaded: 0,
        avgCompletion: 0,
        recentReports: [],
        upcomingInspections: [],
        inspectionTrend: [],
        categoryBreakdown: [],
        projectProgress: [],
        recentActivities: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleKpiClick = (key: string) => {
    switch (key) {
      case 'today':
        setView('calendar');
        break;
      case 'completed':
        setReportsFilter({ status: 'approved' });
        setView('reports');
        break;
      case 'pending':
        setReportsFilter({ status: 'submitted' });
        setView('reports');
        break;
      case 'overdue':
        setReportsFilter({ status: 'rejected' });
        setView('reports');
        break;
      case 'projects':
        setView('projects');
        break;
      case 'workorders':
        setView('reports');
        break;
      case 'photos':
        setView('reports');
        break;
      case 'avgCompletion':
        setView('analytics');
        break;
    }
  };

  const handleReportClick = (report: IrmReport) => {
    setSelectedReportId(report.id);
    setView('report-view');
  };

  const getStatusBadge = (status: string) => {
    const s = REPORT_STATUSES.find((r) => r.value === status);
    return s ? (
      <Badge variant="secondary" className={`${s.color} text-xs`}>
        {s.label}
      </Badge>
    ) : (
      <Badge variant="secondary">{status}</Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of inspection activities</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Today's Inspections"
          value={data?.todayInspections ?? 0}
          icon={CalendarCheck}
          accent="text-blue-600"
          iconBg="bg-blue-50 dark:bg-blue-900/20"
          loading={loading}
          onClick={() => handleKpiClick('today')}
        />
        <KpiCard
          title="Completed Reports"
          value={data?.completedReports ?? 0}
          icon={CheckCircle}
          accent="text-green-600"
          iconBg="bg-green-50 dark:bg-green-900/20"
          loading={loading}
          onClick={() => handleKpiClick('completed')}
        />
        <KpiCard
          title="Pending Reports"
          value={data?.pendingReports ?? 0}
          icon={Clock}
          accent="text-yellow-600"
          iconBg="bg-yellow-50 dark:bg-yellow-900/20"
          loading={loading}
          onClick={() => handleKpiClick('pending')}
        />
        <KpiCard
          title="Overdue"
          value={data?.overdueReports ?? 0}
          icon={AlertTriangle}
          accent="text-red-600"
          iconBg="bg-red-50 dark:bg-red-900/20"
          loading={loading}
          onClick={() => handleKpiClick('overdue')}
        />
        <KpiCard
          title="Active Projects"
          value={data?.activeProjects ?? 0}
          icon={FolderKanban}
          accent="text-purple-600"
          iconBg="bg-purple-50 dark:bg-purple-900/20"
          loading={loading}
          onClick={() => handleKpiClick('projects')}
        />
        <KpiCard
          title="Active Work Orders"
          value={data?.activeWorkOrders ?? 0}
          icon={Wrench}
          accent="text-cyan-600"
          iconBg="bg-cyan-50 dark:bg-cyan-900/20"
          loading={loading}
          onClick={() => handleKpiClick('workorders')}
        />
        <KpiCard
          title="Photos Uploaded"
          value={data?.photosUploaded ?? 0}
          icon={Camera}
          accent="text-amber-600"
          iconBg="bg-amber-50 dark:bg-amber-900/20"
          loading={loading}
          onClick={() => handleKpiClick('photos')}
        />
        <KpiCard
          title="Avg Completion"
          value={`${data?.avgCompletion ?? 0}%`}
          icon={TrendingUp}
          accent="text-emerald-600"
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
          loading={loading}
          onClick={() => handleKpiClick('avgCompletion')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Inspection Trends */}
        <Card className="lg:col-span-2 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Inspection Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data?.inspectionTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Inspections"
                    stroke="#16a34a"
                    fill="#16a34a33"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category Pie Chart */}
        <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data?.categoryBreakdown || []}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ category, percent }) =>
                      `${category.split(' ')[0]} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                    fontSize={10}
                  >
                    {(data?.categoryBreakdown || []).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Reports */}
        <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : data?.recentReports && data.recentReports.length > 0 ? (
              <ScrollArea className="h-[250px]">
                <div className="space-y-2">
                  {data.recentReports.slice(0, 5).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                      onClick={() => handleReportClick(r)}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.number}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {r.project?.name || '—'}
                        </p>
                      </div>
                      {getStatusBadge(r.status)}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No recent reports</p>
            )}
          </CardContent>
        </Card>

        {/* Project Progress */}
        <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Project Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : data?.projectProgress && data.projectProgress.length > 0 ? (
              <ScrollArea className="h-[250px]">
                <div className="space-y-4">
                  {data.projectProgress.map((p, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium truncate max-w-[180px]">{p.name}</span>
                        <span className="text-muted-foreground">{p.reports} reports</span>
                      </div>
                      <Progress value={p.progress} className="h-2" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No projects</p>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activity Feed</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : data?.recentActivities && data.recentActivities.length > 0 ? (
              <ScrollArea className="h-[250px]">
                <div className="space-y-3">
                  {data.recentActivities.slice(0, 10).map((a) => (
                    <div key={a.id} className="flex gap-2 text-sm">
                      <div className="h-2 w-2 mt-1.5 rounded-full bg-green-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{a.description}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {a.user?.name || 'System'} · {new Date(a.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}