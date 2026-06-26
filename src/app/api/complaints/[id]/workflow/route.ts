import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, generateInvoiceNumber } from '@/lib/auth';
import {
  recordWorkflowTransition,
  getComplaintTimeline,
} from '@/lib/workflow/notification-engine';
import {
  validateTransition,
  getAvailableActions,
  type ComplaintStatus,
} from '@/lib/workflow/state-machine';

export const dynamic = 'force-dynamic';

// ── Action → Status Mapping ──────────────────────────────────────────────────

const ACTION_STATUS_MAP: Record<string, ComplaintStatus> = {
  assign: 'ASSIGNED',
  accept: 'ACCEPTED',
  reject: 'NEW',
  start: 'IN_PROGRESS',
  complete: 'WAITING_CLIENT_CONFIRMATION',
  client_confirm: 'CLIENT_CONFIRMED',
  client_reject: 'REWORK_REQUIRED',
  rework: 'IN_PROGRESS',
  approve_invoice: 'INVOICE_APPROVED',
  send_invoice: 'INVOICE_SENT',
  record_payment: 'PAID',
  close: 'CLOSED',
};

// ── Helper: generate work order number ───────────────────────────────────────

async function generateWorkOrderNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
  const count = await db.workOrder.count({
    where: {
      tenantId,
      createdAt: { gte: startOfYear, lte: endOfYear },
    },
  });
  return `WO-${year}-${String(count + 1).padStart(6, '0')}`;
}

