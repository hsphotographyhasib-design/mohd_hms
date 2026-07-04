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
    const items = await db.hrAssetAssignment.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, include: { employee: { select: { user: { select: { name: true } } } } } });
    const data = items.map((a) => ({
      id: a.id, employeeName: a.employee?.user?.name || '—', assetType: a.assetType, assetName: a.assetName,
      serialNumber: a.serialNumber, assignedDate: a.assignedDate.toISOString(), returnDate: a.returnDate?.toISOString(),
      status: a.status, condition: a.condition, notes: a.notes,
    }));
    return NextResponse.json({ data, total: data.length });
  } catch (error) { console.error('HR assets list error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const payload = verifyToken(authHeader?.replace('Bearer ', '') || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = payload.tenantId as string;
    const body = await request.json();
    if (!body.assetName) return NextResponse.json({ error: 'Asset name required' }, { status: 400 });
    let employeeId = '';
    if (body.employeeName) {
      const emp = await db.hrEmployee.findFirst({ where: { tenantId, user: { name: body.employeeName } } });
      if (emp) employeeId = emp.id;
    }
    const item = await db.hrAssetAssignment.create({
      data: { tenantId, employeeId: employeeId || '', assetType: body.assetType || 'laptop', assetName: body.assetName, serialNumber: body.serialNumber || null, condition: body.condition || 'new', notes: body.notes || null },
    });
    return NextResponse.json({ id: item.id, message: 'Asset assigned' }, { status: 201 });
  } catch (error) { console.error('HR assets create error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}