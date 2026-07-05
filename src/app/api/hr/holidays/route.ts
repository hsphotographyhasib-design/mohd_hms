import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = auth.user.tenantId as string;
    const { searchParams } = request.nextUrl;
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const holidays = await db.hrHoliday.findMany({
      where: { tenantId },
      orderBy: { date: 'asc' },
    });

    const data = holidays.map((h) => ({
      id: h.id,
      tenantId: h.tenantId,
      name: h.name,
      date: h.date.toISOString(),
      type: h.type,
      recurring: h.recurring,
      createdAt: h.createdAt.toISOString(),
    }));

    // Filter by year if requested
    const filtered = year
      ? data.filter((h) => new Date(h.date).getFullYear() === year)
      : data;

    return NextResponse.json({ holidays: filtered, total: filtered.length });
  } catch (error) {
    console.error('Holidays list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = auth.user.tenantId as string;
    const body = await request.json();
    const { action } = body;

    // Delete action
    if (action === 'delete') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'Holiday ID is required' }, { status: 400 });

      const existing = await db.hrHoliday.findUnique({ where: { id } });
      if (!existing || existing.tenantId !== tenantId) {
        return NextResponse.json({ error: 'Holiday not found' }, { status: 404 });
      }

      await db.hrHoliday.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    // Create holiday (default action)
    const { name, date, type, recurring } = body;

    if (!name || !date) {
      return NextResponse.json({ error: 'Name and date are required' }, { status: 400 });
    }

    const holidayDate = new Date(date);

    const holiday = await db.hrHoliday.create({
      data: {
        tenantId,
        name,
        date: holidayDate,
        type: type || 'public',
        recurring: recurring || false,
      },
    });

    return NextResponse.json({
      id: holiday.id,
      tenantId: holiday.tenantId,
      name: holiday.name,
      date: holiday.date.toISOString(),
      type: holiday.type,
      recurring: holiday.recurring,
      createdAt: holiday.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Holiday create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}