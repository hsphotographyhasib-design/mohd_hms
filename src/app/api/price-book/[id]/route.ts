import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'inventory' });
    if (auth.error) return auth.error;
    const { id } = await params;
    const entry = await db.priceBookEntry.findFirst({ where: { id, tenantId: auth.tenantId } });
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(entry);
  } catch (error) {
    console.error('Price book get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'inventory' });
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await request.json();
    const entry = await db.priceBookEntry.update({
      where: { id },
      data: {
        serviceItemId: body.serviceItemId || undefined,
        pricingType: body.pricingType || undefined,
        customerId: body.customerId !== undefined ? body.customerId : undefined,
        contractId: body.contractId !== undefined ? body.contractId : undefined,
        name: body.name !== undefined ? body.name : undefined,
        sellingPrice: body.sellingPrice !== undefined ? body.sellingPrice : undefined,
        discount: body.discount !== undefined ? body.discount : undefined,
        taxRate: body.taxRate !== undefined ? body.taxRate : undefined,
        validFrom: body.validFrom ? new Date(body.validFrom) : null,
        validTo: body.validTo ? new Date(body.validTo) : null,
        minQuantity: body.minQuantity !== undefined ? body.minQuantity : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
        isActive: body.isActive !== undefined ? body.isActive : undefined,
      },
    });
    return NextResponse.json(entry);
  } catch (error) {
    console.error('Price book update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'inventory' });
    if (auth.error) return auth.error;

    const { id } = await params;
    await db.priceBookEntry.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Price book delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}