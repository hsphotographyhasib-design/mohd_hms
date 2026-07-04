import { NextRequest, NextResponse } from 'next/server';
import { db, getDbFriendlyMessage } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const payload = verifyToken(authHeader?.replace('Bearer ', '') || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = payload.tenantId as string;
    const [leaveTypes, shifts, holidays] = await Promise.all([
      db.hrLeaveType.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
      db.hrShift.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
      db.hrHoliday.findMany({ where: { tenantId }, orderBy: { date: 'asc' } }),
    ]);
    return NextResponse.json({
      leaveTypes: leaveTypes.map((lt) => ({ id: lt.id, name: lt.name, code: lt.code, daysAllowed: lt.daysAllowed, isPaid: lt.isPaid, carryForward: lt.carryForward, maxCarryDays: lt.maxCarryDays, requiresDoc: lt.requiresDoc })),
      shifts: shifts.map((s) => ({ id: s.id, name: s.name, startTime: s.startTime, endTime: s.endTime, breakMinutes: s.breakMinutes })),
      holidays: holidays.map((h) => ({ id: h.id, name: h.name, date: h.date.toISOString(), type: h.type, recurring: h.recurring })),
    });
  } catch (error) { console.error('HR settings get error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const payload = verifyToken(authHeader?.replace('Bearer ', '') || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = payload.tenantId as string;
    const body = await request.json();
    const section = body.section;
    let item;
    if (section === 'leave_types') {
      if (!body.name || !body.code) return NextResponse.json({ error: 'Name and code required' }, { status: 400 });
      item = await db.hrLeaveType.create({ data: { tenantId, name: body.name, code: body.code.toUpperCase(), daysAllowed: parseFloat(body.daysAllowed) || 0, isPaid: body.isPaid ?? true, carryForward: body.carryForward ?? false, maxCarryDays: body.maxCarryDays ? parseFloat(body.maxCarryDays) : null, requiresDoc: body.requiresDoc ?? false } });
    } else if (section === 'shifts') {
      if (!body.name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
      item = await db.hrShift.create({ data: { tenantId, name: body.name, startTime: body.startTime || '08:00', endTime: body.endTime || '17:00', breakMinutes: parseInt(body.breakMinutes) || 60 } });
    } else if (section === 'holidays') {
      if (!body.name || !body.date) return NextResponse.json({ error: 'Name and date required' }, { status: 400 });
      item = await db.hrHoliday.create({ data: { tenantId, name: body.name, date: new Date(body.date), type: body.type || 'public', recurring: body.recurring ?? false } });
    } else {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
    }
    return NextResponse.json({ id: (item as any).id, message: 'Created' }, { status: 201 });
  } catch (error) { console.error('HR settings create error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}