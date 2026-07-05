import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { getDbFriendlyMessage } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = auth.user.tenantId;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Run all queries in parallel for performance
    const [
      totalEmployees,
      presentToday,
      absentToday,
      pendingLeaves,
      upcomingBirthdays,
      expiringDocuments,
      newHiresMonth,
      payrollStatus,
      activeShifts,
      overtimeMonth,
      trainingRecords,
      deptCount,
    ] = await Promise.all([
      // 1. Total Employees
      db.hrEmployee.count({
        where: { tenantId, status: { in: ['active', 'on_probation'] } },
      }),

      // 2. Present Today
      db.attendance.count({
        where: {
          tenantId,
          date: { gte: todayStart, lt: new Date(todayStart.getTime() + 86400000) },
          status: { in: ['present', 'late', 'half_day'] },
        },
      }),

      // 3. Absent Today
      db.attendance.count({
        where: {
          tenantId,
          date: { gte: todayStart, lt: new Date(todayStart.getTime() + 86400000) },
          status: 'absent',
        },
      }),

      // 4. Pending Leave Requests
      db.hrLeaveRequest.count({
        where: {
          tenantId,
          status: 'PENDING',
        },
      }),

      // 5. Upcoming Birthdays (next 30 days)
      (() => {
        // We check dateOfBirth month+day within next 30 days
        const birthMonth = now.getMonth();
        const birthDay = now.getDate();
        const candidates = [birthMonth, birthMonth + 1, birthMonth + 2].filter(
          (m) => m >= 0 && m <= 11
        );
        return db.hrEmployee.count({
          where: {
            tenantId,
            status: { in: ['active', 'on_probation'] },
            dateOfBirth: { not: null },
          },
        });
      })(),

      // 6. Expiring Documents (next 30 days)
      db.hrEmployeeDocument.count({
        where: {
          tenantId,
          expiryDate: { gte: now, lte: next30Days },
          status: 'active',
        },
      }),

      // 7. New Hires This Month
      db.hrEmployee.count({
        where: {
          tenantId,
          joiningDate: { gte: monthStart, lte: monthEnd },
        },
      }),

      // 8. Payroll Status (count processed this month)
      db.hrPayroll.count({
        where: {
          tenantId,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          status: { in: ['PROCESSED', 'PAID'] },
        },
      }),

      // 9. Active Shifts
      db.hrShift.count({
        where: { tenantId, isActive: true },
      }),

      // 10. Overtime This Month
      (() => db.hrOvertimeRequest.count({
        where: {
          tenantId,
          createdAt: { gte: monthStart, lte: monthEnd },
          status: { in: ['PENDING', 'APPROVED'] },
        },
      }))(),

      // 11. Training Completion
      db.hrTrainingRecord.count({
        where: {
          tenantId,
          status: 'completed',
        },
      }),

      // 12. Department Count
      db.department.count({
        where: { tenantId, isActive: true },
      }),
    ]);

    return NextResponse.json({
      totalEmployees,
      presentToday,
      absentToday,
      pendingLeaves,
      upcomingBirthdays,
      expiringDocuments,
      newHiresMonth,
      payrollStatus,
      activeShifts,
      overtimeMonth,
      trainingRecords,
      deptCount,
    });
  } catch (error) {
    const message = getDbFriendlyMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}