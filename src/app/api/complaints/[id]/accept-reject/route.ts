import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { ensureTableSync } from '@/core/database/db-sync';
import { getComplaintTimeline } from '@/core/workflow/notification-engine';
import { buildAuthContext, logComplaintAccessDenied } from '@/core/permissions/rbac';
import { createNotification } from '@/modules/notifications/services/notification-service';

export const dynamic = 'force-dynamic';

function parseDevice(ua?: string): string | null {
  if (!ua) return null;
  if (/Mobile|Android.*Mobile|iPhone|iPod/i.test(ua)) return 'mobile';
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) return 'tablet';
  return 'desktop';
}

// ============ POST: Technician accepts or rejects assignment ============

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
    await ensureTableSync('ComplaintTimeline');

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const userRole = payload.role as string;
    const { id } = await params;

    const body = await request.json();
    const { action: acceptAction, eta, rejectionReason } = body as {
      action: 'accept' | 'reject';
      eta?: string;
      rejectionReason?: string;
    };

    if (acceptAction !== 'accept' && acceptAction !== 'reject') {
      return NextResponse.json({ error: 'action must be "accept" or "reject"' }, { status: 400 });
    }

    // ─── RBAC: Only technicians can accept/reject assignments ───
    if (userRole !== 'technician') {
      logComplaintAccessDenied({
        userId, tenantId, role: userRole, complaintId: id, request,
        reason: `Role '${userRole}' cannot accept/reject complaint assignments`,
      });
      return NextResponse.json({ error: 'Only technicians can accept or reject assignments' }, { status: 403 });
    }

    // ─── RBAC: Verify complaint is in user's accessible scope ───
    const ctx = await buildAuthContext(payload as Parameters<typeof buildAuthContext>[0]);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get the complaint
    const complaint = await db.complaint.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        assignedTo: { select: { id: true, name: true, phone: true, email: true } },
        supervisor: { select: { id: true, name: true } },
      },
    });

    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    // Validate: complaint must be assigned to this user
    if (complaint.assignedToId !== userId) {
      return NextResponse.json({ error: 'This complaint is not assigned to you' }, { status: 403 });
    }

    // Validate: must be in PENDING_ACCEPTANCE or ASSIGNED status
    if (complaint.assignmentStatus !== 'PENDING_ACCEPTANCE' && complaint.status !== 'ASSIGNED') {
      return NextResponse.json({
        error: `Cannot ${acceptAction}: complaint is not pending acceptance (current: ${complaint.assignmentStatus})`,
      }, { status: 422 });
    }

    // SLA check (warning only, don't block after deadline)
    const slaExceeded = complaint.slaResponseDeadline && new Date() > new Date(complaint.slaResponseDeadline);

    if (acceptAction === 'reject') {
      if (!rejectionReason?.trim()) {
        return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
      }
    }

    // Execute in transaction
    const result = await db.$transaction(async (tx) => {
      if (acceptAction === 'accept') {
        // Update complaint
        const updated = await tx.complaint.update({
          where: { id: complaint.id },
          data: {
            assignmentStatus: 'ACCEPTED',
            status: 'ACCEPTED',
            acceptedAt: new Date(),
            eta: eta || null,
            rejectionReason: null,
          },
        });

        // Timeline
        await tx.complaintTimeline.create({
          data: {
            tenantId,
            complaintId: complaint.id,
            action: 'accepted',
            fromStatus: 'ASSIGNED',
            toStatus: 'ACCEPTED',
            description: `${complaint.assignedTo?.name || 'Technician'} accepted the assignment.${eta ? ` ETA: ${eta}` : ''}${slaExceeded ? ' (SLA exceeded)' : ''}`,
            performedBy: userId,
            performedByRole: userRole,
            metadata: JSON.stringify({
              technicianId: userId,
              technicianName: complaint.assignedTo?.name,
              eta: eta || null,
              slaExceeded,
              slaMinutes: slaExceeded && complaint.slaResponseDeadline
                ? Math.round((Date.now() - new Date(complaint.slaResponseDeadline).getTime()) / 60000)
                : null,
            }),
          },
        });

        // (Notification for accept handled after transaction via centralized service)

        // Audit log
        await tx.auditLog.create({
          data: {
            tenantId,
            userId,
            action: 'complaint.accept_assignment',
            entity: 'Complaint',
            entityId: complaint.id,
            oldValue: JSON.stringify({ assignmentStatus: complaint.assignmentStatus, status: complaint.status }),
            newValue: JSON.stringify({ assignmentStatus: 'ACCEPTED', status: 'ACCEPTED', eta: eta || null }),
            details: JSON.stringify({ slaExceeded, eta: eta || null }),
            ipAddress: request.headers.get('x-forwarded-for') || null,
            userAgent: request.headers.get('user-agent') || null,
            device: parseDevice(request.headers.get('user-agent') || undefined),
          },
        });

        // Auto-create Work Order
        const year = new Date().getFullYear();
        const count = await tx.workOrder.count({
          where: {
            tenantId,
            createdAt: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59, 999) },
          },
        });
        const woNumber = `WO-${year}-${String(count + 1).padStart(6, '0')}`;

        const workOrder = await tx.workOrder.create({
          data: {
            tenantId,
            complaintId: complaint.id,
            equipmentId: complaint.equipmentId,
            title: `${woNumber} — ${complaint.title}`,
            description: complaint.description,
            status: 'PENDING',
            priority: complaint.priority,
            type: 'corrective',
            category: complaint.category,
            assignedToId: complaint.assignedToId,
            supervisorId: complaint.supervisorId,
            createdBy: userId,
            scheduledDate: eta ? new Date(eta) : null,
          },
        });

        // Update complaint with work order reference and new status
        const finalUpdated = await tx.complaint.update({
          where: { id: complaint.id },
          data: {
            workOrderId: workOrder.id,
            status: 'WORK_ORDER_CREATED',
          },
        });

        // Timeline for WO creation
        await tx.complaintTimeline.create({
          data: {
            tenantId,
            complaintId: complaint.id,
            action: 'work_order_created',
            fromStatus: 'ACCEPTED',
            toStatus: 'WORK_ORDER_CREATED',
            description: `Work order ${woNumber} auto-created and assigned.`,
            performedBy: userId,
            performedByRole: userRole,
            metadata: JSON.stringify({ workOrderId: workOrder.id, workOrderNumber: woNumber }),
          },
        });

        return { complaint: finalUpdated, workOrder };
      } else {
        // REJECT
        const updated = await tx.complaint.update({
          where: { id: complaint.id },
          data: {
            assignmentStatus: 'REJECTED',
            status: 'NEW',
            assignedToId: null,
            supervisorId: complaint.supervisorId, // Keep supervisor
            rejectionReason: rejectionReason,
            eta: null,
            acceptedAt: null,
          },
        });

        // Timeline
        await tx.complaintTimeline.create({
          data: {
            tenantId,
            complaintId: complaint.id,
            action: 'rejected',
            fromStatus: 'ASSIGNED',
            toStatus: 'NEW',
            description: `${complaint.assignedTo?.name || 'Technician'} rejected the assignment. Reason: ${rejectionReason}${slaExceeded ? ' (SLA was already exceeded)' : ''}`,
            performedBy: userId,
            performedByRole: userRole,
            metadata: JSON.stringify({
              technicianId: userId,
              technicianName: complaint.assignedTo?.name,
              rejectionReason,
              slaExceeded,
            }),
          },
        });

        // (Notification for reject handled after transaction via centralized service)

        // Audit log
        await tx.auditLog.create({
          data: {
            tenantId,
            userId,
            action: 'complaint.reject_assignment',
            entity: 'Complaint',
            entityId: complaint.id,
            oldValue: JSON.stringify({ assignedToId: complaint.assignedToId, assignmentStatus: complaint.assignmentStatus, status: complaint.status }),
            newValue: JSON.stringify({ assignedToId: null, assignmentStatus: 'REJECTED', status: 'NEW' }),
            details: JSON.stringify({ rejectionReason, slaExceeded, previousTechnicianName: complaint.assignedTo?.name }),
            ipAddress: request.headers.get('x-forwarded-for') || null,
            userAgent: request.headers.get('user-agent') || null,
            device: parseDevice(request.headers.get('user-agent') || undefined),
          },
        });

        return { complaint: updated, workOrder: null };
      }
    });

    // Get updated timeline
    const timeline = await getComplaintTimeline(tenantId, complaint.id);

    // Send notifications via centralized service (non-blocking)
    try {
      if (acceptAction === 'accept') {
        await createNotification({
          tenantId,
          type: 'complaint_accepted',
          title: 'Technician Accepted Assignment',
          message: `${complaint.assignedTo?.name || 'Technician'} accepted complaint: ${complaint.title}${eta ? `. ETA: ${eta}` : ''}`,
          priority: 'normal',
          relatedEntityType: 'complaint',
          relatedEntityId: complaint.id,
          actionLabel: 'View Complaint',
          createdBy: userId,
          roles: ['admin', 'super_admin', 'supervisor', 'manager'],
          excludeUserIds: [userId],
          data: { complaintId: complaint.id, technicianName: complaint.assignedTo?.name, eta: eta || null },
        });
      } else {
        await createNotification({
          tenantId,
          type: 'complaint_rejected',
          title: 'Technician Rejected Assignment',
          message: `${complaint.assignedTo?.name || 'Technician'} rejected complaint "${complaint.title}". Needs reassignment. Reason: ${rejectionReason}`,
          priority: complaint.priority === 'critical' ? 'high' : 'normal',
          relatedEntityType: 'complaint',
          relatedEntityId: complaint.id,
          actionLabel: 'View Complaint',
          createdBy: userId,
          roles: ['admin', 'super_admin', 'supervisor', 'manager'],
          excludeUserIds: [userId],
          data: { complaintId: complaint.id, technicianName: complaint.assignedTo?.name, rejectionReason },
        });
      }
    } catch (notifErr) {
      console.error('Failed to send accept/reject notification:', notifErr);
    }

    const isAccept = acceptAction === 'accept';

    return NextResponse.json({
      success: true,
      message: isAccept
        ? 'Assignment accepted. Work order created.'
        : 'Assignment rejected. Complaint returned to pool for reassignment.',
      complaint: {
        id: result.complaint.id,
        status: result.complaint.status,
        assignmentStatus: result.complaint.assignmentStatus,
        assignedToId: result.complaint.assignedToId,
        acceptedAt: result.complaint.acceptedAt?.toISOString(),
        rejectionReason: result.complaint.rejectionReason,
        workOrderId: result.complaint.workOrderId,
        eta: result.complaint.eta,
      },
      workOrder: result.workOrder ? {
        id: result.workOrder.id,
        title: result.workOrder.title,
        status: result.workOrder.status,
      } : null,
      timeline,
    });
  } catch (error) {
    console.error('Accept/reject assignment error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}