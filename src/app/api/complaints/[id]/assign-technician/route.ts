import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { ensureTableSync } from '@/core/database/db-sync';
import {
  getComplaintTimeline,
} from '@/core/workflow/notification-engine';
import { createNotification, notifyComplaintAssigned } from '@/modules/notifications/services/notification-service';
import { buildAuthContext, canAccessComplaint, buildComplaintWhereClause } from '@/core/permissions/rbac';

export const dynamic = 'force-dynamic';

const MAX_ACTIVE_JOBS = 5;
const SLA_RESPONSE_MINUTES = 15;

const ASSIGNMENT_ROLES = ['super_admin', 'admin', 'supervisor', 'manager'] as const;
const ACTIVE_COMPLAINT_STATUSES = ['ASSIGNED', 'ACCEPTED', 'WORK_ORDER_CREATED', 'IN_PROGRESS'] as const;
const ACTIVE_WO_STATUSES = ['PENDING', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] as const;
const TECH_ROLES = ['technician', 'supervisor'] as const;

function parseDevice(ua?: string): string | null {
  if (!ua) return null;
  if (/Mobile|Android.*Mobile|iPhone|iPod/i.test(ua)) return 'mobile';
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) return 'tablet';
  return 'desktop';
}

/** Safe DB query wrapper — ONLY for non-critical enrichment queries.
 *  DO NOT wrap the primary technician list query with this.
 */
async function safeQuery<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try { return await fn(); } catch (err) { console.warn(`[AssignTech] ${label}:`, err); return fallback; }
}

