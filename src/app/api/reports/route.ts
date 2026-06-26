import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const type = request.nextUrl.searchParams.get('type') || 'complaint';

    switch (type) {
      case 'complaint': {
        const [
          statusCounts,
          priorityCounts,
          categoryCounts,
          avgResolutionDays,
          monthlyCounts,
        ] = await Promise.all([
          db.complaint.groupBy({
            by: ['status'],
            where: { tenantId },
            _count: { id: true },
          }),
          db.complaint.groupBy({
            by: ['priority'],
            where: { tenantId },
            _count: { id: true },
          }),
          db.complaint.groupBy({
            by: ['category'],
            where: { tenantId, category: { not: null } },
            _count: { id: true },
          }),
          // Average resolution time
          db.complaint.findMany({
            where: { tenantId, resolvedAt: { not: null }, createdAt: { not: null } },
            select: { createdAt: true, resolvedAt: true },
          }),
          // Monthly complaint counts for last 6 months
          db.complaint.findMany({
            where: { tenantId },
            select: { createdAt: true },
          }),
        ]);

        const avgDays = monthlyCounts.length > 0
          ? avgResolutionDays.length > 0
            ? Math.round(
                avgResolutionDays.reduce((sum, c) => {
                  const created = new Date(c.createdAt);
                  const resolved = new Date(c.resolvedAt!);
                  return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
                }, 0) / avgResolutionDays.length
              )
            : 0
          : 0;

        const now = new Date();
        const monthlyData = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
          const monthName = d.toLocaleString('default', { month: 'short', year: '2-digit' });
          const count = monthlyCounts.filter((c) => {
            const created = new Date(c.createdAt);
            return created >= d && created <= end;
          }).length;
          monthlyData.push({ month: monthName, count });
        }

        return NextResponse.json({
          type: 'complaint',
          total: statusCounts.reduce((s, c) => s + c._count.id, 0),
          byStatus: statusCounts.map((c) => ({ status: c.status, count: c._count.id })),
          byPriority: priorityCounts.map((c) => ({ priority: c.priority, count: c._count.id })),
          byCategory: categoryCounts.map((c) => ({ category: c.category || 'Unknown', count: c._count.id })),
          avgResolutionDays: avgDays,
          monthlyTrend: monthlyData,
        });
      }

      case 'work_order': {
        const [statusCounts, typeCounts, monthlyCounts, technicianWorkload] = await Promise.all([
          db.workOrder.groupBy({
            by: ['status'],
            where: { tenantId },
            _count: { id: true },
          }),
          db.workOrder.groupBy({
            by: ['type'],
            where: { tenantId },
            _count: { id: true },
          }),
          db.workOrder.findMany({
            where: { tenantId },
            select: { createdAt: true, status: true },
          }),
          db.workOrder.groupBy({
            by: ['assignedToId'],
            where: { tenantId, assignedToId: { not: null } },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
          }),
        ]);

        const now = new Date();
        const monthlyData = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
          const monthName = d.toLocaleString('default', { month: 'short', year: '2-digit' });
          const total = monthlyCounts.filter((c) => {
            const created = new Date(c.createdAt);
            return created >= d && created <= end;
          }).length;
          const completed = monthlyCounts.filter((c) => {
            const created = new Date(c.createdAt);
            return created >= d && created <= end && c.status === 'COMPLETED';
          }).length;
          monthlyData.push({ month: monthName, total, completed });
        }

        // Get technician names
        const techIds = technicianWorkload.map((t) => t.assignedToId!);
        const techs = techIds.length > 0 ? await db.user.findMany({
          where: { id: { in: techIds } },
          select: { id: true, name: true },
        }) : [];
        const techMap: Record<string, string> = {};
        techs.forEach((t) => { techMap[t.id] = t.name; });

        return NextResponse.json({
          type: 'work_order',
          total: statusCounts.reduce((s, c) => s + c._count.id, 0),
          byStatus: statusCounts.map((c) => ({ status: c.status, count: c._count.id })),
          byType: typeCounts.map((c) => ({ type: c.type, count: c._count.id })),
          monthlyTrend: monthlyData,
          technicianWorkload: technicianWorkload.map((t) => ({
            technicianId: t.assignedToId,
            technicianName: techMap[t.assignedToId!],
            workOrders: t._count.id,
          })),
        });
      }

      case 'equipment': {
        const [statusCounts, categoryCounts, maintenanceAlerts] = await Promise.all([
          db.equipment.groupBy({
            by: ['status'],
            where: { tenantId },
            _count: { id: true },
          }),
          db.equipment.groupBy({
            by: ['category'],
            where: { tenantId },
            _count: { id: true },
          }),
          db.equipment.findMany({
            where: {
              tenantId,
              status: { not: 'decommissioned' },
              warrantyExpiry: { lte: new Date(Date.now() + 30 * 86400000) },
            },
            select: { id: true, name: true, warrantyExpiry: true },
          }),
        ]);

        return NextResponse.json({
          type: 'equipment',
          total: statusCounts.reduce((s, c) => s + c._count.id, 0),
          byStatus: statusCounts.map((c) => ({ status: c.status, count: c._count.id })),
          byCategory: categoryCounts.map((c) => ({ category: c.category, count: c._count.id })),
          warrantyExpiringSoon: maintenanceAlerts.map((e) => ({
            id: e.id,
            name: e.name,
            warrantyExpiry: e.warrantyExpiry?.toISOString(),
          })),
        });
      }

      case 'financial': {
        const [
          revenueByMonth,
          expensesByMonth,
          invoiceStatusCounts,
        ] = await Promise.all([
          db.invoice.findMany({
            where: { tenantId, status: 'PAID', paidAt: { not: null } },
            select: { total: true, paidAt: true },
          }),
          db.workOrder.findMany({
            where: { tenantId, status: 'COMPLETED', completedAt: { not: null }, totalCost: { not: null } },
            select: { totalCost: true, completedAt: true },
          }),
          db.invoice.groupBy({
            by: ['status'],
            where: { tenantId },
            _count: true,
            _sum: { total: true },
          }),
        ]);

        const now = new Date();
        const monthlyData = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
          const monthName = d.toLocaleString('default', { month: 'short', year: '2-digit' });
          const revenue = revenueByMonth
            .filter((inv) => { const p = new Date(inv.paidAt!); return p >= d && p <= end; })
            .reduce((s, inv) => s + inv.total, 0);
          const expenses = expensesByMonth
            .filter((wo) => { const c = new Date(wo.completedAt!); return c >= d && c <= end; })
            .reduce((s, wo) => s + (wo.totalCost || 0), 0);
          monthlyData.push({ month: monthName, revenue, expenses, profit: revenue - expenses });
        }

        return NextResponse.json({
          type: 'financial',
          totalRevenue: revenueByMonth.reduce((s, inv) => s + inv.total, 0),
          totalExpenses: expensesByMonth.reduce((s, wo) => s + (wo.totalCost || 0), 0),
          invoiceByStatus: invoiceStatusCounts.map((c) => ({
            status: c.status,
            count: c._count,
            total: c._sum.total || 0,
          })),
          monthlyTrend: monthlyData,
        });
      }

      case 'pm': {
        const [statusCounts, frequencyCounts, overduePm] = await Promise.all([
          db.pmSchedule.groupBy({
            by: ['status'],
            where: { tenantId },
            _count: { id: true },
          }),
          db.pmSchedule.groupBy({
            by: ['frequency'],
            where: { tenantId },
            _count: { id: true },
          }),
          db.pmSchedule.findMany({
            where: { tenantId, status: 'active', nextDueDate: { lt: new Date() } },
            include: { equipment: { select: { name: true } }, assignedTo: { select: { name: true } } },
            take: 20,
          }),
        ]);

        const total = statusCounts.reduce((s, c) => s + c._count.id, 0);
        const completed = statusCounts.find((c) => c.status === 'completed')?._count.id || 0;
        const compliance = total > 0 ? Math.round((completed / total) * 100) : 0;

        return NextResponse.json({
          type: 'pm',
          total,
          compliance,
          byStatus: statusCounts.map((c) => ({ status: c.status, count: c._count.id })),
          byFrequency: frequencyCounts.map((c) => ({ frequency: c.frequency, count: c._count.id })),
          overdue: overduePm.map((pm) => ({
            id: pm.id,
            title: pm.title,
            equipmentName: pm.equipment.name,
            nextDueDate: pm.nextDueDate.toISOString(),
            assignedToName: pm.assignedTo?.name,
          })),
        });
      }

      case 'technician': {
        const technicians = await db.user.findMany({
          where: { tenantId, role: 'technician', isActive: true },
          include: {
            department: { select: { name: true } },
            _count: {
              select: {
                assignedComplaints: true,
                assignedWorkOrders: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        });

        return NextResponse.json({
          type: 'technician',
          total: technicians.length,
          technicians: technicians.map((t) => ({
            id: t.id,
            name: t.name,
            email: t.email,
            phone: t.phone,
            departmentName: t.department?.name,
            isOnline: t.isOnline,
            complaints: t._count.assignedComplaints,
            workOrders: t._count.assignedWorkOrders,
          })),
        });
      }

      default:
        return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
