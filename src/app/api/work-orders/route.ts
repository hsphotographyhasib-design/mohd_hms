import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { buildAuthContext, resolveDepartmentTechnicianIds } from '@/core/permissions/rbac';
import { notifyWorkOrderCreated, createNotification } from '@/modules/notifications/services/notification-service';
import type { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

// ─── WO Number Generator: WO/HMS/2026/000001 ─────────────────────────
async function generateWorkOrderNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `WO/HMS/${year}/`;

  // Find the highest existing WO number for this year
  const latestWo = await db.workOrder.findFirst({
    where: {
      tenantId,
      workOrderNumber: { startsWith: prefix },
    },
    orderBy: { workOrderNumber: 'desc' },
    select: { workOrderNumber: true },
  });

  let nextNum = 1;
  if (latestWo?.workOrderNumber) {
    const parts = latestWo.workOrderNumber.split('/');
    const numStr = parts[parts.length - 1];
    const parsed = parseInt(numStr, 10);
    if (!isNaN(parsed)) nextNum = parsed + 1;
  }

  return `${prefix}${String(nextNum).padStart(6, '0')}`;
}

// ─── Create Audit Log ─────────────────────────────────────────────────
async function createAuditLog(
  tenantId: string,
  userId: string,
  entityId: string,
  action: string,
  details: Record<string, unknown>,
  request: NextRequest,
) {
  try {
    await db.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        entity: 'WorkOrder',
        entityId,
        newValue: JSON.stringify(details),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
        device: null,
      },
    });
  } catch {
    // Audit log failure should not block WO creation
  }
}

