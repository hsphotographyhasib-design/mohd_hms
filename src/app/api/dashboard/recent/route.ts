import { NextRequest, NextResponse } from 'next/server';
import { db, getDbFriendlyMessage, getErrorHeaders } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { buildAuthContext, buildComplaintWhereClause } from '@/lib/rbac';
import type { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

/**
 * Recent activity endpoint — returns recent complaints, work orders, and PM schedules.
 * Cached for 1 minute on the client.
 * Uses `select` instead of `include` to minimize response payload.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const payload = verifyToken(token || '');
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = payload.tenantId as string;
  const role = (payload.role as string).toLowerCase();

  const ctx = await buildAuthContext(payload, { resolveCustomer: true });
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { where: complaintRbacWhere } = await buildComplaintWhereClause(ctx);

  try {
    let workOrderWhere: Prisma.WorkOrderWhereInput = { tenantId };
    if (role === 'technician') {
      workOrderWhere = { tenantId, assignedToId: ctx.userId };
    } else if (role === 'customer') {
      workOrderWhere = { tenantId, id: '__NEVER_MATCH__' };
    }

    const isPm = ['super_admin', 'admin', 'manager', 'supervisor'].includes(role);

    const [recentComplaints, recentWorkOrders, upcomingPm] = await Promise.all([
      // Recent complaints — select only fields displayed in the table
      db.complaint.findMany({
        where: complaintRbacWhere,
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          tenantId: true,
          customerId: true,
          equipmentId: true,
          title: true,
          description: true,
          priority: true,
          status: true,
          category: true,
          assignedToId: true,
          supervisorId: true,
          createdAt: true,
          updatedAt: true,
          resolvedAt: true,
          closedAt: true,
          customer: { select: { name: true } },
          assignedTo: { select: { name: true } },
          supervisor: { select: { name: true } },
          equipment: { select: { name: true } },
        },
      }),
      // Recent work orders — select only fields displayed in the table
      db.workOrder.findMany({
        where: workOrderWhere,
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          tenantId: true,
          complaintId: true,
          equipmentId: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          type: true,
          assignedToId: true,
          scheduledDate: true,
          completedAt: true,
          totalCost: true,
          createdAt: true,
          updatedAt: true,
          assignedTo: { select: { name: true } },
          equipment: { select: { name: true } },
        },
      }),
      // Upcoming PM — select only displayed fields
      isPm
        ? db.pmSchedule.findMany({
            where: { tenantId, status: 'active', nextDueDate: { gte: new Date() } },
            take: 6,
            orderBy: { nextDueDate: 'asc' },
            select: {
              id: true,
              tenantId: true,
              equipmentId: true,
              title: true,
              description: true,
              frequency: true,
              lastExecuted: true,
              nextDueDate: true,
              assignedToId: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              equipment: { select: { name: true } },
              assignedTo: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      recentComplaints: recentComplaints.map((c) => ({
        id: c.id,
        tenantId: c.tenantId,
        customerId: c.customerId,
        customerName: c.customer.name,
        equipmentId: c.equipmentId,
        equipmentName: c.equipment?.name || null,
        title: c.title,
        description: c.description,
        priority: c.priority,
        status: c.status,
        category: c.category,
        assignedToId: c.assignedToId,
        assignedToName: c.assignedTo?.name || null,
        supervisorId: c.supervisorId,
        supervisorName: c.supervisor?.name || null,
        resolvedAt: c.resolvedAt?.toISOString() || null,
        closedAt: c.closedAt?.toISOString() || null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      recentWorkOrders: recentWorkOrders.map((wo) => ({
        id: wo.id,
        tenantId: wo.tenantId,
        complaintId: wo.complaintId,
        equipmentId: wo.equipmentId,
        equipmentName: wo.equipment?.name || null,
        title: wo.title,
        description: wo.description,
        status: wo.status,
        priority: wo.priority,
        type: wo.type,
        assignedToId: wo.assignedToId,
        assignedToName: wo.assignedTo?.name || null,
        scheduledDate: wo.scheduledDate?.toISOString() || null,
        completedAt: wo.completedAt?.toISOString() || null,
        totalCost: wo.totalCost,
        createdAt: wo.createdAt.toISOString(),
        updatedAt: wo.updatedAt.toISOString(),
      })),
      upcomingPm: (upcomingPm as any[]).map((pm) => ({
        id: pm.id,
        tenantId: pm.tenantId,
        equipmentId: pm.equipmentId,
        equipmentName: pm.equipment?.name || null,
        title: pm.title,
        description: pm.description,
        frequency: pm.frequency,
        lastExecuted: pm.lastExecuted?.toISOString() || null,
        nextDueDate: pm.nextDueDate?.toISOString() || null,
        assignedToId: pm.assignedToId,
        assignedToName: pm.assignedTo?.name || null,
        status: pm.status,
        createdAt: pm.createdAt?.toISOString() || null,
        updatedAt: pm.updatedAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error('Dashboard recent error:', error);
    return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500, headers: getErrorHeaders(error) });
  }
}