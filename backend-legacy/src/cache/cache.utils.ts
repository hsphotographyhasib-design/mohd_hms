/**
 * MOHD.HMS Enterprise — Cache Utilities
 *
 * Key builders and invalidation helpers for all modules.
 * Ensures consistent, role-isolated cache keys.
 */

import { KEY_PREFIXES } from './cache.constants.js';
import { clearByPattern, cacheDelete, cacheSet } from './cache.service.js';

// ─── Key Builders (role-isolated) ──────────────────────────────────────────

/** Build a dashboard cache key scoped by role and user. */
export function dashboardKey(
  type: 'kpi' | 'summary' | 'charts' | 'recent',
  tenantId: string,
  userId: string,
  role: string
): string {
  // Admin/manager share cache; others get user-specific keys
  const scope = ['super_admin', 'admin', 'manager'].includes(role)
    ? `${role}:shared`
    : `${role}:${userId}`;
  return `${KEY_PREFIXES.dashboard}:${type}:${scope}`;
}

/** Build a complaints cache key scoped by role and user. */
export function complaintsKey(
  type: 'list' | 'stats' | 'detail',
  tenantId: string,
  userId: string,
  role: string,
  extra?: string  // e.g., page number, filter hash
): string {
  const scope = ['super_admin', 'admin', 'manager'].includes(role)
    ? `${role}:shared`
    : `${role}:${userId}`;
  const suffix = extra ? `:${extra}` : '';
  return `${KEY_PREFIXES.complaints}:${type}:${scope}${suffix}`;
}

/** Build a work orders cache key. */
export function workOrdersKey(
  type: 'list' | 'detail' | 'next-number',
  tenantId: string,
  userId: string,
  role: string,
  extra?: string
): string {
  const scope = ['super_admin', 'admin', 'manager'].includes(role)
    ? `${role}:shared`
    : `${role}:${userId}`;
  const suffix = extra ? `:${extra}` : '';
  return `${KEY_PREFIXES.workOrders}:${type}:${scope}${suffix}`;
}

/** Build a notifications cache key. */
export function notificationsKey(
  type: 'unread' | 'list' | 'badge',
  tenantId: string,
  userId: string,
  extra?: string
): string {
  const suffix = extra ? `:${extra}` : '';
  return `${KEY_PREFIXES.notifications}:${type}:${userId}${suffix}`;
}

/** Build an equipment/inventory cache key. */
export function equipmentKey(
  type: 'list' | 'detail' | 'search',
  tenantId: string,
  extra?: string
): string {
  const suffix = extra ? `:${extra}` : '';
  return `${KEY_PREFIXES.equipment}:${type}${suffix}`;
}

export function inventoryKey(
  type: 'list' | 'categories' | 'suppliers' | 'brands' | 'units' | 'equipment-types',
  tenantId: string,
  extra?: string
): string {
  const suffix = extra ? `:${extra}` : '';
  return `${KEY_PREFIXES.inventory}:${type}${suffix}`;
}

/** Build a customer search cache key. */
export function customerKey(
  type: 'list' | 'search',
  tenantId: string,
  extra?: string
): string {
  const suffix = extra ? `:${extra}` : '';
  return `${KEY_PREFIXES.customers}:${type}${suffix}`;
}

/** Build an employee/department cache key. */
export function employeeKey(
  type: 'list',
  tenantId: string,
  extra?: string
): string {
  const suffix = extra ? `:${extra}` : '';
  return `${KEY_PREFIXES.employees}:${type}${suffix}`;
}

/** Build a settings cache key. */
export function settingsKey(
  type: 'company' | 'smtp' | 'firebase' | 'maps' | 'theme' | 'system',
  tenantId: string
): string {
  return `${KEY_PREFIXES.settings}:${type}`;
}

/** Build a role/permission cache key. */
export function roleKey(
  type: 'user-role' | 'permissions',
  tenantId: string,
  userId: string
): string {
  return `${KEY_PREFIXES.roles}:${type}:${userId}`;
}

// ─── Cache Invalidation Helpers ────────────────────────────────────────────

/**
 * Invalidate all dashboard caches for a tenant.
 * Call after any data change that affects dashboard numbers.
 */
