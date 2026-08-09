/**
 * Centralized Technician Resolution Service
 *
 * SINGLE SOURCE OF TRUTH for resolving technician users.
 * All modules that need to find/list/resolve technicians MUST use this service.
 *
 * Canonical definition: A "technician" is any User record where:
 *   role IN ('technician', 'supervisor') AND isActive = true
 *
 * Usage:
 *   import { TechnicianResolver } from '@/modules/technicians/services/technician-resolver';
 *   const techs = await TechnicianResolver.getAvailable(tenantId);
 */

import { db } from '@/core/database/db';

// ============ CONSTANTS ============

/** Roles that qualify as "technician" for assignment/operations purposes */
export const TECH_ROLES = ['technician', 'supervisor'] as const;
export type TechRole = (typeof TECH_ROLES)[number];

const MAX_ACTIVE_JOBS = 5;

const ACTIVE_COMPLAINT_STATUSES = ['ASSIGNED', 'ACCEPTED', 'WORK_ORDER_CREATED', 'IN_PROGRESS'] as const;
const ACTIVE_WO_STATUSES = ['PENDING', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] as const;

// ============ TYPES ============

export interface TechnicianBasic {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  employeeNumber: string | null;
  avatar: string | null;
  departmentId: string | null;
  departmentName: string | null;
  isOnline: boolean;
  isActive: boolean;
}

export interface TechnicianResolved extends TechnicianBasic {
  activeJobs: number;
  activeWorkOrders: number;
  maxJobs: number;
  workloadPercent: number;
  onLeave: boolean;
  leaveType: string | null;
  availabilityStatus: 'available' | 'busy' | 'on_leave' | 'offline' | 'emergency';
  canAssign: boolean;
  skills: string[];
  totalCompleted: number;
  avgCompletionHours: number | null;
}

// ============ SAFE QUERY HELPER ============

