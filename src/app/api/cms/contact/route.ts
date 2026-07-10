import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import type { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

function formatMessage(m: {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  source: string;
  status: string;
  assignedToId: string | null;
  reply: string | null;
  replyAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: m.id,
    tenantId: m.tenantId,
    name: m.name,
    email: m.email,
    phone: m.phone,
    subject: m.subject,
    message: m.message,
    source: m.source,
    status: m.status,
    assignedToId: m.assignedToId,
    reply: m.reply,
    replyAt: m.replyAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const search = request.nextUrl.searchParams.get('search') || '';
    const status = request.nextUrl.searchParams.get('status') || '';
    const source = request.nextUrl.searchParams.get('source') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.CmsContactMessageWhereInput = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { subject: { contains: search } },
        { message: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (source) where.source = source;

    const [items, total] = await Promise.all([
      db.cmsContactMessage.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.cmsContactMessage.count({ where }),
    ]);

    const data = items.map(formatMessage);

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('CMS contact messages GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUBLIC endpoint - NO auth required for contact form submissions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, subject, message, source, tenantId } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Use provided tenantId or default to the first tenant
    let targetTenantId = tenantId;
    if (!targetTenantId) {
      const firstTenant = await db.tenant.findFirst({ where: { isActive: true } });
      if (!firstTenant) {
        return NextResponse.json({ error: 'No tenant configured' }, { status: 400 });
      }
      targetTenantId = firstTenant.id;
    }

    const contactMessage = await db.cmsContactMessage.create({
      data: {
        tenantId: targetTenantId,
        name,
        email,
        phone: phone || null,
        subject: subject || null,
        message,
        source: source || 'website',
        status: 'new',
      },
    });

    return NextResponse.json(formatMessage(contactMessage), { status: 201 });
  } catch (error) {
    console.error('CMS contact POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}