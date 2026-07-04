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
    const authHeader = request.headers.get('authorization');
    const payload = verifyToken(authHeader?.replace('Bearer ', '') || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = payload.tenantId as string;
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