'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/app-shell/store';
import type { ComplaintItem, WorkOrderItem, PmScheduleItem } from '@/core/types';

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

// ─── Error Classification ────────────────────────────────────────

export type DashboardErrorCategory =
  | 'auth'        // 401/403 — session expired
  | 'network'     // fetch failed / DNS / connection refused
  | 'timeout'     // request took too long
  | 'server'      // 5xx from API
  | 'parse'       // response is not valid JSON
  | 'unavailable' // 502/503 — backend service unavailable
  | 'unknown';    // catch-all

export interface DashboardError extends Error {
  category: DashboardErrorCategory;
  statusCode?: number;
  isAuthError: boolean;
  isRetryable: boolean;
}

function classifyDashboardError(error: unknown, label: string): DashboardError {
  // Network errors (fetch itself throws)
  if (error instanceof TypeError && (
    error.message.includes('fetch') ||
    error.message.includes('network') ||
    error.message.includes('Failed to fetch') ||
    error.message.includes('NetoworkError')
  )) {
    const e = new Error(`Network connection unavailable — could not reach the server for ${label}.`) as DashboardError;
    e.category = 'network';
    e.isAuthError = false;
    e.isRetryable = true;
    return e;
  }

  // DOMException for abort (timeout)
  if (error instanceof DOMException && error.name === 'AbortError') {
    const e = new Error(`Request timed out while loading ${label}. The server may be busy.`) as DashboardError;
    e.category = 'timeout';
    e.isAuthError = false;
    e.isRetryable = true;
    return e;
  }

  // Already a DashboardError from a previous classification
  if ((error as DashboardError).category) {
    return error as DashboardError;
  }

  // Our custom auth error from dashboardFetch
  if ((error as DashboardError).isAuthError) {
    const e = error as DashboardError;
    e.category = 'auth';
    return e;
  }

  // Error from res.json() parse failure
  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    const e = new Error(`Received an invalid response from the server for ${label}.`) as DashboardError;
    e.category = 'parse';
    e.isAuthError = false;
    e.isRetryable = true;
    return e;
  }

  // Generic fallback
  const msg = error instanceof Error ? error.message : String(error);
  const e = new Error(msg || `Unexpected error loading ${label}.`) as DashboardError;
  e.category = 'unknown';
  e.isAuthError = false;
  e.isRetryable = true;
  return e;
}

