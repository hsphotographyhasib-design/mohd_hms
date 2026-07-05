import { NextRequest, NextResponse } from 'next/server';
import { db, getDbFriendlyMessage } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const payload = verifyToken(authHeader?.replace('Bearer ', '') || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const item = await db.hrTraining.findUnique({ where: { id }, include: { records: true } });
    if (!item || item.tenantId !== payload.tenantId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(item);
  } catch (error) { return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const payload = verifyToken(authHeader?.replace('Bearer ', '') || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const existing = await db.hrTraining.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== payload.tenantId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const body = await request.json();
    const updateData: Record<string, unknown> = {};
    for (const key of ['title', 'description', 'provider', 'location', 'status']) { if (body[key] !== undefined) updateData[key] = body[key]; }
    for (const key of ['cost', 'maxParticipants']) { if (body[key] !== undefined) updateData[key] = body[key] !== '' ? parseFloat(body[key]) : null; }
    for (const key of ['startDate', 'endDate']) { if (body[key]) updateData[key] = new Date(body[key]); }
    await db.hrTraining.update({ where: { id }, data: updateData });
    return NextResponse.json({ message: 'Updated' });
  } catch (error) { return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const payload = verifyToken(authHeader?.replace('Bearer ', '') || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const existing = await db.hrTraining.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== payload.tenantId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await db.hrTraining.delete({ where: { id } });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) { return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}