async function safeQuery<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[TechnicianResolver] ${label}:`, err);
    return fallback;
  }
}

// ============ RESOLVER CLASS ============

export class TechnicianResolver {
  /**
   * Get all active technician/supervisor users for a tenant.
   * Returns basic user info — no enrichment.
   */
  static async getAll(tenantId: string): Promise<TechnicianBasic[]> {
    return safeQuery(
      () => db.user.findMany({
        where: { tenantId, isActive: true, role: { in: [...TECH_ROLES] } },
        select: {
          id: true, name: true, email: true, phone: true, role: true,
          employeeNumber: true, avatar: true, departmentId: true,
          isActive: true, isOnline: true,
          department: { select: { name: true } },
        },
        orderBy: { name: 'asc' },
      }).then((rows: any[]) => rows.map((u: any) => ({
        id: u.id, name: u.name, email: u.email,
        phone: u.phone ?? null, role: u.role,
        employeeNumber: u.employeeNumber ?? null,
        avatar: u.avatar ?? null,
        departmentId: u.departmentId ?? null,
        departmentName: u.department?.name ?? null,
        isOnline: Boolean(u.isOnline),
        isActive: Boolean(u.isActive),
      }))),
      [] as TechnicianBasic[],
      'getAll',
    );
  }

  /**
   * Get a single technician by user ID.
   * Returns null if not found or not a technician role.
   */
  static async getById(tenantId: string, userId: string): Promise<TechnicianBasic | null> {
    return safeQuery(
      () => db.user.findFirst({
        where: { id: userId, tenantId, isActive: true, role: { in: [...TECH_ROLES] } },
        select: {
          id: true, name: true, email: true, phone: true, role: true,
          employeeNumber: true, avatar: true, departmentId: true,
          isActive: true, isOnline: true,
          department: { select: { name: true } },
        },
      }).then((u: any) => u ? ({
        id: u.id, name: u.name, email: u.email,
        phone: u.phone ?? null, role: u.role,
        employeeNumber: u.employeeNumber ?? null,
        avatar: u.avatar ?? null,
        departmentId: u.departmentId ?? null,
        departmentName: u.department?.name ?? null,
        isOnline: Boolean(u.isOnline),
        isActive: Boolean(u.isActive),
      } as TechnicianBasic) : null),
      null,
      'getById',
    );
  }

  /**
   * Get all technician IDs for a tenant (lightweight).
   */
  static async getAllIds(tenantId: string): Promise<string[]> {
    return safeQuery(
      () => db.user.findMany({
        where: { tenantId, isActive: true, role: { in: [...TECH_ROLES] } },
        select: { id: true },
      }).then((rows: any[]) => rows.map((r: any) => r.id)),
      [] as string[],
      'getAllIds',
    );
  }

  /**
   * Check if a user is a technician.
   */
  static async isTechnician(tenantId: string, userId: string): Promise<boolean> {
    const user = await safeQuery(
      () => db.user.findFirst({
        where: { id: userId, tenantId, isActive: true, role: { in: [...TECH_ROLES] } },
        select: { id: true },
      }),
      null,
      'isTechnician',
    );
    return user !== null;
  }

  /**
   * Get technicians available for assignment (not on leave, under workload limit).
   */
  static async getAvailable(tenantId: string, options?: {
    departmentId?: string;
    search?: string;
    limit?: number;
  }): Promise<TechnicianResolved[]> {
    const techs = await TechnicianResolver.getAll(tenantId);
    let filtered = techs;

    if (options?.departmentId) {
      filtered = filtered.filter(t => t.departmentId === options.departmentId);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.employeeNumber && t.employeeNumber.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) return [];

    const techIds = filtered.map(t => t.id);
    const now = new Date();

    // Parallel enrichment
    const [leaveMap, activeJobsMap, activeWOMap] = await Promise.all([
      safeQuery(
        async () => {
          const leaves = await db.leaveRequest.findMany({
            where: { userId: { in: techIds }, status: 'APPROVED', startDate: { lte: now }, endDate: { gte: now } },
            select: { userId: true, type: true },
          });
          const map: Record<string, { onLeave: boolean; type: string | null }> = {};
          const byUser: Record<string, string[]> = {};
          for (const l of leaves as any[]) {
            if (!byUser[l.userId]) byUser[l.userId] = [];
            byUser[l.userId].push(l.type);
          }
          for (const [uid, types] of Object.entries(byUser)) {
            map[uid] = { onLeave: true, type: types[0] || null };
          }
          return map;
        },
        {} as Record<string, { onLeave: boolean; type: string | null }>,
        'leave check',
      ),
      safeQuery(
        () => db.complaint.groupBy({
          by: ['assignedToId'],
          where: { assignedToId: { in: techIds }, status: { in: [...ACTIVE_COMPLAINT_STATUSES] } },
          _count: { id: true },
        }).then((rows: any[]) => Object.fromEntries(rows.map((r: any) => [r.assignedToId, (r._count as any)?.id ?? 0]))),
        {} as Record<string, number>,
        'active jobs',
      ),
      safeQuery(
        () => db.workOrder.groupBy({
          by: ['assignedToId'],
          where: { assignedToId: { in: techIds }, status: { in: [...ACTIVE_WO_STATUSES] } },
          _count: { id: true },
        }).then((rows: any[]) => Object.fromEntries(rows.map((r: any) => [r.assignedToId, (r._count as any)?.id ?? 0]))),
        {} as Record<string, number>,
        'active WOs',
      ),
    ]);

    const resolved: TechnicianResolved[] = filtered.map(t => {
      const leave = leaveMap[t.id];
      const onLeave = leave?.onLeave ?? false;
      const leaveType = leave?.type ?? null;
      const activeJobs = activeJobsMap[t.id] ?? 0;
      const activeWorkOrders = activeWOMap[t.id] ?? 0;

      let availabilityStatus: TechnicianResolved['availabilityStatus'];
      if (onLeave) availabilityStatus = 'on_leave';
      else if (activeJobs > 0) availabilityStatus = 'busy';
      else if (t.isOnline) availabilityStatus = 'available';
      else availabilityStatus = 'offline';

      return {
        ...t,
        activeJobs,
        activeWorkOrders,
        maxJobs: MAX_ACTIVE_JOBS,
        workloadPercent: Math.round((activeJobs / MAX_ACTIVE_JOBS) * 100),
        onLeave,
        leaveType,
        availabilityStatus,
        canAssign: !onLeave && activeJobs < MAX_ACTIVE_JOBS,
        skills: [], // Skills require complaint history query — use getResolved for full data
        totalCompleted: 0,
        avgCompletionHours: null,
      };
    });

    // Sort: available first, then by workload
    resolved.sort((a, b) => {
      if (a.canAssign !== b.canAssign) return a.canAssign ? -1 : 1;
      return a.activeJobs - b.activeJobs || a.name.localeCompare(b.name);
    });

    const limit = options?.limit || resolved.length;
    return resolved.slice(0, limit);
  }

  /**
   * Get a fully resolved technician with all enrichment data.
   */
  static async getResolved(tenantId: string, userId: string): Promise<TechnicianResolved | null> {
    const basic = await TechnicianResolver.getById(tenantId, userId);
    if (!basic) return null;

    const available = await TechnicianResolver.getAvailable(tenantId);
    return available.find(t => t.id === userId) || null;
  }
}
