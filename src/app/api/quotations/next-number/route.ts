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

    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const tenantCode = tenant.name.substring(0, 4).toUpperCase();

    const monthStart = new Date(year, now.getMonth(), 1);
    const monthEnd = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);

    const count = await db.quotation.count({
      where: {
        tenantId,
        createdAt: { gte: monthStart, lte: monthEnd },
      },
    });

    const sequential = String(count + 1).padStart(4, '0');
    const quotationNo = `QTN/${tenantCode}/${month}/${sequential}`;

    return NextResponse.json({ quotationNo });
  } catch (error) {
    console.error('Quotation next number error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}