// ── POST: Execute a workflow transition ──────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Auth check
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const userRole = (payload.role as string) || 'technician';
    const isAdminOverride =
      userRole === 'super_admin' || userRole === 'admin';
    const { id } = await params;

    // 2. Get complaint with tenant isolation
    const complaint = await db.complaint.findFirst({
      where: { id, tenantId },
      include: {
        workOrders: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!complaint) {
      return NextResponse.json(
        { error: 'Complaint not found' },
        { status: 404 }
      );
    }

    // 3. Parse body and determine target status
    const body = await request.json();
    const { action, targetStatus: overrideTargetStatus } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    if (!ACTION_STATUS_MAP[action] && action !== 'override') {
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
    }

    const targetStatus: ComplaintStatus =
      action === 'override'
        ? (overrideTargetStatus as ComplaintStatus)
        : ACTION_STATUS_MAP[action];

    if (!targetStatus) {
      return NextResponse.json(
        { error: 'targetStatus is required for override action' },
        { status: 400 }
      );
    }

    const currentStatus = complaint.status as ComplaintStatus;

    // 4. Validate transition
    const validation = validateTransition(
      currentStatus,
      targetStatus,
      userRole,
      isAdminOverride
    );

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message || 'Transition not allowed' },
        { status: 422 }
      );
    }

    // 5. Execute transition in a Prisma transaction
    const result = await db.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {
        status: targetStatus,
      };

      // ── Per-action field updates ──

      if (action === 'assign') {
        if (!body.assignedToId) {
          throw new Error('assignedToId is required for assign action');
        }
        updateData.assignedToId = body.assignedToId;
        updateData.supervisorId = body.supervisorId || null;
        updateData.rejectionReason = null;
      }

      if (action === 'accept') {
        updateData.acceptedAt = new Date();
        updateData.eta = body.eta || null;

        // Auto-create WorkOrder
        const woNumber = await generateWorkOrderNumber(tenantId);
        const workOrder = await tx.workOrder.create({
          data: {
            tenantId,
            complaintId: complaint.id,
            equipmentId: complaint.equipmentId,
            title: `WO for ${complaint.title}`,
            description: complaint.description,
            status: 'PENDING',
            priority: complaint.priority,
            type: 'corrective',
            assignedToId: complaint.assignedToId,
            createdBy: userId,
          },
        });

        // Patch the woNumber via a second update (can't set the generated field in create)
        // Actually WorkOrder doesn't have a number field — use title prefix
        await tx.workOrder.update({
          where: { id: workOrder.id },
          data: { title: `${woNumber} — ${complaint.title}` },
        });

        updateData.workOrderId = workOrder.id;
      }

      if (action === 'reject') {
        updateData.assignedToId = null;
        updateData.supervisorId = null;
        updateData.rejectionReason = body.rejectionReason || null;
        updateData.eta = null;
        updateData.acceptedAt = null;
        updateData.startedAt = null;
      }

      if (action === 'start') {
        if (!complaint.startedAt) {
          updateData.startedAt = new Date();
        }
      }

      if (action === 'rework') {
        updateData.reworkReason = body.reworkReason || null;
        if (!complaint.startedAt) {
          updateData.startedAt = new Date();
        }
      }

      if (action === 'complete') {
        updateData.completedAt = new Date();

        // Update the linked WorkOrder
        const woId =
          body.workOrderId || complaint.workOrders[0]?.id;
        if (woId) {
          const laborCost = body.laborCost ?? 0;
          const materialCost = body.materialCost ?? 0;
          await tx.workOrder.update({
            where: { id: woId },
            data: {
              status: 'COMPLETED',
              isLocked: true,
              completedAt: new Date(),
              laborHours: body.laborHours ?? null,
              laborCost,
              materialCost,
              totalCost: laborCost + materialCost,
              checklistData: body.checklistData
                ? JSON.stringify(body.checklistData)
                : null,
              beforePhotos: body.beforePhotos
                ? JSON.stringify(body.beforePhotos)
                : null,
              afterPhotos: body.afterPhotos
                ? JSON.stringify(body.afterPhotos)
                : null,
              materialsUsed: body.materialsUsed
                ? JSON.stringify(body.materialsUsed)
                : null,
              videoUrl: body.videoUrl || null,
              remarks: body.remarks || null,
              technicianSignature: body.technicianSignature || null,
            },
          });
        }
      }

      if (action === 'client_confirm') {
        updateData.clientConfirmedAt = new Date();

        // Auto-create a Draft Invoice from the WorkOrder costs
        const workOrder = complaint.workOrders[0];
        if (workOrder) {
          const laborCost = workOrder.laborCost ?? 0;
          const materialCost = workOrder.materialCost ?? 0;
          const subtotal = laborCost + materialCost;
          const invoiceNumber = generateInvoiceNumber();

          const items = [];
          if (laborCost > 0) {
            items.push({
              description: 'Labor',
              quantity: workOrder.laborHours ?? 1,
              unitPrice: workOrder.laborHours
                ? laborCost / workOrder.laborHours
                : laborCost,
              total: laborCost,
            });
          }
          if (materialCost > 0) {
            items.push({
              description: 'Materials',
              quantity: 1,
              unitPrice: materialCost,
              total: materialCost,
            });
          }

          const invoice = await tx.invoice.create({
            data: {
              tenantId,
              customerId: complaint.customerId,
              workOrderId: workOrder.id,
              invoiceNumber,
              title: `Invoice for ${complaint.title}`,
              description: `Service completion for complaint: ${complaint.title}`,
              items: JSON.stringify(items),
              subtotal,
              tax: 0,
              discount: 0,
              total: subtotal,
              status: 'DRAFT',
              dueDate: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000
              ), // 30 days from now
              createdBy: userId,
            },
          });

          updateData.invoiceId = invoice.id;
        }
      }

      if (action === 'client_reject') {
        updateData.reworkReason = body.reworkReason || null;
      }

      if (action === 'approve_invoice') {
        if (complaint.invoiceId) {
          await tx.invoice.update({
            where: { id: complaint.invoiceId },
            data: { status: 'APPROVED' },
          });
        }
      }

      if (action === 'send_invoice') {
        if (complaint.invoiceId) {
          await tx.invoice.update({
            where: { id: complaint.invoiceId },
            data: {
              status: 'PENDING',
              sentVia: body.sentVia || 'portal',
            },
          });
        }
      }

      if (action === 'record_payment') {
        if (complaint.invoiceId) {
          await tx.invoice.update({
            where: { id: complaint.invoiceId },
            data: {
              status: 'PAID',
              paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
              paymentMethod: body.paymentMethod || null,
              paymentRef: body.paymentRef || null,
            },
          });
        }
      }

      if (action === 'close') {
        updateData.closedAt = new Date();
        updateData.resolvedAt = complaint.resolvedAt || new Date();
      }

      if (action === 'override') {
        updateData.resolutionNotes = body.notes || complaint.resolutionNotes;
        if (targetStatus === 'CLOSED') {
          updateData.closedAt = new Date();
          updateData.resolvedAt = complaint.resolvedAt || new Date();
        }
      }

      // Apply the complaint update
      const updatedComplaint = await tx.complaint.update({
        where: { id: complaint.id },
        data: updateData,
      });

      // Record timeline entry + notifications + audit
      await recordWorkflowTransition(
        tx,
        {
          complaintId: complaint.id,
          tenantId,
          fromStatus: currentStatus,
          toStatus: targetStatus,
          action,
          performedBy: userId,
          performedByRole: userRole,
          metadata: {
            assignedToId: body.assignedToId,
            supervisorId: body.supervisorId,
            eta: body.eta,
            rejectionReason: body.rejectionReason,
            reworkReason: body.reworkReason,
            laborCost: body.laborCost,
            materialCost: body.materialCost,
            notes: body.notes,
            workOrderId: updateData.workOrderId,
            invoiceId: updateData.invoiceId,
          },
        }
      );

      return updatedComplaint;
    });

    // 6. Return updated complaint with timeline
    const timeline = await getComplaintTimeline(tenantId, complaint.id);

    return NextResponse.json({
      complaint: {
        id: result.id,
        status: result.status,
        assignedToId: result.assignedToId,
        supervisorId: result.supervisorId,
        workOrderId: result.workOrderId,
        invoiceId: result.invoiceId,
        eta: result.eta,
        rejectionReason: result.rejectionReason,
        reworkReason: result.reworkReason,
        acceptedAt: result.acceptedAt?.toISOString(),
        startedAt: result.startedAt?.toISOString(),
        completedAt: result.completedAt?.toISOString(),
        clientConfirmedAt: result.clientConfirmedAt?.toISOString(),
        resolvedAt: result.resolvedAt?.toISOString(),
        closedAt: result.closedAt?.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      },
      timeline,
    });
  } catch (error) {
    console.error('Workflow transition error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── GET: Retrieve workflow state and available actions ───────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = payload.tenantId as string;
    const userRole = (payload.role as string) || 'technician';
    const isAdminOverride =
      userRole === 'super_admin' || userRole === 'admin';
    const { id } = await params;

    // Get complaint with tenant isolation
    const complaint = await db.complaint.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        assignedTo: {
          select: { id: true, name: true, role: true },
        },
        supervisor: {
          select: { id: true, name: true, role: true },
        },
        workOrders: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!complaint) {
      return NextResponse.json(
        { error: 'Complaint not found' },
        { status: 404 }
      );
    }

    const currentStatus = complaint.status as ComplaintStatus;
    const availableActions = getAvailableActions(
      currentStatus,
      userRole,
      isAdminOverride
    );

    const timeline = await getComplaintTimeline(tenantId, complaint.id);

    return NextResponse.json({
      complaint: {
        id: complaint.id,
        status: complaint.status,
        priority: complaint.priority,
        category: complaint.category,
        title: complaint.title,
        source: complaint.source,
        assignedToId: complaint.assignedToId,
        assignedToName: complaint.assignedTo?.name,
        supervisorId: complaint.supervisorId,
        supervisorName: complaint.supervisor?.name,
        workOrders: complaint.workOrders.map(wo => ({
          id: wo.id,
          status: wo.status,
          type: wo.type,
          assignedToName: wo.assignedTo?.name || null,
          laborHours: wo.laborHours,
          totalCost: wo.totalCost,
          notes: wo.notes,
        })),
        workOrderId: complaint.workOrders[0]?.id ?? null,
        invoiceId: complaint.invoiceId,
        eta: complaint.eta,
        rejectionReason: complaint.rejectionReason,
        reworkReason: complaint.reworkReason,
        acceptedAt: complaint.acceptedAt?.toISOString(),
        startedAt: complaint.startedAt?.toISOString(),
        completedAt: complaint.completedAt?.toISOString(),
        clientConfirmedAt: complaint.clientConfirmedAt?.toISOString(),
        resolvedAt: complaint.resolvedAt?.toISOString(),
        closedAt: complaint.closedAt?.toISOString(),
        createdAt: complaint.createdAt.toISOString(),
        updatedAt: complaint.updatedAt.toISOString(),
      },
      availableActions,
      timeline,
    });
  } catch (error) {
    console.error('Workflow GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}