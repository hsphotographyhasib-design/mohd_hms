import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { sendNotification } from '../lib/notification.service.js';
import { cachedFetch } from '../cache/cache.service.js';
import { TTL } from '../cache/cache.constants.js';
import { workOrdersKey, invalidateWorkOrders, invalidateDashboard } from '../cache/cache.utils.js';

const router = Router();

// ─── GET / — List Work Orders ────────────────────────────────────────────────
router.route('/').get(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.userId as string;
    const role = (req.user!.role as string).toLowerCase();
    const page = parseInt(req.query.page as string || '1');
    const pageSize = parseInt(req.query.pageSize as string || '20');
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';
    const type = (req.query.type as string) || '';
    const skip = (page - 1) * pageSize;

    // Customers cannot access work orders
    if (role === 'customer') {
      res.json({ data: [], total: 0, page, pageSize, totalPages: 0 });
      return;
    }

    const where: Record<string, unknown> = { tenantId };

    // Technicians only see their own work orders
    if (role === 'technician') {
      where.assignedToId = userId;
    }

    // Supervisors see their supervised work orders
    if (role === 'supervisor') {
      where.supervisorId = userId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { workOrderNumber: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (type) where.type = type;

    const cacheKey = workOrdersKey('list', tenantId, userId, role, `p${page}:s${pageSize}:q${search}:st${status}:t${type}`);
    const data = await cachedFetch(cacheKey, tenantId, async () => {
      const [items, total] = await Promise.all([
        db.workOrder.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        }),
        db.workOrder.count({ where }),
      ]);

      const mapped = (items as any[]).map((wo: any) => ({
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
        scheduledDate: wo.scheduledDate?.toISOString?.() || null,
        startTime: wo.startTime,
        dueDate: wo.dueDate?.toISOString?.() || null,
        dueTime: wo.dueTime,
        building: wo.building,
        floor: wo.floor,
        siteId: wo.siteId,
        estimatedHours: wo.estimatedHours,
        startedAt: wo.startedAt?.toISOString?.() || null,
        completedAt: wo.completedAt?.toISOString?.() || null,
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
        createdAt: wo.createdAt?.toISOString?.() || wo.createdAt,
        updatedAt: wo.updatedAt?.toISOString?.() || wo.updatedAt,
        materials: (wo.materials || []).map((m: any) => ({
          id: m.id,
          workOrderId: m.workOrderId,
          inventoryItemId: m.inventoryItemId,
          itemName: m.inventoryItem?.name,
          quantity: m.quantity,
          unitCost: m.unitCost,
          totalCost: m.totalCost,
        })),
      }));

      return {
        data: mapped,
        total: total as number,
        page,
        pageSize,
        totalPages: Math.ceil((total as number) / pageSize),
      };
    }, TTL.workOrderList);

    res.json(data);
  } catch (error) {
    console.error('Work orders list error:', error);
    res.status(500).json({ error: 'Internal server error', debug: (error as any)?.message || String(error) });
  }
});

