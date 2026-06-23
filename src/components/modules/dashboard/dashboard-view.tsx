'use client';

import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Wrench, AlertTriangle, ClipboardList, DollarSign,
  TrendingUp, TrendingDown, Clock, Users, Package,
  Activity, CheckCircle2, Star, Calendar, ArrowRight,
  RefreshCw, ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore, useAppStore } from '@/store';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import type { DashboardStats, ComplaintItem, WorkOrderItem, PmScheduleItem, UserRole } from '@/types';
import { MobileDashboard, MobileDashboardSkeleton } from './mobile-dashboard';

// ============ HELPERS ============

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    OPEN: 'bg-amber-100 text-amber-800 border-amber-200',
    ASSIGNED: 'bg-blue-100 text-blue-800 border-blue-200',
    IN_PROGRESS: 'bg-purple-100 text-purple-800 border-purple-200',
    RESOLVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    CLOSED: 'bg-gray-100 text-gray-800 border-gray-200',
    COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
    PAID: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    OVERDUE: 'bg-rose-100 text-rose-800 border-rose-200',
    DRAFT: 'bg-gray-100 text-gray-800 border-gray-200',
    APPROVED: 'bg-teal-100 text-teal-800 border-teal-200',
    CANCELLED: 'bg-gray-100 text-gray-700 border-gray-200',
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-rose-100 text-rose-700',
  };
  return (
    <Badge variant="outline" className={variants[status] || ''}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

function truncateId(id: string): string {
  return id.length > 8 ? id.substring(0, 8) + '...' : id;
}

const PIE_COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#f43f5e', '#a855f7', '#f97316'];

const STATUS_BAR_COLORS: Record<string, string> = {
  OPEN: '#f59e0b',
  ASSIGNED: '#3b82f6',
  IN_PROGRESS: '#a855f7',
  RESOLVED: '#10b981',
  CLOSED: '#9ca3af',
};

// ============ KPI CARD CONFIGS ============

interface KpiConfig {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  trend?: { value: number; label: string };
  trendType?: 'positive' | 'negative' | 'warning';
}

function getKpiCardsForRole(role: UserRole, stats: DashboardStats): KpiConfig[] {
  switch (role) {
    case 'technician':
      return [
        {
          icon: <ClipboardList className="h-5 w-5 text-emerald-600" />,
          value: stats.pendingWorkOrders + stats.inProgressComplaints,
          label: 'My Active Jobs',
          trend: { value: 12, label: 'vs last week' },
          trendType: 'positive',
        },
        {
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
          value: stats.completedWorkOrders,
          label: 'Completed This Month',
          trend: { value: 8, label: 'vs last month' },
          trendType: 'positive',
        },
        {
          icon: <Clock className="h-5 w-5 text-amber-500" />,
          value: stats.upcomingPm?.length || 0,
          label: 'PM Due Soon',
          trend: { value: 3, label: 'next 7 days' },
          trendType: 'warning',
        },
        {
          icon: <Star className="h-5 w-5 text-amber-500" />,
          value: '4.8',
          label: 'Avg Customer Rating',
          trend: { value: 5, label: 'vs last month' },
          trendType: 'positive',
        },
      ];
    case 'finance':
      return [
        {
          icon: <DollarSign className="h-5 w-5 text-emerald-600" />,
          value: formatCurrency(stats.totalRevenue),
          label: 'Total Revenue',
          trend: { value: 15, label: 'vs last month' },
          trendType: 'positive',
        },
        {
          icon: <ClipboardList className="h-5 w-5 text-amber-500" />,
          value: formatCurrency(stats.pendingInvoices),
          label: 'Pending Invoices',
          trend: { value: 4, label: 'awaiting payment' },
          trendType: 'warning',
        },
        {
          icon: <AlertTriangle className="h-5 w-5 text-rose-500" />,
          value: formatCurrency(stats.overdueInvoices),
          label: 'Overdue Amount',
          trend: { value: stats.overdueInvoices > 0 ? 2 : 0, label: stats.overdueInvoices > 0 ? 'needs attention' : 'all clear' },
          trendType: stats.overdueInvoices > 0 ? 'negative' : 'positive',
        },
        {
          icon: <TrendingUp className="h-5 w-5 text-emerald-600" />,
          value: '68%',
          label: 'Collection Rate',
          trend: { value: 3, label: 'vs target' },
          trendType: 'warning',
        },
      ];
    case 'customer':
      return [
        {
          icon: <Wrench className="h-5 w-5 text-emerald-600" />,
          value: stats.totalEquipment,
          label: 'My Equipment',
          trend: { value: 2, label: 'new this month' },
          trendType: 'positive',
        },
        {
          icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
          value: stats.openComplaints,
          label: 'Open Complaints',
          trend: { value: 1, label: 'vs last week' },
          trendType: 'warning',
        },
        {
          icon: <DollarSign className="h-5 w-5 text-amber-500" />,
          value: formatCurrency(stats.pendingInvoices),
          label: 'Pending Invoices',
          trend: { value: stats.pendingInvoices > 0 ? 3 : 0, label: 'awaiting' },
          trendType: stats.pendingInvoices > 0 ? 'warning' : 'positive',
        },
        {
          icon: <ShieldCheck className="h-5 w-5 text-emerald-600" />,
          value: `${stats.pmCompliance}%`,
          label: 'PM Compliance',
          trend: { value: stats.pmCompliance, label: 'on schedule' },
          trendType: stats.pmCompliance >= 80 ? 'positive' : 'warning',
        },
      ];
    default:
      // admin, manager, supervisor, super_admin
      return [
        {
          icon: <Wrench className="h-5 w-5 text-emerald-600" />,
          value: stats.activeEquipment,
          label: 'Active Equipment',
          trend: { value: 95, label: `${stats.totalEquipment} total` },
          trendType: 'positive',
        },
        {
          icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
          value: stats.openComplaints + stats.inProgressComplaints,
          label: 'Open Complaints',
          trend: { value: stats.openComplaints, label: 'need attention' },
          trendType: stats.openComplaints > 10 ? 'warning' : 'positive',
        },
        {
          icon: <ClipboardList className="h-5 w-5 text-amber-500" />,
          value: stats.pendingWorkOrders,
          label: 'Pending Work Orders',
          trend: { value: stats.totalWorkOrders, label: 'total WOs' },
          trendType: stats.pendingWorkOrders > 20 ? 'warning' : 'positive',
        },
        {
          icon: <DollarSign className="h-5 w-5 text-emerald-600" />,
          value: formatCurrency(stats.totalRevenue),
          label: 'Total Revenue',
          trend: { value: 15, label: 'vs last month' },
          trendType: 'positive',
        },
      ];
  }
}

// ============ SKELETON LOADER ============

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Welcome header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="py-0 gap-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-7 w-24 mb-1" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Second charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tables skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* PM schedule skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ CUSTOM CHART TOOLTIP ============

function ChartTooltipContent({ active, payload, label, formatter }: {
  active?: boolean;
  payload?: Array<{ value: number; color: string; name: string }>;
  label?: string;
  formatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}

// ============ CIRCULAR PROGRESS ============

function CircularProgress({ value, size = 140 }: { value: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;
  const strokeColor = value >= 80 ? '#10b981' : value >= 50 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color: strokeColor }}>
          {value}%
        </span>
        <span className="text-xs text-muted-foreground">Compliance</span>
      </div>
    </div>
  );
}

