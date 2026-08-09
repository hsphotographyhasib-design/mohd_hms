import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export const dynamic = 'force-dynamic';

const ACTIVE_COMPLAINT_STATUSES = ['ASSIGNED', 'ACCEPTED', 'WORK_ORDER_CREATED', 'IN_PROGRESS'] as const;
const ACTIVE_WO_STATUSES = ['PENDING', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] as const;

// Helper: safe query wrapper
async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

// Helper: safe date to ISO string
function toISO(date: unknown): string | null {
  if (date == null) return null;
  return new Date(date as string | Date).toISOString();
}

// ============ GET: Single technician full detail ============

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

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // --- Fetch technician (no relation includes) ---
    const technician: any = await safeQuery(
      () => db.user.findFirst({
        where: { id, tenantId, isActive: true, role: { in: ['technician', 'supervisor'] } },
        select: {
          id: true, name: true, email: true, phone: true, avatar: true,
          employeeNumber: true, role: true, departmentId: true, isOnline: true,
          lastLogin: true, gpsLocation: true, profileCompleted: true,
          createdAt: true, updatedAt: true,
        },
      }),
      null,
    );

    if (!technician) {
      return NextResponse.json({ error: 'Technician not found' }, { status: 404 });
    }

    // --- Fetch department separately ---
    const department: any = await safeQuery(
      () => technician.departmentId
        ? db.department.findFirst({
            where: { id: technician.departmentId, tenantId },
            select: { id: true, name: true, description: true, headId: true },
          })
        : Promise.resolve(null),
      null,
    );

    // Department head
    const departmentHead = await safeQuery(
      () => department?.headId
        ? db.user.findFirst({
            where: { id: department.headId, tenantId },
            select: { id: true, name: true },
          }).then((u: any) => u?.name || null)
        : Promise.resolve(null),
      null,
    );

    // --- Active complaints (no customer/equipment include) ---
    const activeComplaints: any[] = await safeQuery(
      () => db.complaint.findMany({
        where: {
          assignedToId: id,
          tenantId,
          status: { in: [...ACTIVE_COMPLAINT_STATUSES] },
        },
        select: {
          id: true, title: true, description: true, status: true, priority: true,
          category: true, assignedAt: true, acceptedAt: true, startedAt: true,
          createdAt: true, customerId: true, equipmentId: true,
        },
        orderBy: { priority: 'desc' },
      }),
      [],
    );

    // Fetch customers and equipment separately for complaints
    const complaintCustomerIds = [...new Set((activeComplaints || []).map((c: any) => c.customerId).filter(Boolean))] as string[];
    const complaintEquipmentIds = [...new Set((activeComplaints || []).map((c: any) => c.equipmentId).filter(Boolean))] as string[];

    const [complaintCustomers, complaintEquipments]: [any[], any[]] = await Promise.all([
      safeQuery(
        () => complaintCustomerIds.length > 0
          ? db.customer.findMany({
              where: { id: { in: complaintCustomerIds } },
              select: { id: true, name: true, phone: true, address: true },
            })
          : Promise.resolve([]),
        [],
      ),
      safeQuery(
        () => complaintEquipmentIds.length > 0
          ? db.equipment.findMany({
              where: { id: { in: complaintEquipmentIds } },
              select: { id: true, name: true, assetNumber: true, category: true },
            })
          : Promise.resolve([]),
        [],
      ),
    ]);

    const customerMap = new Map(complaintCustomers.map((c: any) => [c.id, c]));
    const equipmentMap = new Map(complaintEquipments.map((e: any) => [e.id, e]));

    // --- Active work orders (no customer include) ---
    const activeWorkOrders: any[] = await safeQuery(
      () => db.workOrder.findMany({
        where: {
          assignedToId: id,
          tenantId,
          status: { in: [...ACTIVE_WO_STATUSES] },
        },
        select: {
          id: true, workOrderNumber: true, title: true, description: true,
          status: true, priority: true, type: true, scheduledDate: true,
          dueDate: true, startedAt: true, laborHours: true, totalCost: true,
          customerId: true,
        },
        orderBy: { priority: 'desc' },
      }),
      [],
    );

    // Fetch customers for work orders
    const woCustomerIds = [...new Set((activeWorkOrders || []).map((wo: any) => wo.customerId).filter(Boolean))] as string[];
    const woCustomers: any[] = await safeQuery(
      () => woCustomerIds.length > 0
        ? db.customer.findMany({
            where: { id: { in: woCustomerIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      [],
    );
    const woCustomerMap = new Map(woCustomers.map((c: any) => [c.id, c]));

    // --- Get complaint IDs assigned to this tech (for timeline queries) ---
    const techComplaintIds: string[] = await safeQuery(
      () => db.complaint.findMany({
        where: { assignedToId: id, tenantId },
        select: { id: true },
      }).then((rows: any[]) => rows.map((r: any) => r.id)),
      [],
    );

    // --- Parallel enrichment queries ---
    const [
      todayAttendance,
      todayTimeline,
      monthlyCompleted,
      monthlyAvgTime,
      monthlyRatings,
      stockMovements,
      leaveHistory,
      currentLeave,
    ] = await Promise.all([
      // Today's attendance
      safeQuery<any>(
        () => db.attendance.findFirst({
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
        null,
      ),

      // Today's timeline (use complaintIds instead of relation filter)
      safeQuery<any[]>(
        () => techComplaintIds.length > 0
          ? db.complaintTimeline.findMany({
              where: {
                complaintId: { in: techComplaintIds },
                createdAt: { gte: todayStart, lt: todayEnd },
              },
              select: {
                id: true, complaintId: true, action: true, fromStatus: true,
                toStatus: true, description: true, performedBy: true,
                performedByRole: true, createdAt: true,
              },
              orderBy: { createdAt: 'asc' },
            })
          : Promise.resolve([]),
        [],
      ),

      // Monthly completed count
      safeQuery(
        () => db.complaint.count({
          where: {
            assignedToId: id,
            tenantId,
            status: { in: ['CLOSED', 'PAID'] },
            completedAt: { gte: monthStart },
          },
        }),
        0,
      ),

      // Monthly avg completion time
      safeQuery(
        () => db.complaint.findMany({
          where: {
            assignedToId: id,
            tenantId,
            status: { in: ['CLOSED', 'PAID'] },
            startedAt: { not: null },
            completedAt: { not: null, gte: monthStart },
          },
          select: { startedAt: true, completedAt: true },
        }).then((rows: any[]) => {
          if (!rows || rows.length === 0) return null;
          let totalMs = 0;
          for (const r of rows) {
            if (r.startedAt && r.completedAt) {
              totalMs += new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime();
            }
          }
          return parseFloat(((totalMs / rows.length) / 3_600_000).toFixed(1));
        }),
        null,
      ),

      // Customer ratings received
      safeQuery(
        () => db.complaint.findMany({
          where: {
            assignedToId: id,
            tenantId,
            customerRating: { not: null },
          },
          select: { id: true, customerRating: true, customerFeedback: true },
          take: 50,
        }),
        [],
      ),

      // Inventory issued (stock movements performed by this tech, no item include)
      safeQuery(
        () => db.stockMovement.findMany({
          where: {
            performedBy: id,
            tenantId,
            type: 'stock_out',
          },
          select: {
            id: true, itemId: true, quantity: true, unitCost: true,
            reason: true, referenceNo: true, referenceType: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        [],
      ),

      // Leave history (last 10)
      safeQuery<any[]>(
        () => db.leaveRequest.findMany({
          where: { userId: id, tenantId },
          select: {
            id: true, type: true, startDate: true, endDate: true, days: true,
            reason: true, status: true, approvedBy: true, approvedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        [],
      ),

      // Current leave (active approved leave)
      safeQuery<any>(
        () => db.leaveRequest.findFirst({
          where: {
            userId: id,
            tenantId,
            status: 'APPROVED',
            startDate: { lte: now },
            endDate: { gte: now },
          },
          select: { id: true, type: true, startDate: true, endDate: true, reason: true },
        }),
        null,
      ),
    ]);

    // Fetch items for stock movements (model is InventoryItem, FK is itemId)
    const smItemIds = [...new Set((stockMovements || []).map((m: any) => m.itemId).filter(Boolean))] as string[];
    const smItems: any[] = await safeQuery(
      () => smItemIds.length > 0
        ? db.inventoryItem.findMany({
            where: { id: { in: smItemIds } },
            select: { id: true, name: true, sku: true, itemCode: true },
          })
        : Promise.resolve([]),
      [],
    );
    const smItemMap = new Map(smItems.map((i: any) => [i.id, i]));

    // --- Compute performance summary ---
    const ratingsArr = monthlyRatings || [];
    const ratingsWithValues = ratingsArr.filter((r: any) => r.customerRating !== null);
    const avgRating = ratingsWithValues.length > 0
      ? parseFloat((ratingsWithValues.reduce((sum: number, r: any) => sum + (r.customerRating ?? 0), 0) / ratingsWithValues.length).toFixed(1))
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
      createdAt: toISO(technician.createdAt),
      updatedAt: toISO(technician.updatedAt),
      lastLogin: toISO(technician.lastLogin),

      // Department
      department: department ? {
        id: department.id,
        name: department.name,
        description: department.description,
        headName: departmentHead,
      } : null,

      // Current complaints (active)
      activeComplaints: (activeComplaints || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        status: c.status,
        priority: c.priority,
        category: c.category,
        assignedAt: toISO(c.assignedAt),
        acceptedAt: toISO(c.acceptedAt),
        startedAt: toISO(c.startedAt),
        createdAt: toISO(c.createdAt),
        customer: customerMap.get(c.customerId) || null,
        equipment: equipmentMap.get(c.equipmentId) || null,
      })),

      // Current work orders (active)
      activeWorkOrders: (activeWorkOrders || []).map((wo: any) => ({
        id: wo.id,
        workOrderNumber: wo.workOrderNumber,
        title: wo.title,
        description: wo.description,
        status: wo.status,
        priority: wo.priority,
        type: wo.type,
        scheduledDate: toISO(wo.scheduledDate),
        dueDate: toISO(wo.dueDate),
        startedAt: toISO(wo.startedAt),
        laborHours: wo.laborHours,
        totalCost: wo.totalCost,
        customer: woCustomerMap.get(wo.customerId) || null,
      })),

      // Today's attendance
      todayAttendance: todayAttendance ? {
        id: todayAttendance.id,
        date: toISO(todayAttendance.date),
        checkIn: toISO(todayAttendance.checkIn),
        checkOut: toISO(todayAttendance.checkOut),
        hoursWorked: todayAttendance.hoursWorked,
        status: todayAttendance.status,
        checkInGps: todayAttendance.checkInGps,
        checkOutGps: todayAttendance.checkOutGps,
      } : null,

      // Today's timeline
      todayTimeline: (todayTimeline || []).map((entry: any) => ({
        id: entry.id,
        complaintId: entry.complaintId,
        action: entry.action,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        description: entry.description,
        performedBy: entry.performedBy,
        performedByRole: entry.performedByRole,
        createdAt: toISO(entry.createdAt),
      })),

      // Performance summary
      performance: {
        completedThisMonth: monthlyCompleted ?? 0,
        avgCompletionTimeHours: monthlyAvgTime,
        totalRatingsReceived: ratingsWithValues.length,
        averageRating: avgRating,
      },

      // Inventory issued
      inventoryIssued: (stockMovements || []).map((m: any) => {
        const item = smItemMap.get(m.itemId);
        return {
          id: m.id,
          itemName: item?.name || 'Unknown',
          itemSku: item?.sku || null,
          itemCode: item?.itemCode || null,
          quantity: m.quantity,
          unitCost: m.unitCost,
          totalValue: m.quantity * m.unitCost,
          reason: m.reason,
          referenceNo: m.referenceNo,
          referenceType: m.referenceType,
          issuedAt: toISO(m.createdAt),
        };
      }),

      // Leave history
      leaveHistory: (leaveHistory || []).map((l: any) => ({
        id: l.id,
        type: l.type,
        startDate: toISO(l.startDate),
        endDate: toISO(l.endDate),
        days: l.days,
        reason: l.reason,
        status: l.status,
        approvedBy: l.approvedBy,
        approvedAt: toISO(l.approvedAt),
        createdAt: toISO(l.createdAt),
      })),

      // Current leave status
      onLeave: !!currentLeave,
      currentLeave: currentLeave ? {
        id: currentLeave.id,
        type: currentLeave.type,
        startDate: toISO(currentLeave.startDate),
        endDate: toISO(currentLeave.endDate),
        reason: currentLeave.reason,
      } : null,
    });
  } catch (error) {
    console.error('Technician detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
