import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyAuth } from '@/core/auth/auth-lib';
import { getDbFriendlyMessage, getErrorHeaders } from '@/core/database/db';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = auth.user.tenantId as string;
    const status = request.nextUrl.searchParams.get('status') || '';
    const employeeId = request.nextUrl.searchParams.get('employeeId') || '';
    const dateFrom = request.nextUrl.searchParams.get('dateFrom') || '';
    const dateTo = request.nextUrl.searchParams.get('dateTo') || '';
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '50');
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, unknown> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      where.date = dateFilter;
    }

    const [records, total] = await Promise.all([
      db.hrOvertimeRequest.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            include: {
              department: { select: { name: true } },
              user: { select: { name: true, email: true } },
            },
          },
        },
      }),
      db.hrOvertimeRequest.count({ where }),
    ]);

    const data = records.map((r) => ({
      id: r.id,
      date: r.date.toISOString(),
      hours: r.hours,
      reason: r.reason,
      status: r.status,
      rate: r.rate,
      totalPay: r.totalPay,
      supervisorId: r.supervisorId,
      supervisorApprovedAt: r.supervisorApprovedAt?.toISOString(),
      hrOfficerId: r.hrOfficerId,
      hrApprovedAt: r.hrApprovedAt?.toISOString(),
      payrollId: r.payrollId,
      employeeId: r.employeeId,
      employeeName: r.employee?.user?.name || r.employee?.employeeId || 'Unknown',
      employeeCode: r.employee?.employeeId || '',
      department: r.employee?.department?.name || '',
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    // Stats
    const allRecords = await db.hrOvertimeRequest.findMany({ where: { tenantId } });
    const stats = {
      pending: allRecords.filter((r) => r.status === 'PENDING').length,
      supervisorApproved: allRecords.filter((r) => r.status === 'SUPERVISOR_APPROVED').length,
      hrApproved: allRecords.filter((r) => r.status === 'HR_APPROVED').length,
      rejected: allRecords.filter((r) => r.status === 'REJECTED').length,
      totalHours: allRecords.reduce((sum, r) => sum + r.hours, 0),
      totalAmount: allRecords.reduce((sum, r) => sum + (r.totalPay || 0), 0),
    };

    return NextResponse.json({ data, total, stats, page, pageSize });
  } catch (error) {
    const msg = getDbFriendlyMessage(error);
    return NextResponse.json({ error: msg }, { status: 500, headers: getErrorHeaders(error) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = auth.user.tenantId as string;
    const body = await request.json();
    const { employeeId, date, hours, reason, rate } = body;

    if (!employeeId || !date || !hours || hours <= 0) {
      return NextResponse.json({ error: 'employeeId, date, and hours (> 0) are required' }, { status: 400 });
    }

    const emp = await db.hrEmployee.findFirst({
      where: { id: employeeId, tenantId },
      select: { basicSalary: true },
    });

    const hourlyRate = rate || (emp?.basicSalary ? Math.round((emp.basicSalary / 160) * 100) / 100 : 0);
    const totalPay = Math.round(hours * hourlyRate * 1.5 * 100) / 100; // 1.5x OT rate

    const record = await db.hrOvertimeRequest.create({
      data: {
        tenantId,
        employeeId,
        date: new Date(date),
        hours,
        reason,
        rate: hourlyRate,
        totalPay,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ data: record, message: 'OT request created' });
  } catch (error) {
    const msg = getDbFriendlyMessage(error);
    return NextResponse.json({ error: msg }, { status: 500, headers: getErrorHeaders(error) });
  }
}