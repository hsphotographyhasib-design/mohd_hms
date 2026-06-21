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

    const quotation = await db.quotation.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { name: true } },
      },
    });

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: quotation.id,
      tenantId: quotation.tenantId,
      customerId: quotation.customerId,
      customerName: quotation.customer.name,
      complaintId: quotation.complaintId,
      title: quotation.title,
      description: quotation.description,
      items: quotation.items,
      subtotal: quotation.subtotal,
      tax: quotation.tax,
      discount: quotation.discount,
      total: quotation.total,
      status: quotation.status,
      validUntil: quotation.validUntil?.toISOString(),
      approvedBy: quotation.approvedBy,
      approvedAt: quotation.approvedAt?.toISOString(),
      pdfUrl: quotation.pdfUrl,
      notes: quotation.notes,
      createdAt: quotation.createdAt.toISOString(),
      updatedAt: quotation.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Quotation get error:', error);
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

    const existing = await db.quotation.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.items !== undefined) updateData.items = body.items ? JSON.stringify(body.items) : null;
    if (body.subtotal !== undefined) updateData.subtotal = body.subtotal;
    if (body.tax !== undefined) updateData.tax = body.tax;
    if (body.discount !== undefined) updateData.discount = body.discount;
    if (body.total !== undefined) updateData.total = body.total;
    if (body.validUntil !== undefined) updateData.validUntil = body.validUntil ? new Date(body.validUntil) : null;
    if (body.pdfUrl !== undefined) updateData.pdfUrl = body.pdfUrl || null;
    if (body.notes !== undefined) updateData.notes = body.notes || null;

    if (body.status) {
      updateData.status = body.status;
      if (body.status === 'APPROVED') {
        updateData.approvedAt = new Date();
        updateData.approvedBy = payload.userId;
      }
    }

    const updated = await db.quotation.update({
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
      title: updated.title,
      description: updated.description,
      items: updated.items,
      subtotal: updated.subtotal,
      tax: updated.tax,
      discount: updated.discount,
      total: updated.total,
      status: updated.status,
      validUntil: updated.validUntil?.toISOString(),
      approvedBy: updated.approvedBy,
      approvedAt: updated.approvedAt?.toISOString(),
      pdfUrl: updated.pdfUrl,
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Quotation update error:', error);
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

    const existing = await db.quotation.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });

    await db.quotation.delete({ where: { id } });
    return NextResponse.json({ message: 'Quotation deleted successfully' });
  } catch (error) {
    console.error('Quotation delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