// ─── POST / — Create Work Order ──────────────────────────────────────────────
router.route('/').post(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.userId as string;
    const body = req.body;

    const {
      title, description, source, reference, customerId, equipmentId, assetId,
      priority, type, workType, category, subCategory, sla, estimatedHours,
      assignedToId, supervisorId, teamId, scheduledDate, startTime, dueDate,
      dueTime, siteId, building, floor, internalNotes, checklistId, notes,
      isDraft, permitRequired, lockoutTagout, lockoutTagoutRequired,
      highRiskWork, safetyEquipment, safetyEquipmentReq, safetyNotes,
      attachments, complaintId,
    } = body;

    if (!title?.trim()) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }
    if (!isDraft && !description?.trim()) {
      res.status(400).json({ error: 'Description is required for non-draft work orders' });
      return;
    }

    // Generate WO number
    const year = new Date().getFullYear();
    const prefix = `WO/HMS/${year}/`;
    const latestWo = await db.workOrder.findFirst({
      where: { tenantId, workOrderNumber: { startsWith: prefix } },
      orderBy: { workOrderNumber: 'desc' },
      select: { workOrderNumber: true },
    });
    let nextNum = 1;
    if ((latestWo as any)?.workOrderNumber) {
      const parts = (latestWo as any).workOrderNumber.split('/');
      const numStr = parts[parts.length - 1];
      const parsed = parseInt(numStr, 10);
      if (!isNaN(parsed)) nextNum = parsed + 1;
    }
    const workOrderNumber = `${prefix}${String(nextNum).padStart(6, '0')}`;

    // Map form values to DB format
    const priorityMap: Record<string, string> = {
      'Emergency': 'emergency', 'High': 'high', 'Medium': 'medium', 'Low': 'low',
    };
    const mappedPriority = priorityMap[priority] || priority?.toLowerCase() || 'medium';

    const typeMap: Record<string, string> = {
      'Corrective': 'corrective', 'Preventive': 'preventive', 'Emergency': 'emergency',
      'Inspection': 'inspection', 'Installation': 'installation', 'Breakdown': 'breakdown',
    };
    const mappedType = typeMap[workType || type] || type?.toLowerCase() || 'corrective';

    const sourceMap: Record<string, string> = {
      'Complaint': 'complaint', 'Preventive Maintenance': 'preventive',
      'Manual': 'manual', 'Quotation': 'quotation',
      'Service Request': 'service_request', 'Inspection Report': 'inspection_report',
    };
    const mappedSource = sourceMap[source] || source?.toLowerCase() || 'manual';

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
    } as any);

    const wo = workOrder as any;

    // Notify assigned technician + supervisors via centralized notification service
    if (!isDraft) {
      sendNotification({
        tenantId,
        userId: assignedToId || undefined,
        roles: assignedToId ? undefined : ['technician', 'supervisor'],
        excludeUserIds: [userId],
        type: 'assignment',
        title: 'Work Order Created',
        message: `Work order "${title.trim()}" (${workOrderNumber}) has been created.`,
        priority: mappedPriority === 'emergency' ? 'urgent' : mappedPriority === 'high' ? 'high' : 'normal',
        category: 'work_order',
        relatedEntityType: 'work_order',
        relatedEntityId: wo.id,
        actionUrl: `work-order-detail?id=${wo.id}`,
        actionLabel: 'View Work Order',
        createdBy: userId,
        sendPush: true,
      }).catch(() => {});
    }

    invalidateWorkOrders(tenantId).catch(() => {});
    invalidateDashboard(tenantId).catch(() => {});

    res.status(201).json({
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
      scheduledDate: wo.scheduledDate?.toISOString?.() || null,
      startTime: wo.startTime,
      dueDate: wo.dueDate?.toISOString?.() || null,
      dueTime: wo.dueTime,
      building: wo.building,
      floor: wo.floor,
      estimatedHours: wo.estimatedHours,
      isDraft: wo.isDraft,
      createdAt: wo.createdAt?.toISOString?.() || wo.createdAt,
      updatedAt: wo.updatedAt?.toISOString?.() || wo.updatedAt,
    });
  } catch (error) {
    console.error('Work order create error:', error);
    res.status(500).json({ error: 'Internal server error', debug: (error as any)?.message || String(error) });
  }
});

// ─── GET /next-number — Get next WO number ───────────────────────────────────
router.route('/next-number').get(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.userId as string;
    const role = (req.user!.role as string).toLowerCase();
    const year = new Date().getFullYear();
    const prefix = `WO/HMS/${year}/`;

    const cacheKey = workOrdersKey('next-number', tenantId, userId, role);
    const data = await cachedFetch(cacheKey, tenantId, async () => {
      const where: Record<string, unknown> = tenantId
        ? { tenantId, workOrderNumber: { startsWith: prefix } }
        : { workOrderNumber: { startsWith: prefix } };

      const latestWo = await db.workOrder.findFirst({
        where,
        orderBy: { workOrderNumber: 'desc' },
        select: { workOrderNumber: true },
      });

      let nextNum = 1;
      if ((latestWo as any)?.workOrderNumber) {
        const parts = (latestWo as any).workOrderNumber.split('/');
        const numStr = parts[parts.length - 1];
        const parsed = parseInt(numStr, 10);
        if (!isNaN(parsed)) nextNum = parsed + 1;
      }

      return { nextNumber: `${prefix}${String(nextNum).padStart(6, '0')}` };
    }, TTL.workOrderNextNumber);

    res.json(data);
  } catch (error) {
    console.error('Next WO number error:', error);
    const year = new Date().getFullYear();
    res.json({ nextNumber: `WO/HMS/${year}/000001` });
  }
});

export default router;