'use client';

import { memo } from 'react';
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
import type { ComplaintItem, WorkOrderItem, PmScheduleItem, UserRole } from '@/types';
import {
  useDashboardKpi, useDashboardCharts, useDashboardRecent,
} from '@/hooks/use-dashboard-queries';
import type { DashboardKpiData, DashboardChartsData } from '@/hooks/use-dashboard-queries';

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

function getKpiCardsForRole(role: UserRole, data: DashboardKpiData, upcomingPmLength: number): KpiConfig[] {
  switch (role) {
    case 'technician':
      return [
        {
          icon: <ClipboardList className="h-5 w-5 text-emerald-600" />,
          value: data.pendingWorkOrders + data.inProgressComplaints,
          label: 'My Active Jobs',
          trend: { value: 12, label: 'vs last week' },
          trendType: 'positive',
        },
        {
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
          value: data.completedWorkOrders,
          label: 'Completed This Month',
          trend: { value: 8, label: 'vs last month' },
          trendType: 'positive',
        },
        {
          icon: <Clock className="h-5 w-5 text-amber-500" />,
          value: upcomingPmLength,
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
          value: formatCurrency(data.totalRevenue),
          label: 'Total Revenue',
          trend: { value: 15, label: 'vs last month' },
          trendType: 'positive',
        },
        {
          icon: <ClipboardList className="h-5 w-5 text-amber-500" />,
          value: formatCurrency(data.pendingInvoices),
          label: 'Pending Invoices',
          trend: { value: 4, label: 'awaiting payment' },
          trendType: 'warning',
        },
        {
          icon: <AlertTriangle className="h-5 w-5 text-rose-500" />,
          value: formatCurrency(data.overdueInvoices),
          label: 'Overdue Amount',
          trend: { value: data.overdueInvoices > 0 ? 2 : 0, label: data.overdueInvoices > 0 ? 'needs attention' : 'all clear' },
          trendType: data.overdueInvoices > 0 ? 'negative' : 'positive',
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
          value: data.totalEquipment,
          label: 'My Equipment',
          trend: { value: 2, label: 'new this month' },
          trendType: 'positive',
        },
        {
          icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
          value: data.openComplaints,
          label: 'Open Complaints',
          trend: { value: 1, label: 'vs last week' },
          trendType: 'warning',
        },
        {
          icon: <DollarSign className="h-5 w-5 text-amber-500" />,
          value: formatCurrency(data.pendingInvoices),
          label: 'Pending Invoices',
          trend: { value: data.pendingInvoices > 0 ? 3 : 0, label: 'awaiting' },
          trendType: data.pendingInvoices > 0 ? 'warning' : 'positive',
        },
        {
          icon: <ShieldCheck className="h-5 w-5 text-emerald-600" />,
          value: `${data.pmCompliance}%`,
          label: 'PM Compliance',
          trend: { value: data.pmCompliance, label: 'on schedule' },
          trendType: data.pmCompliance >= 80 ? 'positive' : 'warning',
        },
      ];
    default:
      // admin, manager, supervisor, super_admin
      return [
        {
          icon: <Wrench className="h-5 w-5 text-emerald-600" />,
          value: data.activeEquipment,
          label: 'Active Equipment',
          trend: { value: 95, label: `${data.totalEquipment} total` },
          trendType: 'positive',
        },
        {
          icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
          value: data.openComplaints + data.inProgressComplaints,
          label: 'Open Complaints',
          trend: { value: data.openComplaints, label: 'need attention' },
          trendType: data.openComplaints > 10 ? 'warning' : 'positive',
        },
        {
          icon: <ClipboardList className="h-5 w-5 text-amber-500" />,
          value: data.pendingWorkOrders,
          label: 'Pending Work Orders',
          trend: { value: data.totalWorkOrders, label: 'total WOs' },
          trendType: data.pendingWorkOrders > 20 ? 'warning' : 'positive',
        },
        {
          icon: <DollarSign className="h-5 w-5 text-emerald-600" />,
          value: formatCurrency(data.totalRevenue),
          label: 'Total Revenue',
          trend: { value: 15, label: 'vs last month' },
          trendType: 'positive',
        },
      ];
  }
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

// ============ MEMOIZED SUB-COMPONENTS ============

const KpiCardsSection = memo(function KpiCardsSection({
  data,
  isLoading,
  error,
  refetch,
  upcomingPmLength,
  role,
}: {
  data: DashboardKpiData | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  upcomingPmLength: number;
  role: UserRole;
}) {
  if (error) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="flex flex-col items-center py-12 gap-4">
          <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-rose-500" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-lg font-semibold">Failed to Load Dashboard</h3>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
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
    );
  }

  if (!data) return null;

  const kpiCards = getKpiCardsForRole(role, data, upcomingPmLength);

  return (
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
  );
});