// ─── GET: List Work Orders ────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await buildAuthContext(payload, { resolveCustomer: true });
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { role, userId: uid, departmentId, customerId: custId } = ctx;
    const tenantId = ctx.tenantId;
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const search = request.nextUrl.searchParams.get('search') || '';
    const status = request.nextUrl.searchParams.get('status') || '';
    const type = request.nextUrl.searchParams.get('type') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.WorkOrderWhereInput = { tenantId };

    // ─── RBAC: Role-based scoping ───
    if (role === 'technician') {
      where.assignedToId = uid;
    } else if (role === 'supervisor') {
      // See work orders supervised by self OR assigned to department technicians
      const deptTechIds = departmentId
        ? await resolveDepartmentTechnicianIds(tenantId, departmentId)
        : [];
      where.OR = [
        { complaint: { supervisorId: uid } },
        { assignedToId: { in: deptTechIds } },
      ];
    } else if (role === 'customer') {
      // Customers can see work orders linked to their complaints
      where.complaint = { customerId: custId };
      if (!custId) {
        return NextResponse.json({ data: [], total: 0, page, pageSize, totalPages: 0 });
      }
    } else if (role === 'hr' || role === 'finance' || role === 'vendor' || role === 'guest') {
      return NextResponse.json({ data: [], total: 0, page, pageSize, totalPages: 0 });
    }
    // super_admin, admin, manager: full tenant access (no additional filter)
    if (search) {
      const searchOr: Prisma.WorkOrderWhereInput[] = [
        { title: { contains: search } },
        { description: { contains: search } },
        { workOrderNumber: { contains: search } },
      ];
      // If RBAC already set OR (e.g. supervisor), wrap both under AND
      if (where.OR && !Array.isArray(where.AND)) {
        where.AND = [
          { OR: where.OR },
          { OR: searchOr },
        ];
        delete (where as Record<string, unknown>).OR;
      } else {
        where.OR = searchOr;
      }
    }
    if (status) where.status = status;
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      db.workOrder.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: { select: { name: true, avatar: true } },
          supervisor: { select: { name: true } },
          equipment: { select: { name: true, assetNumber: true, category: true } },
          creator: { select: { name: true } },
          customer: { select: { name: true, companyName: true } },
          materials: {
            include: { inventoryItem: { select: { name: true } } },
          },
        },
      }),
      db.workOrder.count({ where }),
    ]);

    const data = items.map((wo) => ({
      id: wo.id,
      tenantId: wo.tenantId,
      workOrderNumber: wo.workOrderNumber,
      complaintId: wo.complaintId,
      customerId: wo.customerId,
      customerName: wo.customer?.companyName || wo.customer?.name,
      equipmentId: wo.equipmentId,
      equipmentName: wo.equipment?.name,
      equipmentAsset: wo.equipment?.assetNumber,
      title: wo.title,
      description: wo.description,
      source: wo.source,
      reference: wo.reference,
      status: wo.status,
      priority: wo.priority,
      type: wo.type,
      category: wo.category,
      subCategory: wo.subCategory,
      assignedToId: wo.assignedToId,
      assignedToName: wo.assignedTo?.name,
      supervisorId: wo.supervisorId,
      supervisorName: wo.supervisor?.name,
      createdBy: wo.createdBy,
      creatorName: wo.creator?.name,
      scheduledDate: wo.scheduledDate?.toISOString(),
      startTime: wo.startTime,
      dueDate: wo.dueDate?.toISOString(),
      dueTime: wo.dueTime,
      building: wo.building,
      floor: wo.floor,
      siteId: wo.siteId,
      estimatedHours: wo.estimatedHours,
      startedAt: wo.startedAt?.toISOString(),
      completedAt: wo.completedAt?.toISOString(),
      laborHours: wo.laborHours,
      laborCost: wo.laborCost,
      materialCost: wo.materialCost,
      totalCost: wo.totalCost,
      notes: wo.notes,
      internalNotes: wo.internalNotes,
      photos: wo.photos,
      checklistData: wo.checklistData,
      checklistId: wo.checklistId,
      technicianSignature: wo.technicianSignature,
      customerSignature: wo.customerSignature,
      isDraft: wo.isDraft,
      permitRequired: wo.permitRequired,
      lockoutTagoutRequired: wo.lockoutTagoutRequired,
      highRiskWork: wo.highRiskWork,
      safetyEquipmentReq: wo.safetyEquipmentReq,
      safetyNotes: wo.safetyNotes,
      attachments: wo.attachments,
      createdAt: wo.createdAt.toISOString(),
      updatedAt: wo.updatedAt.toISOString(),
      materials: wo.materials.map((m) => ({
        id: m.id,
        workOrderId: m.workOrderId,
        inventoryItemId: m.inventoryItemId,
        itemName: m.inventoryItem.name,
        quantity: m.quantity,
        unitCost: m.unitCost,
        totalCost: m.totalCost,
      })),
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Work orders list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Create Work Order ──────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const body = await request.json();

    const {
      title,
      description,
      source,
      reference,
      customerId,
      equipmentId,
      assetId,
      priority,
      type,
      workType,
      category,
      subCategory,
      sla,
      estimatedHours,
      assignedToId,
      supervisorId,
      teamId,
      scheduledDate,
      startTime,
      dueDate,
      dueTime,
      siteId,
      building,
      floor,
      internalNotes,
      checklistId,
      notes,
      isDraft,
      permitRequired,
      lockoutTagout,
      lockoutTagoutRequired,
      highRiskWork,
      safetyEquipment,
      safetyEquipmentReq,
      safetyNotes,
      attachments,
      complaintId,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!isDraft && !description?.trim()) {
      return NextResponse.json({ error: 'Description is required for non-draft work orders' }, { status: 400 });
    }

    // Generate WO number (only for non-draft or first draft)
    const workOrderNumber = await generateWorkOrderNumber(tenantId);

    // Map form priority to lowercase DB format
    const priorityMap: Record<string, string> = {
      'Emergency': 'emergency',
      'High': 'high',
      'Medium': 'medium',
      'Low': 'low',
    };
    const mappedPriority = priorityMap[priority] || priority?.toLowerCase() || 'medium';

    // Map form type to lowercase DB format
    const typeMap: Record<string, string> = {
      'Corrective': 'corrective',
      'Preventive': 'preventive',
      'Emergency': 'emergency',
      'Inspection': 'inspection',
      'Installation': 'installation',
      'Breakdown': 'breakdown',
    };
    const mappedType = typeMap[workType || type] || type?.toLowerCase() || 'corrective';

    // Map source to DB format
    const sourceMap: Record<string, string> = {
      'Complaint': 'complaint',
      'Preventive Maintenance': 'preventive',
      'Manual': 'manual',
      'Quotation': 'quotation',
      'Service Request': 'service_request',
      'Inspection Report': 'inspection_report',
    };
    const mappedSource = sourceMap[source] || source?.toLowerCase() || 'manual';

    // Build attachments JSON
    let attachmentsJson: string | null = null;
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      attachmentsJson = JSON.stringify(attachments);
    }

    const workOrder = await db.workOrder.create({
      data: {
        tenantId,
        workOrderNumber,
        complaintId: complaintId || null,
        customerId: customerId || null,
        equipmentId: equipmentId || null,
        assetId: assetId || null,
        title: title.trim(),
        description: description?.trim() || '',
        source: mappedSource,
        reference: reference || null,
        status: isDraft ? 'DRAFT' : 'PENDING',
        priority: mappedPriority,
        type: mappedType,
        category: category || null,
        subCategory: subCategory || null,
        sla: sla || null,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        assignedToId: assignedToId || null,
        supervisorId: supervisorId || null,
        teamId: teamId || null,
        createdBy: userId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        startTime: startTime || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        dueTime: dueTime || null,
        siteId: siteId || null,
        building: building || null,
        floor: floor || null,
        internalNotes: internalNotes || null,
        checklistId: checklistId || null,
        notes: notes || null,
        isDraft: !!isDraft,
        permitRequired: !!permitRequired,
        lockoutTagoutRequired: !!(lockoutTagout || lockoutTagoutRequired),
        highRiskWork: !!highRiskWork,
        safetyEquipmentReq: !!(safetyEquipment || safetyEquipmentReq),
        safetyNotes: safetyNotes || null,
        attachments: attachmentsJson,
      },
      include: {
        assignedTo: { select: { name: true, avatar: true } },
        supervisor: { select: { name: true } },
        equipment: { select: { name: true, assetNumber: true, category: true } },
        creator: { select: { name: true } },
        customer: { select: { name: true, companyName: true, phone: true, address: true } },
      },
    });

    // Fire and forget: notifications + audit log
    if (!isDraft) {
      // Notify assigned technician via centralized service
      if (assignedToId) {
        notifyWorkOrderCreated(
          workOrder.id,
          tenantId,
          assignedToId,
          workOrder.title,
          userId,
        ).catch(() => {});
      }

      // Notify supervisor via centralized service
      if (supervisorId && supervisorId !== assignedToId && supervisorId !== userId) {
        createNotification({
          tenantId,
          userId: supervisorId,
          type: 'work_order_supervised',
          title: 'Work Order to Supervise',
          message: `Work order ${workOrderNumber} has been created: "${title}" with ${mappedPriority} priority`,
          priority: 'normal',
          relatedEntityType: 'work_order',
          relatedEntityId: workOrder.id,
          actionLabel: 'View Work Order',
          createdBy: userId,
          data: { workOrderId: workOrder.id, workOrderNumber },
        }).catch(() => {});
      }

      // Audit log (non-blocking)
      createAuditLog(tenantId, userId, workOrder.id, 'work_order_created', {
        workOrderNumber,
        title,
        priority: mappedPriority,
        type: mappedType,
        source: mappedSource,
        assignedToId: assignedToId || null,
        customerId: customerId || null,
        equipmentId: equipmentId || null,
        status: 'PENDING',
      }, request).catch(() => {});
    }

    return NextResponse.json({
      id: workOrder.id,
      tenantId: workOrder.tenantId,
      workOrderNumber: workOrder.workOrderNumber,
      complaintId: workOrder.complaintId,
      customerId: workOrder.customerId,
      customerName: workOrder.customer?.companyName || workOrder.customer?.name,
      equipmentId: workOrder.equipmentId,
      equipmentName: workOrder.equipment?.name,
      equipmentAsset: workOrder.equipment?.assetNumber,
      title: workOrder.title,
      description: workOrder.description,
      source: workOrder.source,
      reference: workOrder.reference,
      status: workOrder.status,
      priority: workOrder.priority,
      type: workOrder.type,
      category: workOrder.category,
      subCategory: workOrder.subCategory,
      assignedToId: workOrder.assignedToId,
      assignedToName: workOrder.assignedTo?.name,
      supervisorId: workOrder.supervisorId,
      supervisorName: workOrder.supervisor?.name,
      createdBy: workOrder.createdBy,
      creatorName: workOrder.creator?.name,
      scheduledDate: workOrder.scheduledDate?.toISOString(),
      startTime: workOrder.startTime,
      dueDate: workOrder.dueDate?.toISOString(),
      dueTime: workOrder.dueTime,
      building: workOrder.building,
      floor: workOrder.floor,
      estimatedHours: workOrder.estimatedHours,
      isDraft: workOrder.isDraft,
      createdAt: workOrder.createdAt.toISOString(),
      updatedAt: workOrder.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Work order create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}