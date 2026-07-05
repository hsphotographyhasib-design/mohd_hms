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
    const items = await db.hrPerformanceReview.findMany({
      where: { tenantId }, orderBy: { createdAt: 'desc' },
      include: { employee: { select: { employeeId: true, status: true, user: { select: { name: true, id: true } } } } },
    });
    const data = items.map((r) => ({
      id: r.id, period: r.period, type: r.type, kpiScore: r.kpiScore, goalsScore: r.goalsScore,
      overallScore: r.overallScore, rating: r.rating, status: r.status,
      employeeName: r.employee?.user?.name || r.employee?.employeeId || '—',
      employeeComments: r.employeeComments, managerComments: r.managerComments,
      completedAt: r.completedAt?.toISOString(), createdAt: r.createdAt.toISOString(),
    }));
    return NextResponse.json({ data, total: data.length });
  } catch (error) { console.error('HR performance list error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const payload = verifyToken(authHeader?.replace('Bearer ', '') || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = payload.tenantId as string;
    const body = await request.json();
    const { employeeName, period, type, kpiScore, goalsScore, overallScore, rating, employeeComments, managerComments, status, reviewerId } = body;
    if (!period) return NextResponse.json({ error: 'Period is required' }, { status: 400 });

    // Find or create HR employee by name
    let hrEmployee = await db.hrEmployee.findFirst({ where: { tenantId, user: { name: employeeName } }, include: { user: true } });
    if (!hrEmployee) {
      const user = await db.user.findFirst({ where: { tenantId, name: employeeName } });
      if (user) { hrEmployee = await db.hrEmployee.create({ data: { tenantId, userId: user.id, employeeId: user.employeeNumber || `EMP-${Date.now().toString(36).toUpperCase()}` }, include: { user: true } }); }
    }
    const employeeId = hrEmployee?.id;
    const finalOverall = overallScore || ((kpiScore && goalsScore) ? (kpiScore + goalsScore) / 2 : null);

    const item = await db.hrPerformanceReview.create({
      data: { tenantId, employeeId: employeeId || '', period, type: type || 'quarterly', kpiScore: kpiScore ?? null, goalsScore: goalsScore ?? null, overallScore: finalOverall, rating: rating || null, employeeComments, managerComments, status: status || 'draft', reviewerId: reviewerId || payload.userId || null },
    });
    return NextResponse.json({ id: item.id, message: 'Review created' }, { status: 201 });
  } catch (error) { console.error('HR performance create error:', error); return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500 }); }
}