import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/email/customers/search?q=...&limit=20
 * Search customers for the email compose "To" field.
 * Searches by: name, email, phone, company name, customer number.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = verifyRouteAuth(req, { feature: 'email' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 50);

    if (!q) {
      return NextResponse.json({ error: 'Search query (q) is required' }, { status: 400 });
    }

    const customers = await db.customer.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
          { companyName: { contains: q } },
          { customerNumber: { contains: q } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        companyName: true,
        customerNumber: true,
        district: true,
        address: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ customers });
  } catch (err) {
    console.error('[Email Customer Search] Error:', err);
    return NextResponse.json({ error: 'Failed to search customers' }, { status: 500 });
  }
}