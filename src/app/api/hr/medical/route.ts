import { NextRequest, NextResponse } from 'next/server';
import { db, getDbFriendlyMessage } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const items = await db.hrMedicalRecord.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, include: { employee: { select: { user: { select: { name: true } } } } } });
    const data = items.map((r) => ({
      id: r.id, employeeName: r.employee?.user?.name || '—', recordType: r.recordType,
      provider: r.provider, date: r.date.toISOString(), expiryDate: r.expiryDate?.toISOString(),
      details: r.details, cost: r.cost, status: r.status,
    }));
    return NextResponse.json({ data, total: data.length });
  } catch (error) { console.error('HR medical list error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const body = await request.json();
    if (!body.date) return NextResponse.json({ error: 'Date required' }, { status: 400 });
    let employeeId = '';
    if (body.employeeName) {
      const emp = await db.hrEmployee.findFirst({ where: { tenantId, user: { name: body.employeeName } } });
      if (emp) employeeId = emp.id;
    }
    const item = await db.hrMedicalRecord.create({
      data: { tenantId, employeeId: employeeId || '', recordType: body.recordType || 'checkup', provider: body.provider || null, date: new Date(body.date), expiryDate: body.expiryDate ? new Date(body.expiryDate) : null, details: body.details || null, fileUrl: body.fileUrl || null, cost: body.cost ?? null, status: 'active' },
    });
    return NextResponse.json({ id: item.id, message: 'Record created' }, { status: 201 });
  } catch (error) { console.error('HR medical create error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}