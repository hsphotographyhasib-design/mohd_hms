import { NextRequest, NextResponse } from 'next/server';
import { db, getDbFriendlyMessage } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const { id } = await params;
    // Try all three tables
    const leaveType = await db.hrLeaveType.findUnique({ where: { id } });
    if (leaveType && leaveType.tenantId === tenantId) return NextResponse.json({ ...leaveType, section: 'leave_types' });
    const shift = await db.hrShift.findUnique({ where: { id } });
    if (shift && shift.tenantId === tenantId) return NextResponse.json({ ...shift, section: 'shifts' });
    const holiday = await db.hrHoliday.findUnique({ where: { id } });
    if (holiday && holiday.tenantId === tenantId) return NextResponse.json({ ...holiday, section: 'holidays' });
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) { return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const { id } = await params;
    const body = await request.json();
    const section = body.section;

    if (section === 'leave_types') {
      const existing = await db.hrLeaveType.findUnique({ where: { id } });
      if (!existing || existing.tenantId !== tenantId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const data: Record<string, unknown> = {};
      for (const key of ['name', 'code', 'isPaid', 'carryForward', 'requiresDoc']) { if (body[key] !== undefined) data[key] = body[key]; }
      for (const key of ['daysAllowed', 'maxCarryDays']) { if (body[key] !== undefined) data[key] = body[key] !== '' ? parseFloat(body[key]) : null; }
      await db.hrLeaveType.update({ where: { id }, data });
    } else if (section === 'shifts') {
      const existing = await db.hrShift.findUnique({ where: { id } });
      if (!existing || existing.tenantId !== tenantId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const data: Record<string, unknown> = {};
      for (const key of ['name', 'startTime', 'endTime']) { if (body[key] !== undefined) data[key] = body[key]; }
      if (body.breakMinutes !== undefined) data.breakMinutes = parseInt(body.breakMinutes);
      await db.hrShift.update({ where: { id }, data });
    } else if (section === 'holidays') {
      const existing = await db.hrHoliday.findUnique({ where: { id } });
      if (!existing || existing.tenantId !== tenantId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const data: Record<string, unknown> = {};
      for (const key of ['name', 'type', 'recurring']) { if (body[key] !== undefined) data[key] = body[key]; }
      if (body.date) data.date = new Date(body.date);
      await db.hrHoliday.update({ where: { id }, data });
    } else {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Updated' });
  } catch (error) { return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const { id } = await params;
    // Try deleting from all three tables
    const leaveType = await db.hrLeaveType.findUnique({ where: { id } });
    if (leaveType && leaveType.tenantId === tenantId) { await db.hrLeaveType.delete({ where: { id } }); return NextResponse.json({ message: 'Deleted' }); }
    const shift = await db.hrShift.findUnique({ where: { id } });
    if (shift && shift.tenantId === tenantId) { await db.hrShift.delete({ where: { id } }); return NextResponse.json({ message: 'Deleted' }); }
    const holiday = await db.hrHoliday.findUnique({ where: { id } });
    if (holiday && holiday.tenantId === tenantId) { await db.hrHoliday.delete({ where: { id } }); return NextResponse.json({ message: 'Deleted' }); }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) { return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}