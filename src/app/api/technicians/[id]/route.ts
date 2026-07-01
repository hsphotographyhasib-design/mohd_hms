import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ACTIVE_COMPLAINT_STATUSES = ['ASSIGNED', 'ACCEPTED', 'WORK_ORDER_CREATED', 'IN_PROGRESS'] as const;
const ACTIVE_WO_STATUSES = ['PENDING', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] as const;

// ============ GET: Single technician full detail ============

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

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // --- Fetch technician with department ---
    const technician = await db.user.findFirst({
      where: { id, tenantId, isActive: true, role: { in: ['technician', 'supervisor'] } },
      select: {
        id: true, name: true, email: true, phone: true, avatar: true,
        employeeNumber: true, role: true, departmentId: true, isOnline: true,
        lastLogin: true, gpsLocation: true, profileCompleted: true,
        createdAt: true, updatedAt: true,
        department: {
          select: {
            id: true, name: true, description: true, headId: true,
          },
        },
      },
    });

    if (!technician) {
      return NextResponse.json({ error: 'Technician not found' }, { status: 404 });
    }

    // --- Parallel enrichment queries ---
    const [
      departmentHead,
      activeComplaints,
      activeWorkOrders,
      todayAttendance,
      todayTimeline,
      monthlyCompleted,
      monthlyAvgTime,
      monthlyRatings,
      stockMovements,
      leaveHistory,
      currentLeave,
    ] = await Promise.all([
      // 1. Department head name
      technician.department?.headId
        ? db.user.findFirst({
            where: { id: technician.department.headId, tenantId },
            select: { id: true, name: true },
          }).then(u => u?.name || null).catch(() => null)
        : Promise.resolve(null),

      // 2. Active complaints with customer + equipment
      db.complaint.findMany({
        where: {
          assignedToId: id,
          tenantId,
          status: { in: [...ACTIVE_COMPLAINT_STATUSES] },
        },
        select: {
          id: true, title: true, description: true, status: true, priority: true,
          category: true, assignedAt: true, acceptedAt: true, startedAt: true,
          createdAt: true,
          customer: { select: { id: true, name: true, phone: true, address: true } },
          equipment: { select: { id: true, name: true, assetNumber: true, category: true } },
        },
        orderBy: { priority: 'desc' },
      }),

      // 3. Active work orders
      db.workOrder.findMany({
        where: {
          assignedToId: id,
          tenantId,
          status: { in: [...ACTIVE_WO_STATUSES] },
        },
        select: {
          id: true, workOrderNumber: true, title: true, description: true,
          status: true, priority: true, type: true, scheduledDate: true,
          dueDate: true, startedAt: true, laborHours: true, totalCost: true,
          customer: { select: { id: true, name: true } },
        },
        orderBy: { priority: 'desc' },
      }),

      // 4. Today's attendance
      db.attendance.findFirst({
        where: {
          userId: id,
          tenantId,
          date: { gte: todayStart, lt: todayEnd },
        },
        select: {
          id: true, date: true, checkIn: true, checkOut: true,
          hoursWorked: true, status: true, checkInGps: true, checkOutGps: true,
        },
      }),

      // 5. Today's timeline (complaints assigned to this tech, timeline created today)
      db.complaintTimeline.findMany({
        where: {
          complaint: { assignedToId: id, tenantId },
          createdAt: { gte: todayStart, lt: todayEnd },
        },
        select: {
          id: true, complaintId: true, action: true, fromStatus: true,
          toStatus: true, description: true, performedBy: true,
          performedByRole: true, createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),

      // 6. Monthly completed count
      db.complaint.count({
        where: {
          assignedToId: id,
          tenantId,
          status: { in: ['CLOSED', 'PAID'] },
          completedAt: { gte: monthStart },
        },
      }),

      // 7. Monthly avg completion time
      db.complaint.findMany({
        where: {
          assignedToId: id,
          tenantId,
          status: { in: ['CLOSED', 'PAID'] },
          startedAt: { not: null },
          completedAt: { not: null, gte: monthStart },
        },
        select: { startedAt: true, completedAt: true },
      }).then(rows => {
        if (rows.length === 0) return null;
        let totalMs = 0;
        for (const r of rows) {
          if (r.startedAt && r.completedAt) {
            totalMs += r.completedAt.getTime() - r.startedAt.getTime();
          }
        }
        return parseFloat(((totalMs / rows.length) / 3_600_000).toFixed(1));
      }),

      // 8. Customer ratings received
      db.complaint.findMany({
        where: {
          assignedToId: id,
          tenantId,
          customerRating: { not: null },
        },
        select: { id: true, customerRating: true, customerFeedback: true },
        take: 50,
      }),

      // 9. Inventory issued (stock movements performed by this tech)
      db.stockMovement.findMany({
        where: {
          performedBy: id,
          tenantId,
          type: 'stock_out',
        },
        select: {
          id: true, itemId: true, quantity: true, unitCost: true,
          reason: true, referenceNo: true, referenceType: true,
          createdAt: true,
          item: { select: { name: true, sku: true, itemCode: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // 10. Leave history (last 10)
      db.leaveRequest.findMany({
        where: { userId: id, tenantId },
        select: {
          id: true, type: true, startDate: true, endDate: true, days: true,
          reason: true, status: true, approvedBy: true, approvedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // 11. Current leave (active approved leave)
      db.leaveRequest.findFirst({
        where: {
          userId: id,
          tenantId,
          status: 'APPROVED',
          startDate: { lte: now },
          endDate: { gte: now },
        },
        select: { id: true, type: true, startDate: true, endDate: true, reason: true },
      }),
    ]);

    // --- Compute performance summary ---
    const ratingsWithValues = monthlyRatings.filter(r => r.customerRating !== null);
    const avgRating = ratingsWithValues.length > 0
      ? parseFloat((ratingsWithValues.reduce((sum, r) => sum + (r.customerRating ?? 0), 0) / ratingsWithValues.length).toFixed(1))
      : null;

    // --- Build response ---
    return NextResponse.json({
      // Basic info
      id: technician.id,
      name: technician.name,
      email: technician.email,
      phone: technician.phone,
      avatar: technician.avatar,
      employeeNumber: technician.employeeNumber,
      role: technician.role,
      isOnline: technician.isOnline,
      gpsLocation: technician.gpsLocation,
      profileCompleted: technician.profileCompleted,
      createdAt: technician.createdAt.toISOString(),
      updatedAt: technician.updatedAt.toISOString(),
      lastLogin: technician.lastLogin?.toISOString() || null,

      // Department
      department: technician.department ? {
        id: technician.department.id,
        name: technician.department.name,
        description: technician.department.description,
        headName: departmentHead,
      } : null,

      // Current complaints (active)
      activeComplaints: activeComplaints.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        status: c.status,
        priority: c.priority,
        category: c.category,
        assignedAt: c.assignedAt?.toISOString() || null,
        acceptedAt: c.acceptedAt?.toISOString() || null,
        startedAt: c.startedAt?.toISOString() || null,
        createdAt: c.createdAt.toISOString(),
        customer: c.customer,
        equipment: c.equipment,
      })),

      // Current work orders (active)
      activeWorkOrders: activeWorkOrders.map(wo => ({
        id: wo.id,
        workOrderNumber: wo.workOrderNumber,
        title: wo.title,
        description: wo.description,
        status: wo.status,
        priority: wo.priority,
        type: wo.type,
        scheduledDate: wo.scheduledDate?.toISOString() || null,
        dueDate: wo.dueDate?.toISOString() || null,
        startedAt: wo.startedAt?.toISOString() || null,
        laborHours: wo.laborHours,
        totalCost: wo.totalCost,
        customer: wo.customer,
      })),

      // Today's attendance
      todayAttendance: todayAttendance ? {
        id: todayAttendance.id,
        date: todayAttendance.date.toISOString(),
        checkIn: todayAttendance.checkIn?.toISOString() || null,
        checkOut: todayAttendance.checkOut?.toISOString() || null,
        hoursWorked: todayAttendance.hoursWorked,
        status: todayAttendance.status,
        checkInGps: todayAttendance.checkInGps,
        checkOutGps: todayAttendance.checkOutGps,
      } : null,

      // Today's timeline
      todayTimeline: todayTimeline.map(entry => ({
        id: entry.id,
        complaintId: entry.complaintId,
        action: entry.action,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        description: entry.description,
        performedBy: entry.performedBy,
        performedByRole: entry.performedByRole,
        createdAt: entry.createdAt.toISOString(),
      })),

      // Performance summary
      performance: {
        completedThisMonth: monthlyCompleted,
        avgCompletionTimeHours: monthlyAvgTime,
        totalRatingsReceived: ratingsWithValues.length,
        averageRating: avgRating,
      },

      // Inventory issued
      inventoryIssued: stockMovements.map(m => ({
        id: m.id,
        itemName: m.item?.name || 'Unknown',
        itemSku: m.item?.sku || null,
        itemCode: m.item?.itemCode || null,
        quantity: m.quantity,
        unitCost: m.unitCost,
        totalValue: m.quantity * m.unitCost,
        reason: m.reason,
        referenceNo: m.referenceNo,
        referenceType: m.referenceType,
        issuedAt: m.createdAt.toISOString(),
      })),

      // Leave history
      leaveHistory: leaveHistory.map(l => ({
        id: l.id,
        type: l.type,
        startDate: l.startDate.toISOString(),
        endDate: l.endDate.toISOString(),
        days: l.days,
        reason: l.reason,
        status: l.status,
        approvedBy: l.approvedBy,
        approvedAt: l.approvedAt?.toISOString() || null,
        createdAt: l.createdAt.toISOString(),
      })),

      // Current leave status
      onLeave: !!currentLeave,
      currentLeave: currentLeave ? {
        id: currentLeave.id,
        type: currentLeave.type,
        startDate: currentLeave.startDate.toISOString(),
        endDate: currentLeave.endDate.toISOString(),
        reason: currentLeave.reason,
      } : null,
    });
  } catch (error) {
    console.error('Technician detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}