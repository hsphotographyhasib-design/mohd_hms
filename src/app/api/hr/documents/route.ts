import { NextRequest, NextResponse } from 'next/server';
import { db, getDbFriendlyMessage } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const payload = verifyToken(authHeader?.replace('Bearer ', '') || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = payload.tenantId as string;
    const items = await db.hrEmployeeDocument.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, include: { employee: { select: { user: { select: { name: true } } } } } });
    const data = items.map((d) => ({
      id: d.id, employeeName: d.employee?.user?.name || '—', documentType: d.documentType, title: d.title,
      fileUrl: d.fileUrl, expiryDate: d.expiryDate?.toISOString(), reminderDays: d.reminderDays,
      status: d.status, uploadedAt: d.uploadedAt.toISOString(), createdAt: d.createdAt.toISOString(),
    }));
    return NextResponse.json({ data, total: data.length });
  } catch (error) { console.error('HR documents list error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const payload = verifyToken(authHeader?.replace('Bearer ', '') || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = payload.tenantId as string;
    const body = await request.json();
    if (!body.title || !body.fileUrl) return NextResponse.json({ error: 'Title and file URL required' }, { status: 400 });
    let employeeId = '';
    if (body.employeeName) {
      const emp = await db.hrEmployee.findFirst({ where: { tenantId, user: { name: body.employeeName } } });
      if (emp) employeeId = emp.id;
    }
    const item = await db.hrEmployeeDocument.create({
      data: { tenantId, employeeId: employeeId || '', documentType: body.documentType || 'other', title: body.title, fileUrl: body.fileUrl, expiryDate: body.expiryDate ? new Date(body.expiryDate) : null, reminderDays: body.reminderDays || 30, status: 'active' },
    });
    return NextResponse.json({ id: item.id, message: 'Document uploaded' }, { status: 201 });
  } catch (error) { console.error('HR documents create error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}