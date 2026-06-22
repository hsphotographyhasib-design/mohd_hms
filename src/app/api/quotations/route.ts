import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

interface QuotationItem {
  title?: string;
  unit?: string;
  quantity?: number;
  rate?: number;
  amount?: number;
  description?: string;
  unitPrice?: number;
  [key: string]: unknown;
}

function computeTotals(items: QuotationItem[], taxRate = 0, discount = 0, shipping = 0) {
  const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax - discount + shipping;
  return { subtotal, tax, discount, shipping, total };
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const search = request.nextUrl.searchParams.get('search') || '';
    const status = request.nextUrl.searchParams.get('status') || '';
    const customerId = request.nextUrl.searchParams.get('customerId') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.QuotationWhereInput = { tenantId };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { quotationNo: { contains: search } },
        { referenceNo: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    // Stats query (lightweight aggregation)
  const statsMode = request.nextUrl.searchParams.get('stats') === 'true';

    if (statsMode) {
      const [totalCount, totalValue, draftCount, pendingCount, acceptedCount, paidCount] = await Promise.all([
        db.quotation.count({ where: { tenantId } }),
        db.quotation.aggregate({ where: { tenantId }, _sum: { total: true } }),
        db.quotation.count({ where: { tenantId, status: 'DRAFT' } }),
        db.quotation.count({ where: { tenantId, status: { in: ['REVIEW', 'SENT', 'APPROVED'] } } }),
        db.quotation.count({ where: { tenantId, status: 'ACCEPTED' } }),
        db.quotation.count({ where: { tenantId, status: 'PAID' } }),
      ]);
      return NextResponse.json({
        total: totalCount,
        totalValue: totalValue._sum.total || 0,
        draft: draftCount,
        pendingAction: pendingCount,
        accepted: acceptedCount,
        paid: paidCount,
      });
    }

    const [items, total] = await Promise.all([
      db.quotation.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, phone: true, email: true } },
        },
      }),
      db.quotation.count({ where }),
    ]);

    const data = items.map((q) => ({
      id: q.id,
      tenantId: q.tenantId,
      customerId: q.customerId,
      customerName: q.customer.name,
      complaintId: q.complaintId,
      quotationNo: q.quotationNo,
      title: q.title,
      description: q.description,
      referenceNo: q.referenceNo,
      projectName: q.projectName,
      site: q.site,
      preparedBy: q.preparedBy,
      currency: q.currency,
      subtotal: q.subtotal,
      taxRate: q.taxRate,
      tax: q.tax,
      discount: q.discount,
      shipping: q.shipping,
      total: q.total,
      status: q.status,
      validUntil: q.validUntil?.toISOString(),
      approvedBy: q.approvedBy,
      approvedAt: q.approvedAt?.toISOString(),
      sentAt: q.sentAt?.toISOString(),
      acceptedAt: q.acceptedAt?.toISOString(),
      pdfUrl: q.pdfUrl,
      notes: q.notes,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Quotations list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    let parsedItems: QuotationItem[] = [];
    try {
      parsedItems = typeof items === 'string' ? JSON.parse(items) : (Array.isArray(items) ? items : []);
    } catch { parsedItems = []; }
    const finalTaxRate = taxRate ?? 0;
    const finalDiscount = discount ?? 0;
    const finalShipping = shipping ?? 0;
    const { subtotal, tax, total } = computeTotals(parsedItems, finalTaxRate, finalDiscount, finalShipping);

    // Generate quotation number: QTN/{tenant_code}/{month}/{sequential_4digit}
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const tenantCode = tenant.name.substring(0, 4).toUpperCase();

    const monthStart = new Date(year, now.getMonth(), 1);
    const monthEnd = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);

    const count = await db.quotation.count({
      where: {
        tenantId,
        createdAt: { gte: monthStart, lte: monthEnd },
      },
    });

    const sequential = String(count + 1).padStart(4, '0');
    const quotationNo = `QTN/${tenantCode}/${month}/${sequential}`;

    const qId = crypto.randomUUID();
    const sqlStr = (s: string | undefined | null) => s ? s.replace(/'/g, "''") : null;
    const safeItems = sqlStr(JSON.stringify(parsedItems));
    const safeTerms = terms ? sqlStr(JSON.stringify(terms)) : null;
    const safeTitle = sqlStr(title);
    const safeDesc = description ? `'${sqlStr(description)}'` : 'NULL';
    const safeRef = referenceNo ? `'${sqlStr(referenceNo)}'` : 'NULL';
    const safeProject = projectName ? `'${sqlStr(projectName)}'` : 'NULL';
    const safeSite = site ? `'${sqlStr(site)}'` : 'NULL';
    const safeNotes = notes ? `'${sqlStr(notes)}'` : 'NULL';
    const safeValidUntil = validUntil ? `'${new Date(validUntil).toISOString()}'` : 'NULL';
    const safeComplaintId = complaintId ? `'${complaintId}'` : 'NULL';
    const dt = new Date();
    const isoNow = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}:${String(dt.getSeconds()).padStart(2,'0')}`;

    console.log('[QUOTATION SQL]:', `INSERT INTO Quotation ... VALUES ('${qId.substring(0,8)}...', '${safeItems.substring(0, 30)}...`);
    await db.$executeRawUnsafe(`
      INSERT INTO Quotation (id, tenantId, customerId, complaintId, quotationNo, title, description, referenceNo, projectName, site, preparedBy, items, terms, currency, subtotal, taxRate, tax, discount, shipping, total, status, validUntil, notes, createdAt, updatedAt)
      VALUES ('${qId}', '${tenantId}', '${customerId}', ${safeComplaintId}, '${quotationNo}', '${safeTitle}', ${safeDesc}, ${safeRef}, ${safeProject}, ${safeSite}, '${userId}', '${safeItems}', ${safeTerms}, '${currency || 'BND'}', ${subtotal}, ${finalTaxRate}, ${tax}, ${finalDiscount}, ${finalShipping}, ${total}, 'DRAFT', ${safeValidUntil}, ${safeNotes}, '${now.toISOString()}', '${now.toISOString()}')
    `);

    const rows = await db.$queryRawUnsafe<any[]>(`
      SELECT q.*, c.name as "customerName"
      FROM Quotation q
      LEFT JOIN Customer c ON q.customerId = c.id
      WHERE q.id = '${qId}'
    `);
    const q = rows[0];

    return NextResponse.json({
      id: q.id,
      tenantId: q.tenantId,
      customerId: q.customerId,
      customerName: q.customerName,
      quotationNo: q.quotationNo,
      title: q.title,
      description: q.description,
      referenceNo: q.referenceNo,
      projectName: q.projectName,
      site: q.site,
      preparedBy: q.preparedBy,
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
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    }, { status: 201 });
  } catch (error) {
    console.error('Quotation create error:', error);
    return NextResponse.json({ error: 'Internal server error', detail: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}