import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { INVOICE_STATUS_TRANSITIONS } from '@/modules/invoices/services/invoice-helpers';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'invoices', entity: 'invoice', action: 'approve' });
    if (auth.error) return auth.error;

    const tenantId = auth.tenantId;
    const userId = auth.userId;
    const { id } = await params;
    const body = await request.json();

    const { status, reason } = body as { status?: string; reason?: string };

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const existing = await db.invoice.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const allowedTransitions = INVOICE_STATUS_TRANSITIONS[existing.status] || [];
    if (!allowedTransitions.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from ${existing.status} to ${status}. Allowed: ${allowedTransitions.join(', ') || 'none'}`,
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { status, updatedAt: new Date() };

    if (reason !== undefined) {
      updateData.notes = reason || existing.notes || null;
    }

    if (status === 'APPROVED') {
      updateData.approvedAt = new Date();
      updateData.approvedBy = userId;
    }

    if (status === 'SENT') {
      updateData.sentAt = new Date();
    }

    if (status === 'VIEWED') {
      updateData.viewedAt = new Date();
    }

    if (status === 'PAID') {
      updateData.paidAt = new Date();
    }

    if (status === 'CLOSED') {
      updateData.closedAt = new Date();
    }

    const updated = await db.invoice.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { name: true, phone: true, email: true, address: true } },
        User_Invoice_preparedByToUser: { select: { name: true } },
      },
    });

    const preparedByName = updated.User_Invoice_preparedByToUser?.name || null;

    return NextResponse.json({
      id: updated.id,
      tenantId: updated.tenantId,
      customerId: updated.customerId,
      customerName: updated.customer?.name || null,
      workOrderId: updated.workOrderId,
      quotationId: updated.quotationId,
      invoiceNumber: updated.invoiceNumber,
      title: updated.title,
      description: updated.description,
      items: updated.items,
      terms: updated.terms,
      currency: updated.currency,
      subtotal: Number(updated.subtotal),
      taxRate: Number(updated.taxRate),
      tax: Number(updated.tax),
      discount: Number(updated.discount),
      shipping: Number(updated.shipping),
      total: Number(updated.total),
      status: updated.status,
      referenceNo: updated.referenceNo,
      poReference: updated.poReference,
      paymentTerms: updated.paymentTerms,
      dueDate: updated.dueDate,
      notes: updated.notes,
      shipToName: updated.shipToName,
      shipToAddress: updated.shipToAddress,
      shipToPhone: updated.shipToPhone,
      shipToContact: updated.shipToContact,
      preparedBy: updated.preparedBy,
      preparedByName,
      createdBy: updated.createdBy,
      approvedBy: updated.approvedBy,
      approvedAt: updated.approvedAt,
      sentAt: updated.sentAt,
      viewedAt: updated.viewedAt,
      paidAt: updated.paidAt,
      closedAt: updated.closedAt,
      pdfUrl: updated.pdfUrl,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('Invoice status update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}