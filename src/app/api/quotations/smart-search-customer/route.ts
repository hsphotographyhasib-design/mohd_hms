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
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '8', 10);

    if (q.length < 1) return NextResponse.json({ results: [] });

    const customers = await db.$queryRawUnsafe<any[]>(`
      SELECT c.*,
        (SELECT COUNT(*) FROM Quotation q WHERE q.customerId = c.id) as "quotationCount",
        (SELECT COUNT(*) FROM Invoice i WHERE i.customerId = c.id AND i.status IN ('PENDING','APPROVED','OVERDUE')) as "activeInvoiceCount"
      FROM Customer c
      WHERE c.tenantId = '${tenantId}'
        AND c.isActive = 1
        AND (
          LOWER(c.name) LIKE '%${q.toLowerCase().replace(/'/g, "''")}%'
          OR LOWER(c."companyName") LIKE '%${q.toLowerCase().replace(/'/g, "''")}%'
          OR LOWER(c.email) LIKE '%${q.toLowerCase().replace(/'/g, "''")}%'
          OR c.phone LIKE '%${q.replace(/'/g, "''")}%'
          OR LOWER(c."customerNumber") LIKE '%${q.toLowerCase().replace(/'/g, "''")}%'
        )
      ORDER BY c."companyName" IS NULL, c."companyName" ASC, c.name ASC
      LIMIT ${limit}
    `);

    return NextResponse.json({
      results: customers.map(c => ({
        id: c.id,
        name: c.name,
        companyName: c.companyName,
        email: c.email,
        phone: c.phone,
        address: c.address,
        customerNumber: c.customerNumber,
        pic: c.pic,
        country: c.country,
        district: c.district,
        taxRate: c.taxRate ? Number(c.taxRate) : 0,
        paymentTerms: c.paymentTerms,
        quotationCount: Number(c.quotationCount || 0),
        activeInvoiceCount: Number(c.activeInvoiceCount || 0),
      })),
    });
  } catch (error) {
    console.error('Smart customer search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}