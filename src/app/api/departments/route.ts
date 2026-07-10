import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'employees' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;
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