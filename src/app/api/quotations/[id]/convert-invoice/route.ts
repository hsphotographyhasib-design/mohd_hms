import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { generateInvoiceNumber } from '@/core/auth/auth-lib';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'quotations', entity: 'quotation', action: 'convert_to_invoice' });
    if (auth.error) return auth.error;

    const tenantId = auth.tenantId;
    const userId = auth.userId;
    const { id } = await params;

    const quotation = await db.quotation.findFirst({
      where: { id, tenantId },
      include: { customer: { select: { name: true, phone: true, email: true, address: true, companyName: true, pic: true } } },
    });

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    if (!['DRAFT', 'APPROVED', 'SENT', 'ACCEPTED'].includes(quotation.status)) {
      return NextResponse.json(
        { error: `Cannot convert quotation in ${quotation.status} status to Invoice` },
        { status: 400 }
      );
    }

    // Parse items
    let parsedItems: any[] = [];
    try {
      parsedItems = typeof quotation.items === 'string' ? JSON.parse(quotation.items) : quotation.items;
      if (!Array.isArray(parsedItems)) parsedItems = [];
    } catch {
      parsedItems = [];
    }

    // Map quotation items to invoice items format
    const invoiceItems = parsedItems.map((item: any) => ({
      title: item.title || item.description || 'Item',
      description: item.description || '',
      unit: item.unit || 'Nos',
      quantity: item.quantity || 0,
      unitPrice: item.rate || item.unitPrice || 0,
      amount: item.amount || 0,
    }));

    // Due date: 30 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Create invoice
    const invoice = await db.invoice.create({
      data: {
        tenantId,
        customerId: quotation.customerId,
        quotationId: id,
        invoiceNumber: generateInvoiceNumber(),
        title: `Invoice for ${quotation.title || quotation.projectName || 'Services'}`,
        description: quotation.description,
        items: JSON.stringify(invoiceItems),
        subtotal: Number(quotation.subtotal) || 0,
        taxRate: Number(quotation.taxRate) || 0,
        tax: Number(quotation.tax) || 0,
        discount: Number(quotation.discount) || 0,
        shipping: Number(quotation.shipping) || 0,
        total: Number(quotation.total) || 0,
        status: 'DRAFT',
        currency: quotation.currency || 'BND',
        referenceNo: quotation.referenceNo || null,
        dueDate,
        notes: `Converted from Quotation ${quotation.quotationNo}`,
        terms: quotation.terms,
        shipToName: quotation.customer?.companyName || quotation.customer?.name || null,
        shipToAddress: quotation.site || quotation.customer?.address || null,
        shipToPhone: quotation.customer?.phone || null,
        shipToContact: quotation.customer?.pic || null,
        preparedBy: quotation.preparedBy || null,
        createdBy: userId,
      },
      include: {
        customer: { select: { name: true, phone: true, email: true, address: true, companyName: true, pic: true } },
      },
    });

    // Update quotation status
    await db.quotation.update({
      where: { id },
      data: { status: 'CONVERTED_INVOICE' },
    });

    return NextResponse.json({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      quotationId: id,
      quotationNo: quotation.quotationNo,
      message: `Invoice ${invoice.invoiceNumber} created successfully from Quotation ${quotation.quotationNo}`,
    });
  } catch (error) {
    console.error('Convert quotation to Invoice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}