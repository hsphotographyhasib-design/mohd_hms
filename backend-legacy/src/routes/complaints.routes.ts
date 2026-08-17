import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { sendNotification } from '../lib/notification.service.js';
import { cachedFetch } from '../cache/cache.service.js';
import { TTL } from '../cache/cache.constants.js';
import { complaintsKey, invalidateComplaints, invalidateDashboard } from '../cache/cache.utils.js';

const router = Router();

// ─── GET / — List complaints ─────────────────────────────────────────────────
router.route('/').get(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const role = (req.user!.role as string).toLowerCase();
    const page = parseInt(req.query.page as string || '1');
    const pageSize = parseInt(req.query.pageSize as string || '20');
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';
    const priority = (req.query.priority as string) || '';
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { tenantId };

    // RBAC: customers see only their own complaints
    if (role === 'customer') {
      // Find the linked customer for this user
      const user = await db.user.findUnique({
        where: { id: req.user!.userId as string },
        select: { id: true, email: true, phone: true },
      });
      if (user) {
        const linkedCustomer = await db.customer.findFirst({
          where: {
            tenantId,
            OR: [
              ...(user.email ? [{ email: user.email }] : []),
              ...(user.phone ? [{ phone: user.phone }] : []),
            ],
          },
          select: { id: true },
        });
        if (linkedCustomer) {
          where.customerId = linkedCustomer.id;
        }
      }
    } else if (role === 'technician') {
      where.assignedToId = req.user!.userId;
    }

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const userId = req.user!.userId as string;
    const cacheKey = complaintsKey('list', tenantId, userId, role, `p${page}:s${pageSize}:q${search}:st${status}:pr${priority}`);
    const data = await cachedFetch(cacheKey, tenantId, async () => {
      const [items, total] = await Promise.all([
        db.complaint.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        }),
        db.complaint.count({ where }),
      ]);

      const mapped = (items as any[]).map((c: any) => ({
        id: c.id,
        tenantId: c.tenantId,
        customerId: c.customerId,
        customerName: c.customer?.name,
        equipmentId: c.equipmentId,
        equipmentName: c.equipment?.name,
        title: c.title,
        description: c.description,
        priority: c.priority,
        status: c.status,
        category: c.category,
        photos: c.photos,
        assignedToId: c.assignedToId,
        assignedToName: c.assignedTo?.name,
        supervisorId: c.supervisorId,
        supervisorName: c.supervisor?.name,
        resolutionNotes: c.resolutionNotes,
        customerRating: c.customerRating,
        customerFeedback: c.customerFeedback,
        resolvedAt: c.resolvedAt?.toISOString?.() || null,
        closedAt: c.closedAt?.toISOString?.() || null,
        createdAt: c.createdAt?.toISOString?.() || c.createdAt,
        updatedAt: c.updatedAt?.toISOString?.() || c.updatedAt,
      }));

      return {
        data: mapped,
        total: total as number,
        page,
        pageSize,
        totalPages: Math.ceil((total as number) / pageSize),
      };
    }, TTL.complaintList);

    res.json(data);
  } catch (error) {
    console.error('Complaints list error:', error);
    res.status(500).json({ error: 'Internal server error', debug: (error as any)?.message || String(error) });
  }
});

