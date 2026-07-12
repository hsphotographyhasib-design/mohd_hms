import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { generateInvoiceNumber } from '@/core/auth/auth-lib';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { scopeInvoice } from '@/core/permissions/rbac/data-scope';
import { notifyInvoiceCreated } from '@/modules/notifications/services/notification-service';
import type { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'invoices', entity: 'invoice', action: 'view' });
    if (auth.error) return auth.error;

    // Build RBAC WHERE clause for invoices via data-scope
    const invoiceWhere = await scopeInvoice({ userId: auth.userId, tenantId: auth.tenantId, role: auth.role, email: auth.email });
    if (!invoiceWhere) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    let where: Prisma.InvoiceWhereInput = { ...invoiceWhere };

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const search = request.nextUrl.searchParams.get('search') || '';
    const status = request.nextUrl.searchParams.get('status') || '';
    const queryCustomerId = request.nextUrl.searchParams.get('customerId') || '';
    const skip = (page - 1) * pageSize;

    // Save RBAC base (before query param filters) for stats queries
    const rbacWhere: Prisma.InvoiceWhereInput = { ...where };

    const wantStats = request.nextUrl.searchParams.get('stats') === 'true';

    if (wantStats) {
      const [totalCount, totalValue, draftCount, reviewCount, sentCount, paidCount, overdueCount] = await Promise.all([
        db.invoice.count({ where: rbacWhere }),
        db.invoice.aggregate({ where: rbacWhere, _sum: { total: true } }).catch(() => ({ _sum: { total: 0 } })),
        db.invoice.count({ where: { ...rbacWhere, status: 'DRAFT' } as Prisma.InvoiceWhereInput }),
        db.invoice.count({ where: { ...rbacWhere, status: 'REVIEW' } as Prisma.InvoiceWhereInput }),
        db.invoice.count({ where: { ...rbacWhere, status: { in: ['SENT', 'VIEWED', 'APPROVED'] } } as Prisma.InvoiceWhereInput }),
        db.invoice.count({ where: { ...rbacWhere, status: 'PAID' } as Prisma.InvoiceWhereInput }),
        db.invoice.count({ where: { ...rbacWhere, status: 'OVERDUE' } as Prisma.InvoiceWhereInput }),
      ]);
      return NextResponse.json({
        stats: {
          totalCount,
          totalValue: Number(totalValue._sum.total || 0),
          draftCount,
          reviewCount,
          sentCount,
          paidCount,
          overdueCount,
        },
      });
    }

    // Apply search, status, and customerId query param filters on top of RBAC (for list queries)
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { invoiceNumber: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (queryCustomerId) where.customerId = queryCustomerId;

    let items: any[] = [];
    let total = 0;
    try {
      [items, total] = await Promise.all([
        db.invoice.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { name: true, phone: true, email: true, address: true, companyName: true, pic: true } },
            quotation: { select: { quotationNo: true } },
            workOrder: { select: { id: true, title: true } },
            preparedByUser: { select: { name: true } },
            createdByUser: { select: { name: true } },
            payments: { orderBy: { paidAt: 'desc' } },
          },
        }),
        db.invoice.count({ where }),
      ]);
    } catch {
      // Invoice table may not exist in Supabase yet
      return NextResponse.json({ data: [], total: 0, page, pageSize, totalPages: 0 });
    }

    const data = items.map((inv: any) => {
      const amountPaid = inv.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;
      return {
      id: inv.id,
      tenantId: inv.tenantId,
      customerId: inv.customerId,
      customerName: inv.customer?.name || '—',
      customerPhone: inv.customer?.phone,
      customerEmail: inv.customer?.email,
      customerAddress: inv.customer?.address,
      customerCompany: inv.customer?.companyName,
      customerPic: inv.customer?.pic,
      workOrderId: inv.workOrderId,
      workOrderTitle: inv.workOrder?.title,
      quotationId: inv.quotationId,
      quotationNo: inv.quotation?.quotationNo,
      invoiceNumber: inv.invoiceNumber,
      title: inv.title,
      description: inv.description,
      items: inv.items,
      subtotal: Number(inv.subtotal),
      taxRate: Number(inv.taxRate ?? 0),
      tax: Number(inv.tax),
      discount: Number(inv.discount),
      shipping: Number(inv.shipping ?? 0),
      total: Number(inv.total),
      status: inv.status,
      currency: inv.currency ?? 'BND',
      referenceNo: inv.referenceNo,
      poReference: inv.poReference,
      paymentTerms: inv.paymentTerms,
      dueDate: inv.dueDate ? (typeof inv.dueDate === 'string' ? inv.dueDate : new Date(inv.dueDate).toISOString()) : undefined,
      paidAt: inv.paidAt ? (typeof inv.paidAt === 'string' ? inv.paidAt : new Date(inv.paidAt).toISOString()) : undefined,
      paymentMethod: inv.paymentMethod,
      paymentRef: inv.paymentRef,
      transactionId: inv.transactionId,
      sentVia: inv.sentVia,
      pdfUrl: inv.pdfUrl,
      notes: inv.notes,
      terms: inv.terms,
      preparedBy: inv.preparedBy,
      preparedByName: inv.preparedByUser?.name,
      createdBy: inv.createdBy,
      creatorName: inv.createdByUser?.name,
      approvedAt: inv.approvedAt ? new Date(inv.approvedAt).toISOString() : undefined,
      sentAt: inv.sentAt ? new Date(inv.sentAt).toISOString() : undefined,
      amountPaid,
      balanceDue: Number(inv.total) - amountPaid,
      payments: inv.payments?.map((p: any) => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        referenceNo: p.referenceNo,
        transactionId: p.transactionId,
        notes: p.notes,
        paidAt: new Date(p.paidAt).toISOString(),
        createdByName: null,
      })),
      createdAt: typeof inv.createdAt === 'string' ? inv.createdAt : new Date(inv.createdAt).toISOString(),
      updatedAt: typeof inv.updatedAt === 'string' ? inv.updatedAt : new Date(inv.updatedAt).toISOString(),
    }});

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
    const auth = verifyRouteAuth(request, { feature: 'invoices', entity: 'invoice', action: 'create' });
    if (auth.error) return auth.error;

    const tenantId = auth.tenantId;
    const userId = auth.userId;
    const body = await request.json();
    const {
      customerId, workOrderId, quotationId, title, description, items,
      subtotal, taxRate, tax, discount, shipping, total, status, dueDate, sentVia,
      currency, referenceNo, poReference, paymentTerms, notes, terms,
      shipToName, shipToAddress, shipToPhone, shipToContact, preparedBy,
      bankName, bankAccountName, bankAccountNo,
    } = body;

    if (!customerId || !title) {
      return NextResponse.json({ error: 'Customer and title are required' }, { status: 400 });
    }

    const invoiceNumber = generateInvoiceNumber();

    const invoice = await db.invoice.create({
      data: {
        tenantId,
        customerId,
        workOrderId: workOrderId || null,
        quotationId: quotationId || null,
        invoiceNumber,
        title,
        description: description || null,
        items: items ? JSON.stringify(items) : null,
        subtotal: subtotal || 0,
        taxRate: taxRate || 0,
        tax: tax || 0,
        discount: discount || 0,
        shipping: shipping || 0,
        total: total || 0,
        status: status || 'DRAFT',
        currency: currency || 'BND',
        referenceNo: referenceNo || null,
        poReference: poReference || null,
        paymentTerms: paymentTerms || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        sentVia: sentVia || null,
        notes: notes || null,
        terms: terms ? JSON.stringify(terms) : null,
        shipToName: shipToName || null,
        shipToAddress: shipToAddress || null,
        shipToPhone: shipToPhone || null,
        shipToContact: shipToContact || null,
        preparedBy: preparedBy || null,
        bankName: bankName || null,
        bankAccountName: bankAccountName || null,
        bankAccountNo: bankAccountNo || null,
        createdBy: userId,
      },
      include: {
        customer: { select: { name: true, phone: true, email: true, address: true, companyName: true, pic: true } },
      },
    });

    // Notify customer about the new invoice (fire-and-forget)
    try {
      await notifyInvoiceCreated(
        invoice.id,
        tenantId,
        customerId,
        title,
        total || 0,
        userId,
      );
    } catch (notifErr) {
      console.error('Failed to send invoice creation notification:', notifErr);
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
      quotationId: invoice.quotationId,
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