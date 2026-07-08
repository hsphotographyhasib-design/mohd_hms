import { NextRequest, NextResponse } from 'next/server';
import { db, getDbFriendlyMessage, getErrorHeaders } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { buildDashboardScope } from '@/lib/dashboard-scope';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: NextRequest) {
  // ── Production: proxy to Render backend ────────────────────────────────
  if (BACKEND_URL) {
    try {
      const authHeader = request.headers.get('authorization') || '';
      const searchParams = request.nextUrl.searchParams.toString();
      const url = searchParams
        ? `${BACKEND_URL}/api/dashboard/recent?${searchParams}`
        : `${BACKEND_URL}/api/dashboard/recent`;

      const token = authHeader.replace('Bearer ', '');
      const payload = verifyToken(token);
      if (payload) {
        console.log(`[Dashboard/${payload.role}] GET /api/dashboard/recent userId=${payload.userId}`);
      }

      const res = await fetch(url, {
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch (error) {
      console.error('Dashboard recent proxy error:', error);
      return NextResponse.json({ error: 'Backend service unavailable' }, { status: 502 });
    }
  }

  // ── Local dev: use Prisma/SQLite ───────────────────────────────────────
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const role = (payload.role as string).toLowerCase();

    const scope = await buildDashboardScope({
      userId: payload.userId as string,
      tenantId,
      role,
      email: payload.email as string | undefined,
    });
    if (!scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    console.log(`[Dashboard/${role}] GET /api/dashboard/recent userId=${payload.userId}`);

    // HR / finance see no operational data
    const fetchComplaints = role !== 'hr' && role !== 'finance';
    const fetchWorkOrders = role !== 'hr' && role !== 'finance';

    const [recentComplaints, recentWorkOrders, upcomingPm] = await Promise.all([
      fetchComplaints
        ? db.complaint.findMany({
            where: scope.complaintWhere,
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
          })
        : Promise.resolve([]),
      fetchWorkOrders
        ? db.workOrder.findMany({
            where: scope.workOrderWhere,
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
          })
        : Promise.resolve([]),
      scope.canSeePm
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
      recentComplaints: (recentComplaints as any[]).map((c: any) => ({
        id: c.id,
        tenantId: c.tenantId,
        customerId: c.customerId,
        customerName: c.customer?.name || null,
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
      recentWorkOrders: (recentWorkOrders as any[]).map((wo: any) => ({
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
      upcomingPm: (upcomingPm as any[]).map((pm: any) => ({
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
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500, headers: getErrorHeaders(error) },
    );
  }
}