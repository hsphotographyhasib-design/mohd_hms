import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, generateAssetNumber } from '@/lib/auth';
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
    const status = request.nextUrl.searchParams.get('status') || '';
    const customerId = request.nextUrl.searchParams.get('customerId') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.EquipmentWhereInput = { tenantId };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { brand: { contains: search } },
        { model: { contains: search } },
        { assetNumber: { contains: search } },
        { location: { contains: search } },
      ];
    }
    if (category) where.category = category;
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const [items, total] = await Promise.all([
      db.equipment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true } },
          _count: { select: { complaints: true, workOrders: true } },
        },
      }),
      db.equipment.count({ where }),
    ]);

    const data = items.map((eq) => ({
      id: eq.id,
      tenantId: eq.tenantId,
      customerId: eq.customerId,
      customerName: eq.customer?.name,
      name: eq.name,
      category: eq.category,
      assetNumber: eq.assetNumber,
      qrCode: eq.qrCode,
      brand: eq.brand,
      model: eq.model,
      serialNumber: eq.serialNumber,
      location: eq.location,
      installDate: eq.installDate?.toISOString(),
      warrantyExpiry: eq.warrantyExpiry?.toISOString(),
      status: eq.status,
      photos: eq.photos,
      documents: eq.documents,
      specifications: eq.specifications,
      notes: eq.notes,
      createdAt: eq.createdAt.toISOString(),
      updatedAt: eq.updatedAt.toISOString(),
      _count: eq._count,
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Equipment list error:', error);
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
    const { name, category, customerId, brand, model, serialNumber, location, installDate, warrantyExpiry, status, photos, documents, specifications, notes } = body;

    if (!name || !category) {
      return NextResponse.json({ error: 'Name and category are required' }, { status: 400 });
    }

    const assetNumber = generateAssetNumber(category);
    const qrCode = `QR-${assetNumber}`;

    const equipment = await db.equipment.create({
      data: {
        tenantId,
        name,
        category,
        customerId: customerId || null,
        assetNumber,
        qrCode,
        brand: brand || null,
        model: model || null,
        serialNumber: serialNumber || null,
        location: location || null,
        installDate: installDate ? new Date(installDate) : null,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        status: status || 'active',
        photos: photos || null,
        documents: documents || null,
        specifications: specifications ? JSON.stringify(specifications) : null,
        notes: notes || null,
      },
      include: {
        customer: { select: { name: true } },
      },
    });

    return NextResponse.json({
      id: equipment.id,
      tenantId: equipment.tenantId,
      customerId: equipment.customerId,
      customerName: equipment.customer?.name,
      name: equipment.name,
      category: equipment.category,
      assetNumber: equipment.assetNumber,
      qrCode: equipment.qrCode,
      brand: equipment.brand,
      model: equipment.model,
      serialNumber: equipment.serialNumber,
      location: equipment.location,
      installDate: equipment.installDate?.toISOString(),
      warrantyExpiry: equipment.warrantyExpiry?.toISOString(),
      status: equipment.status,
      photos: equipment.photos,
      documents: equipment.documents,
      specifications: equipment.specifications,
      notes: equipment.notes,
      createdAt: equipment.createdAt.toISOString(),
      updatedAt: equipment.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Equipment create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
