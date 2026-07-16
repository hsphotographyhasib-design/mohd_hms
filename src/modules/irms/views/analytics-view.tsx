'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Camera,
  FolderKanban,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useIrmStore, type AnalyticsData } from '@/modules/irms/lib';
import { toast } from 'sonner';

const COLORS = ['#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#b45309', '#64748b'];

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
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? <Skeleton className="h-7 w-16 mt-1" /> : <p className="text-2xl font-bold">{value}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const setView = useIrmStore((s) => s.setView);
  const setReportsFilter = useIrmStore((s) => s.setReportsFilter);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/irms/analytics');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
    } catch {
      toast.error('Failed to load analytics');
      setData({
        totalReports: 0,
        completedReports: 0,
        pendingReports: 0,
        overdueReports: 0,
        avgCompletion: 0,
        photosCount: 0,
        activeProjects: 0,
        totalUsers: 0,
        monthlyTrend: [],
        categoryBreakdown: [],
        priorityBreakdown: [],
        statusBreakdown: [],
        technicianPerformance: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm">Detailed reports and insights</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Reports"
          value={data?.totalReports ?? 0}
          icon={FileText}
          accent="text-blue-600"
          iconBg="bg-blue-50 dark:bg-blue-900/20"
          loading={loading}
          onClick={() => setView('reports')}
        />
        <KpiCard
          title="Completed"
          value={data?.completedReports ?? 0}
          icon={CheckCircle}
          accent="text-green-600"
          iconBg="bg-green-50 dark:bg-green-900/20"
          loading={loading}
          onClick={() => {
            setReportsFilter({ status: 'approved' });
            setView('reports');
          }}
        />
        <KpiCard
          title="Pending"
          value={data?.pendingReports ?? 0}
          icon={Clock}
          accent="text-yellow-600"
          iconBg="bg-yellow-50 dark:bg-yellow-900/20"
          loading={loading}
          onClick={() => setView('reports')}
        />
        <KpiCard
          title="Overdue"
          value={data?.overdueReports ?? 0}
          icon={AlertTriangle}
          accent="text-red-600"
          iconBg="bg-red-50 dark:bg-red-900/20"
          loading={loading}
        />
        <KpiCard
          title="Avg Completion"
          value={`${data?.avgCompletion ?? 0}%`}
          icon={TrendingUp}
          accent="text-emerald-600"
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
          loading={loading}
        />
        <KpiCard
          title="Photos"
          value={data?.photosCount ?? 0}
          icon={Camera}
          accent="text-amber-600"
          iconBg="bg-amber-50 dark:bg-amber-900/20"
          loading={loading}
        />
        <KpiCard
          title="Active Projects"
          value={data?.activeProjects ?? 0}
          icon={FolderKanban}
          accent="text-purple-600"
          iconBg="bg-purple-50 dark:bg-purple-900/20"
          loading={loading}
          onClick={() => setView('projects')}
        />
        <KpiCard
          title="Total Users"
          value={data?.totalUsers ?? 0}
          icon={Users}
          accent="text-cyan-600"
          iconBg="bg-cyan-50 dark:bg-cyan-900/20"
          loading={loading}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Trend */}
        <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data?.monthlyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Reports"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data?.categoryBreakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Reports" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Priority Radar */}
        <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={data?.priorityBreakdown || []}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="priority" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fontSize: 10 }} />
                  <Radar
                    name="Count"
                    dataKey="count"
                    stroke="#16a34a"
                    fill="#16a34a"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data?.statusBreakdown || []}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ status, percent }) =>
                      `${status.split(' ')[0]} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                    fontSize={10}
                  >
                    {(data?.statusBreakdown || []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Technician Performance Table */}
      <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-800/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Technician Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data?.technicianPerformance && data.technicianPerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Technician</TableHead>
                    <TableHead className="text-center">Reports</TableHead>
                    <TableHead className="text-center">Avg Completion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.technicianPerformance.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-center">{t.reports}</TableCell>
                      <TableCell className="text-center">{t.avgCompletion}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No performance data</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}