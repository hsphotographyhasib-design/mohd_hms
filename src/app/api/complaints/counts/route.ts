import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { buildAuthContext, buildComplaintWhereClause } from '@/core/permissions/rbac';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await buildAuthContext(payload, { resolveCustomer: true });
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { where: rbacWhere, accessLevel } = await buildComplaintWhereClause(ctx);

    // If customer has no linked record, return zero counts (not 401)
    if (accessLevel === 'none') {
      return NextResponse.json({ counts: {} });
    }

    // Single groupBy query to get all status counts at once
    const groups = await db.complaint.groupBy({
      by: ['status'],
      where: rbacWhere,
      _count: { status: true },
    });

    const counts: Record<string, number> = {};
    for (const g of groups) {
      if (g.status) counts[g.status] = g._count.status;
    }

    return NextResponse.json({ counts });
  } catch (error) {
    console.error('Complaint counts error:', error);
    return NextResponse.json({ error: 'Failed to load complaint counts' }, { status: 500 });
  }
}