import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'inventory' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;
    const search = request.nextUrl.searchParams.get('search') || '';
    const isActiveOnly = request.nextUrl.searchParams.get('isActive') === 'true';

    // ServiceCategory model is not in prisma/schema.prisma (runtime-only table)
    const where: Record<string, any> = { tenantId };
    if (isActiveOnly) where.isActive = true;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const categories = await db.serviceCategory.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    const data = categories.map((cat) => ({
      id: cat.id,
      tenantId: cat.tenantId,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      sortOrder: cat.sortOrder,
      subcategories: cat.subcategories ? JSON.parse(cat.subcategories) : [],
      isActive: cat.isActive,
      createdAt: cat.createdAt.toISOString(),
      updatedAt: cat.updatedAt.toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Service categories list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'inventory' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;
    const body = await request.json();
    const { name, description, icon, sortOrder, subcategories } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const category = await db.serviceCategory.create({
      data: {
        tenantId,
        name,
        description: description || null,
        icon: icon || null,
        sortOrder: sortOrder || 0,
        subcategories: Array.isArray(subcategories) ? JSON.stringify(subcategories) : null,
      },
    });

    return NextResponse.json({
      id: category.id,
      tenantId: category.tenantId,
      name: category.name,
      description: category.description,
      icon: category.icon,
      sortOrder: category.sortOrder,
      subcategories: category.subcategories ? JSON.parse(category.subcategories) : [],
      isActive: category.isActive,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Service category create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}