// ─── POST / — Create complaint ───────────────────────────────────────────────
router.route('/').post(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.userId as string;
    const role = (req.user!.role as string).toLowerCase();

    const {
      customerId, equipmentId, title, description, priority, category,
      photos, gpsLocation, assignedToId, supervisorId, source,
      customerSnapshot, locationInfo,
    } = req.body;

    if (!title?.trim()) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }
    if (!description?.trim()) {
      res.status(400).json({ error: 'Description is required' });
      return;
    }
    if (!customerId) {
      res.status(400).json({ error: 'Customer is required' });
      return;
    }

    // Customer-role users can only create complaints for themselves
    if (role === 'customer') {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, phone: true },
      });
      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      const linkedCustomer = await db.customer.findFirst({
        where: {
          tenantId,
          id: customerId,
          OR: [
            ...(user.email ? [{ email: user.email }] : []),
            ...(user.phone ? [{ phone: user.phone }] : []),
          ],
        },
        select: { id: true },
      });
      if (!linkedCustomer) {
        res.status(403).json({ error: 'You can only create complaints for your own account' });
        return;
      }
    }

    // Technician cannot pre-assign or pre-supervise
    if (role === 'technician') {
      if (assignedToId && assignedToId !== userId) {
        res.status(403).json({ error: 'Technicians cannot assign complaints to others' });
        return;
      }
    }

    // Generate complaint number
    const now = new Date();
    const year = now.getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const countThisYear = await db.complaint.count({
      where: { tenantId, createdAt: { gte: yearStart, lt: yearEnd } },
    });
    const complaintNumber = `CMP/${year}/${String(countThisYear + 1).padStart(6, '0')}`;

    const createData: Record<string, unknown> = {
      tenantId,
      customerId,
      equipmentId: equipmentId || null,
      title: title.trim(),
      description: description.trim(),
      priority: priority || 'medium',
      status: 'NEW',
      source: source || 'admin',
      category: category || null,
      photos: photos ? JSON.stringify(photos) : null,
      gpsLocation: gpsLocation ? JSON.stringify(gpsLocation) : null,
      assignedToId: role === 'technician' ? userId : (assignedToId || null),
      supervisorId: supervisorId || null,
    };

    if (customerSnapshot) createData.customerSnapshot = JSON.stringify(customerSnapshot);
    if (locationInfo) createData.locationInfo = JSON.stringify(locationInfo);

    const complaint = await db.complaint.create({
      data: createData,
    } as any);

    // Notify admins + supervisor + technician via centralized notification service
    const complaintId = (complaint as any).id;
    const complaintTitle = (complaint as any).title as string;
    const assignedTo = (complaint as any).assignedToId as string | null;
    const supervisor = (complaint as any).supervisorId as string | null;

    sendNotification({
      tenantId,
      roles: ['super_admin', 'admin', 'manager', 'supervisor'],
      excludeUserIds: [userId],
      type: 'info',
      title: 'New Complaint Created',
      message: `A new complaint "${complaintTitle}" has been created.`,
      priority: 'normal',
      category: 'complaint',
      relatedEntityType: 'complaint',
      relatedEntityId: complaintId,
      actionUrl: `complaint-detail?id=${complaintId}`,
      actionLabel: 'View Complaint',
      createdBy: userId,
      sendPush: true,
    }).catch(() => {});

    // Notify assigned technician
    if (assignedTo && assignedTo !== userId) {
      sendNotification({
        tenantId,
        userId: assignedTo,
        type: 'assignment',
        title: 'Complaint Assigned to You',
        message: `You have been assigned complaint "${complaintTitle}".`,
        priority: 'high',
        category: 'complaint',
        relatedEntityType: 'complaint',
        relatedEntityId: complaintId,
        actionUrl: `complaint-detail?id=${complaintId}`,
        actionLabel: 'View Complaint',
        createdBy: userId,
        sendPush: true,
      }).catch(() => {});
    }

    invalidateComplaints(tenantId).catch(() => {});
    invalidateDashboard(tenantId).catch(() => {});

    res.status(201).json({
      id: (complaint as any).id,
      complaintNumber,
      tenantId: (complaint as any).tenantId,
      customerId: (complaint as any).customerId,
      customerName: (complaint as any).customer?.name,
      equipmentId: (complaint as any).equipmentId,
      equipmentName: (complaint as any).equipment?.name,
      title: (complaint as any).title,
      description: (complaint as any).description,
      priority: (complaint as any).priority,
      status: (complaint as any).status,
      category: (complaint as any).category,
      assignedToId: (complaint as any).assignedToId,
      assignedToName: (complaint as any).assignedTo?.name,
      supervisorId: (complaint as any).supervisorId,
      supervisorName: (complaint as any).supervisor?.name,
      createdAt: (complaint as any).createdAt?.toISOString?.() || (complaint as any).createdAt,
      updatedAt: (complaint as any).updatedAt?.toISOString?.() || (complaint as any).updatedAt,
    });
  } catch (error) {
    console.error('Complaint create error:', error);
    res.status(500).json({ error: 'Internal server error', debug: (error as any)?.message || String(error) });
  }
});

// ─── GET /:id — Get single complaint ─────────────────────────────────────────
router.route('/:id').get(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const role = (req.user!.role as string).toLowerCase();
    const { id } = req.params;

    const userId = req.user!.userId as string;
    const cacheKey = complaintsKey('detail', tenantId, userId, role, id as string);
    const data = await cachedFetch(cacheKey, tenantId, async () => {
      const complaint = await db.complaint.findFirst({
        where: { tenantId, id },
      });

      if (!complaint) return null;

      const c = complaint as any;
      return {
        id: c.id,
        tenantId: c.tenantId,
        customerId: c.customerId,
        customerName: c.customer?.name,
        equipmentId: c.equipmentId,
        equipmentName: c.equipment?.name,
        title: c.title,
        description: c.description,
        priority: c.priority,
        status: c.status,
        category: c.category,
        photos: c.photos,
        gpsLocation: c.gpsLocation,
        assignedToId: c.assignedToId,
        assignedToName: c.assignedTo?.name,
        supervisorId: c.supervisorId,
        supervisorName: c.supervisor?.name,
        resolutionNotes: c.resolutionNotes,
        customerRating: c.customerRating,
        customerFeedback: c.customerFeedback,
        resolvedAt: c.resolvedAt?.toISOString?.() || null,
        closedAt: c.closedAt?.toISOString?.() || null,
        createdAt: c.createdAt?.toISOString?.() || c.createdAt,
        updatedAt: c.updatedAt?.toISOString?.() || c.updatedAt,
        workOrders: (c.workOrders || []).map((wo: any) => ({
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
          createdAt: wo.createdAt?.toISOString?.() || wo.createdAt,
          updatedAt: wo.updatedAt?.toISOString?.() || wo.updatedAt,
        })),
      };
    }, TTL.complaintDetail);

    if (!data) {
      res.status(404).json({ error: 'Complaint not found' });
      return;
    }
    res.json(data);
  } catch (error) {
    console.error('Complaint get error:', error);
    res.status(500).json({ error: 'Internal server error', debug: (error as any)?.message || String(error) });
  }
});

