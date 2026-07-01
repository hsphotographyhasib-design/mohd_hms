import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const CLOSED_STATUSES = ['CLOSED', 'PAID'] as const;
const ACTIVE_STATUSES = ['ASSIGNED', 'ACCEPTED', 'WORK_ORDER_CREATED', 'IN_PROGRESS'] as const;
const CANCELLED_STATUS = 'CANCELLED';

// ============ GET: Performance metrics for a single technician ============

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // --- Auth ---
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;

    // Verify technician exists
    const tech = await db.user.findFirst({
      where: { id, tenantId, isActive: true, role: { in: ['technician', 'supervisor'] } },
      select: { id: true, name: true },
    });

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

    // --- Parallel queries ---
    const [
      // 1. Completed counts — all time, this month, this week, today
      allTimeCompleted,
      monthlyCompleted,
      weeklyCompleted,
      todayCompleted,

      // 2. Pending jobs
      pendingCount,

      // 3. Cancelled jobs
      cancelledCount,

      // 4. SLA compliance data (complaints with completedAt and startedAt)
      slaComplaints,

      // 5. Customer ratings
      ratings,

      // 6. First-time fix rate / rework rate
      reworkComplaints,
      directClosedComplaints,

      // 7. Attendance this month (for % and punctuality)
      monthlyAttendance,

      // 8. Average completion time (all completed)
      allCompletedComplaints,

      // 9. Revenue generated (invoices linked to tech's complaints/work orders)
      revenueInvoices,

      // 10. Labor hours total
      laborHoursWorkOrders,
    ] = await Promise.all([
      // 1a. All-time completed
      db.complaint.count({
        where: { assignedToId: id, tenantId, status: { in: [...CLOSED_STATUSES] } },
      }),
      // 1b. Monthly completed
      db.complaint.count({
        where: {
          assignedToId: id, tenantId, status: { in: [...CLOSED_STATUSES] },
          completedAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      // 1c. Weekly completed
      db.complaint.count({
        where: {
          assignedToId: id, tenantId, status: { in: [...CLOSED_STATUSES] },
          completedAt: { gte: weekStart },
        },
      }),
      // 1d. Today completed
      db.complaint.count({
        where: {
          assignedToId: id, tenantId, status: { in: [...CLOSED_STATUSES] },
          completedAt: { gte: todayStart, lt: todayEnd },
        },
      }),

      // 2. Pending jobs (active complaints)
      db.complaint.count({
        where: { assignedToId: id, tenantId, status: { in: [...ACTIVE_STATUSES] } },
      }),

      // 3. Cancelled
      db.complaint.count({
        where: { assignedToId: id, tenantId, status: CANCELLED_STATUS },
      }),

      // 4. SLA complaints — completed complaints with assignedAt and completedAt for SLA calc
      db.complaint.findMany({
        where: {
          assignedToId: id, tenantId, status: { in: [...CLOSED_STATUSES] },
          assignedAt: { not: null }, completedAt: { not: null },
        },
        select: {
          id: true, priority: true, assignedAt: true, completedAt: true,
        },
      }),

      // 5. Customer ratings
      db.complaint.findMany({
        where: {
          assignedToId: id, tenantId, customerRating: { not: null },
        },
        select: { id: true, customerRating: true },
      }),

      // 6a. Complaints that went to REWORK_REQUIRED (rework count)
      db.complaint.count({
        where: {
          assignedToId: id, tenantId, status: 'REWORK_REQUIRED',
        },
      }),

      // 6b. Complaints that went directly to CLOSED (no rework)
      // We check if the timeline has a REWORK_REQUIRED entry. Instead, check:
      // complaints that reached CLOSED/PAID and were never REWORK_REQUIRED
      // Simplified: count complaints where status is CLOSED/PAID
      // and check timeline for absence of 'rework_required' action
      db.complaint.count({
        where: {
          assignedToId: id, tenantId, status: { in: [...CLOSED_STATUSES] },
        },
      }),

      // 7. Monthly attendance
      db.attendance.findMany({
        where: {
          userId: id, tenantId,
          date: { gte: monthStart, lte: monthEnd },
        },
        select: { id: true, date: true, checkIn: true, status: true, hoursWorked: true },
      }),

      // 8. All completed complaints with timing (for avg completion time)
      db.complaint.findMany({
        where: {
          assignedToId: id, tenantId, status: { in: [...CLOSED_STATUSES] },
          startedAt: { not: null }, completedAt: { not: null },
        },
        select: { id: true, startedAt: true, completedAt: true },
      }),

      // 9. Revenue: invoices linked to complaints assigned to this tech
      db.invoice.findMany({
        where: {
          tenantId,
          OR: [
            { workOrder: { complaint: { assignedToId: id } } },
            { workOrder: { assignedToId: id } },
          ],
          status: { in: ['PAID', 'APPROVED', 'PENDING'] },
        },
        select: { id: true, total: true, status: true },
      }),

      // 10. Labor hours from completed work orders
      db.workOrder.aggregate({
        where: {
          assignedToId: id, tenantId,
          status: { in: ['COMPLETED', 'CLOSED'] },
          laborHours: { not: null },
        },
        _sum: { laborHours: true, totalCost: true, materialCost: true, laborCost: true },
        _count: true,
      }),
    ]);

    // --- Compute SLA compliance ---
    // SLA thresholds by priority (hours from assignment to completion)
    const slaThresholds: Record<string, number> = {
      critical: 4,
      high: 8,
      medium: 24,
      low: 48,
    };
    let slaCompliant = 0;
    for (const c of slaComplaints) {
      if (c.assignedAt && c.completedAt) {
        const hoursTaken = (c.completedAt.getTime() - c.assignedAt.getTime()) / 3_600_000;
        const threshold = slaThresholds[c.priority] ?? 48;
        if (hoursTaken <= threshold) slaCompliant++;
      }
    }
    const slaTotal = slaComplaints.length;
    const slaCompliancePercent = slaTotal > 0 ? parseFloat(((slaCompliant / slaTotal) * 100).toFixed(1)) : null;

    // --- Average customer rating ---
    const avgRating = ratings.length > 0
      ? parseFloat((ratings.reduce((sum, r) => sum + (r.customerRating ?? 0), 0) / ratings.length).toFixed(1))
      : null;

    // --- First-time fix rate & rework rate ---
    // Get complaint IDs that ever had REWORK_REQUIRED in their timeline
    const reworkedComplaintIds = await db.complaintTimeline.findMany({
      where: {
        complaint: { assignedToId: id, tenantId },
        action: 'rework_required',
      },
      select: { complaintId: true },
      distinct: ['complaintId'],
    }).then(rows => new Set(rows.map(r => r.complaintId)));

    const totalClosedComplaints = directClosedComplaints;
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

    const presentDays = monthlyAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
    const attendancePercent = totalWorkingDays > 0
      ? parseFloat(((presentDays / totalWorkingDays) * 100).toFixed(1))
      : null;

    // Punctuality: check-ins before or at 9:00 AM
    const punctualDays = monthlyAttendance.filter(a => {
      if (!a.checkIn) return false;
      const h = a.checkIn.getHours();
      const m = a.checkIn.getMinutes();
      return h < 9 || (h === 9 && m === 0);
    }).length;
    const punctualityPercent = totalWorkingDays > 0
      ? parseFloat(((punctualDays / totalWorkingDays) * 100).toFixed(1))
      : null;

    // --- Average completion time ---
    let avgCompletionHours: number | null = null;
    if (allCompletedComplaints.length > 0) {
      let totalMs = 0;
      let validCount = 0;
      for (const c of allCompletedComplaints) {
        if (c.startedAt && c.completedAt) {
          totalMs += c.completedAt.getTime() - c.startedAt.getTime();
          validCount++;
        }
      }
      if (validCount > 0) {
        avgCompletionHours = parseFloat(((totalMs / validCount) / 3_600_000).toFixed(1));
      }
    }

    // --- Revenue generated ---
    const totalRevenue = revenueInvoices.reduce((sum, inv) => sum + inv.total, 0);

    // --- Labor hours ---
    const totalLaborHours = laborHoursWorkOrders._sum.laborHours ?? 0;
    const totalMaterialCost = laborHoursWorkOrders._sum.materialCost ?? 0;
    const totalLaborCost = laborHoursWorkOrders._sum.laborCost ?? 0;

    return NextResponse.json({
      technicianId: id,
      technicianName: tech.name,

      // Completed jobs
      completedJobs: {
        allTime: allTimeCompleted,
        thisMonth: monthlyCompleted,
        thisWeek: weeklyCompleted,
        today: todayCompleted,
      },

      // Pending & cancelled
      pendingJobs: pendingCount,
      cancelledJobs: cancelledCount,

      // SLA
      slaCompliance: {
        compliant: slaCompliant,
        total: slaTotal,
        percentage: slaCompliancePercent,
      },

      // Customer satisfaction
      customerSatisfaction: {
        totalRatings: ratings.length,
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
        totalLaborHours: parseFloat(totalLaborHours.toFixed(1)),
      },

      // Revenue
      revenue: {
        totalGenerated: parseFloat(totalRevenue.toFixed(2)),
        invoiceCount: revenueInvoices.length,
      },

      // Work order costs
      workOrderCosts: {
        totalLaborCost: parseFloat(totalLaborCost.toFixed(2)),
        totalMaterialCost: parseFloat(totalMaterialCost.toFixed(2)),
        completedWorkOrders: laborHoursWorkOrders._count,
      },
    });
  } catch (error) {
    console.error('Technician performance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}