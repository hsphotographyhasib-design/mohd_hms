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
    const view = request.nextUrl.searchParams.get('view');

    if (view === 'records') {
      const items = await db.hrTrainingRecord.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, include: { employee: { select: { user: { select: { name: true } } } }, training: { select: { title: true } } } });
      const data = items.map((r) => ({ id: r.id, employeeName: r.employee?.user?.name || '—', trainingTitle: r.training?.title, score: r.score, status: r.status, certificateUrl: r.certificateUrl, completedAt: r.completedAt?.toISOString() }));
      return NextResponse.json({ data, total: data.length });
    }

    const items = await db.hrTraining.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, include: { records: { select: { id: true } } } });
    const data = items.map((c) => ({ id: c.id, title: c.title, provider: c.provider, startDate: c.startDate.toISOString(), endDate: c.endDate.toISOString(), cost: c.cost, status: c.status, enrolledCount: c.records.length }));
    return NextResponse.json({ data, total: data.length });
  } catch (error) { console.error('HR training list error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const payload = verifyToken(authHeader?.replace('Bearer ', '') || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = payload.tenantId as string;
    const body = await request.json();
    if (!body.title || !body.startDate) return NextResponse.json({ error: 'Title and start date required' }, { status: 400 });
    const item = await db.hrTraining.create({
      data: { tenantId, title: body.title, description: body.description || null, provider: body.provider || null, location: body.location || null, startDate: new Date(body.startDate), endDate: body.endDate ? new Date(body.endDate) : new Date(body.startDate), cost: body.cost ?? null, maxParticipants: body.maxParticipants ?? null, status: body.status || 'planned' },
    });
    return NextResponse.json({ id: item.id, message: 'Course created' }, { status: 201 });
  } catch (error) { console.error('HR training create error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}