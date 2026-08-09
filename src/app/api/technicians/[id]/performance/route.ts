import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export const dynamic = 'force-dynamic';

const CLOSED_STATUSES = ['CLOSED', 'PAID'] as const;
const ACTIVE_STATUSES = ['ASSIGNED', 'ACCEPTED', 'WORK_ORDER_CREATED', 'IN_PROGRESS'] as const;
const CANCELLED_STATUS = 'CANCELLED';

// Helper: safe query wrapper
async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

// Helper: safe date parsing
function toDate(val: unknown): Date | null {
  if (val == null) return null;
  return new Date(val as string | Date);
}

// ============ GET: Performance metrics for a single technician ============

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // --- Auth ---
    const auth = verifyRouteAuth(request, { feature: 'technicians' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;
    const { id } = await params;

    // Verify technician exists
    const tech: any = await safeQuery(
      () => db.user.findFirst({
        where: { id, tenantId, isActive: true, role: { in: ['technician', 'supervisor'] } },
        select: { id: true, name: true },
      }),
      null,
    );

    if (!tech) {
      return NextResponse.json({ error: 'Technician not found' }, { status: 404 });
    }

    // --- Time ranges ---
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // This week (Monday)
    const weekStart = new Date(todayStart);
    const dayOfWeek = weekStart.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
    weekStart.setDate(weekStart.getDate() - diff);

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // --- Get work order IDs for invoices (separate queries instead of nested relation filter) ---
    // Complaint IDs assigned to this tech
    const techComplaintIds: string[] = await safeQuery(
      () => db.complaint.findMany({
        where: { assignedToId: id, tenantId },
        select: { id: true },
      }).then((rows: any[]) => rows.map((r: any) => r.id)),
      [],
    );

    // Work order IDs linked to those complaints
    const woIdsFromComplaints: string[] = await safeQuery(
      () => techComplaintIds.length > 0
        ? db.workOrder.findMany({
            where: { complaintId: { in: techComplaintIds }, tenantId },
            select: { id: true },
          }).then((rows: any[]) => rows.map((r: any) => r.id))
        : Promise.resolve([]),
      [],
    );

    // Work order IDs directly assigned to this tech
    const woIdsDirect: string[] = await safeQuery(
      () => db.workOrder.findMany({
        where: { assignedToId: id, tenantId },
        select: { id: true },
      }).then((rows: any[]) => rows.map((r: any) => r.id)),
      [],
    );

    // Combine and deduplicate work order IDs for invoice query
    const allWoIds = [...new Set([...woIdsFromComplaints, ...woIdsDirect])];

    // --- Parallel queries ---
    const [
      allTimeCompleted,
      monthlyCompleted,
      weeklyCompleted,
      todayCompleted,
      pendingCount,
      cancelledCount,
      slaComplaints,
      ratings,
      reworkComplaints,
      directClosedComplaints,
      monthlyAttendance,
      allCompletedComplaints,
      revenueInvoices,
      laborHoursWorkOrders,
    ] = await Promise.all([
      // 1a. All-time completed
      safeQuery(
        () => db.complaint.count({
          where: { assignedToId: id, tenantId, status: { in: [...CLOSED_STATUSES] } },
        }),
        0,
      ),
      // 1b. Monthly completed
      safeQuery(
        () => db.complaint.count({
          where: {
            assignedToId: id, tenantId, status: { in: [...CLOSED_STATUSES] },
            completedAt: { gte: monthStart, lte: monthEnd },
          },
        }),
        0,
      ),
      // 1c. Weekly completed
      safeQuery(
        () => db.complaint.count({
          where: {
            assignedToId: id, tenantId, status: { in: [...CLOSED_STATUSES] },
            completedAt: { gte: weekStart },
          },
        }),
        0,
      ),
      // 1d. Today completed
      safeQuery(
        () => db.complaint.count({
          where: {
            assignedToId: id, tenantId, status: { in: [...CLOSED_STATUSES] },
            completedAt: { gte: todayStart, lt: todayEnd },
          },
        }),
        0,
      ),

      // 2. Pending jobs (active complaints)
      safeQuery(
        () => db.complaint.count({
          where: { assignedToId: id, tenantId, status: { in: [...ACTIVE_STATUSES] } },
        }),
        0,
      ),

      // 3. Cancelled
      safeQuery(
        () => db.complaint.count({
          where: { assignedToId: id, tenantId, status: CANCELLED_STATUS },
        }),
        0,
      ),

      // 4. SLA complaints
      safeQuery<any[]>(
        () => db.complaint.findMany({
          where: {
            assignedToId: id, tenantId, status: { in: [...CLOSED_STATUSES] },
            assignedAt: { not: null }, completedAt: { not: null },
          },
          select: {
            id: true, priority: true, assignedAt: true, completedAt: true,
          },
        }),
        [],
      ),

      // 5. Customer ratings
      safeQuery<any[]>(
        () => db.complaint.findMany({
          where: {
            assignedToId: id, tenantId, customerRating: { not: null },
          },
          select: { id: true, customerRating: true },
        }),
        [],
      ),

      // 6a. Complaints that went to REWORK_REQUIRED (rework count)
      safeQuery(
        () => db.complaint.count({
          where: {
            assignedToId: id, tenantId, status: 'REWORK_REQUIRED',
          },
        }),
        0,
      ),

      // 6b. Complaints that went directly to CLOSED/PAID
      safeQuery(
        () => db.complaint.count({
          where: {
            assignedToId: id, tenantId, status: { in: [...CLOSED_STATUSES] },
          },
        }),
        0,
      ),

      // 7. Monthly attendance
      safeQuery<any[]>(
        () => db.attendance.findMany({
          where: {
            userId: id, tenantId,
            date: { gte: monthStart, lte: monthEnd },
          },
          select: { id: true, date: true, checkIn: true, status: true, hoursWorked: true },
        }),
        [],
      ),

      // 8. All completed complaints with timing
      safeQuery<any[]>(
        () => db.complaint.findMany({
          where: {
            assignedToId: id, tenantId, status: { in: [...CLOSED_STATUSES] },
            startedAt: { not: null }, completedAt: { not: null },
          },
          select: { id: true, startedAt: true, completedAt: true },
        }),
        [],
      ),

      // 9. Revenue: invoices linked to work orders (using pre-fetched WO IDs instead of nested relation)
      safeQuery<any[]>(
        () => allWoIds.length > 0
          ? db.invoice.findMany({
              where: {
                tenantId,
                workOrderId: { in: allWoIds },
                status: { in: ['PAID', 'APPROVED', 'PENDING'] },
              },
              select: { id: true, total: true, status: true },
            })
          : Promise.resolve([]),
        [],
      ),

      // 10. Labor hours from completed work orders
      safeQuery<any>(
        () => db.workOrder.aggregate({
          where: {
            assignedToId: id, tenantId,
            status: { in: ['COMPLETED', 'CLOSED'] },
            laborHours: { not: null },
          },
          _sum: { laborHours: true, totalCost: true, materialCost: true, laborCost: true },
          _count: true,
        }),
        { _sum: { laborHours: null, totalCost: null, materialCost: null, laborCost: null }, _count: 0 },
      ),
    ]);

    // --- Compute SLA compliance ---
    const slaThresholds: Record<string, number> = {
      critical: 4,
      high: 8,
      medium: 24,
      low: 48,
    };
    let slaCompliant = 0;
    const slaArr = slaComplaints || [];
    for (const c of slaArr) {
      if (c.assignedAt && c.completedAt) {
        const hoursTaken = (toDate(c.completedAt)!.getTime() - toDate(c.assignedAt)!.getTime()) / 3_600_000;
        const threshold = slaThresholds[c.priority] ?? 48;
        if (hoursTaken <= threshold) slaCompliant++;
      }
    }
    const slaTotal = slaArr.length;
    const slaCompliancePercent = slaTotal > 0 ? parseFloat(((slaCompliant / slaTotal) * 100).toFixed(1)) : null;

    // --- Average customer rating ---
    const ratingsArr = ratings || [];
    const avgRating = ratingsArr.length > 0
      ? parseFloat((ratingsArr.reduce((sum: number, r: any) => sum + (r.customerRating ?? 0), 0) / ratingsArr.length).toFixed(1))
      : null;

    // --- First-time fix rate & rework rate ---
    // Get complaint IDs that ever had REWORK_REQUIRED in their timeline
    // Use complaintIds instead of nested relation filter
    const reworkedComplaintIds = await safeQuery(
      () => techComplaintIds.length > 0
        ? db.complaintTimeline.findMany({
            where: {
              complaintId: { in: techComplaintIds },
              action: 'rework_required',
            },
            select: { complaintId: true },
            distinct: ['complaintId'],
          }).then((rows: any[]) => new Set(rows.map((r: any) => r.complaintId)))
        : Promise.resolve(new Set<string>()),
      new Set<string>(),
    );

    const totalClosedComplaints = directClosedComplaints ?? 0;
    const reworkCount = reworkedComplaintIds.size;
    const firstTimeFixCount = totalClosedComplaints - reworkCount;
    const firstTimeFixRate = totalClosedComplaints > 0
      ? parseFloat(((firstTimeFixCount / totalClosedComplaints) * 100).toFixed(1))
      : null;
    const reworkRate = totalClosedComplaints > 0
      ? parseFloat(((reworkCount / totalClosedComplaints) * 100).toFixed(1))
      : null;

    // --- Attendance % and punctuality ---
    // Count working days in this month (excluding weekends)
    const workingDaysInMonth: number[] = [];
    const d = new Date(monthStart);
    while (d <= monthEnd) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) workingDaysInMonth.push(d.getDate());
      d.setDate(d.getDate() + 1);
    }
    const totalWorkingDays = workingDaysInMonth.length;

    const monthlyAttendanceArr = monthlyAttendance || [];
    const presentDays = monthlyAttendanceArr.filter((a: any) => a.status === 'present' || a.status === 'late').length;
    const attendancePercent = totalWorkingDays > 0
      ? parseFloat(((presentDays / totalWorkingDays) * 100).toFixed(1))
      : null;

    // Punctuality: check-ins before or at 9:00 AM
    const punctualDays = monthlyAttendanceArr.filter((a: any) => {
      if (!a.checkIn) return false;
      const checkInDate = toDate(a.checkIn);
      if (!checkInDate) return false;
      const h = checkInDate.getHours();
      const m = checkInDate.getMinutes();
      return h < 9 || (h === 9 && m === 0);
    }).length;
    const punctualityPercent = totalWorkingDays > 0
      ? parseFloat(((punctualDays / totalWorkingDays) * 100).toFixed(1))
      : null;

    // --- Average completion time ---
    let avgCompletionHours: number | null = null;
    const allCompletedArr = allCompletedComplaints || [];
    if (allCompletedArr.length > 0) {
      let totalMs = 0;
      let validCount = 0;
      for (const c of allCompletedArr) {
        if (c.startedAt && c.completedAt) {
          const start = toDate(c.startedAt);
          const end = toDate(c.completedAt);
          if (start && end) {
            totalMs += end.getTime() - start.getTime();
            validCount++;
          }
        }
      }
      if (validCount > 0) {
        avgCompletionHours = parseFloat(((totalMs / validCount) / 3_600_000).toFixed(1));
      }
    }

    // --- Revenue generated ---
    const revenueInvoicesArr = revenueInvoices || [];
    const totalRevenue = revenueInvoicesArr.reduce((sum: number, inv: any) => sum + (inv.total ?? 0), 0);

    // --- Labor hours ---
    const totalLaborHours = laborHoursWorkOrders?._sum?.laborHours ?? 0;
    const totalMaterialCost = laborHoursWorkOrders?._sum?.materialCost ?? 0;
    const totalLaborCost = laborHoursWorkOrders?._sum?.laborCost ?? 0;

    return NextResponse.json({
      technicianId: id,
      technicianName: tech.name,

      // Completed jobs
      completedJobs: {
        allTime: allTimeCompleted ?? 0,
        thisMonth: monthlyCompleted ?? 0,
        thisWeek: weeklyCompleted ?? 0,
        today: todayCompleted ?? 0,
      },

      // Pending & cancelled
      pendingJobs: pendingCount ?? 0,
      cancelledJobs: cancelledCount ?? 0,

      // SLA
      slaCompliance: {
        compliant: slaCompliant,
        total: slaTotal,
        percentage: slaCompliancePercent,
      },

      // Customer satisfaction
      customerSatisfaction: {
        totalRatings: ratingsArr.length,
        averageRating: avgRating,
      },

      // Quality
      quality: {
        firstTimeFixRate,
        reworkRate,
        reworkCount,
        totalClosedJobs: totalClosedComplaints,
      },

      // Attendance
      attendance: {
        thisMonth: {
          percentage: attendancePercent,
          presentDays,
          totalWorkingDays,
          punctuality: punctualityPercent,
          punctualDays,
        },
      },

      // Efficiency
      efficiency: {
        averageCompletionTimeHours: avgCompletionHours,
        totalLaborHours: parseFloat((totalLaborHours ?? 0).toFixed(1)),
      },

      // Revenue
      revenue: {
        totalGenerated: parseFloat(totalRevenue.toFixed(2)),
        invoiceCount: revenueInvoicesArr.length,
      },

      // Work order costs
      workOrderCosts: {
        totalLaborCost: parseFloat((totalLaborCost ?? 0).toFixed(2)),
        totalMaterialCost: parseFloat((totalMaterialCost ?? 0).toFixed(2)),
        completedWorkOrders: laborHoursWorkOrders?._count ?? 0,
      },
    });
  } catch (error) {
    console.error('Technician performance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
