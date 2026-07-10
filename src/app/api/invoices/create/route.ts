import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import {
  generateInvoiceNo,
  computeTotals,
  type LineItem,
} from '@/modules/invoices/services/invoice-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const body = await request.json();

    const {
      customerId,
      title,
      description,
      items,
      terms,
      currency,
      taxRate,
      discount,
      shipping,
      referenceNo,
      poReference,
      paymentTerms,
      dueDate,
      notes,
      shipToName,
      shipToAddress,
      shipToPhone,
      shipToContact,
      preparedBy,
      workOrderId,
      quotationId,
    } = body;

    if (!customerId || !title) {
      return NextResponse.json({ error: 'Customer and title are required' }, { status: 400 });
    }

    let parsedItems: LineItem[] = [];
    try {
      const parsed = typeof items === 'string' ? JSON.parse(items) : items;
      parsedItems = Array.isArray(parsed) ? parsed : [];
    } catch { /* ignore */ }

    const finalTaxRate = taxRate ?? 0;
    const finalDiscount = discount ?? 0;
    const finalShipping = shipping ?? 0;
    const { subtotal, tax, total } = computeTotals(parsedItems, finalTaxRate, finalDiscount, finalShipping);

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNo(tenantId);

    // Single atomic create — all fields set in one operation
    const invoice = await db.invoice.create({
      data: {
        tenantId,
        customerId,
        workOrderId: workOrderId || null,
        quotationId: quotationId || null,
        invoiceNumber,
        title,
        description: description || null,
        items: JSON.stringify(parsedItems),
        subtotal,
        taxRate: finalTaxRate,
        tax,
        discount: finalDiscount,
        shipping: finalShipping,
        total,
        status: 'DRAFT',
        currency: currency || 'BND',
        referenceNo: referenceNo || null,
        poReference: poReference || null,
        paymentTerms: paymentTerms || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        terms: terms ? JSON.stringify(terms) : null,
        shipToName: shipToName || null,
        shipToAddress: shipToAddress || null,
        shipToPhone: shipToPhone || null,
        shipToContact: shipToContact || null,
        preparedBy: preparedBy || userId,
        createdBy: userId,
        updatedAt: new Date(),
      },
      include: {
        customer: { select: { name: true } },
        User_Invoice_preparedByToUser: { select: { name: true } },
      },
    });

    return NextResponse.json({
      id: invoice.id,
      tenantId: invoice.tenantId,
      customerId: invoice.customerId,
      customerName: invoice.customer?.name || null,
      workOrderId: invoice.workOrderId,
      quotationId: invoice.quotationId,
      invoiceNumber: invoice.invoiceNumber,
      title: invoice.title,
      description: invoice.description,
      items: invoice.items,
      terms: invoice.terms,
      currency: invoice.currency,
      subtotal: Number(invoice.subtotal),
      taxRate: Number(invoice.taxRate),
      tax: Number(invoice.tax),
      discount: Number(invoice.discount),
      shipping: Number(invoice.shipping),
      total: Number(invoice.total),
      status: invoice.status,
      referenceNo: invoice.referenceNo,
      poReference: invoice.poReference,
      paymentTerms: invoice.paymentTerms,
      dueDate: invoice.dueDate,
      notes: invoice.notes,
      shipToName: invoice.shipToName,
      shipToAddress: invoice.shipToAddress,
      shipToPhone: invoice.shipToPhone,
      shipToContact: invoice.shipToContact,
      preparedBy: invoice.preparedBy,
      preparedByName: invoice.User_Invoice_preparedByToUser?.name || null,
      createdBy: invoice.createdBy,
      approvedBy: invoice.approvedBy,
      approvedAt: invoice.approvedAt,
      sentAt: invoice.sentAt,
      viewedAt: invoice.viewedAt,
      paidAt: invoice.paidAt,
      closedAt: invoice.closedAt,
      pdfUrl: invoice.pdfUrl,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    }, { status: 201 });
  } catch (error) {
    console.error('Invoice create error:', error);
    return NextResponse.json({ error: 'Internal server error', detail: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}