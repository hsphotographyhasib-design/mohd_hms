'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ComplaintItem, WorkOrderItem, PmScheduleItem } from '@/types';

// ─── Types for split endpoints ───────────────────────────────────

export interface DashboardKpiData {
  totalEquipment: number;
  activeEquipment: number;
  openComplaints: number;
  inProgressComplaints: number;
  totalWorkOrders: number;
  pendingWorkOrders: number;
  completedWorkOrders: number;
  totalRevenue: number;
  pendingInvoices: number;
  overdueInvoices: number;
  pmCompliance: number;
  totalCustomers: number;
  totalEmployees: number;
  lowStockItems: number;
  accessLevel: string;
}

export interface DashboardChartsData {
  monthlyRevenue: { month: string; revenue: number }[];
  complaintsByCategory: { category: string; count: number }[];
  complaintsByStatus: { status: string; count: number }[];
  pmCompliance: number;
  upcomingPmCounts: { completed: number; overdue: number; scheduled: number };
}

export interface DashboardRecentData {
  recentComplaints: ComplaintItem[];
  recentWorkOrders: WorkOrderItem[];
  upcomingPm: PmScheduleItem[];
}

/** Global dashboard filters (only visible to admin/manager/supervisor) */
export interface DashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  priority?: string;
  department?: string;
  technician?: string;
  customer?: string;
  category?: string;
}

// ─── Auth helper ─────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cmms_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Roles that should never trigger dashboard API calls */
const BLOCKED_ROLES = new Set(['vendor', 'guest']);

/** Build query string from filter object */
function filtersToQuery(filters?: DashboardFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.department) params.set('department', filters.department);
  if (filters.technician) params.set('technician', filters.technician);
  if (filters.customer) params.set('customer', filters.customer);
  if (filters.category) params.set('category', filters.category);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// ─── KPI Query — 30s stale time, highest priority ────────────────

export function useDashboardKpi(role?: string, filters?: DashboardFilters) {
  const isEnabled = !!role && !BLOCKED_ROLES.has(role);

  return useQuery<DashboardKpiData>({
    queryKey: ['dashboard', 'kpi', filters],
    queryFn: async () => {
      const qs = filtersToQuery(filters);
      const res = await fetch(`/api/dashboard/kpi${qs}`, { headers: getAuthHeaders() });
      if (!res.ok) {
        let detail = 'Failed to load KPI data';
        try {
          const body = await res.json();
          if (body.error) detail = body.error;
        } catch {}
        throw new Error(detail);
      }
      return res.json();
    },
    enabled: isEnabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchInterval: 60_000,
  });
}

// ─── Charts Query — 2min stale time ─────────────────────────────

export function useDashboardCharts(role?: string, filters?: DashboardFilters) {
  // Finance sees only revenue charts; HR sees nothing; customer sees complaint charts only
  const isEnabled = !!role && !BLOCKED_ROLES.has(role) && role !== 'hr';

  return useQuery<DashboardChartsData>({
    queryKey: ['dashboard', 'charts', filters],
    queryFn: async () => {
      const qs = filtersToQuery(filters);
      const res = await fetch(`/api/dashboard/charts${qs}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load chart data');
      return res.json();
    },
    enabled: isEnabled,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    refetchInterval: 2 * 60_000,
  });
}

// ─── Recent Activity Query — 1min stale time ─────────────────────

export function useDashboardRecent(role?: string, filters?: DashboardFilters) {
  // Finance and HR don't see operational recent activity
  const isEnabled = !!role && !BLOCKED_ROLES.has(role) && role !== 'hr' && role !== 'finance';

  return useQuery<DashboardRecentData>({
    queryKey: ['dashboard', 'recent', filters],
    queryFn: async () => {
      const qs = filtersToQuery(filters);
      const res = await fetch(`/api/dashboard/recent${qs}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load recent activity');
      return res.json();
    },
    enabled: isEnabled,
    staleTime: 1 * 60_000,
    gcTime: 5 * 60_000,
    refetchInterval: 60_000,
  });
}

// ─── Invalidate all dashboard queries ────────────────────────────

export function useInvalidateDashboard() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
}