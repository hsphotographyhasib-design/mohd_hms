import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { ensureTableSync } from '@/core/database/db-sync';
import {
  buildAuthContext,
  buildComplaintWhereClause,
  canAccessComplaint,
  canPerformComplaintAction,
  isFieldVisibleToRole,
  logComplaintAccessDenied,
  logComplaintAccessAllowed,
} from '@/core/permissions/rbac';
import type { Prisma } from '@prisma/client';
import { withErrorLogging } from '@/core/errors/with-error-logging';
export const dynamic = 'force-dynamic';

// ── Helper: redact sensitive fields for customer role ────────────────────────

function redactCustomerFields(complaint: Record<string, unknown>, role: string): Record<string, unknown> {
  if (role !== 'customer') return complaint;
  const redacted = { ...complaint };
  for (const field of ['rejectionReason', 'reworkReason', 'assignmentReason', 'reassignmentCount', 'slaResponseDeadline']) {
    if (field in redacted) {
      delete redacted[field];
    }
  }
  return redacted;
}

export const GET = withErrorLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureTableSync('Complaint');

    const { id } = await params;

    // ─── RBAC: Build auth context ───
    const ctx = await buildAuthContext(payload, { resolveCustomer: true });
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // ─── RBAC: Check access to this specific complaint ───
    const hasAccess = await canAccessComplaint(ctx, id);
    if (!hasAccess) {
      logComplaintAccessDenied({
        userId: ctx.userId,
        tenantId: ctx.tenantId,
        role: ctx.role,
        complaintId: id,
        request,
        reason: 'User does not have access to this complaint',
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build the RBAC-aware WHERE clause for the query
    const { where: rbacWhere } = await buildComplaintWhereClause(ctx);

    const complaint = await db.complaint.findFirst({
      where: { ...rbacWhere, id },
      include: {
        customer: { select: { name: true } },
        equipment: { select: { name: true } },
        assignedTo: { select: { name: true } },
        supervisor: { select: { name: true } },
        workOrders: {
          include: {
            assignedTo: { select: { name: true } },
            equipment: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    logComplaintAccessAllowed({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      role: ctx.role,
      complaintId: id,
      request,
      action: 'VIEW_DETAIL',
    });

    // Fallback: resolve customer/equipment name if relation returned null
    let customerName = complaint.customer?.name;
    let equipmentName = complaint.equipment?.name;
    if (!customerName && complaint.customerId) {
      const c = await db.customer.findUnique({ where: { id: complaint.customerId }, select: { name: true } });
      customerName = c?.name || null;
    }
    if (!customerName && complaint.customerSnapshot) {
      try { customerName = JSON.parse(complaint.customerSnapshot).name; } catch { /* ignore */ }
    }
    if (!equipmentName && complaint.equipmentId) {
      const e = await db.equipment.findUnique({ where: { id: complaint.equipmentId }, select: { name: true } });
      equipmentName = e?.name || null;
    }

    // Redact sensitive fields for customer role
    const responseData = redactCustomerFields({
      id: complaint.id,
      tenantId: complaint.tenantId,
      customerId: complaint.customerId,
      customerName,
      equipmentId: complaint.equipmentId,
      equipmentName,
      title: complaint.title,
      description: complaint.description,
      priority: complaint.priority,
      status: complaint.status,
      category: complaint.category,
      photos: complaint.photos,
      gpsLocation: complaint.gpsLocation,
      assignedToId: complaint.assignedToId,
      assignedToName: complaint.assignedTo?.name,
      supervisorId: complaint.supervisorId,
      supervisorName: complaint.supervisor?.name,
      resolutionNotes: complaint.resolutionNotes,
      customerRating: complaint.customerRating,
      customerFeedback: complaint.customerFeedback,
      resolvedAt: complaint.resolvedAt?.toISOString(),
      closedAt: complaint.closedAt?.toISOString(),
      createdAt: complaint.createdAt.toISOString(),
      updatedAt: complaint.updatedAt.toISOString(),
      workOrders: complaint.workOrders.map((wo) => ({
        id: wo.id,
        tenantId: wo.tenantId,
        title: wo.title,
        description: wo.description,
        status: wo.status,
        priority: wo.priority,
        type: wo.type,
        assignedToId: wo.assignedToId,
        assignedToName: wo.assignedTo?.name,
        equipmentName: wo.equipment?.name,
        totalCost: wo.totalCost,
        createdAt: wo.createdAt.toISOString(),
        updatedAt: wo.updatedAt.toISOString(),
      })),
    }, ctx.role);

    return NextResponse.json(responseData, { status: 200 });
}, { module: 'complaints' });

// ── PUT: Update Complaint (Admin / Technician) ───────────────────────────────

export const PUT = withErrorLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const role = (payload.role as string).toLowerCase();
    const { id } = await params;
    const body = await request.json();

    // ─── RBAC: Check mutation permission ───
    if (!canPerformComplaintAction(role, 'update_fields')) {
      logComplaintAccessDenied({
        userId,
        tenantId,
        role,
        complaintId: id,
        request,
        reason: `Role '${role}' cannot update complaints`,
      });
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // ─── RBAC: Verify ownership before update ───
    const ctx = await buildAuthContext(payload, { resolveCustomer: true });
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = await canAccessComplaint(ctx, id);
    if (!hasAccess) {
      logComplaintAccessDenied({
        userId: ctx.userId,
        tenantId: ctx.tenantId,
        role: ctx.role,
        complaintId: id,
        request,
        reason: 'Cannot update a complaint you do not have access to',
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Customer can only update: customerRating, customerFeedback
    if (role === 'customer') {
      const allowedCustomerFields = ['customerRating', 'customerFeedback'];
      const requestedFields = Object.keys(body);
      const disallowedFields = requestedFields.filter(f => !allowedCustomerFields.includes(f));
      if (disallowedFields.length > 0) {
        return NextResponse.json({
          error: 'Customers can only update rating and feedback',
          disallowedFields,
        }, { status: 403 });
      }
    }

    // Technician cannot reassign or change supervisor
    if (role === 'technician') {
      if (body.assignedToId !== undefined && body.assignedToId !== userId) {
        return NextResponse.json({ error: 'Technicians cannot reassign complaints' }, { status: 403 });
      }
      if (body.supervisorId !== undefined) {
        return NextResponse.json({ error: 'Technicians cannot change supervisors' }, { status: 403 });
      }
    }

    const { where: rbacWhere } = await buildComplaintWhereClause(ctx);

    const existing = await db.complaint.findFirst({ where: { ...rbacWhere, id } });
    if (!existing) return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });

    // Build update data with timestamp logic
    const updateData: Record<string, unknown> = {};

    // Validate customerRating and customerFeedback before building update data
    if (body.customerRating !== undefined) {
      const rating = Number(body.customerRating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Customer rating must be an integer between 1 and 5' }, { status: 400 });
      }
    }
    if (body.customerFeedback !== undefined) {
      if (typeof body.customerFeedback === 'string' && body.customerFeedback.trim().length > 1000) {
        return NextResponse.json({ error: 'Customer feedback must be 1000 characters or less' }, { status: 400 });
      }
    }

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.category !== undefined) updateData.category = body.category || null;
    if (body.photos !== undefined) updateData.photos = body.photos ? JSON.stringify(body.photos) : null;
    if (body.gpsLocation !== undefined) updateData.gpsLocation = body.gpsLocation ? JSON.stringify(body.gpsLocation) : null;
    if (body.resolutionNotes !== undefined) updateData.resolutionNotes = body.resolutionNotes || null;
    if (body.customerRating !== undefined) updateData.customerRating = body.customerRating || null;
    if (body.customerFeedback !== undefined) updateData.customerFeedback = body.customerFeedback || null;

    // Status transitions must go through /workflow endpoint to enforce the state machine.
    // The PUT endpoint only handles field updates (title, description, priority, etc.).
    if (body.status) {
      return NextResponse.json(
        { error: 'Use POST /api/complaints/[id]/workflow for status transitions' },
        { status: 422 }
      );
    }
    if (body.assignedToId !== undefined && !body.status) updateData.assignedToId = body.assignedToId || null;
    if (body.supervisorId !== undefined) updateData.supervisorId = body.supervisorId || null;

    const updated = await db.complaint.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { name: true } },
        equipment: { select: { name: true } },
        assignedTo: { select: { name: true } },
        supervisor: { select: { name: true } },
      },
    });

    logComplaintAccessAllowed({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      role: ctx.role,
      complaintId: id,
      request,
      action: 'UPDATE',
    });

    return NextResponse.json({
      id: updated.id,
      tenantId: updated.tenantId,
      customerId: updated.customerId,
      customerName: updated.customer?.name,
      equipmentId: updated.equipmentId,
      equipmentName: updated.equipment?.name,
      title: updated.title,
      description: updated.description,
      priority: updated.priority,
      status: updated.status,
      category: updated.category,
      assignedToId: updated.assignedToId,
      assignedToName: updated.assignedTo?.name,
      supervisorId: updated.supervisorId,
      supervisorName: updated.supervisor?.name,
      resolutionNotes: updated.resolutionNotes,
      customerRating: updated.customerRating,
      resolvedAt: updated.resolvedAt?.toISOString(),
      closedAt: updated.closedAt?.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
}, { module: 'complaints' });

export const DELETE = withErrorLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const role = (payload.role as string).toLowerCase();
    const { id } = await params;

    // ─── RBAC: Only super_admin and admin can delete ───
    if (!canPerformComplaintAction(role, 'delete')) {
      logComplaintAccessDenied({
        userId,
        tenantId,
        role,
        complaintId: id,
        request,
        reason: `Role '${role}' cannot delete complaints`,
      });
      return NextResponse.json({ error: 'Insufficient permissions to delete complaints' }, { status: 403 });
    }

    await ensureTableSync('Complaint');

    // ─── RBAC: Verify tenant access ───
    const ctx = await buildAuthContext(payload);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { where: rbacWhere } = await buildComplaintWhereClause(ctx);

    const existing = await db.complaint.findFirst({ where: { ...rbacWhere, id } });
    if (!existing) return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });

    await db.complaint.delete({ where: { id } });

    logComplaintAccessAllowed({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      role: ctx.role,
      complaintId: id,
      request,
      action: 'DELETE',
    });

    return NextResponse.json({ message: 'Complaint deleted successfully' });
}, { module: 'complaints' });