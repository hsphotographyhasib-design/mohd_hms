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

    const customers = await db.customer.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { name: { contains: q } },
          { companyName: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
          { customerNumber: { contains: q } },
        ],
      },
      include: {
        _count: {
          select: {
            quotations: true,
            invoices: { where: { status: { in: ['PENDING', 'APPROVED', 'OVERDUE'] } } },
          },
        },
      },
      orderBy: [
        { companyName: 'asc' as const },
        { name: 'asc' as const },
      ],
      take: limit,
    });

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
        quotationCount: c._count.quotations,
        activeInvoiceCount: c._count.invoices,
      })),
    });
  } catch (error) {
    console.error('Smart customer search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}