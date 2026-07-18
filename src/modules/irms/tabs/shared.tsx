'use client';

import { useAuthStore } from '@/app-shell/store';
import type { UserRole } from '@/core/permissions/rbac/types';
import { canPerformAction } from '@/core/permissions/rbac/permissions-matrix';

/** Get current user's role from the enterprise auth store */
export function useCurrentRole(): UserRole | null {
  const user = useAuthStore((s) => s.user);
  return user?.role ?? null;
}

/** Check if the current user can perform an action */
export function useCanPerformAction(entity: string, action: string): boolean {
  const role = useCurrentRole();
  if (!role) return false;
  return canPerformAction(role, entity, action);
}

/** Get auth token for API calls */
export function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}

/** Make an authenticated fetch request */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}

/** Status badge styles */
export const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400',
};

/** Priority badge styles */
export const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

/** Result badge styles */
export const RESULT_STYLES: Record<string, string> = {
  pass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  fail: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  conditional: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  na: 'bg-gray-100 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400',
};

/** Format a date string for display */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Format date as short (no year) */
export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Truncate a string with ellipsis */
export function truncate(str: string, maxLen: number): string {
  if (!str || str.length <= maxLen) return str || '';
  return str.slice(0, maxLen) + '...';
}