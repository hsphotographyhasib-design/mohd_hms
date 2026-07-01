import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import {
  generateQuotationNo,
  computeTotals,
  type LineItem,
} from '@/lib/quotation-helpers';

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
      complaintId,
      title,
      description,
      referenceNo,
      projectName,
      site,
      items,
      terms,
      currency,
      taxRate,
      discount,
      shipping,
      validUntil,
      notes,
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

    // Generate quotation number
    const quotationNo = await generateQuotationNo(tenantId);

    // Single atomic create — all fields set in one operation
    const quotation = await db.quotation.create({
      data: {
        tenantId,
        customerId,
        complaintId: complaintId || null,
        quotationNo,
        title,
        description: description || null,
        items: JSON.stringify(parsedItems),
        subtotal,
        tax,
        discount: finalDiscount,
        shipping: finalShipping,
        total,
        taxRate: finalTaxRate,
        status: 'DRAFT',
        validUntil: validUntil ? new Date(validUntil) : null,
        notes: notes || null,
        referenceNo: referenceNo || null,
        projectName: projectName || null,
        site: site || null,
        preparedBy: userId,
        terms: terms ? JSON.stringify(terms) : null,
        currency: currency || 'BND',
      },
      include: {
        customer: { select: { name: true } },
        preparedByUser: { select: { name: true } },
      },
    });

    return NextResponse.json({
      id: quotation.id,
      tenantId: quotation.tenantId,
      customerId: quotation.customerId,
      customerName: quotation.customer?.name || null,
      complaintId: quotation.complaintId,
      quotationNo: quotation.quotationNo,
      title: quotation.title,
      description: quotation.description,
      referenceNo: quotation.referenceNo,
      projectName: quotation.projectName,
      site: quotation.site,
      preparedBy: quotation.preparedBy,
      preparedByName: quotation.preparedByUser?.name || null,
      currency: quotation.currency,
      items: quotation.items,
      terms: quotation.terms,
      subtotal: Number(quotation.subtotal),
      taxRate: Number(quotation.taxRate),
      tax: Number(quotation.tax),
      discount: Number(quotation.discount),
      shipping: Number(quotation.shipping),
      total: Number(quotation.total),
      status: quotation.status,
      validUntil: quotation.validUntil,
      approvedBy: quotation.approvedBy,
      approvedAt: quotation.approvedAt,
      sentAt: quotation.sentAt,
      acceptedAt: quotation.acceptedAt,
      pdfUrl: quotation.pdfUrl,
      notes: quotation.notes,
      createdAt: quotation.createdAt,
      updatedAt: quotation.updatedAt,
    }, { status: 201 });
  } catch (error) {
    console.error('Quotation create error:', error);
    return NextResponse.json({ error: 'Internal server error', detail: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}