// ============ MAIN DASHBOARD VIEW ============

export function DashboardView() {
  const { user } = useAuthStore();
  const setView = useAppStore((s) => s.setView);
  const isMobile = useIsMobile();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('cmms_token') : null;
      const res = await fetch('/api/dashboard', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to load dashboard data');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) return isMobile ? <MobileDashboardSkeleton /> : <div className="p-4 md:p-6"><DashboardSkeleton /></div>;

  if (error) {
    return isMobile ? (
      <div className="p-4">
        <div className="flex flex-col items-center py-16 gap-4">
          <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-rose-500" />
          </div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={fetchDashboard} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />Retry
          </Button>
        </div>
      </div>
    ) : (
      <div className="p-4 md:p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center py-12 gap-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-rose-500" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-semibold">Failed to Load Dashboard</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={fetchDashboard} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  // Mobile: use the reference-design dashboard
  if (isMobile) return <MobileDashboard stats={stats} />;

  const kpiCards = getKpiCardsForRole(user?.role || 'admin', stats);
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  const quickBadges = [
    { label: `${stats.totalEquipment} Equipment`, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { label: `${stats.totalCustomers} Customers`, color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { label: `${stats.totalEmployees} Employees`, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    stats.lowStockItems > 0
      ? { label: `${stats.lowStockItems} Low Stock`, color: 'bg-rose-50 text-rose-700 border-rose-200' }
      : { label: 'Stock OK', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ============ 1. WELCOME HEADER ============ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Welcome back, {user?.name || 'User'}
          </h1>
          <p className="text-muted-foreground mt-1">{today}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickBadges.map((badge, i) => (
            <Badge key={i} variant="outline" className={badge.color}>
              {badge.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* ============ 2. KPI CARDS ROW ============ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <Card key={i} className="py-0 gap-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  {kpi.icon}
                </div>
                {kpi.trend && (
                  <div className="flex items-center gap-1 text-xs">
                    {kpi.trendType === 'positive' ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : kpi.trendType === 'negative' ? (
                      <TrendingDown className="h-3 w-3 text-rose-500" />
                    ) : (
                      <Activity className="h-3 w-3 text-amber-500" />
                    )}
                    <span className={
                      kpi.trendType === 'positive' ? 'text-emerald-600' :
                      kpi.trendType === 'negative' ? 'text-rose-600' : 'text-amber-600'
                    }>
                      {kpi.trend.label}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ============ 3. CHARTS ROW: Revenue Trend + Complaints by Status ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend Line Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue over the past 12 months</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => (
                      <ChartTooltipContent
                        active={active}
                        payload={payload?.map((p) => ({
                          value: p.value as number,
                          color: '#10b981',
                          name: 'Revenue',
                        }))}
                        label={label}
                        formatter={(v) => formatCurrency(v)}
                      />
                    )}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}
                    fill="#10b981"
                    fillOpacity={0.1}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Complaints by Status Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Complaints by Status</CardTitle>
            <CardDescription>Distribution of complaint statuses</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.complaintsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="status"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => (v as string).replace(/_/g, ' ')}
                  />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => (
                      <ChartTooltipContent
                        active={active}
                        payload={payload?.map((p) => ({
                          value: p.value as number,
                          color: STATUS_BAR_COLORS[(label as string)] || '#6b7280',
                          name: (label as string).replace(/_/g, ' '),
                        }))}
                        label={label as string}
                      />
                    )}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {stats.complaintsByStatus.map((entry, i) => (
                      <Cell key={i} fill={STATUS_BAR_COLORS[entry.status] || '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============ 4. SECOND CHARTS ROW: Category Pie + PM Compliance ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Complaints by Category Donut Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Complaints by Category</CardTitle>
            <CardDescription>Breakdown by equipment category</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72">
              {stats.complaintsByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.complaintsByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="category"
                      label={({ category, count, percent }) =>
                        `${category}: ${count} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={{ stroke: '#a1a1aa' }}
                    >
                      {stats.complaintsByCategory.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0];
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-sm">
                            <p className="text-sm font-medium text-foreground">{d.name}</p>
                            <p className="text-sm" style={{ color: d.payload.fill }}>
                              Count: {d.value}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No complaint categories available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* PM Compliance Gauge */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">PM Compliance</CardTitle>
            <CardDescription>Preventive maintenance schedule adherence</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col items-center justify-center py-4 gap-6">
              <CircularProgress value={stats.pmCompliance} size={160} />
              <div className="w-full max-w-xs space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Target</span>
                  <span className="font-medium">90%</span>
                </div>
                <Progress
                  value={Math.min(stats.pmCompliance, 100)}
                  className={`h-2 [&>div]:${
                    stats.pmCompliance >= 80
                      ? 'bg-emerald-500'
                      : stats.pmCompliance >= 50
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                  }`}
                />
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-emerald-600 font-semibold">
                      {stats.upcomingPm?.filter((p) => p.status === 'completed').length || 0}
                    </p>
                    <p className="text-muted-foreground">Completed</p>
                  </div>
                  <div>
                    <p className="text-amber-600 font-semibold">
                      {stats.upcomingPm?.filter((p) => p.status === 'overdue').length || 0}
                    </p>
                    <p className="text-muted-foreground">Overdue</p>
                  </div>
                  <div>
                    <p className="text-purple-600 font-semibold">
                      {stats.upcomingPm?.filter((p) => p.status === 'scheduled').length || 0}
                    </p>
                    <p className="text-muted-foreground">Scheduled</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============ 5. RECENT ACTIVITY TABLES ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Complaints */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Complaints</CardTitle>
                <CardDescription>Latest reported issues</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('complaints')}
                className="text-emerald-600 hover:text-emerald-700"
              >
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentComplaints?.slice(0, 5).map((complaint) => (
                    <TableRow
                      key={complaint.id}
                      className="cursor-pointer"
                      onClick={() => setView('complaint-detail', { id: complaint.id })}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {truncateId(complaint.id)}
                      </TableCell>
                      <TableCell className="font-medium max-w-[160px] truncate">
                        {complaint.title}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={complaint.priority} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={complaint.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(complaint.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!stats.recentComplaints || stats.recentComplaints.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No recent complaints
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Work Orders */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Work Orders</CardTitle>
                <CardDescription>Latest work orders</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('work-orders')}
                className="text-emerald-600 hover:text-emerald-700"
              >
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead className="w-24">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentWorkOrders?.slice(0, 5).map((wo) => (
                    <TableRow
                      key={wo.id}
                      className="cursor-pointer"
                      onClick={() => setView('work-order-detail', { id: wo.id })}
                    >
                      <TableCell className="font-medium max-w-[140px] truncate">
                        {wo.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {wo.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={wo.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[100px]">
                        {wo.assignedToName || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(wo.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!stats.recentWorkOrders || stats.recentWorkOrders.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No recent work orders
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============ 6. UPCOMING PM SCHEDULE ============ */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Upcoming PM Schedule</CardTitle>
              <CardDescription>Preventive maintenance due soon</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('pm')}
              className="text-emerald-600 hover:text-emerald-700"
            >
              View All PM <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-2">
            {stats.upcomingPm && stats.upcomingPm.length > 0 ? (
              stats.upcomingPm.slice(0, 6).map((pm) => (
                <div
                  key={pm.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <Calendar className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{pm.title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {pm.equipmentName || 'Unassigned Equipment'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 text-sm shrink-0">
                    <Badge variant="outline" className="capitalize">
                      {pm.frequency.replace(/_/g, ' ')}
                    </Badge>
                    <div className="text-right">
                      <p className="font-medium">{formatDate(pm.nextDueDate)}</p>
                      <p className="text-xs text-muted-foreground">
                        {pm.assignedToName || 'Unassigned'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8 text-sm">
                No upcoming PM schedules
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
