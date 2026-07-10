import { NextRequest, NextResponse } from 'next/server';
import { db, getDbFriendlyMessage } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const items = await db.hrVisitor.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
    const data = items.map((v) => ({
      id: v.id, name: v.name, email: v.email, phone: v.phone, company: v.company,
      purpose: v.purpose, hostName: v.hostEmployeeId || null, checkIn: v.checkIn?.toISOString(),
      checkOut: v.checkOut?.toISOString(), status: v.status, idNumber: v.idNumber, badgeNumber: v.badgeNumber,
    }));
    return NextResponse.json({ data, total: data.length });
  } catch (error) { console.error('HR visitors list error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    let hostEmployeeId: string | null = null;
    if (body.hostName) {
      const emp = await db.hrEmployee.findFirst({ where: { tenantId, user: { name: body.hostName } } });
      if (emp) hostEmployeeId = emp.id;
    }
    const item = await db.hrVisitor.create({
      data: { tenantId, name: body.name, email: body.email || null, phone: body.phone || null, company: body.company || null, purpose: body.purpose || null, hostEmployeeId, idNumber: body.idNumber || null, status: 'expected' },
    });
    return NextResponse.json({ id: item.id, message: 'Visitor registered' }, { status: 201 });
  } catch (error) { console.error('HR visitors create error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}