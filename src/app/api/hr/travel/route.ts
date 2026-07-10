import { NextRequest, NextResponse } from 'next/server';
import { db, getDbFriendlyMessage } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const items = await db.hrTravelRequest.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, include: { employee: { select: { user: { select: { name: true } } } } } });
    const data = items.map((t) => ({
      id: t.id, employeeName: t.employee?.user?.name || '—', destination: t.destination,
      purpose: t.purpose, startDate: t.startDate.toISOString(), endDate: t.endDate.toISOString(),
      budget: t.budget, actualCost: t.actualCost, status: t.status, notes: t.notes,
    }));
    return NextResponse.json({ data, total: data.length });
  } catch (error) { console.error('HR travel list error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const body = await request.json();
    if (!body.destination || !body.startDate) return NextResponse.json({ error: 'Destination and start date required' }, { status: 400 });
    let employeeId = '';
    if (body.employeeName) {
      const emp = await db.hrEmployee.findFirst({ where: { tenantId, user: { name: body.employeeName } } });
      if (emp) employeeId = emp.id;
    }
    const item = await db.hrTravelRequest.create({
      data: { tenantId, employeeId: employeeId || '', destination: body.destination, purpose: body.purpose || '', startDate: new Date(body.startDate), endDate: body.endDate ? new Date(body.endDate) : new Date(body.startDate), budget: body.budget ?? null, notes: body.notes || null },
    });
    return NextResponse.json({ id: item.id, message: 'Travel request created' }, { status: 201 });
  } catch (error) { console.error('HR travel create error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}