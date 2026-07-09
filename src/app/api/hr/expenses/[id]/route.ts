import { NextRequest, NextResponse } from 'next/server';
import { db, getDbFriendlyMessage } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const payload = verifyToken(authHeader?.replace('Bearer ', '') || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const item = await db.hrExpenseClaim.findUnique({ where: { id }, include: { employee: { select: { user: { select: { name: true } } } } } });
    if (!item || item.tenantId !== payload.tenantId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ...item, employeeName: item.employee?.user?.name });
  } catch (error) { return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const payload = verifyToken(authHeader?.replace('Bearer ', '') || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const existing = await db.hrExpenseClaim.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== payload.tenantId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const body = await request.json();
    const updateData: Record<string, unknown> = {};
    for (const key of ['category', 'description', 'receiptUrl', 'status', 'rejectionReason']) { if (body[key] !== undefined) updateData[key] = body[key]; }
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount);
    if (body.expenseDate) updateData.expenseDate = new Date(body.expenseDate);
    if (['MANAGER_APPROVED', 'HR_APPROVED'].includes(body.status)) {
      updateData.approvedBy = payload.userId || payload.sub;
      updateData.approvedAt = new Date();
    }
    if (body.status === 'PAID') updateData.paidAt = new Date();
    await db.hrExpenseClaim.update({ where: { id }, data: updateData });
    return NextResponse.json({ message: 'Updated' });
  } catch (error) { return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const payload = verifyToken(authHeader?.replace('Bearer ', '') || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const existing = await db.hrExpenseClaim.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== payload.tenantId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await db.hrExpenseClaim.delete({ where: { id } });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) { return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}