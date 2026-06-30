import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import {
  recordWorkflowTransition,
  getComplaintTimeline,
} from '@/lib/workflow/notification-engine';

export const dynamic = 'force-dynamic';

const MAX_ACTIVE_JOBS = 5;
const SLA_RESPONSE_MINUTES = 15; // minutes to accept assignment

// ============ RBAC: Roles that can assign/reassign technicians ============
const ASSIGNMENT_ROLES = ['super_admin', 'admin', 'supervisor', 'manager'] as const;

// ============ Helper: Parse device from User-Agent ============
function parseDevice(ua?: string): string | null {
  if (!ua) return null;
  if (/Mobile|Android.*Mobile|iPhone|iPod/i.test(ua)) return 'mobile';
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) return 'tablet';
  return 'desktop';
}

// ============ Helper: Escape SQL strings ============
function esc(val: string): string {
  return val.replace(/'/g, "''");
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

    const tenantId = payload.tenantId as string;
    const userRole = payload.role as string;
    const { id } = await params;

    if (!ASSIGNMENT_ROLES.includes(userRole as any)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status') || '';
    const department = searchParams.get('department') || '';
    const sortBy = searchParams.get('sortBy') || 'availability'; // availability, workload, name, recently_active
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 50);

    // Build WHERE clause
    const conditions: string[] = [`u.tenantId = '${esc(tenantId)}'`, `u.isActive = 1`];
    conditions.push(`(u.role = 'technician' OR u.role = 'supervisor')`);

    // Text search
    if (q.length >= 1) {
      const escaped = esc(q.toLowerCase());
      conditions.push(`(
        LOWER(u.name) LIKE '%${escaped}%'
        OR LOWER(u.email) LIKE '%${escaped}%'
        OR LOWER(u."employeeNumber") LIKE '%${escaped}%'
        OR u.phone LIKE '%${esc(q)}%'
      )`);
    }

    // Status filter
    if (status === 'available') {
      conditions.push(`u.isOnline = 1`);
    } else if (status === 'busy') {
      conditions.push(`u.isOnline = 0`);
    } else if (status === 'on_leave') {
      // Handled below in post-processing — we still fetch them but flag them
    }

    // Department filter
    if (department) {
      conditions.push(`u."departmentId" = '${esc(department)}'`);
    }

    const whereClause = conditions.join(' AND ');

    // ORDER BY clause
    let orderBy = 'u.isOnline DESC, u.name ASC';
    switch (sortBy) {
      case 'workload':
        orderBy = '"activeJobs" ASC, u.isOnline DESC, u.name ASC';
        break;
      case 'name':
        orderBy = 'u.name ASC';
        break;
      case 'recently_active':
        orderBy = 'u."lastLogin" DESC NULLS LAST, u.isOnline DESC';
        break;
      case 'availability':
      default:
        orderBy = 'CASE WHEN (SELECT COUNT(*) FROM LeaveRequest lr WHERE lr.userId = u.id AND lr.status = \'APPROVED\' AND lr.startDate <= date(\'now\') AND lr.endDate >= date(\'now\')) > 0 THEN 2 WHEN u.isOnline = 1 THEN 0 ELSE 1 END, "activeJobs" ASC, u.name ASC';
        break;
    }

    // Query technicians with rich data
    const technicians = await db.$queryRawUnsafe<any[]>(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        u.role,
        u."employeeNumber",
        u.avatar,
        u."departmentId",
        d.name as "departmentName",
        u.isOnline,
        u."lastLogin",
        u."profileCompleted",
        (SELECT COUNT(*) FROM Complaint c
          WHERE c."assignedToId" = u.id
            AND c.status IN ('ASSIGNED', 'ACCEPTED', 'WORK_ORDER_CREATED', 'IN_PROGRESS')
        ) as "activeJobs",
        (SELECT COUNT(*) FROM WorkOrder wo
          WHERE wo."assignedToId" = u.id
            AND wo.status IN ('PENDING', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS')
        ) as "activeWorkOrders",
        (SELECT COUNT(*) FROM LeaveRequest lr
          WHERE lr.userId = u.id
            AND lr.status = 'APPROVED'
            AND lr.startDate <= date('now')
            AND lr.endDate >= date('now')
        ) as "onLeave",
        (SELECT AVG(
            CAST((julianday(c."completedAt") - julianday(c."startedAt")) * 24 AS REAL)
          )
          FROM Complaint c
          WHERE c."assignedToId" = u.id
            AND c.status IN ('CLOSED', 'PAID')
            AND c."startedAt" IS NOT NULL
            AND c."completedAt" IS NOT NULL
        ) as "avgCompletionHours",
        (SELECT COUNT(*) FROM Complaint c
          WHERE c."assignedToId" = u.id
            AND c.status IN ('CLOSED', 'PAID')
        ) as "totalCompleted",
        (SELECT GROUP_CONCAT(DISTINCT c.category, ',')
          FROM Complaint c
          WHERE c."assignedToId" = u.id
            AND c.category IS NOT NULL
            AND c.category != ''
          LIMIT 1
        ) as "skillCategories"
      FROM User u
      LEFT JOIN Department d ON u."departmentId" = d.id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ${limit}
    `);

    // Get current complaint assignment info
    const complaint = await db.complaint.findFirst({
      where: { id, tenantId },
      select: {
        assignedToId: true,
        supervisorId: true,
        category: true,
        status: true,
        assignmentStatus: true,
        assignedAt: true,
        slaResponseDeadline: true,
        priority: true,
      },
    });

    // Get current active tasks for each technician (for expansion)
    const technicianIds = technicians.map(t => t.id);
    const activeTasks = technicianIds.length > 0
      ? await db.$queryRawUnsafe<any[]>(`
          SELECT c."assignedToId", c.id, c.title, c.status, c.priority, c.category, c."createdAt"
          FROM Complaint c
          WHERE c."assignedToId" IN (${technicianIds.map(id => `'${esc(id)}'`).join(',')})
            AND c.status IN ('ASSIGNED', 'ACCEPTED', 'WORK_ORDER_CREATED', 'IN_PROGRESS')
          ORDER BY c.priority DESC, c."createdAt" DESC
        `)
      : [];

    // Build task map
    const taskMap: Record<string, any[]> = {};
    for (const task of activeTasks) {
      if (!taskMap[task.assignedToId]) taskMap[task.assignedToId] = [];
      taskMap[task.assignedToId].push({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        category: task.category,
        createdAt: task.createdAt,
      });
    }

    // SLA urgency for current assignment
    let slaUrgent = false;
    if (complaint?.slaResponseDeadline && complaint.assignmentStatus === 'PENDING_ACCEPTANCE') {
      slaUrgent = new Date(complaint.slaResponseDeadline) < new Date(Date.now() + 5 * 60 * 1000);
    }

    return NextResponse.json({
      technicians: technicians.map(t => {
        const onLeave = Number(t.onLeave || 0) > 0;
        const jobs = Number(t.activeJobs || 0);
        const categories = (t.skillCategories || '').split(',').filter(Boolean).slice(0, 8);
        const avgHrs = t.avgCompletionHours ? Number(t.avgCompletionHours).toFixed(1) : null;

        // Filter by on_leave status if specifically requested
        if (status === 'on_leave' && !onLeave) return null;

        return {
          id: t.id,
          name: t.name,
          email: t.email,
          phone: t.phone,
          role: t.role,
          employeeNumber: t.employeeNumber,
          avatar: t.avatar,
          departmentId: t.departmentId,
          departmentName: t.departmentName,
          isOnline: Boolean(t.isOnline),
          lastLogin: t.lastLogin ? new Date(t.lastLogin).toISOString() : null,
          activeJobs: jobs,
          activeWorkOrders: Number(t.activeWorkOrders || 0),
          maxJobs: MAX_ACTIVE_JOBS,
          workloadPercent: Math.round((jobs / MAX_ACTIVE_JOBS) * 100),
          onLeave,
          availabilityStatus: onLeave
            ? 'on_leave' as const
            : Boolean(t.isOnline)
              ? 'available' as const
              : 'offline' as const,
          isCurrentlyAssigned: t.id === complaint?.assignedToId,
          avgCompletionHours: avgHrs ? parseFloat(avgHrs) : null,
          totalCompleted: Number(t.totalCompleted || 0),
          skills: categories,
          currentTasks: taskMap[t.id] || [],
          canAssign: !onLeave && jobs < MAX_ACTIVE_JOBS,
        };
      }).filter(Boolean),
      currentAssignment: complaint ? {
        assignedToId: complaint.assignedToId,
        supervisorId: complaint.supervisorId,
        category: complaint.category,
        assignmentStatus: complaint.assignmentStatus,
        assignedAt: complaint.assignedAt?.toISOString() || null,
        slaResponseDeadline: complaint.slaResponseDeadline?.toISOString() || null,
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

    const tenantId = payload.tenantId as string;
    const userRole = payload.role as string;
    const userId = payload.userId as string;
    const { id } = await params;

    // RBAC: Admin, Supervisor, Manager, and SuperAdmin can all assign
    if (!ASSIGNMENT_ROLES.includes(userRole as any)) {
      return NextResponse.json({ error: 'Only Admin, Supervisor, and Manager can assign technicians' }, { status: 403 });
    }

    const body = await request.json();
    const { technicianId, reason } = body as {
      technicianId: string;
      reason?: string;
    };

    if (!technicianId) {
      return NextResponse.json({ error: 'technicianId is required' }, { status: 400 });
    }

    // Get the complaint
    const complaint = await db.complaint.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        assignedTo: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    // ===== VALIDATION =====
    const tech = await db.user.findFirst({
      where: { id: technicianId, tenantId, isActive: true },
      select: {
        id: true, name: true, role: true, isOnline: true,
        departmentId: true, phone: true, email: true,
      },
    });

    if (!tech) {
      return NextResponse.json({ error: 'Technician not found or inactive' }, { status: 404 });
    }

    if (tech.role !== 'technician' && tech.role !== 'supervisor') {
      return NextResponse.json({ error: 'Selected user is not a technician or supervisor' }, { status: 400 });
    }

    // Cannot reassign to the same technician
    if (complaint.assignedToId === technicianId) {
      return NextResponse.json({
        error: 'Validation failed',
        details: `${tech.name} is already assigned to this complaint.`,
      }, { status: 422 });
    }

    // Check if on leave
    const onLeave = await db.leaveRequest.count({
      where: {
        userId: technicianId,
        status: 'APPROVED',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });
    if (onLeave > 0) {
      return NextResponse.json({
        error: 'Validation failed',
        details: `${tech.name} is currently on leave and cannot be assigned.`,
      }, { status: 422 });
    }

    // Check workload
    const activeJobs = await db.complaint.count({
      where: {
        assignedToId: technicianId,
        tenantId,
        id: { not: complaint.id }, // Exclude this complaint itself
        status: { in: ['ASSIGNED', 'ACCEPTED', 'WORK_ORDER_CREATED', 'IN_PROGRESS'] },
      },
    });
    if (activeJobs >= MAX_ACTIVE_JOBS) {
      return NextResponse.json({
        error: 'Validation failed',
        details: `${tech.name} already has ${activeJobs} active jobs (max ${MAX_ACTIVE_JOBS}). Workload too high.`,
      }, { status: 422 });
    }

    // ===== ASSIGNMENT / REASSIGNMENT =====
    const isReassignment = complaint.assignedToId !== null && complaint.assignedToId !== technicianId;
    const previousTechnicianId = complaint.assignedToId;
    const previousTechnicianName = complaint.assignedTo?.name || null;
    const slaDeadline = new Date(Date.now() + SLA_RESPONSE_MINUTES * 60 * 1000);

    const result = await db.$transaction(async (tx) => {
      // Build update data
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

      // First assignment: set assignedAt
      if (!isReassignment && !complaint.assignedAt) {
        updateData.assignedAt = new Date();
      }

      // Increment reassignment count
      if (isReassignment) {
        const currentCount = Number(complaint.reassignmentCount || 0);
        updateData.reassignmentCount = currentCount + 1;
      }

      const updated = await tx.complaint.update({
        where: { id: complaint.id },
        data: updateData,
      });

      // Record timeline
      const action = isReassignment ? 'reassigned' : 'assigned';
      const description = isReassignment
        ? `${tech.name} reassigned by ${userRole} (replacing ${previousTechnicianName || 'unassigned'}). Reason: ${reason || 'N/A'}. SLA: ${SLA_RESPONSE_MINUTES}min to accept.`
        : `${tech.name} assigned by ${userRole}. Reason: ${reason || 'N/A'}. SLA: ${SLA_RESPONSE_MINUTES}min to accept.`;

      await tx.complaintTimeline.create({
        data: {
          tenantId,
          complaintId: complaint.id,
          action,
          fromStatus: complaint.status,
          toStatus: 'ASSIGNED',
          description,
          performedBy: userId,
          performedByRole: userRole,
          metadata: JSON.stringify({
            technicianId,
            technicianName: tech.name,
            previousTechnicianId,
            previousTechnicianName,
            isReassignment,
            reason: reason || null,
            activeJobs,
            reassignmentCount: isReassignment ? (Number(complaint.reassignmentCount || 0) + 1) : 0,
            slaResponseDeadline: slaDeadline.toISOString(),
          }),
        },
      });

      // Notify the assigned technician
      await tx.notification.create({
        data: {
          tenantId,
          userId: technicianId,
          type: 'complaint_assigned',
          title: isReassignment ? 'Complaint Reassigned' : 'New Complaint Assigned',
          message: isReassignment
            ? `You have been reassigned to complaint: ${complaint.title}. Previous: ${previousTechnicianName || 'N/A'}. Please respond within ${SLA_RESPONSE_MINUTES} minutes.`
            : `You have been assigned a new complaint: ${complaint.title}. Please respond within ${SLA_RESPONSE_MINUTES} minutes.`,
          data: JSON.stringify({ complaintId: complaint.id, action, priority: complaint.priority, slaMinutes: SLA_RESPONSE_MINUTES }),
          relatedEntityType: 'complaint',
          relatedEntityId: complaint.id,
        },
      });

      // Notify customer
      await tx.notification.create({
        data: {
          tenantId,
          userId: complaint.customerId,
          type: 'workflow_transition',
          title: 'Technician Assigned',
          message: `${tech.name} has been assigned to your complaint: ${complaint.title}.`,
          data: JSON.stringify({ complaintId: complaint.id, action, technicianName: tech.name }),
          relatedEntityType: 'complaint',
          relatedEntityId: complaint.id,
        },
      });

      // Notify admins and supervisors
      const notifTargets = await tx.user.findMany({
        where: {
          tenantId,
          isActive: true,
          role: { in: ['admin', 'super_admin'] },
          id: { not: userId },
        },
        select: { id: true },
      });
      if (notifTargets.length > 0) {
        await tx.notification.createMany({
          data: notifTargets.map(a => ({
            tenantId,
            userId: a.id,
            type: 'workflow_transition',
            title: isReassignment ? 'Complaint Reassigned' : 'Complaint Assigned',
            message: `${userRole} assigned ${tech.name} to complaint: ${complaint.title}${isReassignment ? ` (replacing ${previousTechnicianName || 'N/A'})` : ''}`,
            data: JSON.stringify({ complaintId: complaint.id, action, isReassignment }),
            relatedEntityType: 'complaint',
            relatedEntityId: complaint.id,
          })),
        });
      }

      // Notify previous technician if reassigning
      if (isReassignment && previousTechnicianId) {
        await tx.notification.create({
          data: {
            tenantId,
            userId: previousTechnicianId,
            type: 'complaint_reassigned_away',
            title: 'Complaint Reassigned',
            message: `Complaint "${complaint.title}" has been reassigned to ${tech.name}. Reason: ${reason || 'N/A'}.`,
            data: JSON.stringify({ complaintId: complaint.id, newTechnicianName: tech.name, reason: reason || null }),
            relatedEntityType: 'complaint',
            relatedEntityId: complaint.id,
          },
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: `complaint.${action}`,
          entity: 'Complaint',
          entityId: complaint.id,
          oldValue: JSON.stringify({
            assignedToId: previousTechnicianId,
            assignedToName: previousTechnicianName,
            status: complaint.status,
            assignmentStatus: complaint.assignmentStatus,
            reassignmentCount: complaint.reassignmentCount,
          }),
          newValue: JSON.stringify({
            assignedToId: technicianId,
            assignedToName: tech.name,
            status: 'ASSIGNED',
            assignmentStatus: 'PENDING_ACCEPTANCE',
            reassignmentCount: isReassignment ? (Number(complaint.reassignmentCount || 0) + 1) : 0,
            slaResponseDeadline: slaDeadline.toISOString(),
          }),
          details: JSON.stringify({
            isReassignment,
            previousTechnicianId,
            previousTechnicianName,
            reason: reason || null,
            performedByRole: userRole,
            activeJobsAtAssignment: activeJobs,
          }),
          ipAddress: request.headers.get('x-forwarded-for') || null,
          userAgent: request.headers.get('user-agent') || null,
          device: parseDevice(request.headers.get('user-agent') || undefined),
        },
      });

      return updated;
    });

    // Get updated timeline
    const timeline = await getComplaintTimeline(tenantId, complaint.id);

    return NextResponse.json({
      success: true,
      isReassignment,
      message: isReassignment
        ? `${tech.name} has been reassigned to this complaint. SLA: ${SLA_RESPONSE_MINUTES}min to accept.`
        : `${tech.name} has been assigned to this complaint. SLA: ${SLA_RESPONSE_MINUTES}min to accept.`,
      complaint: {
        id: result.id,
        status: result.status,
        assignedToId: result.assignedToId,
        assignedBy: result.assignedBy,
        assignedByRole: result.assignedByRole,
        assignedAt: result.assignedAt?.toISOString(),
        lastReassignedAt: result.lastReassignedAt?.toISOString(),
        assignmentReason: result.assignmentReason,
        assignmentStatus: result.assignmentStatus,
        reassignmentCount: result.reassignmentCount,
        slaResponseDeadline: result.slaResponseDeadline?.toISOString(),
      },
      timeline,
    });
  } catch (error) {
    console.error('Assign technician error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}