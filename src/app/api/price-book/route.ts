import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'inventory' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;
    const pricingType = request.nextUrl.searchParams.get('pricingType') || '';
    const serviceItemId = request.nextUrl.searchParams.get('serviceItemId') || '';
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const skip = (page - 1) * pageSize;

    const where: Prisma.PriceBookEntryWhereInput = { tenantId, isActive: true };
    if (pricingType) where.pricingType = pricingType;
    if (serviceItemId) where.serviceItemId = serviceItemId;

    const [entries, total] = await Promise.all([
      db.priceBookEntry.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.priceBookEntry.count({ where }),
    ]);

    return NextResponse.json({ data: entries, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    console.error('Price book list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'inventory' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;
    const body = await request.json();
    const { serviceItemId, pricingType, customerId, contractId, name, sellingPrice, discount, taxRate, validFrom, validTo, minQuantity, notes } = body;

    if (!serviceItemId || sellingPrice === undefined) {
      return NextResponse.json({ error: 'Service item and selling price are required' }, { status: 400 });
    }

    const entry = await db.priceBookEntry.create({
      data: {
        tenantId,
        serviceItemId,
        pricingType: pricingType || 'standard',
        customerId: customerId || null,
        contractId: contractId || null,
        name: name || null,
        sellingPrice,
        discount: discount || 0,
        taxRate: taxRate || 0,
        validFrom: validFrom ? new Date(validFrom) : null,
        validTo: validTo ? new Date(validTo) : null,
        minQuantity: minQuantity || 1,
        notes: notes || null,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Price book create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}