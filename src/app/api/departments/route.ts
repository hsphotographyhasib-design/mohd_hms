import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = payload.tenantId as string;
    const { searchParams } = new URL(request.url);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50', 10), 100);

    const departments = await db.department.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
      take: pageSize,
    });

    return NextResponse.json({ data: departments });
  } catch (error) {
    console.error('Departments fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}