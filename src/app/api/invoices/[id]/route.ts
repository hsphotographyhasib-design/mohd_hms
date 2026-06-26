import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export const dynamic = 'force-dynamic';

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
        customer: { select: { name: true, phone: true, email: true, address: true, companyName: true, pic: true } },
        workOrder: { select: { id: true, title: true } },
        creator: { select: { name: true } },
        preparer: { select: { name: true } },
        quotation: { select: { quotationNo: true } },
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
      customerPhone: invoice.customer.phone,
      customerEmail: invoice.customer.email,
      customerAddress: invoice.customer.address,
      customerCompany: invoice.customer.companyName,
      customerPic: invoice.customer.pic,
      workOrderId: invoice.workOrderId,
      workOrderTitle: invoice.workOrder?.title,
      quotationId: invoice.quotationId,
      quotationNo: invoice.quotation?.quotationNo,
      invoiceNumber: invoice.invoiceNumber,
      title: invoice.title,
      description: invoice.description,
      items: invoice.items,
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate ?? 0,
      tax: invoice.tax,
      discount: invoice.discount,
      shipping: invoice.shipping ?? 0,
      total: invoice.total,
      status: invoice.status,
      currency: invoice.currency ?? 'BND',
      referenceNo: invoice.referenceNo,
      poReference: invoice.poReference,
      paymentTerms: invoice.paymentTerms,
      dueDate: invoice.dueDate?.toISOString(),
      paidAt: invoice.paidAt?.toISOString(),
      paymentMethod: invoice.paymentMethod,
      paymentRef: invoice.paymentRef,
      transactionId: invoice.transactionId,
      bankName: invoice.bankName,
      bankAccountName: invoice.bankAccountName,
      bankAccountNo: invoice.bankAccountNo,
      sentVia: invoice.sentVia,
      pdfUrl: invoice.pdfUrl,
      notes: invoice.notes,
      terms: invoice.terms,
      shipToName: invoice.shipToName,
      shipToAddress: invoice.shipToAddress,
      shipToPhone: invoice.shipToPhone,
      shipToContact: invoice.shipToContact,
      preparedBy: invoice.preparedBy,
      preparedByName: invoice.preparer?.name,
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
    if (body.taxRate !== undefined) updateData.taxRate = body.taxRate;
    if (body.tax !== undefined) updateData.tax = body.tax;
    if (body.discount !== undefined) updateData.discount = body.discount;
    if (body.shipping !== undefined) updateData.shipping = body.shipping;
    if (body.total !== undefined) updateData.total = body.total;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.referenceNo !== undefined) updateData.referenceNo = body.referenceNo || null;
    if (body.poReference !== undefined) updateData.poReference = body.poReference || null;
    if (body.paymentTerms !== undefined) updateData.paymentTerms = body.paymentTerms || null;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.sentVia !== undefined) updateData.sentVia = body.sentVia || null;
    if (body.pdfUrl !== undefined) updateData.pdfUrl = body.pdfUrl || null;
    if (body.notes !== undefined) updateData.notes = body.notes || null;
    if (body.terms !== undefined) updateData.terms = body.terms ? JSON.stringify(body.terms) : null;
    if (body.shipToName !== undefined) updateData.shipToName = body.shipToName || null;
    if (body.shipToAddress !== undefined) updateData.shipToAddress = body.shipToAddress || null;
    if (body.shipToPhone !== undefined) updateData.shipToPhone = body.shipToPhone || null;
    if (body.shipToContact !== undefined) updateData.shipToContact = body.shipToContact || null;
    if (body.preparedBy !== undefined) updateData.preparedBy = body.preparedBy || null;
    if (body.bankName !== undefined) updateData.bankName = body.bankName || null;
    if (body.bankAccountName !== undefined) updateData.bankAccountName = body.bankAccountName || null;
    if (body.bankAccountNo !== undefined) updateData.bankAccountNo = body.bankAccountNo || null;
    if (body.transactionId !== undefined) updateData.transactionId = body.transactionId || null;

    if (body.status) {
      updateData.status = body.status;
      if (body.status === 'PAID') {
        updateData.paidAt = new Date();
        if (body.paymentMethod) updateData.paymentMethod = body.paymentMethod;
        if (body.paymentRef) updateData.paymentRef = body.paymentRef;
        if (body.transactionId) updateData.transactionId = body.transactionId;
      }
    }

    const updated = await db.invoice.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { name: true, phone: true, email: true, address: true, companyName: true, pic: true } },
        creator: { select: { name: true } },
        preparer: { select: { name: true } },
        quotation: { select: { quotationNo: true } },
      },
    });

    return NextResponse.json({
      id: updated.id,
      tenantId: updated.tenantId,
      customerId: updated.customerId,
      customerName: updated.customer.name,
      customerPhone: updated.customer.phone,
      customerEmail: updated.customer.email,
      customerAddress: updated.customer.address,
      customerCompany: updated.customer.companyName,
      customerPic: updated.customer.pic,
      workOrderId: updated.workOrderId,
      quotationId: updated.quotationId,
      quotationNo: updated.quotation?.quotationNo,
      invoiceNumber: updated.invoiceNumber,
      title: updated.title,
      description: updated.description,
      items: updated.items,
      subtotal: updated.subtotal,
      taxRate: updated.taxRate ?? 0,
      tax: updated.tax,
      discount: updated.discount,
      shipping: updated.shipping ?? 0,
      total: updated.total,
      status: updated.status,
      currency: updated.currency ?? 'BND',
      referenceNo: updated.referenceNo,
      poReference: updated.poReference,
      paymentTerms: updated.paymentTerms,
      dueDate: updated.dueDate?.toISOString(),
      paidAt: updated.paidAt?.toISOString(),
      paymentMethod: updated.paymentMethod,
      paymentRef: updated.paymentRef,
      transactionId: updated.transactionId,
      bankName: updated.bankName,
      bankAccountName: updated.bankAccountName,
      bankAccountNo: updated.bankAccountNo,
      sentVia: updated.sentVia,
      pdfUrl: updated.pdfUrl,
      notes: updated.notes,
      terms: updated.terms,
      shipToName: updated.shipToName,
      shipToAddress: updated.shipToAddress,
      shipToPhone: updated.shipToPhone,
      shipToContact: updated.shipToContact,
      preparedBy: updated.preparedBy,
      preparedByName: updated.preparer?.name,
      createdBy: updated.createdBy,
      creatorName: updated.creator?.name,
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