import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, generateInvoiceNumber } from '@/lib/auth';
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
    const customerId = request.nextUrl.searchParams.get('customerId') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.InvoiceWhereInput = { tenantId };
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { invoiceNumber: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const [items, total] = await Promise.all([
      db.invoice.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true } },
        },
      }),
      db.invoice.count({ where }),
    ]);

    const data = items.map((inv) => ({
      id: inv.id,
      tenantId: inv.tenantId,
      customerId: inv.customerId,
      customerName: inv.customer.name,
      workOrderId: inv.workOrderId,
      invoiceNumber: inv.invoiceNumber,
      title: inv.title,
      description: inv.description,
      items: inv.items,
      subtotal: inv.subtotal,
      tax: inv.tax,
      discount: inv.discount,
      total: inv.total,
      status: inv.status,
      dueDate: inv.dueDate?.toISOString(),
      paidAt: inv.paidAt?.toISOString(),
      paymentMethod: inv.paymentMethod,
      paymentRef: inv.paymentRef,
      sentVia: inv.sentVia,
      pdfUrl: inv.pdfUrl,
      createdBy: inv.createdBy,
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Invoices list error:', error);
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
    const userId = payload.userId as string;
    const body = await request.json();
    const { customerId, workOrderId, title, description, items, subtotal, tax, discount, total, status, dueDate, sentVia } = body;

    if (!customerId || !title) {
      return NextResponse.json({ error: 'Customer and title are required' }, { status: 400 });
    }

    const invoiceNumber = generateInvoiceNumber();

    const invoice = await db.invoice.create({
      data: {
        tenantId,
        customerId,
        workOrderId: workOrderId || null,
        invoiceNumber,
        title,
        description: description || null,
        items: items ? JSON.stringify(items) : null,
        subtotal: subtotal || 0,
        tax: tax || 0,
        discount: discount || 0,
        total: total || 0,
        status: status || 'DRAFT',
        dueDate: dueDate ? new Date(dueDate) : null,
        sentVia: sentVia || null,
        createdBy: userId,
      },
      include: {
        customer: { select: { name: true } },
      },
    });

    return NextResponse.json({
      id: invoice.id,
      tenantId: invoice.tenantId,
      customerId: invoice.customerId,
      customerName: invoice.customer.name,
      workOrderId: invoice.workOrderId,
      invoiceNumber: invoice.invoiceNumber,
      title: invoice.title,
      description: invoice.description,
      items: invoice.items,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      discount: invoice.discount,
      total: invoice.total,
      status: invoice.status,
      dueDate: invoice.dueDate?.toISOString(),
      sentVia: invoice.sentVia,
      createdBy: invoice.createdBy,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Invoice create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
