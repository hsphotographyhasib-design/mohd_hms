import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import type { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const payload = verifyToken(token);

    const year = new Date().getFullYear();
    const prefix = `WO/HMS/${year}/`;

    const where: Prisma.WorkOrderWhereInput = payload
      ? { tenantId: payload.tenantId as string, workOrderNumber: { startsWith: prefix } }
      : { workOrderNumber: { startsWith: prefix } };

    const latestWo = await db.workOrder.findFirst({
      where,
      orderBy: { workOrderNumber: 'desc' },
      select: { workOrderNumber: true },
    });

    let nextNum = 1;
    if (latestWo?.workOrderNumber) {
      const parts = latestWo.workOrderNumber.split('/');
      const numStr = parts[parts.length - 1];
      const parsed = parseInt(numStr, 10);
      if (!isNaN(parsed)) nextNum = parsed + 1;
    }

    return NextResponse.json({
      nextNumber: `${prefix}${String(nextNum).padStart(6, '0')}`,
    });
  } catch (error) {
    console.error('Next WO number error:', error);
    const year = new Date().getFullYear();
    return NextResponse.json({
      nextNumber: `WO/HMS/${year}/000001`,
    });
  }
}