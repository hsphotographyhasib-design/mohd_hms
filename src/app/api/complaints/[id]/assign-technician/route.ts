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

// ============ GET: Search technicians available for assignment ============
// Fully database-agnostic (uses Prisma query builder, no raw SQL).

const ACTIVE_COMPLAINT_STATUSES = ['ASSIGNED', 'ACCEPTED', 'WORK_ORDER_CREATED', 'IN_PROGRESS'] as const;
const ACTIVE_WO_STATUSES = ['PENDING', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] as const;

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
    const sortBy = searchParams.get('sortBy') || 'availability';
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 50);

    // --- Build Prisma where filter ---
    const and: any[] = [
      { tenantId, isActive: true, role: { in: ['technician', 'supervisor'] } },
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

    // --- Fetch technicians with department ---
    let technicians = await db.user.findMany({
      where: { AND: and },
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        employeeNumber: true, avatar: true, departmentId: true,
        isOnline: true, lastLogin: true, profileCompleted: true,
        department: { select: { name: true } },
        assignedComplaints: {
          where: { status: { in: [...ACTIVE_COMPLAINT_STATUSES] } },
          select: { id: true, title: true, status: true, priority: true, category: true, createdAt: true },
        },
        assignedWorkOrders: {
          where: { status: { in: [...ACTIVE_WO_STATUSES] } },
          select: { id: true },
        },
      },
      take: limit * 2, // over-fetch, we'll trim after enrichment
    });

    // --- Enrich with leave, completion stats, skill categories ---
    const now = new Date();
    const techIds = technicians.map(t => t.id);

    // Parallel enrichment queries
    const [leaveMap, completedStats, skillMap] = await Promise.all([
      // On-leave check
      db.leaveRequest.groupBy({
        by: ['userId'],
        where: {
          userId: { in: techIds },
          status: 'APPROVED',
          startDate: { lte: now },
          endDate: { gte: now },
        },
        _count: { id: true },
      }).then(rows => Object.fromEntries(rows.map(r => [r.userId, r._count.id]))),

      // Completed complaints — fetch for count + avg completion time calculation
      db.complaint.findMany({
        where: {
          assignedToId: { in: techIds },
          status: { in: ['CLOSED', 'PAID'] },
          startedAt: { not: null },
          completedAt: { not: null },
        },
        select: { assignedToId: true, startedAt: true, completedAt: true },
      }).then(rows => {
        const map: Record<string, { count: number; totalMs: number }> = {};
        for (const r of rows) {
          if (!r.assignedToId || !r.startedAt || !r.completedAt) continue;
          const ms = new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime();
          if (!map[r.assignedToId]) map[r.assignedToId] = { count: 0, totalMs: 0 };
          map[r.assignedToId].count++;
          map[r.assignedToId].totalMs += ms;
        }
        // Convert to avgHours
        const result: Record<string, { count: number; avgHours: number | null }> = {};
        for (const [id, data] of Object.entries(map)) {
          result[id] = {
            count: data.count,
            avgHours: data.totalMs > 0 ? (data.totalMs / data.count) / (1000 * 60 * 60) : null,
          };
        }
        return result;
      }),

      // Skill categories (distinct categories from completed complaints)
      db.complaint.findMany({
        where: {
          assignedToId: { in: techIds },
          category: { not: null, not: '' },
        },
        select: { assignedToId: true, category: true },
        distinct: ['assignedToId', 'category'],
      }).then(rows => {
        const map: Record<string, string[]> = {};
        for (const r of rows) {
          if (!map[r.assignedToId]) map[r.assignedToId] = [];
          if (r.category && !map[r.assignedToId].includes(r.category)) {
            map[r.assignedToId].push(r.category);
          }
        }
        return map;
      }),
    ]);

    // --- Build enriched technician list ---
    let enriched = technicians.map(t => {
      const onLeave = (leaveMap[t.id] ?? 0) > 0;
      const activeJobs = t.assignedComplaints.length;
      const activeWorkOrders = t.assignedWorkOrders.length;
      const completed = completedStats[t.id];
      const skills = (skillMap[t.id] || []).slice(0, 8);

      return {
        id: t.id,
        name: t.name,
        email: t.email,
        phone: t.phone,
        role: t.role,
        employeeNumber: t.employeeNumber,
        avatar: t.avatar,
        departmentId: t.departmentId,
        departmentName: t.department?.name || null,
        isOnline: Boolean(t.isOnline),
        lastLogin: t.lastLogin?.toISOString() || null,
        activeJobs,
        activeWorkOrders,
        maxJobs: MAX_ACTIVE_JOBS,
        workloadPercent: Math.round((activeJobs / MAX_ACTIVE_JOBS) * 100),
        onLeave,
        availabilityStatus: onLeave
          ? 'on_leave' as const
          : t.isOnline
            ? 'available' as const
            : 'offline' as const,
        avgCompletionHours: completed?.avgHours ? parseFloat(completed.avgHours.toFixed(1)) : null,
        totalCompleted: completed?.count ?? 0,
        skills,
        currentTasks: t.assignedComplaints.map(c => ({
          id: c.id, title: c.title, status: c.status,
          priority: c.priority, category: c.category, createdAt: c.createdAt,
        })),
        canAssign: !onLeave && activeJobs < MAX_ACTIVE_JOBS,
        // For sorting
        _lastLogin: t.lastLogin,
        _name: t.name,
        _onLeave: onLeave,
        _isOnline: t.isOnline,
      };
    });

    // Filter on_leave after enrichment
    if (status === 'on_leave') {
      enriched = enriched.filter(t => t._onLeave);
    }

    // Sort
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

    // Trim to limit
    enriched = enriched.slice(0, limit);

    // Strip internal sort keys
    const result = enriched.map(({ _lastLogin, _name, _onLeave, _isOnline, ...rest }) => rest);

    // --- Get current complaint assignment info ---
    const complaint = await db.complaint.findFirst({
      where: { id, tenantId },
      select: {
        assignedToId: true, supervisorId: true, category: true,
        status: true, assignmentStatus: true, assignedAt: true,
        slaResponseDeadline: true, priority: true,
      },
    });

    // Mark currently assigned
    for (const t of result) {
      (t as any).isCurrentlyAssigned = t.id === complaint?.assignedToId;
    }

    // SLA urgency
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