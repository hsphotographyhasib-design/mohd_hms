'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BarChart3,
  Shield,
  Trophy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { useAuthStore } from '@/app-shell/store';
import { canPerformAction } from '@/core/permissions/rbac/permissions-matrix';
import type { DashboardStats, AnalyticsSummary } from '../lib';

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#3b82f6',
  in_progress: '#eab308',
  completed: '#16a34a',
  failed: '#dc2626',
  overdue: '#dc2626',
  cancelled: '#6b7280',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#6b7280',
  medium: '#eab308',
  high: '#f97316',
  critical: '#dc2626',
};

export default function AnalyticsTab() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const canView = role ? canPerformAction(role, 'inspection', 'view_analytics') : false;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = useAuthStore.getState().token;
      const h: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) h['Authorization'] = `Bearer ${token}`;

      const [statsRes, analyticsRes] = await Promise.allSettled([
        fetch('/api/irms/inspections/dashboard-stats', { headers: h }),
        fetch('/api/irms/inspections/analytics', { headers: h }),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const d = await statsRes.value.json();
        setStats(d.data ?? d);
      }
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.ok) {
        const d = await analyticsRes.value.json();
        setAnalytics(d.data ?? d);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView) loadData();
  }, [canView, loadData]);

  if (!canView) {
    return (
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardContent className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
          <BarChart3 className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-sm font-medium">Access Restricted</p>
          <p className="text-xs mt-1">You don&apos;t have permission to view analytics</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) return <AnalyticsSkeleton />;

  const kpiCards = [
    { label: 'Total Inspections', value: stats?.totalInspections ?? 0, icon: BarChart3, color: 'text-emerald-600' },
    { label: 'Completed', value: stats?.completed ?? 0, icon: CheckCircle2, color: 'text-green-600' },
    { label: 'Pending', value: stats?.pending ?? 0, icon: AlertTriangle, color: 'text-yellow-600' },
    { label: 'Overdue', value: stats?.overdue ?? 0, icon: XCircle, color: 'text-red-600' },
    { label: 'Failed', value: stats?.failed ?? 0, icon: XCircle, color: 'text-red-500' },
    { label: 'Pass Rate', value: `${stats?.passRate ?? 0}%`, icon: TrendingUp, color: 'text-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gray-50 dark:bg-gray-800 ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-bold">{kpi.value}</p>
                <p className="text-[11px] text-gray-500">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader className="px-4 py-3 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Monthly Inspection Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {analytics?.monthlyTrend && analytics.monthlyTrend.length > 0 ? (
              <div className="space-y-2">
                {analytics.monthlyTrend.map((item) => {
                  const maxCount = Math.max(...analytics.monthlyTrend.map((m) => m.count), 1);
                  const pct = Math.round((item.count / maxCount) * 100);
                  return (
                    <div key={item.month} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-16 shrink-0">{item.month}</span>
                      <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-md transition-all duration-500 flex items-center pl-2"
                          style={{ width: `${Math.max(pct, 8)}%` }}
                        >
                          <span className="text-[10px] text-white font-medium">{item.count}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 w-16 shrink-0 justify-end">
                        <span className="text-[10px] text-green-600">{item.pass}P</span>
                        <span className="text-[10px] text-red-500">{item.fail}F</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <ChartEmpty message="No trend data available" />
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader className="px-4 py-3 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <Shield className="h-4 w-4 text-emerald-600" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {analytics?.statusBreakdown && analytics.statusBreakdown.length > 0 ? (
              <div className="space-y-3">
                {analytics.statusBreakdown.map((item) => {
                  const maxCount = Math.max(...analytics.statusBreakdown.map((s) => s.count), 1);
                  const pct = Math.round((item.count / maxCount) * 100);
                  const color = STATUS_COLORS[item.status] ?? '#6b7280';
                  return (
                    <div key={item.status} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-24 shrink-0 capitalize">{item.status.replace('_', ' ')}</span>
                      <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
                        <div
                          className="h-full rounded-md transition-all duration-500"
                          style={{ width: `${Math.max(pct, 5)}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-xs font-medium w-8 text-right">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <ChartEmpty message="No status data available" />
            )}
          </CardContent>
        </Card>

        {/* Priority Breakdown */}
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader className="px-4 py-3 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <AlertTriangle className="h-4 w-4 text-emerald-600" />
              Priority Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {analytics?.priorityBreakdown && analytics.priorityBreakdown.length > 0 ? (
              <div className="space-y-3">
                {analytics.priorityBreakdown.map((item) => {
                  const maxCount = Math.max(...analytics.priorityBreakdown.map((p) => p.count), 1);
                  const pct = Math.round((item.count / maxCount) * 100);
                  const color = PRIORITY_COLORS[item.priority] ?? '#6b7280';
                  return (
                    <div key={item.priority} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-20 shrink-0 capitalize">{item.priority}</span>
                      <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
                        <div
                          className="h-full rounded-md transition-all duration-500"
                          style={{ width: `${Math.max(pct, 5)}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-xs font-medium w-8 text-right">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <ChartEmpty message="No priority data available" />
            )}
          </CardContent>
        </Card>

        {/* Top Inspectors */}
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader className="px-4 py-3 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <Trophy className="h-4 w-4 text-emerald-600" />
              Top Inspectors by Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {analytics?.topInspectors && analytics.topInspectors.length > 0 ? (
              <div className="space-y-2">
                {analytics.topInspectors.map((inspector, idx) => (
                  <div key={inspector.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                      idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-400' : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{inspector.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${inspector.rate}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500">{inspector.rate}%</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium">{inspector.completed}/{inspector.total}</p>
                      <p className="text-[10px] text-gray-400">completed</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ChartEmpty message="No inspector performance data" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pass/Fail by Equipment Category */}
      {analytics?.passFailByCategory && analytics.passFailByCategory.length > 0 && (
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader className="px-4 py-3 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              Pass/Fail Rate by Equipment Category
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100 dark:border-gray-800">
                    <th className="pb-2 pr-4 font-medium">Category</th>
                    <th className="pb-2 pr-4 font-medium">Total</th>
                    <th className="pb-2 pr-4 font-medium">Pass</th>
                    <th className="pb-2 pr-4 font-medium">Fail</th>
                    <th className="pb-2 font-medium">Pass Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.passFailByCategory.map((cat) => {
                    const rate = cat.total > 0 ? Math.round((cat.pass / cat.total) * 100) : 0;
                    return (
                      <tr key={cat.category} className="border-b border-gray-50 dark:border-gray-800/50">
                        <td className="py-2 pr-4 font-medium">{cat.category}</td>
                        <td className="py-2 pr-4 text-gray-500">{cat.total}</td>
                        <td className="py-2 pr-4">
                          <span className="text-green-600 font-medium">{cat.pass}</span>
                        </td>
                        <td className="py-2 pr-4">
                          <span className="text-red-600 font-medium">{cat.fail}</span>
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-600">
      <BarChart3 className="h-8 w-8 mb-2 opacity-50" />
      <p className="text-xs">{message}</p>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
            <CardHeader className="px-4 py-3">
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-6 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}