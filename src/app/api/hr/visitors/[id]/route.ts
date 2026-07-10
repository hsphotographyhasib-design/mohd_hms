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
    const item = await db.hrVisitor.findUnique({ where: { id } });
    if (!item || item.tenantId !== tenantId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(item);
  } catch (error) { return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const { id } = await params;
    const existing = await db.hrVisitor.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const body = await request.json();
    const updateData: Record<string, unknown> = {};
    for (const key of ['name', 'email', 'phone', 'company', 'purpose', 'status', 'idNumber', 'badgeNumber']) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }
    if (body.checkIn) updateData.checkIn = new Date(body.checkIn);
    if (body.checkOut) updateData.checkOut = new Date(body.checkOut);
    await db.hrVisitor.update({ where: { id }, data: updateData });
    return NextResponse.json({ message: 'Updated' });
  } catch (error) { return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const { id } = await params;
    const existing = await db.hrVisitor.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await db.hrVisitor.delete({ where: { id } });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) { return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}