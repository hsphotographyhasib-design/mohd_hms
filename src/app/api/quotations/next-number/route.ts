import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'quotations', entity: 'quotation', action: 'create' });
    if (auth.error) return auth.error;

    const tenantId = auth.tenantId;

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