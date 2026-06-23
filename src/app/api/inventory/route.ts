import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const search = request.nextUrl.searchParams.get('search') || '';
    const category = request.nextUrl.searchParams.get('category') || '';
    const lowStock = request.nextUrl.searchParams.get('lowStock') === 'true';
    const skip = (page - 1) * pageSize;

    const where: Prisma.InventoryItemWhereInput = { tenantId, isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { supplier: { contains: search } },
      ];
    }
    if (category) where.category = category;
    if (lowStock) {
      // Use a different approach for SQLite - filter in JS or use raw
      where.quantity = { lte: 999999 };
    }

    const [items, total] = await Promise.all([
      db.inventoryItem.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.inventoryItem.count({ where }),
    ]);

    // Filter low stock in JS for SQLite compatibility
    const filtered = lowStock
      ? items.filter((item) => item.quantity <= item.minStock)
      : items;

    const data = filtered.map((item) => ({
      id: item.id,
      tenantId: item.tenantId,
      name: item.name,
      sku: item.sku,
      category: item.category,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      minStock: item.minStock,
      unitCost: item.unitCost,
      supplier: item.supplier,
      location: item.location,
      photos: item.photos,
      isActive: item.isActive,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      total: lowStock ? filtered.length : total,
      page,
      pageSize,
      totalPages: Math.ceil((lowStock ? filtered.length : total) / pageSize),
    });
  } catch (error) {
    console.error('Inventory list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const body = await request.json();
    const { name, sku, category, description, unit, quantity, minStock, unitCost, supplier, location, photos } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const item = await db.inventoryItem.create({
      data: {
        tenantId,
        name,
        sku: sku || null,
        category: category || null,
        description: description || null,
        unit: unit || 'pcs',
        quantity: quantity || 0,
        minStock: minStock || 0,
        unitCost: unitCost || 0,
        supplier: supplier || null,
        location: location || null,
        photos: photos || null,
      },
    });

    return NextResponse.json({
      id: item.id,
      tenantId: item.tenantId,
      name: item.name,
      sku: item.sku,
      category: item.category,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      minStock: item.minStock,
      unitCost: item.unitCost,
      supplier: item.supplier,
      location: item.location,
      photos: item.photos,
      isActive: item.isActive,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Inventory create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
