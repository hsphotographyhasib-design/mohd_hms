import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'inventory' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const search = request.nextUrl.searchParams.get('search') || '';
    const skip = (page - 1) * pageSize;

    // ServicePackage model is not in prisma/schema.prisma (runtime-only table)
    const where: Record<string, any> = { tenantId };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { packageCode: { contains: search } },
      ];
    }

    const [packages, total] = await Promise.all([
      db.servicePackage.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { items: true } },
        },
      }),
      db.servicePackage.count({ where }),
    ]);

    return NextResponse.json({
      data: packages,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Service packages list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'inventory' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;
    const body = await request.json();
    const { name, description, packageCode, pricingModel, costPrice, sellingPrice, discount, taxRate, currency, items } = body;

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const pkg = await db.servicePackage.create({
      data: {
        tenantId,
        name,
        description: description || null,
        packageCode: packageCode || null,
        pricingModel: pricingModel || 'fixed',
        costPrice: costPrice || 0,
        sellingPrice: sellingPrice || 0,
        discount: discount || 0,
        taxRate: taxRate || 0,
        currency: currency || 'BND',
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

    return NextResponse.json(pkg, { status: 201 });
  } catch (error) {
    console.error('Service package create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}