/** Human-readable message for each error category */
export function getDashboardErrorMessage(error: DashboardError): string {
  switch (error.category) {
    case 'auth':
      return 'Session expired — redirecting to login…';
    case 'network':
      return 'Network connection unavailable. Please check your connection and try again.';
    case 'timeout':
      return 'Server is taking too long to respond. Will retry automatically.';
    case 'server':
      return error.statusCode === 502 || error.statusCode === 503
        ? 'Backend service is temporarily unavailable. Retrying…'
        : 'A server error occurred while loading dashboard data.';
    case 'parse':
      return 'Received an unexpected response from the server. Retrying…';
    case 'unavailable':
      return 'Backend service is temporarily unavailable. Retrying…';
    default:
      return error.message || 'An unexpected error occurred.';
  }
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

/**
 * Enterprise fetch for dashboard APIs.
 *
 * Features:
 * - AbortController with 15s timeout
 * - Error classification (auth / network / timeout / server / parse)
 * - Structured DashboardError with retry guidance
 * - Never exposes internal error details to the user
 */
const DASHBOARD_TIMEOUT_MS = 15_000;

async function dashboardFetch<T>(url: string, label: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DASHBOARD_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: getAuthHeaders(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // ── Auth errors ──
    if (res.status === 401 || res.status === 403) {
      const err = new Error(`Authentication error — ${label}`) as DashboardError;
      err.isAuthError = true;
      err.category = 'auth';
      err.statusCode = res.status;
      err.isRetryable = false;
      throw err;
    }

    // ── Backend unavailable ──
    if (res.status === 502 || res.status === 503) {
      const err = new Error(`Backend service unavailable for ${label}.`) as DashboardError;
      err.isAuthError = false;
      err.category = 'unavailable';
      err.statusCode = res.status;
      err.isRetryable = true;
      throw err;
    }

    // ── Other server errors ──
    if (!res.ok) {
      let detail = `Failed to load ${label}`;
      try {
        const body = await res.json();
        if (body.error) detail = body.error;
      } catch { /* use default */ }
      const err = new Error(detail) as DashboardError;
      err.isAuthError = false;
      err.category = 'server';
      err.statusCode = res.status;
      err.isRetryable = res.status >= 500;
      throw err;
    }

    // ── Success — parse JSON safely ──
    const data = await res.json() as T;
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    // Already a classified error — re-throw as-is
    if ((error as DashboardError).category) throw error;

    // Re-classify
    throw classifyDashboardError(error, label);
  }
}

// ─── Shared retry configuration ──────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = [1_000, 3_000, 6_000]; // 1s, 3s, 6s

function dashboardRetryLogic(failureCount: number, error: Error): boolean {
  const de = error as DashboardError;
  // Never retry auth errors
  if (de.isAuthError || de.category === 'auth') return false;
  // Retry up to MAX_RETRIES for retryable errors
  if (!de.isRetryable && de.category !== 'unknown') return false;
  return failureCount < MAX_RETRIES;
}

// ─── KPI Query — 30s stale time, highest priority ────────────────

export function useDashboardKpi(role?: string, filters?: DashboardFilters) {
  const isEnabled = !!role && !BLOCKED_ROLES.has(role);
  const { isAuthenticated } = useAuthStore();

  return useQuery<DashboardKpiData, DashboardError>({
    queryKey: ['dashboard', 'kpi', filters],
    queryFn: () => dashboardFetch<DashboardKpiData>(`/api/dashboard/kpi${filtersToQuery(filters)}`, 'KPI data'),
    enabled: isEnabled && isAuthenticated,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchInterval: 60_000,
    retry: dashboardRetryLogic,
    retryDelay: (attemptIndex) => RETRY_DELAY_MS[Math.min(attemptIndex, RETRY_DELAY_MS.length - 1)],
  });
}

// ─── Charts Query — 2min stale time ─────────────────────────────

export function useDashboardCharts(role?: string, filters?: DashboardFilters) {
  const isEnabled = !!role && !BLOCKED_ROLES.has(role) && role !== 'hr';
  const { isAuthenticated } = useAuthStore();

  return useQuery<DashboardChartsData, DashboardError>({
    queryKey: ['dashboard', 'charts', filters],
    queryFn: () => dashboardFetch<DashboardChartsData>(`/api/dashboard/charts${filtersToQuery(filters)}`, 'chart data'),
    enabled: isEnabled && isAuthenticated,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    refetchInterval: 2 * 60_000,
    retry: dashboardRetryLogic,
    retryDelay: (attemptIndex) => RETRY_DELAY_MS[Math.min(attemptIndex, RETRY_DELAY_MS.length - 1)],
  });
}

// ─── Recent Activity Query — 1min stale time ─────────────────────

export function useDashboardRecent(role?: string, filters?: DashboardFilters) {
  const isEnabled = !!role && !BLOCKED_ROLES.has(role) && role !== 'hr' && role !== 'finance';
  const { isAuthenticated } = useAuthStore();

  return useQuery<DashboardRecentData, DashboardError>({
    queryKey: ['dashboard', 'recent', filters],
    queryFn: () => dashboardFetch<DashboardRecentData>(`/api/dashboard/recent${filtersToQuery(filters)}`, 'recent activity'),
    enabled: isEnabled && isAuthenticated,
    staleTime: 1 * 60_000,
    gcTime: 5 * 60_000,
    refetchInterval: 60_000,
    retry: dashboardRetryLogic,
    retryDelay: (attemptIndex) => RETRY_DELAY_MS[Math.min(attemptIndex, RETRY_DELAY_MS.length - 1)],
  });
}

// ─── Invalidate all dashboard queries ────────────────────────────

export function useInvalidateDashboard() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [queryClient]);
}

// ─── Background Recovery Hook ────────────────────────────────────

/**
 * When dashboard queries are in error state and the error is retryable,
 * automatically re-fetch every 30 seconds until success.
 * This provides automatic recovery when the backend comes back online.
 */
export function useDashboardBackgroundRecovery() {
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      // Find any failed dashboard queries that are retryable
      const allQueries = queryClient.getQueryCache().findAll({ queryKey: ['dashboard'] });
      const hasRetryableError = allQueries.some(
        (q) => q.state.error && (q.state.error as DashboardError).isRetryable !== false
      );

      if (hasRetryableError) {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
    }, 30_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [queryClient]);
}

// ─── Connection Health Hook ───────────────────────────────────────

/**
 * Returns the worst error category across all three dashboard queries.
 * Useful for showing a single connection health indicator.
 */
export function useDashboardHealth() {
  const kpi = useDashboardKpi(useAuthStore(s => s.user?.role));
  const charts = useDashboardCharts(useAuthStore(s => s.user?.role));
  const recent = useDashboardRecent(useAuthStore(s => s.user?.role));

  const errors = [kpi.error, charts.error, recent.error].filter(Boolean) as DashboardError[];
  const isLoading = kpi.isLoading || charts.isLoading || recent.isLoading;

  // If all queries succeeded, we're healthy
  if (errors.length === 0) {
    return {
      status: kpi.data ? 'healthy' : 'loading' as const,
      isLoading,
      error: null as DashboardError | null,
      errorMessage: '',
      errorCategory: null as DashboardErrorCategory | null,
    };
  }

  // Priority: auth > network > timeout > unavailable > server > parse > unknown
  const priority: DashboardErrorCategory[] = ['auth', 'network', 'timeout', 'unavailable', 'server', 'parse', 'unknown'];
  let worstError: DashboardError | null = null;
  let worstIndex = priority.length;

  for (const err of errors) {
    const idx = priority.indexOf(err.category);
    if (idx < worstIndex) {
      worstIndex = idx;
      worstError = err;
    }
  }

  return {
    status: 'error' as const,
    isLoading: false,
    error: worstError,
    errorMessage: worstError ? getDashboardErrorMessage(worstError) : '',
    errorCategory: worstError?.category ?? 'unknown',
  };
}