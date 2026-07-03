import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const pkg = await db.servicePackage.findFirst({
      where: { id, tenantId: payload.tenantId as string },
      include: {
        items: { include: { serviceItem: { select: { id: true, name: true, serviceCode: true, sellingPrice: true } } } },
      },
    });
    if (!pkg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(pkg);
  } catch (error) {
    console.error('Service package get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { name, description, packageCode, pricingModel, costPrice, sellingPrice, discount, taxRate, currency, isActive, items } = body;

    // Delete existing items and recreate
    if (items !== undefined) {
      await db.servicePackageItem.deleteMany({ where: { packageId: id } });
    }

    const pkg = await db.servicePackage.update({
      where: { id },
      data: {
        name: name || undefined,
        description: description !== undefined ? description : undefined,
        packageCode: packageCode !== undefined ? packageCode : undefined,
        pricingModel: pricingModel || undefined,
        costPrice: costPrice !== undefined ? costPrice : undefined,
        sellingPrice: sellingPrice !== undefined ? sellingPrice : undefined,
        discount: discount !== undefined ? discount : undefined,
        taxRate: taxRate !== undefined ? taxRate : undefined,
        currency: currency || undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        items: items ? {
          create: items.map((item: { serviceItemId: string; quantity: number; sortOrder: number }) => ({
            serviceItemId: item.serviceItemId,
            quantity: item.quantity || 1,
            sortOrder: item.sortOrder || 0,
          })),
        } : undefined,
      },
      include: { items: true },
    });

    return NextResponse.json(pkg);
  } catch (error) {
    console.error('Service package update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await db.servicePackage.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Service package delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}