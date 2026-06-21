import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;

    const invoice = await db.invoice.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { name: true } },
        workOrder: { select: { id: true, title: true } },
        creator: { select: { name: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: invoice.id,
      tenantId: invoice.tenantId,
      customerId: invoice.customerId,
      customerName: invoice.customer.name,
      workOrderId: invoice.workOrderId,
      workOrderTitle: invoice.workOrder?.title,
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
      paidAt: invoice.paidAt?.toISOString(),
      paymentMethod: invoice.paymentMethod,
      paymentRef: invoice.paymentRef,
      sentVia: invoice.sentVia,
      pdfUrl: invoice.pdfUrl,
      createdBy: invoice.createdBy,
      creatorName: invoice.creator?.name,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Invoice get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;
    const body = await request.json();

    const existing = await db.invoice.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.items !== undefined) updateData.items = body.items ? JSON.stringify(body.items) : null;
    if (body.subtotal !== undefined) updateData.subtotal = body.subtotal;
    if (body.tax !== undefined) updateData.tax = body.tax;
    if (body.discount !== undefined) updateData.discount = body.discount;
    if (body.total !== undefined) updateData.total = body.total;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.sentVia !== undefined) updateData.sentVia = body.sentVia || null;
    if (body.pdfUrl !== undefined) updateData.pdfUrl = body.pdfUrl || null;

    if (body.status) {
      updateData.status = body.status;
      if (body.status === 'PAID') {
        updateData.paidAt = new Date();
        if (body.paymentMethod) updateData.paymentMethod = body.paymentMethod;
        if (body.paymentRef) updateData.paymentRef = body.paymentRef;
      }
    }

    const updated = await db.invoice.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { name: true } },
      },
    });

    return NextResponse.json({
      id: updated.id,
      tenantId: updated.tenantId,
      customerId: updated.customerId,
      customerName: updated.customer.name,
      workOrderId: updated.workOrderId,
      invoiceNumber: updated.invoiceNumber,
      title: updated.title,
      description: updated.description,
      items: updated.items,
      subtotal: updated.subtotal,
      tax: updated.tax,
      discount: updated.discount,
      total: updated.total,
      status: updated.status,
      dueDate: updated.dueDate?.toISOString(),
      paidAt: updated.paidAt?.toISOString(),
      paymentMethod: updated.paymentMethod,
      paymentRef: updated.paymentRef,
      sentVia: updated.sentVia,
      pdfUrl: updated.pdfUrl,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Invoice update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;

    const existing = await db.invoice.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    await db.invoice.delete({ where: { id } });
    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Invoice delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
