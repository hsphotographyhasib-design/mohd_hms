import { NextRequest, NextResponse } from 'next/server';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { db } from '@/core/database/db';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const { searchParams } = request.nextUrl;
    const view = searchParams.get('view') || '';

    // Schedules view
    if (view === 'schedules') {
      const schedules = await db.hrShiftSchedule.findMany({
        where: { tenantId },
        orderBy: { effectiveFrom: 'desc' },
        include: {
          shift: { select: { id: true, name: true, startTime: true, endTime: true, color: true } },
        },
      });

      // Get employee names via HrEmployee → User
      const empIds = [...new Set(schedules.map((s) => s.employeeId))];
      const hrEmployees = empIds.length > 0
        ? await db.hrEmployee.findMany({ where: { id: { in: empIds } }, select: { id: true, userId: true } })
        : [];
      const empUserMap = new Map(hrEmployees.map((e) => [e.id, e.userId]));
      const userIds = [...new Set(hrEmployees.map((e) => e.userId).filter(Boolean))];
      const users = userIds.length > 0
        ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
        : [];
      const userMap = new Map(users.map((u) => [u.id, u.name]));

      const data = schedules.map((s) => ({
        id: s.id,
        tenantId: s.tenantId,
        employeeId: s.employeeId,
        employeeName: userMap.get(empUserMap.get(s.employeeId) || '') || 'Unknown',
        shiftId: s.shiftId,
        shiftName: s.shift.name,
        shiftColor: s.shift.color,
        effectiveFrom: s.effectiveFrom.toISOString(),
        effectiveTo: s.effectiveTo?.toISOString() || null,
        weeklyOffDays: s.weeklyOffDays,
        createdAt: s.createdAt.toISOString(),
      }));

      return NextResponse.json({ schedules: data });
    }

    // Default: return shifts
    const shifts = await db.hrShift.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const data = shifts.map((s) => ({
      id: s.id,
      tenantId: s.tenantId,
      name: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      breakMinutes: s.breakMinutes,
      color: s.color,
      isActive: s.isActive,
      createdAt: s.createdAt.toISOString(),
    }));

    return NextResponse.json({ shifts: data });
  } catch (error) {
    console.error('Shifts list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const body = await request.json();
    const { action } = body;

    // --- Create Shift ---
    if (action === 'create') {
      const { name, startTime, endTime, breakMinutes, color, isActive } = body;

      if (!name || !startTime || !endTime) {
        return NextResponse.json({ error: 'Name, start time, and end time are required' }, { status: 400 });
      }

      const shift = await db.hrShift.create({
        data: {
          tenantId,
          name,
          startTime,
          endTime,
          breakMinutes: breakMinutes || 0,
          color: color || '#3b82f6',
          isActive: isActive !== false,
        },
      });

      return NextResponse.json({
        id: shift.id,
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        breakMinutes: shift.breakMinutes,
        color: shift.color,
        isActive: shift.isActive,
      }, { status: 201 });
    }

    // --- Update Shift ---
    if (action === 'update') {
      const { id, name, startTime, endTime, breakMinutes, color, isActive } = body;

      if (!id) {
        return NextResponse.json({ error: 'Shift ID is required' }, { status: 400 });
      }

      const existing = await db.hrShift.findUnique({ where: { id } });
      if (!existing || existing.tenantId !== tenantId) {
        return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
      }

      const shift = await db.hrShift.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(startTime && { startTime }),
          ...(endTime && { endTime }),
          ...(breakMinutes !== undefined && { breakMinutes }),
          ...(color && { color }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      return NextResponse.json({
        id: shift.id,
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        breakMinutes: shift.breakMinutes,
        color: shift.color,
        isActive: shift.isActive,
      });
    }

    // --- Delete Shift ---
    if (action === 'delete') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'Shift ID is required' }, { status: 400 });

      const existing = await db.hrShift.findUnique({ where: { id } });
      if (!existing || existing.tenantId !== tenantId) {
        return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
      }

      await db.hrShift.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    // --- Assign Shift Schedule ---
    if (action === 'assign_schedule') {
      const { employeeId, shiftId, effectiveFrom, effectiveTo, weeklyOffDays } = body;

      if (!employeeId || !shiftId || !effectiveFrom) {
        return NextResponse.json({ error: 'Employee, shift, and effective from date are required' }, { status: 400 });
      }

      const schedule = await db.hrShiftSchedule.create({
        data: {
          tenantId,
          employeeId,
          shiftId,
          effectiveFrom: new Date(effectiveFrom),
          effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
          weeklyOffDays: weeklyOffDays || '[]',
        },
      });

      return NextResponse.json({
        id: schedule.id,
        employeeId: schedule.employeeId,
        shiftId: schedule.shiftId,
        effectiveFrom: schedule.effectiveFrom.toISOString(),
        effectiveTo: schedule.effectiveTo?.toISOString() || null,
      }, { status: 201 });
    }

    // --- Delete Shift Schedule ---
    if (action === 'delete_schedule') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });

      const existing = await db.hrShiftSchedule.findUnique({ where: { id } });
      if (!existing || existing.tenantId !== tenantId) {
        return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
      }

      await db.hrShiftSchedule.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Shifts action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}