// ============ GET: Search technicians available for assignment ============

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureTableSync('Complaint');
    await ensureTableSync('User');

    const tenantId = payload.tenantId as string;
    const userRole = (payload.role as string).toLowerCase();
    const { id } = await params;

    if (!ASSIGNMENT_ROLES.includes(userRole as any)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status') || '';
    const department = searchParams.get('department') || '';
    const sortBy = searchParams.get('sortBy') || 'availability';
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 50);

    const and: any[] = [
      { tenantId, isActive: true, role: { in: [...TECH_ROLES] } },
    ];

    if (q.length >= 1) {
      and.push({
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { employeeNumber: { contains: q } },
          { phone: { contains: q } },
        ],
      });
    }

    if (status === 'available') and.push({ isOnline: true });
    else if (status === 'busy') and.push({ isOnline: false });

    if (department) and.push({ departmentId: department });

    // Fetch technicians — NO Prisma relation names in select (Supabase-incompatible)
    // Department is fetched separately to keep the main query resilient.
    // DO NOT wrap this in safeQuery — errors must propagate to the client.
    let technicians: any[];
    try {
      technicians = await db.user.findMany({
        where: { AND: and },
        select: {
          id: true, name: true, email: true, phone: true, role: true,
          employeeNumber: true, avatar: true, departmentId: true,
          isOnline: true, lastLogin: true, profileCompleted: true,
        },
        take: limit * 2,
      });
    } catch (dbErr) {
      console.error('[AssignTech] CRITICAL: technician list query failed:', dbErr);
      return NextResponse.json(
        { error: 'Unable to load technicians. Please try again.', diagnostic: `Technician query failed: ${(dbErr as Error).message?.slice(0, 200)}` },
        { status: 500 }
      );
    }

    // Fetch department names separately (non-critical — failure doesn't block technician list)
    const deptIds = [...new Set(technicians.map((t: any) => t.departmentId).filter(Boolean))];
    const deptMap: Record<string, string> = {};
    if (deptIds.length > 0) {
      try {
        const depts = await safeQuery(
          () => db.department.findMany({
            where: { id: { in: deptIds } },
            select: { id: true, name: true },
          }),
          [] as any[],
          'department lookup',
        );
        for (const d of depts) deptMap[d.id] = d.name;
      } catch {
        // Non-critical — technicians will show without department names
      }
    }

    const now = new Date();
    const techIds = technicians.map((t: any) => t.id);

    // Parallel enrichment — each query individually resilient
    const [leaveMap, completedStats, skillMap, activeComplaintsByTech, activeWOsByTech] = await Promise.all([
      // On-leave check
      safeQuery(
        () => db.leaveRequest.groupBy({
          by: ['userId'],
          where: { userId: { in: techIds }, status: 'APPROVED', startDate: { lte: now }, endDate: { gte: now } },
          _count: { id: true },
        }).then((rows: any[]) => Object.fromEntries(rows.map((r: any) => [r.userId, (r._count as any)?.id ?? 0]))),
        {} as Record<string, number>,
        'leave check',
      ),

      // Completed complaints
      safeQuery(
        () => db.complaint.findMany({
          where: { assignedToId: { in: techIds }, status: { in: ['CLOSED', 'PAID'] }, startedAt: { not: null }, completedAt: { not: null } },
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
            result[id] = { count: data.count, avgHours: data.totalMs > 0 ? (data.totalMs / data.count) / (1000 * 60 * 60) : null };
          }
          return result;
        }),
        {} as Record<string, { count: number; avgHours: number | null }>,
        'completed stats',
      ),

      // Skills
      safeQuery(
        () => db.complaint.findMany({
          where: { assignedToId: { in: techIds }, category: { not: '' } },
          select: { assignedToId: true, category: true },
          distinct: ['assignedToId', 'category'],
        }).then((rows: any[]) => {
          const map: Record<string, string[]> = {};
          for (const r of rows) {
            if (!map[r.assignedToId]) map[r.assignedToId] = [];
            if (r.category && !map[r.assignedToId].includes(r.category)) map[r.assignedToId].push(r.category);
          }
          return map;
        }),
        {} as Record<string, string[]>,
        'skills',
      ),

      // Active complaints per tech (replaces Prisma relation include)
      safeQuery(
        () => db.complaint.findMany({
          where: { assignedToId: { in: techIds }, status: { in: [...ACTIVE_COMPLAINT_STATUSES] } },
          select: { id: true, assignedToId: true, title: true, status: true, priority: true, category: true, createdAt: true },
        }),
        [] as any[],
        'active complaints',
      ),

      // Active work orders per tech (replaces Prisma relation include)
      safeQuery(
        () => db.workOrder.findMany({
          where: { assignedToId: { in: techIds }, status: { in: [...ACTIVE_WO_STATUSES] } },
          select: { id: true, assignedToId: true },
        }),
        [] as any[],
        'active work orders',
      ),
    ]);

    // Build lookup maps
    const complaintMap: Record<string, any[]> = {};
    for (const c of activeComplaintsByTech) {
      if (!c.assignedToId) continue;
      if (!complaintMap[c.assignedToId]) complaintMap[c.assignedToId] = [];
      complaintMap[c.assignedToId].push(c);
    }

    const woCountMap: Record<string, number> = {};
    for (const wo of activeWOsByTech) {
      if (!wo.assignedToId) continue;
      woCountMap[wo.assignedToId] = (woCountMap[wo.assignedToId] || 0) + 1;
    }

    // Build enriched technician list
    let enriched = technicians.map((t: any) => {
      const onLeave = (leaveMap[t.id] ?? 0) > 0;
      const techComplaints = complaintMap[t.id] || [];
      const activeJobs = techComplaints.length;
      const activeWorkOrders = woCountMap[t.id] || 0;
      const completed = completedStats[t.id];
      const skills = (skillMap[t.id] || []).slice(0, 8);

      return {
        id: t.id, name: t.name, email: t.email, phone: t.phone, role: t.role,
        employeeNumber: t.employeeNumber, avatar: t.avatar, departmentId: t.departmentId,
        departmentName: t.departmentId ? (deptMap[t.departmentId] || null) : null,
        isOnline: Boolean(t.isOnline),
        lastLogin: t.lastLogin ? new Date(t.lastLogin).toISOString() : null,
        activeJobs, activeWorkOrders,
        maxJobs: MAX_ACTIVE_JOBS,
        workloadPercent: Math.round((activeJobs / MAX_ACTIVE_JOBS) * 100),
        onLeave,
        availabilityStatus: onLeave ? 'on_leave' as const : t.isOnline ? 'available' as const : 'offline' as const,
        avgCompletionHours: completed?.avgHours ? parseFloat(completed.avgHours.toFixed(1)) : null,
        totalCompleted: completed?.count ?? 0,
        skills,
        currentTasks: techComplaints.map((c: any) => ({
          id: c.id, title: c.title, status: c.status,
          priority: c.priority, category: c.category,
          createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : null,
        })),
        canAssign: !onLeave && activeJobs < MAX_ACTIVE_JOBS,
        _lastLogin: t.lastLogin ? new Date(t.lastLogin) : null,
        _name: t.name,
        _onLeave: onLeave,
        _isOnline: Boolean(t.isOnline),
      };
    });

    if (status === 'on_leave') {
      enriched = enriched.filter(t => t._onLeave);
    }

    switch (sortBy) {
      case 'workload':
        enriched.sort((a, b) => a.activeJobs - b.activeJobs || (b._isOnline ? 1 : 0) - (a._isOnline ? 1 : 0) || a._name.localeCompare(b._name));
        break;
      case 'name':
        enriched.sort((a, b) => a._name.localeCompare(b._name));
        break;
      case 'recently_active':
        enriched.sort((a, b) => {
          if (!a._lastLogin && !b._lastLogin) return 0;
          if (!a._lastLogin) return 1;
          if (!b._lastLogin) return -1;
          return b._lastLogin.getTime() - a._lastLogin.getTime();
        });
        break;
      case 'availability':
      default:
        enriched.sort((a, b) => {
          const aPri = a._onLeave ? 2 : a._isOnline ? 0 : 1;
          const bPri = b._onLeave ? 2 : b._isOnline ? 0 : 1;
          if (aPri !== bPri) return aPri - bPri;
          if (a.activeJobs !== b.activeJobs) return a.activeJobs - b.activeJobs;
          return a._name.localeCompare(b._name);
        });
        break;
    }

    enriched = enriched.slice(0, limit);
    const result = enriched.map(({ _lastLogin, _name, _onLeave, _isOnline, ...rest }) => rest);

    // Get current complaint assignment info (simple scalar select — Supabase-safe)
    const complaint = await safeQuery(
      () => db.complaint.findFirst({
        where: { id, tenantId },
        select: { assignedToId: true, supervisorId: true, category: true, status: true, assignmentStatus: true, assignedAt: true, slaResponseDeadline: true, priority: true },
      }),
      null as any,
      'complaint lookup',
    );

    for (const t of result) {
      (t as any).isCurrentlyAssigned = t.id === complaint?.assignedToId;
    }

    let slaUrgent = false;
    if (complaint?.slaResponseDeadline && complaint.assignmentStatus === 'PENDING_ACCEPTANCE') {
      slaUrgent = new Date(complaint.slaResponseDeadline) < new Date(Date.now() + 5 * 60 * 1000);
    }

    return NextResponse.json({
      technicians: result,
      currentAssignment: complaint ? {
        assignedToId: complaint.assignedToId,
        supervisorId: complaint.supervisorId,
        category: complaint.category,
        assignmentStatus: complaint.assignmentStatus,
        assignedAt: complaint.assignedAt ? new Date(complaint.assignedAt).toISOString() : null,
        slaResponseDeadline: complaint.slaResponseDeadline ? new Date(complaint.slaResponseDeadline).toISOString() : null,
        slaUrgent,
        priority: complaint.priority,
      } : null,
    });
  } catch (error) {
    console.error('Technician search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============ POST: Assign or reassign technician ============

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureTableSync('Complaint');
    await ensureTableSync('User');
    await ensureTableSync('ComplaintTimeline');

    const tenantId = payload.tenantId as string;
    const userRole = payload.role as string;
    const userId = payload.userId as string;
    const { id } = await params;

    if (!ASSIGNMENT_ROLES.includes(userRole as any)) {
      return NextResponse.json({ error: 'Only Admin, Supervisor, and Manager can assign technicians' }, { status: 403 });
    }

    const ctx = await buildAuthContext(payload, { resolveCustomer: true });
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = await canAccessComplaint(ctx, id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'You do not have access to this complaint' }, { status: 403 });
    }

    const { where: rbacWhere } = await buildComplaintWhereClause(ctx);

    const body = await request.json();
    const { technicianId, reason } = body as { technicianId: string; reason?: string };

    if (!technicianId) {
      return NextResponse.json({ error: 'technicianId is required' }, { status: 400 });
    }

    // Get complaint — scalar select only, NO Prisma relation names
    const complaint = await db.complaint.findFirst({
      where: { ...rbacWhere, id },
      select: {
        id: true, assignedToId: true, supervisorId: true, customerId: true, title: true,
        category: true, status: true, assignmentStatus: true, assignedAt: true,
        slaResponseDeadline: true, priority: true, reassignmentCount: true,
      },
    });

    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    // Get customer info separately (replaces Prisma relation include)
    const customer = await safeQuery(
      () => complaint.customerId ? db.customer.findFirst({ where: { id: complaint.customerId }, select: { id: true, name: true, phone: true } }) : null,
      null as any,
      'customer lookup',
    );

    // Get previous technician info separately (replaces Prisma relation include)
    const previousTechnicianId = complaint.assignedToId;
    const previousTech = await safeQuery(
      () => previousTechnicianId ? db.user.findFirst({ where: { id: previousTechnicianId }, select: { id: true, name: true, phone: true, email: true } }) : null,
      null as any,
      'previous tech lookup',
    );
    const previousTechnicianName = previousTech?.name || null;

    // Get target technician
    const tech = await db.user.findFirst({
      where: { id: technicianId, tenantId, isActive: true },
      select: { id: true, name: true, role: true, isOnline: true, departmentId: true, phone: true, email: true },
    });

    if (!tech) {
      return NextResponse.json({ error: 'Technician not found or inactive' }, { status: 404 });
    }

    if (!(TECH_ROLES as readonly string[]).includes(tech.role)) {
      return NextResponse.json({ error: 'Selected user is not a technician or supervisor' }, { status: 400 });
    }

    if (complaint.assignedToId === technicianId) {
      return NextResponse.json({
        error: 'Validation failed',
        details: `${tech.name} is already assigned to this complaint.`,
      }, { status: 422 });
    }

    // Check if on leave
    const onLeave = await db.leaveRequest.count({
      where: { userId: technicianId, status: 'APPROVED', startDate: { lte: new Date() }, endDate: { gte: new Date() } },
    });
    if (onLeave > 0) {
      return NextResponse.json({ error: 'Validation failed', details: `${tech.name} is currently on leave and cannot be assigned.` }, { status: 422 });
    }

    // Check workload
    const activeJobs = await db.complaint.count({
      where: { assignedToId: technicianId, tenantId, id: { not: complaint.id }, status: { in: ['ASSIGNED', 'ACCEPTED', 'WORK_ORDER_CREATED', 'IN_PROGRESS'] } },
    });
    if (activeJobs >= MAX_ACTIVE_JOBS) {
      return NextResponse.json({ error: 'Validation failed', details: `${tech.name} already has ${activeJobs} active jobs (max ${MAX_ACTIVE_JOBS}).` }, { status: 422 });
    }

    // ===== ASSIGNMENT / REASSIGNMENT =====
    const isReassignment = complaint.assignedToId !== null && complaint.assignedToId !== technicianId;
    const slaDeadline = new Date(Date.now() + SLA_RESPONSE_MINUTES * 60 * 1000);

    const result = await db.$transaction(async (tx) => {
      const updateData: Record<string, any> = {
        assignedToId: technicianId,
        supervisorId: (userRole === 'supervisor' || userRole === 'manager') ? userId : complaint.supervisorId || userId,
        assignedBy: userId,
        assignedByRole: userRole,
        lastReassignedAt: isReassignment ? new Date() : undefined,
        assignmentReason: reason || null,
        assignmentStatus: 'PENDING_ACCEPTANCE',
        rejectionReason: null,
        eta: null,
        status: 'ASSIGNED',
        slaResponseDeadline: slaDeadline,
      };

      if (!isReassignment && !complaint.assignedAt) {
        updateData.assignedAt = new Date();
      }

      if (isReassignment) {
        const currentCount = Number(complaint.reassignmentCount || 0);
        updateData.reassignmentCount = currentCount + 1;
      }

      const updated = await tx.complaint.update({ where: { id: complaint.id }, data: updateData });

      const action = isReassignment ? 'reassigned' : 'assigned';
      const description = isReassignment
        ? `${tech.name} reassigned by ${userRole} (replacing ${previousTechnicianName || 'unassigned'}). Reason: ${reason || 'N/A'}. SLA: ${SLA_RESPONSE_MINUTES}min to accept.`
        : `${tech.name} assigned by ${userRole}. Reason: ${reason || 'N/A'}. SLA: ${SLA_RESPONSE_MINUTES}min to accept.`;

      await tx.complaintTimeline.create({
        data: {
          tenantId, complaintId: complaint.id, action,
          fromStatus: complaint.status, toStatus: 'ASSIGNED',
          description, performedBy: userId, performedByRole: userRole,
          metadata: JSON.stringify({
            technicianId, technicianName: tech.name, previousTechnicianId, previousTechnicianName,
            isReassignment, reason: reason || null, activeJobs,
            reassignmentCount: isReassignment ? (Number(complaint.reassignmentCount || 0) + 1) : 0,
            slaResponseDeadline: slaDeadline.toISOString(),
          }),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId, userId, action: `complaint.${action}`, entity: 'Complaint', entityId: complaint.id,
          oldValue: JSON.stringify({ assignedToId: previousTechnicianId, assignedToName: previousTechnicianName, status: complaint.status, assignmentStatus: complaint.assignmentStatus, reassignmentCount: complaint.reassignmentCount }),
          newValue: JSON.stringify({ assignedToId: technicianId, assignedToName: tech.name, status: 'ASSIGNED', assignmentStatus: 'PENDING_ACCEPTANCE', reassignmentCount: isReassignment ? (Number(complaint.reassignmentCount || 0) + 1) : 0, slaResponseDeadline: slaDeadline.toISOString() }),
          details: JSON.stringify({ isReassignment, previousTechnicianId, previousTechnicianName, reason: reason || null, performedByRole: userRole, activeJobsAtAssignment: activeJobs }),
          ipAddress: request.headers.get('x-forwarded-for') || null,
          userAgent: request.headers.get('user-agent') || null,
          device: parseDevice(request.headers.get('user-agent') || undefined),
        },
      });

      return updated;
    });

    const timeline = await getComplaintTimeline(tenantId, complaint.id);

    try {
      await notifyComplaintAssigned(complaint.id, tenantId, technicianId, complaint.customerId, complaint.title, userId);

      await createNotification({
        tenantId, type: 'workflow_transition',
        title: isReassignment ? 'Complaint Reassigned' : 'Complaint Assigned',
        message: `${userRole} assigned ${tech.name} to complaint: ${complaint.title}${isReassignment ? ` (replacing ${previousTechnicianName || 'N/A'})` : ''}`,
        priority: 'normal', relatedEntityType: 'complaint', relatedEntityId: complaint.id,
        actionLabel: 'View Complaint', createdBy: userId,
        roles: ['admin', 'super_admin'], excludeUserIds: [userId],
        data: { complaintId: complaint.id, action: isReassignment ? 'reassigned' : 'assigned', isReassignment },
      });

      if (isReassignment && previousTechnicianId) {
        await createNotification({
          tenantId, userId: previousTechnicianId, type: 'complaint_reassigned_away',
          title: 'Complaint Reassigned',
          message: `Complaint "${complaint.title}" has been reassigned to ${tech.name}. Reason: ${reason || 'N/A'}.`,
          priority: 'normal', relatedEntityType: 'complaint', relatedEntityId: complaint.id,
          actionLabel: 'View Complaint', createdBy: userId,
          data: { complaintId: complaint.id, newTechnicianName: tech.name, reason: reason || null },
        });
      }
    } catch (notifErr) {
      console.error('Failed to send assignment notification:', notifErr);
    }

    return NextResponse.json({
      success: true, isReassignment,
      message: isReassignment
        ? `${tech.name} has been reassigned to this complaint. SLA: ${SLA_RESPONSE_MINUTES}min to accept.`
        : `${tech.name} has been assigned to this complaint. SLA: ${SLA_RESPONSE_MINUTES}min to accept.`,
      complaint: {
        id: result.id, status: result.status, assignedToId: result.assignedToId,
        assignedBy: result.assignedBy, assignedByRole: result.assignedByRole,
        assignedAt: result.assignedAt?.toISOString(),
        lastReassignedAt: result.lastReassignedAt?.toISOString(),
        assignmentReason: result.assignmentReason, assignmentStatus: result.assignmentStatus,
        reassignmentCount: result.reassignmentCount, slaResponseDeadline: result.slaResponseDeadline?.toISOString(),
      },
      timeline,
    });
  } catch (error) {
    console.error('Assign technician error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
