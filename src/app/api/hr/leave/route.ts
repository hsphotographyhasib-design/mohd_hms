import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = auth.user.tenantId as string;
    const { searchParams } = request.nextUrl;
    const view = searchParams.get('view') || '';

    // Meta view — return leave types and balances
    if (view === 'meta') {
      // Find HrEmployee for the current user
      const hrEmp = await db.hrEmployee.findUnique({
        where: { userId: auth.user.userId as string },
        select: { id: true },
      });

      const [leaveTypes, balances] = await Promise.all([
        db.hrLeaveType.findMany({
          where: { tenantId, isActive: true },
          orderBy: { name: 'asc' },
        }),
        hrEmp
          ? db.hrLeaveBalance.findMany({
              where: {
                tenantId,
                year: new Date().getFullYear(),
                employeeId: hrEmp.id,
              },
              include: { leaveType: { select: { name: true } } },
            })
          : Promise.resolve([]),
      ]);

      const balanceSummary = balances.map((b) => ({
        leaveTypeName: b.leaveType.name,
        totalDays: b.totalDays,
        usedDays: b.usedDays,
        remaining: b.totalDays - b.usedDays + b.carriedDays,
      }));

      return NextResponse.json({
        leaveTypes: leaveTypes.map((lt) => ({ id: lt.id, name: lt.name, code: lt.code, daysAllowed: lt.daysAllowed, isPaid: lt.isPaid })),
        balances: balanceSummary,
      });
    }

    // Standard paginated list
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const leaveTypeId = searchParams.get('leaveTypeId') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.HrLeaveRequestWhereInput = { tenantId };
    if (status) where.status = status;
    if (leaveTypeId) where.leaveTypeId = leaveTypeId;

    const [items, total] = await Promise.all([
      db.hrLeaveRequest.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          leaveType: { select: { id: true, name: true, code: true } },
        },
      }),
      db.hrLeaveRequest.count({ where }),
    ]);

    // Fetch employee names via HrEmployee → User mapping
    const empIds = [...new Set(items.map((lr) => lr.employeeId))];
    const hrEmployees = empIds.length > 0
      ? await db.hrEmployee.findMany({ where: { id: { in: empIds } }, select: { id: true, userId: true } })
      : [];
    const empUserMap = new Map(hrEmployees.map((e) => [e.id, e.userId]));
    const userIds = [...new Set(hrEmployees.map((e) => e.userId).filter(Boolean))];
    const users = userIds.length > 0
      ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    // Apply search filter on employee name and map data
    let filtered = items;
    if (search) {
      filtered = items.filter((lr) => {
        const userId = empUserMap.get(lr.employeeId);
        const name = userId ? (userMap.get(userId) || '') : '';
        return name.toLowerCase().includes(search.toLowerCase());
      });
    }

    const data = filtered.map((lr) => {
      const userId = empUserMap.get(lr.employeeId);
      return {
        id: lr.id,
        tenantId: lr.tenantId,
        employeeId: lr.employeeId,
        employeeName: userId ? (userMap.get(userId) || 'Unknown') : 'Unknown',
        leaveTypeId: lr.leaveTypeId,
        leaveTypeName: lr.leaveType?.name || 'Unknown',
        startDate: lr.startDate.toISOString(),
        endDate: lr.endDate.toISOString(),
        days: lr.days,
        reason: lr.reason,
        status: lr.status,
        attachmentUrl: lr.attachmentUrl,
        supervisorApprovedAt: lr.supervisorApprovedAt?.toISOString() || null,
        hrApprovedAt: lr.hrApprovedAt?.toISOString() || null,
        rejectionReason: lr.rejectionReason,
        createdAt: lr.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Leave requests list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = auth.user.tenantId as string;
    const body = await request.json();
    const { employeeId, leaveTypeId, startDate, endDate, reason, attachment } = body;

    if (!employeeId || !leaveTypeId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Employee, leave type, start date, and end date are required' }, { status: 400 });
    }

    // Resolve employeeId: could be a User ID or HrEmployee ID
    let hrEmployee = await db.hrEmployee.findUnique({ where: { id: employeeId }, select: { id: true, userId: true } });
    if (!hrEmployee) {
      // Try finding by userId
      hrEmployee = await db.hrEmployee.findUnique({ where: { userId: employeeId }, select: { id: true, userId: true } });
    }
    if (!hrEmployee) {
      return NextResponse.json({ error: 'Employee not found in HR records' }, { status: 404 });
    }
    const resolvedEmployeeId = hrEmployee.id;

    // Calculate days (excluding weekends)
    const start = new Date(startDate);
    const end = new Date(endDate);
    let days = 0;
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) days += 1;
      current.setDate(current.getDate() + 1);
    }

    if (days <= 0) {
      return NextResponse.json({ error: 'Leave must span at least 1 working day' }, { status: 400 });
    }

    // Check leave balance
    const balance = await db.hrLeaveBalance.findUnique({
      where: {
        tenantId_employeeId_leaveTypeId_year: {
          tenantId,
          employeeId: resolvedEmployeeId,
          leaveTypeId,
          year: start.getFullYear(),
        },
      },
    });

    if (balance) {
      const remaining = balance.totalDays - balance.usedDays + balance.carriedDays;
      if (days > remaining) {
        return NextResponse.json({ error: `Insufficient leave balance. Remaining: ${remaining} days` }, { status: 400 });
      }
    }

    const leaveRequest = await db.hrLeaveRequest.create({
      data: {
        tenantId,
        employeeId: resolvedEmployeeId,
        leaveTypeId,
        startDate: start,
        endDate: end,
        days,
        reason: reason || null,
        attachmentUrl: attachment || null,
        status: 'PENDING',
      },
      include: {
        leaveType: { select: { name: true } },
      },
    });

    // Get employee name for response
    const hrEmp = await db.hrEmployee.findUnique({ where: { id: employeeId }, select: { userId: true } });
    let employeeName = 'Unknown';
    if (hrEmp?.userId) {
      const user = await db.user.findUnique({ where: { id: hrEmp.userId }, select: { name: true } });
      employeeName = user?.name || 'Unknown';
    }

    return NextResponse.json({
      id: leaveRequest.id,
      tenantId: leaveRequest.tenantId,
      employeeId: leaveRequest.employeeId,
      employeeName,
      leaveTypeId: leaveRequest.leaveTypeId,
      leaveTypeName: leaveRequest.leaveType?.name || 'Unknown',
      startDate: leaveRequest.startDate.toISOString(),
      endDate: leaveRequest.endDate.toISOString(),
      days: leaveRequest.days,
      status: leaveRequest.status,
      createdAt: leaveRequest.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Leave request create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}