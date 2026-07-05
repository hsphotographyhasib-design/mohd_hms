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

// ─── Auth helper ─────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cmms_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── KPI Query — 30s stale time, highest priority ────────────────

export function useDashboardKpi() {
  return useQuery<DashboardKpiData>({
    queryKey: ['dashboard', 'kpi'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/kpi', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load KPI data');
      return res.json();
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchInterval: 60_000,
  });
}

// ─── Charts Query — 2min stale time, lazy loaded ─────────────────

export function useDashboardCharts() {
  return useQuery<DashboardChartsData>({
    queryKey: ['dashboard', 'charts'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/charts', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load chart data');
      return res.json();
    },
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    refetchInterval: 2 * 60_000,
  });
}

// ─── Recent Activity Query — 1min stale time ─────────────────────

export function useDashboardRecent() {
  return useQuery<DashboardRecentData>({
    queryKey: ['dashboard', 'recent'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/recent', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load recent activity');
      return res.json();
    },
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