export async function invalidateDashboard(
  tenantId: string
): Promise<void> {
  await Promise.all([
    clearByPattern(`${KEY_PREFIXES.dashboard}:*`, tenantId),
  ]);
}

/**
 * Invalidate all complaint caches for a tenant.
 * Call after complaint create/update/delete.
 */
export async function invalidateComplaints(
  tenantId: string
): Promise<void> {
  await Promise.all([
    clearByPattern(`${KEY_PREFIXES.complaints}:*`, tenantId),
    // Complaints affect dashboard
    invalidateDashboard(tenantId),
  ]);
}

/**
 * Invalidate complaint caches for a specific user.
 */
export async function invalidateUserComplaints(
  tenantId: string,
  userId: string,
  role: string
): Promise<void> {
  const scope = ['super_admin', 'admin', 'manager'].includes(role)
    ? `${role}:*`
    : `${role}:${userId}*`;
  await Promise.all([
    clearByPattern(`${KEY_PREFIXES.complaints}:*:${scope}`, tenantId),
    invalidateDashboard(tenantId),
  ]);
}

/**
 * Invalidate all work order caches for a tenant.
 */
export async function invalidateWorkOrders(
  tenantId: string
): Promise<void> {
  await Promise.all([
    clearByPattern(`${KEY_PREFIXES.workOrders}:*`, tenantId),
    invalidateDashboard(tenantId),
  ]);
}

/**
 * Invalidate equipment caches.
 */
export async function invalidateEquipment(
  tenantId: string
): Promise<void> {
  await Promise.all([
    clearByPattern(`${KEY_PREFIXES.equipment}:*`, tenantId),
    clearByPattern(`${KEY_PREFIXES.inventory}:*`, tenantId),
  ]);
}

/**
 * Invalidate customer caches and related dashboard.
 */
export async function invalidateCustomers(
  tenantId: string
): Promise<void> {
  await Promise.all([
    clearByPattern(`${KEY_PREFIXES.customers}:*`, tenantId),
    invalidateDashboard(tenantId),
  ]);
}

/**
 * Invalidate notification caches for a user.
 * Call after new notification, mark-as-read, delete.
 */
export async function invalidateNotifications(
  tenantId: string,
  userId: string
): Promise<void> {
  await Promise.all([
    cacheDelete(`${KEY_PREFIXES.notifications}:unread:${userId}`, tenantId),
    cacheDelete(`${KEY_PREFIXES.notifications}:badge:${userId}`, tenantId),
    clearByPattern(`${KEY_PREFIXES.notifications}:list:${userId}*`, tenantId),
  ]);
}

/**
 * Invalidate employee/department caches.
 */
export async function invalidateEmployees(
  tenantId: string
): Promise<void> {
  await Promise.all([
    clearByPattern(`${KEY_PREFIXES.employees}:*`, tenantId),
    clearByPattern(`${KEY_PREFIXES.departments}:*`, tenantId),
  ]);
}

/**
 * Invalidate settings caches.
 */
export async function invalidateSettings(
  tenantId: string
): Promise<void> {
  await clearByPattern(`${KEY_PREFIXES.settings}:*`, tenantId);
}

/**
 * Invalidate role/permission caches for a user.
 */
export async function invalidateUserRoles(
  tenantId: string,
  userId: string
): Promise<void> {
  await clearByPattern(`${KEY_PREFIXES.roles}:*:${userId}`, tenantId);
}

/**
 * Master invalidation: clear ALL cache for a tenant.
 * Use sparingly (e.g., bulk imports, tenant config changes).
 */
export async function invalidateAll(tenantId: string): Promise<void> {
  const prefix = `hms:`;
  await clearByPattern(`${prefix}*`, tenantId);
}

/**
 * Get user context from Express request for cache key building.
 */
export function getUserContext(req: {
  user?: Record<string, unknown>;
  tenantId?: string;
}): { tenantId: string; userId: string; role: string } {
  return {
    tenantId: (req.tenantId as string) || 'default',
    userId: String(req.user?.userId || 'anonymous'),
    role: String(req.user?.role || 'unknown'),
  };
}