import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import type { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

function formatTestimonial(t: {
  id: string;
  tenantId: string;
  customerName: string;
  company: string | null;
  photo: string | null;
  rating: number;
  comment: string;
  status: string;
  displayOrder: number;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: t.id,
    tenantId: t.tenantId,
    customerName: t.customerName,
    company: t.company,
    photo: t.photo,
    rating: t.rating,
    comment: t.comment,
    status: t.status,
    displayOrder: t.displayOrder,
    isEnabled: t.isEnabled,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const status = request.nextUrl.searchParams.get('status') || '';
    const isEnabled = request.nextUrl.searchParams.get('isEnabled');
    const skip = (page - 1) * pageSize;

    const where: Prisma.CmsTestimonialWhereInput = { tenantId };

    if (status) where.status = status;
    if (isEnabled !== null && isEnabled !== '' && isEnabled !== undefined) {
      where.isEnabled = isEnabled === 'true';
    }

    const [items, total] = await Promise.all([
      db.cmsTestimonial.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      db.cmsTestimonial.count({ where }),
    ]);

    const data = items.map(formatTestimonial);

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
    console.error('CMS testimonials GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

    const body = await request.json();
    const { customerName, company, photo, rating, comment, status, displayOrder, isEnabled } = body;

    if (!customerName) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }
    if (!comment) {
      return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
    }

    const testimonial = await db.cmsTestimonial.create({
      data: {
        tenantId,
        customerName,
        company: company || null,
        photo: photo || null,
        rating: rating ?? 5,
        comment,
        status: status || 'draft',
        displayOrder: displayOrder ?? 0,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
      },
    });

    return NextResponse.json(formatTestimonial(testimonial), { status: 201 });
  } catch (error) {
    console.error('CMS testimonials POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}