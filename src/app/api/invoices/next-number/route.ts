import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { generateInvoiceNo } from '@/modules/invoices/services/invoice-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;

    const invoiceNumber = await generateInvoiceNo(tenantId);

    return NextResponse.json({ invoiceNumber });
  } catch (error) {
    console.error('Invoice next number error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}