const RevenueChart = memo(function RevenueChart({
  data,
  isLoading,
  error,
}: {
  data: { month: string; revenue: number }[] | undefined;
  isLoading: boolean;
  error: Error | null;
}) {
  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Revenue Trend</CardTitle>
          <CardDescription>Monthly revenue over the past 12 months</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">
            Failed to load charts
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-52" />
        </CardHeader>
        <CardContent className="pt-0">
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Revenue Trend</CardTitle>
        <CardDescription>Monthly revenue over the past 12 months</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
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
  );
});

const ComplaintsStatusChart = memo(function ComplaintsStatusChart({
  data,
  isLoading,
  error,
}: {
  data: { status: string; count: number }[] | undefined;
  isLoading: boolean;
  error: Error | null;
}) {
  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Complaints by Status</CardTitle>
          <CardDescription>Distribution of complaint statuses</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">
            Failed to load charts
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="pt-0">
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Complaints by Status</CardTitle>
        <CardDescription>Distribution of complaint statuses</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
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
                {data.map((entry, i) => (
                  <Cell key={i} fill={STATUS_BAR_COLORS[entry.status] || '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});

const ComplaintsCategoryChart = memo(function ComplaintsCategoryChart({
  data,
  isLoading,
  error,
}: {
  data: { category: string; count: number }[] | undefined;
  isLoading: boolean;
  error: Error | null;
}) {
  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Complaints by Category</CardTitle>
          <CardDescription>Breakdown by equipment category</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">
            Failed to load charts
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="pt-0">
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Complaints by Category</CardTitle>
        <CardDescription>Breakdown by equipment category</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-72">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
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
                  {data.map((_, i) => (
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
  );
});

const PmComplianceGauge = memo(function PmComplianceGauge({
  pmCompliance,
  upcomingPmCounts,
  isLoading,
  error,
}: {
  pmCompliance: number | undefined;
  upcomingPmCounts: { completed: number; overdue: number; scheduled: number } | undefined;
  isLoading: boolean;
  error: Error | null;
}) {
  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">PM Compliance</CardTitle>
          <CardDescription>Preventive maintenance schedule adherence</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">
            Failed to load charts
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || pmCompliance === undefined || !upcomingPmCounts) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col items-center justify-center py-4 gap-6">
            <Skeleton className="h-40 w-40 rounded-full" />
            <div className="w-full max-w-xs space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">PM Compliance</CardTitle>
        <CardDescription>Preventive maintenance schedule adherence</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col items-center justify-center py-4 gap-6">
          <CircularProgress value={pmCompliance} size={160} />
          <div className="w-full max-w-xs space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Target</span>
              <span className="font-medium">90%</span>
            </div>
            <Progress
              value={Math.min(pmCompliance, 100)}
              className={`h-2 [&>div]:${
                pmCompliance >= 80
                  ? 'bg-emerald-500'
                  : pmCompliance >= 50
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
              }`}
            />
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="text-emerald-600 font-semibold">
                  {upcomingPmCounts.completed}
                </p>
                <p className="text-muted-foreground">Completed</p>
              </div>
              <div>
                <p className="text-amber-600 font-semibold">
                  {upcomingPmCounts.overdue}
                </p>
                <p className="text-muted-foreground">Overdue</p>
              </div>
              <div>
                <p className="text-purple-600 font-semibold">
                  {upcomingPmCounts.scheduled}
                </p>
                <p className="text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

const RecentComplaintsTable = memo(function RecentComplaintsTable({
  data,
  isLoading,
  error,
}: {
  data: ComplaintItem[] | undefined;
  isLoading: boolean;
  error: Error | null;
}) {
  const setView = useAppStore((s) => s.setView);

  if (error) {
    return (
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
          <div className="max-h-96 flex items-center justify-center text-muted-foreground text-sm">
            Failed to load data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
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
              {data.slice(0, 5).map((complaint) => (
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
              {data.length === 0 && (
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
  );
});

const RecentWorkOrdersTable = memo(function RecentWorkOrdersTable({
  data,
  isLoading,
  error,
}: {
  data: WorkOrderItem[] | undefined;
  isLoading: boolean;
  error: Error | null;
}) {
  const setView = useAppStore((s) => s.setView);

  if (error) {
    return (
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
          <div className="max-h-96 flex items-center justify-center text-muted-foreground text-sm">
            Failed to load data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
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
              {data.slice(0, 5).map((wo) => (
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
              {data.length === 0 && (
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
  );
});

const UpcomingPmSchedule = memo(function UpcomingPmSchedule({
  data,
  isLoading,
  error,
}: {
  data: PmScheduleItem[] | undefined;
  isLoading: boolean;
  error: Error | null;
}) {
  const setView = useAppStore((s) => s.setView);

  if (error) {
    return (
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
          <div className="max-h-80 flex items-center justify-center text-muted-foreground text-sm">
            Failed to load data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-52" />
            </div>
            <Skeleton className="h-8 w-28" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
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
          {data.length > 0 ? (
            data.slice(0, 6).map((pm) => (
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
  );
});

// ============ MAIN DASHBOARD VIEW ============

export function DashboardView() {
  const { user } = useAuthStore();

  const kpi = useDashboardKpi();
  const charts = useDashboardCharts();
  const recent = useDashboardRecent();

  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  const kpiData = kpi.data;
  const quickBadges = [
    { label: `${kpiData?.totalEquipment ?? 0} Equipment`, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { label: `${kpiData?.totalCustomers ?? 0} Customers`, color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { label: `${kpiData?.totalEmployees ?? 0} Employees`, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    (kpiData?.lowStockItems ?? 0) > 0
      ? { label: `${kpiData?.lowStockItems} Low Stock`, color: 'bg-rose-50 text-rose-700 border-rose-200' }
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
      <KpiCardsSection
        data={kpi.data}
        isLoading={kpi.isLoading}
        error={kpi.error}
        refetch={kpi.refetch}
        upcomingPmLength={recent.data?.upcomingPm?.length ?? 0}
        role={user?.role || 'admin'}
      />

      {/* ============ 3. CHARTS ROW: Revenue Trend + Complaints by Status ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueChart
          data={charts.data?.monthlyRevenue}
          isLoading={charts.isLoading}
          error={charts.error}
        />
        <ComplaintsStatusChart
          data={charts.data?.complaintsByStatus}
          isLoading={charts.isLoading}
          error={charts.error}
        />
      </div>

      {/* ============ 4. SECOND CHARTS ROW: Category Pie + PM Compliance ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ComplaintsCategoryChart
          data={charts.data?.complaintsByCategory}
          isLoading={charts.isLoading}
          error={charts.error}
        />
        <PmComplianceGauge
          pmCompliance={charts.data?.pmCompliance}
          upcomingPmCounts={charts.data?.upcomingPmCounts}
          isLoading={charts.isLoading}
          error={charts.error}
        />
      </div>

      {/* ============ 5. RECENT ACTIVITY TABLES ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentComplaintsTable
          data={recent.data?.recentComplaints}
          isLoading={recent.isLoading}
          error={recent.error}
        />
        <RecentWorkOrdersTable
          data={recent.data?.recentWorkOrders}
          isLoading={recent.isLoading}
          error={recent.error}
        />
      </div>

      {/* ============ 6. UPCOMING PM SCHEDULE ============ */}
      <UpcomingPmSchedule
        data={recent.data?.upcomingPm}
        isLoading={recent.isLoading}
        error={recent.error}
      />
    </div>
  );
}