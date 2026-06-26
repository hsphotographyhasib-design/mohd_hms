import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, generatePONumber } from '@/lib/auth';
import type { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

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
    const status = request.nextUrl.searchParams.get('status') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.PurchaseOrderWhereInput = { tenantId };
    if (search) {
      where.OR = [
        { supplier: { contains: search } },
        { poNumber: { contains: search } },
      ];
    }
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      db.purchaseOrder.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.purchaseOrder.count({ where }),
    ]);

    const data = items.map((po) => ({
      id: po.id,
      tenantId: po.tenantId,
      poNumber: po.poNumber,
      supplier: po.supplier,
      supplierContact: po.supplierContact,
      items: po.items,
      subtotal: po.subtotal,
      tax: po.tax,
      total: po.total,
      status: po.status,
      expectedDate: po.expectedDate?.toISOString(),
      receivedAt: po.receivedAt?.toISOString(),
      notes: po.notes,
      createdAt: po.createdAt.toISOString(),
      updatedAt: po.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Purchases list error:', error);
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
    const { supplier, supplierContact, items, subtotal, tax, total, status, expectedDate, notes } = body;

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier is required' }, { status: 400 });
    }

    const poNumber = generatePONumber();

    const purchaseOrder = await db.purchaseOrder.create({
      data: {
        tenantId,
        poNumber,
        supplier,
        supplierContact: supplierContact || null,
        items: items ? JSON.stringify(items) : null,
        subtotal: subtotal || 0,
        tax: tax || 0,
        total: total || 0,
        status: status || 'DRAFT',
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        notes: notes || null,
      },
    });

    return NextResponse.json({
      id: purchaseOrder.id,
      tenantId: purchaseOrder.tenantId,
      poNumber: purchaseOrder.poNumber,
      supplier: purchaseOrder.supplier,
      supplierContact: purchaseOrder.supplierContact,
      items: purchaseOrder.items,
      subtotal: purchaseOrder.subtotal,
      tax: purchaseOrder.tax,
      total: purchaseOrder.total,
      status: purchaseOrder.status,
      expectedDate: purchaseOrder.expectedDate?.toISOString(),
      notes: purchaseOrder.notes,
      createdAt: purchaseOrder.createdAt.toISOString(),
      updatedAt: purchaseOrder.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Purchase create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
