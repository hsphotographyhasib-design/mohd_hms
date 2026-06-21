import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

interface QuotationItem {
  description?: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
  [key: string]: unknown;
}

function computeTotals(items: QuotationItem[], taxRate = 0, discount = 0, shipping = 0) {
  const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax - discount + shipping;
  return { subtotal, tax, discount, shipping, total };
}

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
        customer: { select: { name: true, phone: true, email: true, address: true } },
      },
    });

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    let preparedByName: string | null = null;
    if (quotation.preparedBy) {
      const user = await db.user.findUnique({
        where: { id: quotation.preparedBy },
        select: { name: true },
      });
      if (user) preparedByName = user.name;
    }

    return NextResponse.json({
      id: quotation.id,
      tenantId: quotation.tenantId,
      customerId: quotation.customerId,
      customer: {
        name: quotation.customer.name,
        phone: quotation.customer.phone,
        email: quotation.customer.email,
        address: quotation.customer.address,
      },
      complaintId: quotation.complaintId,
      quotationNo: quotation.quotationNo,
      title: quotation.title,
      description: quotation.description,
      referenceNo: quotation.referenceNo,
      projectName: quotation.projectName,
      site: quotation.site,
      preparedBy: quotation.preparedBy,
      preparedByName,
      items: quotation.items,
      terms: quotation.terms,
      currency: quotation.currency,
      subtotal: quotation.subtotal,
      taxRate: quotation.taxRate,
      tax: quotation.tax,
      discount: quotation.discount,
      shipping: quotation.shipping,
      total: quotation.total,
      status: quotation.status,
      validUntil: quotation.validUntil?.toISOString(),
      approvedBy: quotation.approvedBy,
      approvedAt: quotation.approvedAt?.toISOString(),
      sentAt: quotation.sentAt?.toISOString(),
      acceptedAt: quotation.acceptedAt?.toISOString(),
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
    if (body.referenceNo !== undefined) updateData.referenceNo = body.referenceNo || null;
    if (body.projectName !== undefined) updateData.projectName = body.projectName || null;
    if (body.site !== undefined) updateData.site = body.site || null;
    if (body.preparedBy !== undefined) updateData.preparedBy = body.preparedBy || null;
    if (body.terms !== undefined) updateData.terms = body.terms ? JSON.stringify(body.terms) : null;
    if (body.currency !== undefined) updateData.currency = body.currency || 'BND';
    if (body.validUntil !== undefined) updateData.validUntil = body.validUntil ? new Date(body.validUntil) : null;
    if (body.pdfUrl !== undefined) updateData.pdfUrl = body.pdfUrl || null;
    if (body.notes !== undefined) updateData.notes = body.notes || null;
    if (body.complaintId !== undefined) updateData.complaintId = body.complaintId || null;

    // Recalculate totals if items, taxRate, discount, or shipping change
    const needsRecalc = body.items !== undefined || body.taxRate !== undefined || body.discount !== undefined || body.shipping !== undefined;

    if (body.items !== undefined) {
      const parsedItems: QuotationItem[] = Array.isArray(body.items) ? body.items : [];
      updateData.items = JSON.stringify(parsedItems);
    }

    if (body.taxRate !== undefined) updateData.taxRate = body.taxRate;
    if (body.discount !== undefined) updateData.discount = body.discount;
    if (body.shipping !== undefined) updateData.shipping = body.shipping;

    if (needsRecalc) {
      const currentItems: QuotationItem[] = body.items !== undefined
        ? (Array.isArray(body.items) ? body.items : [])
        : JSON.parse(existing.items || '[]');
      const currentTaxRate = body.taxRate !== undefined ? body.taxRate : existing.taxRate;
      const currentDiscount = body.discount !== undefined ? body.discount : existing.discount;
      const currentShipping = body.shipping !== undefined ? body.shipping : existing.shipping;

      const { subtotal, tax, total } = computeTotals(currentItems, currentTaxRate, currentDiscount, currentShipping);
      updateData.subtotal = subtotal;
      updateData.tax = tax;
      updateData.total = total;
    }

    const updated = await db.quotation.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { name: true, phone: true, email: true, address: true } },
      },
    });

    let preparedByName: string | null = null;
    if (updated.preparedBy) {
      const user = await db.user.findUnique({
        where: { id: updated.preparedBy },
        select: { name: true },
      });
      if (user) preparedByName = user.name;
    }

    return NextResponse.json({
      id: updated.id,
      tenantId: updated.tenantId,
      customerId: updated.customerId,
      customer: {
        name: updated.customer.name,
        phone: updated.customer.phone,
        email: updated.customer.email,
        address: updated.customer.address,
      },
      complaintId: updated.complaintId,
      quotationNo: updated.quotationNo,
      title: updated.title,
      description: updated.description,
      referenceNo: updated.referenceNo,
      projectName: updated.projectName,
      site: updated.site,
      preparedBy: updated.preparedBy,
      preparedByName,
      items: updated.items,
      terms: updated.terms,
      currency: updated.currency,
      subtotal: updated.subtotal,
      taxRate: updated.taxRate,
      tax: updated.tax,
      discount: updated.discount,
      shipping: updated.shipping,
      total: updated.total,
      status: updated.status,
      validUntil: updated.validUntil?.toISOString(),
      approvedBy: updated.approvedBy,
      approvedAt: updated.approvedAt?.toISOString(),
      sentAt: updated.sentAt?.toISOString(),
      acceptedAt: updated.acceptedAt?.toISOString(),
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