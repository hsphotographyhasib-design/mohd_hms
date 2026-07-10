import { NextRequest, NextResponse } from 'next/server';
import { db, getDbFriendlyMessage } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const items = await db.hrDisciplinaryAction.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, include: { employee: { select: { user: { select: { name: true } } } } } });
    const data = items.map((d) => ({
      id: d.id, employeeName: d.employee?.user?.name || '—', type: d.type,
      severity: d.severity, description: d.description, incidentDate: d.incidentDate.toISOString(),
      actionTaken: d.actionTaken, status: d.status, issuedBy: d.issuedBy,
    }));
    return NextResponse.json({ data, total: data.length });
  } catch (error) { console.error('HR disciplinary list error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const body = await request.json();
    if (!body.description || !body.incidentDate) return NextResponse.json({ error: 'Description and incident date required' }, { status: 400 });
    let employeeId = '';
    if (body.employeeName) {
      const emp = await db.hrEmployee.findFirst({ where: { tenantId, user: { name: body.employeeName } } });
      if (emp) employeeId = emp.id;
    }
    const item = await db.hrDisciplinaryAction.create({
      data: { tenantId, employeeId: employeeId || '', type: body.type || 'warning', severity: body.severity || 'minor', description: body.description, incidentDate: new Date(body.incidentDate), actionTaken: body.actionTaken || null, issuedBy: userId || userId || null },
    });
    return NextResponse.json({ id: item.id, message: 'Disciplinary action recorded' }, { status: 201 });
  } catch (error) { console.error('HR disciplinary create error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}