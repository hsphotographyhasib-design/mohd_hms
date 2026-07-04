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
    const authHeader = request.headers.get('authorization');
    const payload = verifyToken(authHeader?.replace('Bearer ', '') || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = payload.tenantId as string;
    const body = await request.json();
    if (!body.description || !body.incidentDate) return NextResponse.json({ error: 'Description and incident date required' }, { status: 400 });
    let employeeId = '';
    if (body.employeeName) {
      const emp = await db.hrEmployee.findFirst({ where: { tenantId, user: { name: body.employeeName } } });
      if (emp) employeeId = emp.id;
    }
    const item = await db.hrDisciplinaryAction.create({
      data: { tenantId, employeeId: employeeId || '', type: body.type || 'warning', severity: body.severity || 'minor', description: body.description, incidentDate: new Date(body.incidentDate), actionTaken: body.actionTaken || null, issuedBy: payload.userId || payload.sub || null },
    });
    return NextResponse.json({ id: item.id, message: 'Disciplinary action recorded' }, { status: 201 });
  } catch (error) { console.error('HR disciplinary create error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}