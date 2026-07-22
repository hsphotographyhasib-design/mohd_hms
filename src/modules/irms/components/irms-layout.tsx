'use client';

import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  Filter,
  Download,
  Plus,
  ClipboardCheck,
  LayoutDashboard,
  ListChecks,
  CalendarDays,
  FileBarChart,
  LayoutTemplate,
  BarChart3,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarClock,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuthStore } from '@/app-shell/store';
import { canPerformAction } from '@/core/permissions/rbac/permissions-matrix';
import { useInspectionStore, type InspectionTab } from '../lib/store';
import { toast } from 'sonner';
import type { DashboardStats } from '../lib/types';

// Lazy-loaded tab components
const DashboardTab = lazy(() => import('../tabs/dashboard-tab'));
const InspectionsTab = lazy(() => import('../tabs/inspections-tab'));
const CalendarTab = lazy(() => import('../tabs/calendar-tab'));
const ReportsTab = lazy(() => import('../tabs/reports-tab'));
const TemplatesTab = lazy(() => import('../tabs/templates-tab'));
const AnalyticsTab = lazy(() => import('../tabs/analytics-tab'));

// ─── Tab Configuration ───────────────────────────────────────────

interface TabConfig {
  key: InspectionTab;
  label: string;
  icon: React.ElementType;
  permission?: string;
}

const ALL_TABS: TabConfig[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'inspections', label: 'Inspections', icon: ListChecks },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'reports', label: 'Reports', icon: FileBarChart, permission: 'export' },
  { key: 'templates', label: 'Templates', icon: LayoutTemplate, permission: 'manage_templates' },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, permission: 'view_analytics' },
];

// ─── KPI Card Config ────────────────────────────────────────────

interface KpiConfig {
  key: keyof DashboardStats;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  format?: (val: number) => string;
}

const KPI_CARDS: KpiConfig[] = [
  { key: 'totalInspections', label: 'Total Inspections', icon: ClipboardCheck, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { key: 'scheduledToday', label: 'Scheduled Today', icon: CalendarClock, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  { key: 'pending', label: 'Pending', icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20' },
  { key: 'overdue', label: 'Overdue', icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20' },
  { key: 'failed', label: 'Failed', icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-50/80 dark:bg-red-900/20' },
  { key: 'passRate', label: 'Pass Rate', icon: TrendingUp, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', format: (v) => `${v}%` },
];

// ─── Tab Loading Fallback ───────────────────────────────────────

function TabFallback() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

// ─── Main Layout Component ──────────────────────────────────────

export default function IrmsLayout() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const token = useAuthStore.getState().token;

  const activeTab = useInspectionStore((s) => s.activeTab);
  const setActiveTab = useInspectionStore((s) => s.setActiveTab);
  const searchQuery = useInspectionStore((s) => s.searchQuery);
  const setSearchQuery = useInspectionStore((s) => s.setSearchQuery);
  const setShowCreateDialog = useInspectionStore((s) => s.setShowCreateDialog);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  // Determine visible tabs based on RBAC
  const visibleTabs = useMemo(() => {
    if (!role) return ALL_TABS.slice(0, 4); // Show non-restricted tabs
    return ALL_TABS.filter((tab) => {
      if (!tab.permission) return true;
      return canPerformAction(role, 'inspection', tab.permission);
    });
  }, [role]);

  // Load dashboard stats
  const loadStats = useCallback(async () => {
    try {
      const h: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) h['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/irms/inspections/dashboard-stats', { headers: h });
      if (res.ok) {
        const data = await res.json();
        setStats(data.data ?? data);
      }
    } catch {
      // Stats will remain null, KPI cards show zeros
    } finally {
      setStatsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const canCreate = role ? canPerformAction(role, 'inspection', 'create') : false;
  const canExport = role ? canPerformAction(role, 'inspection', 'export') : false;

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Inspection Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage inspections, track compliance, and generate reports
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search inspections..."
              className="pl-8 h-9 w-[200px] sm:w-[240px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter button */}
          <Popover open={showFilterPopover} onOpenChange={setShowFilterPopover}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filter</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-500">Quick filters</p>
                <div className="flex flex-wrap gap-2">
                  {['Today', 'This Week', 'This Month', 'Overdue'].map((f) => (
                    <Button key={f} variant="ghost" size="sm" className="h-7 text-xs">
                      {f}
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Export dropdown */}
          {canExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <FileBarChart className="mr-2 h-4 w-4" />
                  Export PDF
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <LayoutTemplate className="mr-2 h-4 w-4" />
                  Export Excel
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Create inspection */}
          {canCreate && (
            <Button
              size="sm"
              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                setActiveTab('inspections');
                // Small delay to let the tab switch render, then open the dialog
                setTimeout(() => setShowCreateDialog(true), 100);
              }}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Inspection</span>
            </Button>
          )}
        </div>
      </div>

      {/* ─── KPI Cards Row ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        {KPI_CARDS.map((kpi) => {
          const value = stats?.[kpi.key] ?? 0;
          const displayValue = kpi.format ? kpi.format(value) : value;

          return (
            <div
              key={kpi.key}
              className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow"
            >
              <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <div className="min-w-0">
                {statsLoading ? (
                  <>
                    <Skeleton className="h-5 w-10 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                      {displayValue}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">{kpi.label}</p>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Tabs ────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(tabVal) => setActiveTab(tabVal as InspectionTab)}>
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex h-10 w-fit bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-0.5">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="inline-flex items-center gap-1.5 px-3 h-8 text-sm font-medium rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all whitespace-nowrap"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Tab content with lazy loading */}
        <div className="mt-4">
          <TabsContent value="dashboard" className="mt-0">
            <Suspense fallback={<TabFallback />}>
              <DashboardTab searchQuery={searchQuery} />
            </Suspense>
          </TabsContent>

          <TabsContent value="inspections" className="mt-0">
            <Suspense fallback={<TabFallback />}>
              <InspectionsTab searchQuery={searchQuery} />
            </Suspense>
          </TabsContent>

          <TabsContent value="calendar" className="mt-0">
            <Suspense fallback={<TabFallback />}>
              <CalendarTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="reports" className="mt-0">
            <Suspense fallback={<TabFallback />}>
              <ReportsTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="templates" className="mt-0">
            <Suspense fallback={<TabFallback />}>
              <TemplatesTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <Suspense fallback={<TabFallback />}>
              <AnalyticsTab />
            </Suspense>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}