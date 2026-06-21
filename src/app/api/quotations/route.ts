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
    const status = request.nextUrl.searchParams.get('status') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.QuotationWhereInput = { tenantId };
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      db.quotation.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true } },
        },
      }),
      db.quotation.count({ where }),
    ]);

    const data = items.map((q) => ({
      id: q.id,
      tenantId: q.tenantId,
      customerId: q.customerId,
      customerName: q.customer.name,
      complaintId: q.complaintId,
      title: q.title,
      description: q.description,
      items: q.items,
      subtotal: q.subtotal,
      tax: q.tax,
      discount: q.discount,
      total: q.total,
      status: q.status,
      validUntil: q.validUntil?.toISOString(),
      approvedBy: q.approvedBy,
      approvedAt: q.approvedAt?.toISOString(),
      pdfUrl: q.pdfUrl,
      notes: q.notes,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Quotations list error:', error);
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
    const { customerId, complaintId, title, description, items, subtotal, tax, discount, total, status, validUntil, notes } = body;

    if (!customerId || !title) {
      return NextResponse.json({ error: 'Customer and title are required' }, { status: 400 });
    }

    const quotation = await db.quotation.create({
      data: {
        tenantId,
        customerId,
        complaintId: complaintId || null,
        title,
        description: description || null,
        items: items ? JSON.stringify(items) : null,
        subtotal: subtotal || 0,
        tax: tax || 0,
        discount: discount || 0,
        total: total || 0,
        status: status || 'DRAFT',
        validUntil: validUntil ? new Date(validUntil) : null,
        notes: notes || null,
      },
      include: {
        customer: { select: { name: true } },
      },
    });

    return NextResponse.json({
      id: quotation.id,
      tenantId: quotation.tenantId,
      customerId: quotation.customerId,
      customerName: quotation.customer.name,
      title: quotation.title,
      description: quotation.description,
      items: quotation.items,
      subtotal: quotation.subtotal,
      tax: quotation.tax,
      discount: quotation.discount,
      total: quotation.total,
      status: quotation.status,
      validUntil: quotation.validUntil?.toISOString(),
      notes: quotation.notes,
      createdAt: quotation.createdAt.toISOString(),
      updatedAt: quotation.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Quotation create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