// ─── PATCH /:id — Update complaint ───────────────────────────────────────────
router.route('/:id').patch(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.userId as string;
    const role = (req.user!.role as string).toLowerCase();
    const { id } = req.params;
    const body = req.body;

    // RBAC: customer can only update rating and feedback
    if (role === 'customer') {
      const allowedCustomerFields = ['customerRating', 'customerFeedback'];
      const requestedFields = Object.keys(body);
      const disallowedFields = requestedFields.filter(f => !allowedCustomerFields.includes(f));
      if (disallowedFields.length > 0) {
        res.status(403).json({
          error: 'Customers can only update rating and feedback',
          disallowedFields,
        });
        return;
      }
    }

    // Technician cannot reassign or change supervisor
    if (role === 'technician') {
      if (body.assignedToId !== undefined && body.assignedToId !== userId) {
        res.status(403).json({ error: 'Technicians cannot reassign complaints' });
        return;
      }
      if (body.supervisorId !== undefined) {
        res.status(403).json({ error: 'Technicians cannot change supervisors' });
        return;
      }
    }

    const existing = await db.complaint.findFirst({ where: { tenantId, id } });
    if (!existing) {
      res.status(404).json({ error: 'Complaint not found' });
      return;
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.category !== undefined) updateData.category = body.category || null;
    if (body.photos !== undefined) updateData.photos = body.photos ? JSON.stringify(body.photos) : null;
    if (body.gpsLocation !== undefined) updateData.gpsLocation = body.gpsLocation ? JSON.stringify(body.gpsLocation) : null;
    if (body.resolutionNotes !== undefined) updateData.resolutionNotes = body.resolutionNotes || null;
    if (body.customerRating !== undefined) updateData.customerRating = body.customerRating || null;
    if (body.customerFeedback !== undefined) updateData.customerFeedback = body.customerFeedback || null;

    // Handle status transitions
    if (body.status) {
      updateData.status = body.status;
      if (body.status === 'RESOLVED') updateData.resolvedAt = new Date();
      if (body.status === 'CLOSED') updateData.closedAt = new Date();
      if (body.status === 'ASSIGNED') updateData.assignedToId = body.assignedToId || null;
      if (body.status === 'IN_PROGRESS' && body.assignedToId) updateData.assignedToId = body.assignedToId;
    }
    if (body.assignedToId !== undefined && !body.status) updateData.assignedToId = body.assignedToId || null;
    if (body.supervisorId !== undefined) updateData.supervisorId = body.supervisorId || null;

    const updated = await db.complaint.update({
      where: { id },
      data: updateData,
    });

    invalidateComplaints(tenantId).catch(() => {});
    invalidateDashboard(tenantId).catch(() => {});

    const u = updated as any;
    res.json({
      id: u.id,
      tenantId: u.tenantId,
      customerId: u.customerId,
      customerName: u.customer?.name,
      equipmentId: u.equipmentId,
      equipmentName: u.equipment?.name,
      title: u.title,
      description: u.description,
      priority: u.priority,
      status: u.status,
      category: u.category,
      assignedToId: u.assignedToId,
      assignedToName: u.assignedTo?.name,
      supervisorId: u.supervisorId,
      supervisorName: u.supervisor?.name,
      resolutionNotes: u.resolutionNotes,
      customerRating: u.customerRating,
      resolvedAt: u.resolvedAt?.toISOString?.() || null,
      closedAt: u.closedAt?.toISOString?.() || null,
      createdAt: u.createdAt?.toISOString?.() || u.createdAt,
      updatedAt: u.updatedAt?.toISOString?.() || u.updatedAt,
    });
  } catch (error) {
    console.error('Complaint update error:', error);
    res.status(500).json({ error: 'Internal server error', debug: (error as any)?.message || String(error) });
  }
});

export default router;