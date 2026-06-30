import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import {
  generateQuotationNo,
  computeTotals,
  addNewQuotationFields,
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

    // 1. Create quotation with original fields only (Turbopack-compatible)
    const quotation = await db.quotation.create({
      data: {
        tenantId,
        customerId,
        complaintId: complaintId || null,
        quotationNo: '',  // placeholder, will update below
        title,
        description: description || null,
        items: JSON.stringify(parsedItems),
        subtotal,
        tax: 0,
        discount: 0,
        total,
        status: 'DRAFT',
        validUntil: validUntil ? new Date(validUntil) : null,
        notes: notes || null,
      },
      include: {
        customer: { select: { name: true, phone: true, email: true } },
      },
    });

    // 2. Set the new schema fields using raw SQL (bypasses Turbopack's cached Prisma client)
    await addNewQuotationFields(quotation.id, {
      quotationNo,
      referenceNo,
      projectName,
      site,
      preparedBy: userId,
      terms,
      currency,
      taxRate: finalTaxRate,
      discount: finalDiscount,
      shipping: finalShipping,
      sentAt: null,
      acceptedAt: null,
    });

    // 3. Fetch with joined names for response
    const q = await db.quotation.findFirst({
      where: { id: quotation.id },
      include: {
        customer: { select: { name: true } },
        preparedByUser: { select: { name: true } },
      },
    });
    if (!q) throw new Error('Quotation not found after creation');

    return NextResponse.json({
      id: q.id,
      tenantId: q.tenantId,
      customerId: q.customerId,
      customerName: q.customer?.name || null,
      complaintId: q.complaintId,
      quotationNo: q.quotationNo,
      title: q.title,
      description: q.description,
      referenceNo: q.referenceNo,
      projectName: q.projectName,
      site: q.site,
      preparedBy: q.preparedBy,
      preparedByName: q.preparedByUser?.name || null,
      currency: q.currency,
      items: q.items,
      terms: q.terms,
      subtotal: Number(q.subtotal),
      taxRate: Number(q.taxRate),
      tax: Number(q.tax),
      discount: Number(q.discount),
      shipping: Number(q.shipping),
      total: Number(q.total),
      status: q.status,
      validUntil: q.validUntil,
      approvedBy: q.approvedBy,
      approvedAt: q.approvedAt,
      sentAt: q.sentAt,
      acceptedAt: q.acceptedAt,
      pdfUrl: q.pdfUrl,
      notes: q.notes,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    }, { status: 201 });
  } catch (error) {
    console.error('Quotation create error:', error);
    return NextResponse.json({ error: 'Internal server error', detail: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}