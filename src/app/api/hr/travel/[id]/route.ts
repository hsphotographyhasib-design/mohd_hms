import { NextRequest, NextResponse } from 'next/server';
import { db, getDbFriendlyMessage } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const { id } = await params;
    const item = await db.hrTravelRequest.findUnique({ where: { id }, include: { employee: { select: { user: { select: { name: true } } } } } });
    if (!item || item.tenantId !== tenantId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ...item, employeeName: item.employee?.user?.name });
  } catch (error) { return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const { id } = await params;
    const existing = await db.hrTravelRequest.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const body = await request.json();
    const updateData: Record<string, unknown> = {};
    for (const key of ['destination', 'purpose', 'status', 'notes', 'rejectionReason']) { if (body[key] !== undefined) updateData[key] = body[key]; }
    for (const key of ['budget', 'actualCost']) { if (body[key] !== undefined) updateData[key] = body[key] !== '' ? parseFloat(body[key]) : null; }
    if (body.startDate) updateData.startDate = new Date(body.startDate);
    if (body.endDate) updateData.endDate = new Date(body.endDate);
    if (body.status && ['MANAGER_APPROVED', 'HR_APPROVED'].includes(body.status)) {
      updateData.approvedBy = userId || userId;
      updateData.approvedAt = new Date();
    }
    if (body.status === 'COMPLETED') updateData.actualCost = body.actualCost || 0;
    await db.hrTravelRequest.update({ where: { id }, data: updateData });
    return NextResponse.json({ message: 'Updated' });
  } catch (error) { return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const { id } = await params;
    const existing = await db.hrTravelRequest.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await db.hrTravelRequest.delete({ where: { id } });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) { return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}