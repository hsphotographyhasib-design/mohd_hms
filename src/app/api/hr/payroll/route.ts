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
    const month = parseInt(request.nextUrl.searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(request.nextUrl.searchParams.get('year') || String(new Date().getFullYear()));
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '50');
    const skip = (page - 1) * pageSize;

    const where = { tenantId, month, year };

    const [records, total] = await Promise.all([
      db.hrPayroll.findMany({
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
      db.hrPayroll.count({ where }),
    ]);

    const data = records.map((r) => ({
      id: r.id,
      month: r.month,
      year: r.year,
      basicSalary: r.basicSalary,
      allowances: r.allowances,
      deductions: r.deductions,
      overtimePay: r.overtimePay,
      bonus: r.bonus,
      loanDeduction: r.loanDeduction,
      tax: r.tax,
      netPay: r.netPay,
      status: r.status,
      processedBy: r.processedBy,
      processedAt: r.processedAt?.toISOString(),
      paidAt: r.paidAt?.toISOString(),
      notes: r.notes,
      employeeId: r.employeeId,
      employeeName: r.employee?.user?.name || r.employee?.employeeId || 'Unknown',
      employeeCode: r.employee?.employeeId || '',
      department: r.employee?.department?.name || '',
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    // Stats
    const allRecords = await db.hrPayroll.findMany({
      where: { tenantId, month, year },
    });
    const stats = {
      totalAmount: allRecords.reduce((sum, r) => sum + r.netPay, 0),
      totalRecords: allRecords.length,
      draft: allRecords.filter((r) => r.status === 'DRAFT').length,
      processed: allRecords.filter((r) => r.status === 'PROCESSED').length,
      paid: allRecords.filter((r) => r.status === 'PAID').length,
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
    const { month, year, action } = body;

    if (action === 'process') {
      // Process payroll: generate records for all active employees
      const employees = await db.hrEmployee.findMany({
        where: { tenantId, status: 'active', basicSalary: { not: null } },
        include: { user: { select: { name: true } } },
      });

      if (employees.length === 0) {
        return NextResponse.json({ error: 'No active employees found with salary data' }, { status: 400 });
      }

      const m = month ?? new Date().getMonth() + 1;
      const y = year ?? new Date().getFullYear();
      const userId = auth.user.id as string;

      let created = 0;
      let skipped = 0;

      for (const emp of employees) {
        const existing = await db.hrPayroll.findUnique({
          where: { tenantId_employeeId_month_year: { tenantId, employeeId: emp.id, month: m, year: y } },
        });

        if (existing) {
          skipped++;
          continue;
        }

        const basicSalary = emp.basicSalary || 0;
        const allowances = Math.round(basicSalary * 0.1 * 100) / 100; // 10% housing allowance
        const tax = Math.round(basicSalary * 0.05 * 100) / 100; // 5% tax
        const netPay = Math.round((basicSalary + allowances - tax) * 100) / 100;

        await db.hrPayroll.create({
          data: {
            tenantId,
            employeeId: emp.id,
            month: m,
            year: y,
            basicSalary,
            allowances,
            deductions: 0,
            overtimePay: 0,
            bonus: 0,
            loanDeduction: 0,
            tax,
            netPay,
            status: 'DRAFT',
            processedBy: userId,
            processedAt: new Date(),
          },
        });
        created++;
      }

      return NextResponse.json({
        message: `Payroll processed: ${created} records created, ${skipped} skipped (already exist)`,
        created,
        skipped,
      });
    }

    // Single payroll record creation
    const { employeeId, basicSalary, allowances, deductions, overtimePay, bonus, loanDeduction, tax, netPay, notes } = body;
    if (!employeeId || !month || !year) {
      return NextResponse.json({ error: 'employeeId, month, and year are required' }, { status: 400 });
    }

    const record = await db.hrPayroll.create({
      data: {
        tenantId,
        employeeId,
        month,
        year,
        basicSalary: basicSalary || 0,
        allowances: allowances || 0,
        deductions: deductions || 0,
        overtimePay: overtimePay || 0,
        bonus: bonus || 0,
        loanDeduction: loanDeduction || 0,
        tax: tax || 0,
        netPay: netPay || 0,
        notes,
        status: 'DRAFT',
        processedBy: auth.user.id as string,
        processedAt: new Date(),
      },
    });

    return NextResponse.json({ data: record, message: 'Payroll record created' });
  } catch (error) {
    const msg = getDbFriendlyMessage(error);
    return NextResponse.json({ error: msg }, { status: 500, headers: getErrorHeaders(error) });
  }
}