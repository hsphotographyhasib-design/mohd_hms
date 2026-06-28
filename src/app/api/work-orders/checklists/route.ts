import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;

    const checklists = await db.checklistTemplate.findMany({
      where: { tenantId },
      select: { id: true, name: true, category: true, description: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: checklists });
  } catch (error) {
    console.error('Checklists list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}