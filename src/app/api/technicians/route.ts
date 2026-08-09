import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export const dynamic = 'force-dynamic';

const MAX_ACTIVE_JOBS = 5;

const ACTIVE_COMPLAINT_STATUSES = ['ASSIGNED', 'ACCEPTED', 'WORK_ORDER_CREATED', 'IN_PROGRESS'] as const;
const ACTIVE_WO_STATUSES = ['PENDING', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] as const;
const CLOSED_STATUSES = ['CLOSED', 'PAID'] as const;
const TECH_ROLES = ['technician', 'supervisor'] as const;

type AvailabilityStatus = 'available' | 'busy' | 'on_leave' | 'offline' | 'emergency';

/** Safe helper: run a DB query, return fallback on error */
async function safeQuery<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[Technicians API] ${label} failed:`, err);
    return fallback;
  }
}

// ============ GET: Technicians list with KPI stats ============

export async function GET(request: NextRequest) {
  try {
    // --- Auth ---
    const auth = verifyRouteAuth(request, { feature: 'technicians' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

    // --- Parse query params ---
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    const search = (searchParams.get('search') || '').trim();
    const status = searchParams.get('status') || '';
    const department = searchParams.get('department') || '';
    const skill = searchParams.get('skill') || '';
    const sortBy = searchParams.get('sortBy') || 'name';

    // --- Base where clause (Supabase-compatible: no Prisma relation names) ---
    const baseWhere: Record<string, unknown>[] = [
      { tenantId, isActive: true, role: { in: [...TECH_ROLES] } },
    ];

    if (search.length >= 1) {
      baseWhere.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { employeeNumber: { contains: search } },
        ],
      });
    }

    if (department) {
      baseWhere.push({ departmentId: department });
    }

    const listWhere = { AND: baseWhere };

    // --- Time boundaries ---
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // --- Fetch all tech IDs (for KPI + enrichment) ---
    // Only select scalar columns — NO Prisma relation names (Supabase-incompatible)
    const allTechIdsResult = await safeQuery(
      () => db.user.findMany({
        where: { tenantId, isActive: true, role: { in: [...TECH_ROLES] } },
        select: { id: true, isOnline: true, departmentId: true },
      }),
      [] as { id: string; isOnline: boolean; departmentId: string | null }[],
      'allTechIds fetch',
    );

    const allTechIds = allTechIdsResult.map(t => t.id);
    const allTechOnlineMap = Object.fromEntries(allTechIdsResult.map(t => [t.id, t.isOnline]));

    // --- Pagination count + paginated technician list ---
    // CRITICAL: Do NOT include Prisma auto-generated relation names (e.g.,
    // Complaint_Complaint_assignedToIdToUser) in the select. The Supabase adapter
    // cannot resolve them. Active complaints/work orders are fetched separately.
    const [total, technicians] = await Promise.all([
      safeQuery(() => db.user.count({ where: listWhere }), 0, 'count'),
      safeQuery(
        () => db.user.findMany({
          where: listWhere,
          select: {
            id: true, name: true, email: true, phone: true, avatar: true,
            employeeNumber: true, role: true, departmentId: true, isOnline: true,
            lastLogin: true,
            department: { select: { name: true } },
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        [] as any[],
        'technician list',
      ),
    ]);

    const pageTechIds = technicians.map((t: any) => t.id);

    // --- Parallel enrichment queries (each individually resilient) ---
    const [
      leaveMap,
      emergencyMap,
      completedStatsMap,
      todayCompletedMap,
      todayAttendanceMap,
      skillMap,
      pageActiveJobsMap,
    ] = await Promise.all([
      // 1. On-leave check
      safeQuery(
        () => db.leaveRequest.findMany({
          where: {
            userId: { in: allTechIds },
            status: 'APPROVED',
            startDate: { lte: now },
            endDate: { gte: now },
          },
          select: { userId: true, type: true },
        }).then(leaves => {
          const byUser: Record<string, string[]> = {};
          for (const l of leaves) {
            if (!byUser[l.userId]) byUser[l.userId] = [];
            byUser[l.userId].push(l.type);
          }
          const map: Record<string, { onLeave: boolean; type: string | null }> = {};
          for (const [userId, types] of Object.entries(byUser)) {
            map[userId] = { onLeave: true, type: types[0] || null };
          }
          return map;
        }),
        {} as Record<string, { onLeave: boolean; type: string | null }>,
        'leave check',
      ),

      // 2. Emergency count
      safeQuery(
        () => db.complaint.groupBy({
          by: ['assignedToId'],
          where: {
            assignedToId: { in: allTechIds },
            status: 'IN_PROGRESS',
            priority: { in: ['critical', 'high'] },
          },
          _count: { id: true },
        }).then((rows: any[]) =>
          Object.fromEntries(rows.map((r: any) => [r.assignedToId, (r._count as any)?.id ?? 0]))
        ),
        {} as Record<string, number>,
        'emergency count',
      ),

      // 3. Completed complaints stats
      safeQuery(
        () => db.complaint.findMany({
          where: {
            assignedToId: { in: pageTechIds },
            status: { in: [...CLOSED_STATUSES] },
            startedAt: { not: null },
            completedAt: { not: null },
          },
          select: { assignedToId: true, startedAt: true, completedAt: true },
        }).then((rows: any[]) => {
          const map: Record<string, { count: number; totalMs: number }> = {};
          for (const r of rows) {
            if (!r.assignedToId || !r.startedAt || !r.completedAt) continue;
            const ms = new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime();
            if (!map[r.assignedToId]) map[r.assignedToId] = { count: 0, totalMs: 0 };
            map[r.assignedToId].count++;
            map[r.assignedToId].totalMs += ms;
          }
          const result: Record<string, { count: number; avgHours: number | null }> = {};
          for (const [id, data] of Object.entries(map)) {
            result[id] = {
              count: data.count,
              avgHours: data.totalMs > 0 ? parseFloat(((data.totalMs / data.count) / 3_600_000).toFixed(1)) : null,
            };
          }
          return result;
        }),
        {} as Record<string, { count: number; avgHours: number | null }>,
        'completed stats',
      ),

      // 4. Today's completed complaints count
      safeQuery(
        () => db.complaint.groupBy({
          by: ['assignedToId'],
          where: {
            assignedToId: { in: pageTechIds },
            status: { in: [...CLOSED_STATUSES] },
            completedAt: { gte: todayStart, lt: todayEnd },
          },
          _count: { id: true },
        }).then((rows: any[]) =>
          Object.fromEntries(rows.map((r: any) => [r.assignedToId, (r._count as any)?.id ?? 0]))
        ),
        {} as Record<string, number>,
        'today completed',
      ),

      // 5. Today's attendance
      safeQuery(
        () => db.attendance.findMany({
          where: {
            userId: { in: pageTechIds },
            date: { gte: todayStart, lt: todayEnd },
          },
          select: { userId: true, hoursWorked: true, checkIn: true, checkOut: true, status: true },
        }).then((rows: any[]) => {
          const map: Record<string, { hoursWorked: number | null; status: string | null }> = {};
          for (const r of rows) {
            map[r.userId] = { hoursWorked: r.hoursWorked, status: r.status };
          }
          return map;
        }),
        {} as Record<string, { hoursWorked: number | null; status: string | null }>,
        'attendance',
      ),

      // 6. Skills (distinct complaint categories)
      safeQuery(
        () => db.complaint.findMany({
          where: {
            assignedToId: { in: pageTechIds },
            AND: [
              { category: { not: null } },
              { category: { not: '' } },
            ],
          },
          select: { assignedToId: true, category: true },
          distinct: ['assignedToId', 'category'],
        }).then((rows: any[]) => {
          const map: Record<string, string[]> = {};
          for (const r of rows) {
            if (!r.assignedToId) continue;
            if (!map[r.assignedToId]) map[r.assignedToId] = [];
            if (r.category && !map[r.assignedToId].includes(r.category)) {
              map[r.assignedToId].push(r.category);
            }
          }
          return map;
        }),
        {} as Record<string, string[]>,
        'skills',
      ),

      // 7. Active complaints per page tech (replaces the Prisma relation include)
      safeQuery(
        () => db.complaint.findMany({
          where: {
            assignedToId: { in: pageTechIds },
            status: { in: [...ACTIVE_COMPLAINT_STATUSES] },
          },
          select: {
            id: true, title: true, status: true, priority: true, category: true,
            customerId: true, assignedToId: true, assignedAt: true, createdAt: true,
          },
        }),
        [] as any[],
        'active complaints',
      ),
    ]);

    // Build per-tech active complaint map (replaces Prisma relation)
    const activeComplaintsByTech: Record<string, any[]> = {};
    for (const c of pageActiveJobsMap) {
      if (!c.assignedToId) continue;
      if (!activeComplaintsByTech[c.assignedToId]) activeComplaintsByTech[c.assignedToId] = [];
      activeComplaintsByTech[c.assignedToId].push(c);
    }

    // --- Active work orders per page tech ---
    const activeWOs = await safeQuery(
      () => db.workOrder.findMany({
        where: {
          assignedToId: { in: pageTechIds },
          status: { in: [...ACTIVE_WO_STATUSES] },
        },
        select: { id: true, title: true, status: true, assignedToId: true },
      }),
      [] as any[],
      'active work orders',
    );

    const activeWOsByTech: Record<string, any[]> = {};
    for (const wo of activeWOs) {
      if (!wo.assignedToId) continue;
      if (!activeWOsByTech[wo.assignedToId]) activeWOsByTech[wo.assignedToId] = [];
      activeWOsByTech[wo.assignedToId].push(wo);
    }

    // --- Compute KPI stats (using ALL techs, not just page) ---
    const allActiveJobsMap = await safeQuery(
      () => db.complaint.groupBy({
        by: ['assignedToId'],
        where: {
          assignedToId: { in: allTechIds },
          status: { in: [...ACTIVE_COMPLAINT_STATUSES] },
        },
        _count: { id: true },
      }).then((rows: any[]) =>
        Object.fromEntries(rows.map((r: any) => [r.assignedToId, (r._count as any)?.id ?? 0]))
      ),
      {} as Record<string, number>,
      'all active jobs',
    );

    let totalTechnicians = allTechIds.length;
    let activeCount = allTechIds.length;
    let inactiveCount = 0;
    let availableCount = 0;
    let busyCount = 0;
    let onLeaveCount = 0;
    let offlineCount = 0;
    let emergencyCount = 0;

    for (const techId of allTechIds) {
      const onLeave = leaveMap[techId]?.onLeave ?? false;
      const hasEmergency = (emergencyMap[techId] ?? 0) > 0;
      const activeJobs = allActiveJobsMap[techId] ?? 0;
      const isOnline = allTechOnlineMap[techId] ?? false;

      if (onLeave) {
        onLeaveCount++;
      } else if (hasEmergency) {
        emergencyCount++;
      } else if (activeJobs > 0) {
        busyCount++;
      } else if (isOnline) {
        availableCount++;
      } else {
        offlineCount++;
      }
    }

    const kpiStats = {
      totalTechnicians,
      activeCount,
      inactiveCount,
      availableCount,
      busyCount,
      onLeaveCount,
      offlineCount,
      emergencyCount,
    };

    // --- Enrich paginated technicians ---
    type EnrichedTech = {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      avatar: string | null;
      employeeNumber: string | null;
      role: string;
      departmentId: string | null;
      departmentName: string | null;
      isOnline: boolean;
      availabilityStatus: AvailabilityStatus;
      activeJobs: number;
      activeWorkOrders: number;
      maxJobs: number;
      workloadPercent: number;
      currentComplaint: Record<string, unknown> | null;
      currentWorkOrder: Record<string, unknown> | null;
      avgCompletionHours: number | null;
      totalCompleted: number;
      skills: string[];
      onLeave: boolean;
      leaveType: string | null;
      completedToday: number;
      hoursWorkedToday: number | null;
      lastLogin: string | null;
      _name?: string;
      _lastLogin?: Date | null;
      _onLeave?: boolean;
      _isOnline?: boolean;
      _activeJobs?: number;
    };

    let enriched: EnrichedTech[] = technicians.map((t: any) => {
      const onLeave = leaveMap[t.id]?.onLeave ?? false;
      const leaveType = leaveMap[t.id]?.type ?? null;
      const hasEmergency = (emergencyMap[t.id] ?? 0) > 0;
      const techComplaints = activeComplaintsByTech[t.id] || [];
      const techWOs = activeWOsByTech[t.id] || [];
      const activeJobs = techComplaints.length;
      const activeWorkOrders = techWOs.length;
      const completed = completedStatsMap[t.id];
      const skills = (skillMap[t.id] || []).slice(0, 8);

      // Determine availability status
      let availabilityStatus: AvailabilityStatus;
      if (onLeave) {
        availabilityStatus = 'on_leave';
      } else if (hasEmergency) {
        availabilityStatus = 'emergency';
      } else if (activeJobs > 0) {
        availabilityStatus = 'busy';
      } else if (t.isOnline) {
        availabilityStatus = 'available';
      } else {
        availabilityStatus = 'offline';
      }

      // Current complaint (first active one)
      const firstComplaint = techComplaints[0];
      const currentComplaint = firstComplaint ? {
        id: firstComplaint.id,
        title: firstComplaint.title,
        status: firstComplaint.status,
        priority: firstComplaint.priority,
        category: firstComplaint.category,
        assignedAt: firstComplaint.assignedAt ?? null,
      } : null;

      // Current work order (first active one)
      const firstWO = techWOs[0];
      const currentWorkOrder = firstWO ? {
        id: firstWO.id,
        title: firstWO.title,
        status: firstWO.status,
      } : null;

      const attendance = todayAttendanceMap[t.id];
      const lastLogin = t.lastLogin;

      return {
        id: t.id,
        name: t.name,
        email: t.email,
        phone: t.phone ?? null,
        avatar: t.avatar ?? null,
        employeeNumber: t.employeeNumber ?? null,
        role: t.role,
        departmentId: t.departmentId ?? null,
        departmentName: t.department?.name || null,
        isOnline: Boolean(t.isOnline),
        availabilityStatus,
        activeJobs,
        activeWorkOrders,
        maxJobs: MAX_ACTIVE_JOBS,
        workloadPercent: Math.round((activeJobs / MAX_ACTIVE_JOBS) * 100),
        currentComplaint,
        currentWorkOrder,
        avgCompletionHours: completed?.avgHours ?? null,
        totalCompleted: completed?.count ?? 0,
        skills,
        onLeave,
        leaveType,
        completedToday: todayCompletedMap[t.id] ?? 0,
        hoursWorkedToday: attendance?.hoursWorked ?? null,
        lastLogin: lastLogin ? new Date(lastLogin).toISOString() : null,
        // Sort helpers (stripped before response)
        _name: t.name,
        _lastLogin: lastLogin ? new Date(lastLogin) : null,
        _onLeave: onLeave,
        _isOnline: Boolean(t.isOnline),
        _activeJobs: activeJobs,
      };
    });

    // --- Post-filter by status ---
    if (status === 'available') {
      enriched = enriched.filter(t => t.availabilityStatus === 'available');
    } else if (status === 'busy') {
      enriched = enriched.filter(t => t.availabilityStatus === 'busy');
    } else if (status === 'on_leave') {
      enriched = enriched.filter(t => t.availabilityStatus === 'on_leave');
    } else if (status === 'offline') {
      enriched = enriched.filter(t => t.availabilityStatus === 'offline');
    } else if (status === 'emergency') {
      enriched = enriched.filter(t => t.availabilityStatus === 'emergency');
    }

    // --- Post-filter by skill ---
    if (skill) {
      enriched = enriched.filter(t =>
        t.skills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
      );
    }

    // --- Sort ---
    switch (sortBy) {
      case 'availability':
        enriched.sort((a, b) => {
          const order: Record<AvailabilityStatus, number> = {
            emergency: 0, busy: 1, available: 2, offline: 3, on_leave: 4,
          };
          const aPri = order[a.availabilityStatus] ?? 5;
          const bPri = order[b.availabilityStatus] ?? 5;
          if (aPri !== bPri) return aPri - bPri;
          return (a._activeJobs ?? 0) - (b._activeJobs ?? 0) || a._name!.localeCompare(b._name!);
        });
        break;
      case 'workload':
        enriched.sort((a, b) =>
          (a._activeJobs ?? 0) - (b._activeJobs ?? 0) ||
          (b._isOnline ? 1 : 0) - (a._isOnline ? 1 : 0) ||
          a._name!.localeCompare(b._name!)
        );
        break;
      case 'recently_active':
        enriched.sort((a, b) => {
          if (!a._lastLogin && !b._lastLogin) return 0;
          if (!a._lastLogin) return 1;
          if (!b._lastLogin) return -1;
          return b._lastLogin.getTime() - a._lastLogin.getTime();
        });
        break;
      case 'name':
      default:
        enriched.sort((a, b) => a._name!.localeCompare(b._name!));
        break;
    }

    // --- Strip internal sort keys ---
    const result = enriched.map(({
      _name, _lastLogin, _onLeave, _isOnline, _activeJobs, ...rest
    }) => rest);

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      stats: kpiStats,
      technicians: result,
      pagination: { page, pageSize, total, totalPages },
    });
  } catch (error) {
    console.error('Technicians list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
