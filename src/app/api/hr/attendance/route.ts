import { NextRequest, NextResponse } from 'next/server';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { db } from '@/core/database/db';
import type { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const { searchParams } = request.nextUrl;
    const view = searchParams.get('view') || '';

    // Calendar view — return attendance map for a given month
    if (view === 'calendar') {
      const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
      const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      // Get current user's attendance for the month
      const currentUserId = userId as string;
      const records = await db.attendance.findMany({
        where: {
          tenantId,
          userId: currentUserId,
          date: { gte: startDate, lte: endDate },
        },
        select: { date: true, status: true },
        orderBy: { date: 'asc' },
      });

      // Build calendar days array
      const daysInMonth = new Date(year, month, 0).getDate();
      const calendarDays = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const fullDate = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const record = records.find((r) => {
          const rd = r.date.toISOString().split('T')[0];
          return rd === fullDate;
        });
        calendarDays.push({
          date: d,
          fullDate,
          status: record?.status || null,
        });
      }

      return NextResponse.json({ calendarDays, month, year });
    }

    // Standard paginated list view
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.AttendanceWhereInput = { tenantId };

    if (search) {
      // Will filter by user name after fetching
    }
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const [items, total] = await Promise.all([
      db.attendance.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { date: 'desc' },
      }),
      db.attendance.count({ where }),
    ]);

    // Fetch user names
    const userIds = [...new Set(items.map((a) => a.userId))];
    const users = userIds.length > 0
      ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    // Apply search filter on user names
    const filtered = search
      ? items.filter((a) => (userMap.get(a.userId) || '').toLowerCase().includes(search.toLowerCase()))
      : items;

    // Today stats for this tenant
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayRecords = await db.attendance.findMany({
      where: {
        tenantId,
        date: { gte: today, lt: tomorrow },
      },
      select: { status: true },
    });

    const todayStats = {
      present: todayRecords.filter((r) => r.status === 'present').length,
      absent: todayRecords.filter((r) => r.status === 'absent').length,
      late: todayRecords.filter((r) => r.status === 'late').length,
      half_day: todayRecords.filter((r) => r.status === 'half_day').length,
      leave: todayRecords.filter((r) => r.status === 'leave').length,
    };

    const data = filtered.map((a) => ({
      id: a.id,
      tenantId: a.tenantId,
      userId: a.userId,
      userName: userMap.get(a.userId) || 'Unknown',
      date: a.date.toISOString(),
      checkIn: a.checkIn?.toISOString() || null,
      checkOut: a.checkOut?.toISOString() || null,
      hoursWorked: a.hoursWorked,
      status: a.status,
      checkInGps: a.checkInGps,
      checkOutGps: a.checkOutGps,
      notes: a.notes,
      createdAt: a.createdAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      todayStats,
    });
  } catch (error) {
    console.error('Attendance list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const body = await request.json();
    const { action, userId, notes, gps } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'userId and action are required' }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (action === 'checkIn') {
      // Find or create today's attendance record
      const existing = await db.attendance.findUnique({
        where: { tenantId_userId_date: { tenantId, userId, date: today } },
      });

      if (existing) {
        if (existing.checkIn) {
          return NextResponse.json({ error: 'Already checked in today' }, { status: 400 });
        }
        // Determine status based on time
        const now = new Date();
        const lateThreshold = new Date(today);
        lateThreshold.setHours(9, 0, 0, 0); // 9:00 AM
        const status = now > lateThreshold ? 'late' : 'present';

        const updated = await db.attendance.update({
          where: { id: existing.id },
          data: {
            checkIn: now,
            checkInGps: gps || null,
            status,
            notes: notes || existing.notes,
          },
        });
        return NextResponse.json({ id: updated.id, status: updated.status, checkIn: updated.checkIn?.toISOString() });
      }

      // Determine status
      const now = new Date();
      const lateThreshold = new Date(today);
      lateThreshold.setHours(9, 0, 0, 0);
      const status = now > lateThreshold ? 'late' : 'present';

      const record = await db.attendance.create({
        data: {
          tenantId,
          userId,
          date: today,
          checkIn: now,
          checkInGps: gps || null,
          status,
          notes: notes || null,
        },
      });
      return NextResponse.json({ id: record.id, status: record.status, checkIn: record.checkIn?.toISOString() }, { status: 201 });
    }

    if (action === 'checkOut') {
      const existing = await db.attendance.findUnique({
        where: { tenantId_userId_date: { tenantId, userId, date: today } },
      });

      if (!existing || !existing.checkIn) {
        return NextResponse.json({ error: 'No check-in found for today' }, { status: 400 });
      }
      if (existing.checkOut) {
        return NextResponse.json({ error: 'Already checked out today' }, { status: 400 });
      }

      const now = new Date();
      const hoursWorked = (now.getTime() - existing.checkIn.getTime()) / (1000 * 60 * 60);

      // Determine if half day
      let status = existing.status;
      if (hoursWorked < 5) {
        status = 'half_day';
      } else if (status === 'late') {
        status = 'late'; // Keep late status
      } else {
        status = 'present';
      }

      const updated = await db.attendance.update({
        where: { id: existing.id },
        data: {
          checkOut: now,
          checkOutGps: gps || null,
          hoursWorked,
          status,
          notes: notes || existing.notes,
        },
      });
      return NextResponse.json({ id: updated.id, status: updated.status, hoursWorked: updated.hoursWorked, checkOut: updated.checkOut?.toISOString() });
    }

    return NextResponse.json({ error: 'Invalid action. Use checkIn or checkOut.' }, { status: 400 });
  } catch (error) {
    console.error('Attendance action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}