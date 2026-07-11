import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { generateInvoiceNo } from '@/modules/invoices/services/invoice-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'invoices', entity: 'invoice', action: 'create' });
    if (auth.error) return auth.error;

    const tenantId = auth.tenantId;

    const invoiceNumber = await generateInvoiceNo(tenantId);

    return NextResponse.json({ invoiceNumber });
  } catch (error) {
    console.error('Invoice next number error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}