import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import type { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

function formatApplication(a: {
  id: string;
  tenantId: string;
  jobId: string;
  fullName: string;
  email: string;
  phone: string | null;
  resumeUrl: string | null;
  coverLetter: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: a.id,
    tenantId: a.tenantId,
    jobId: a.jobId,
    fullName: a.fullName,
    email: a.email,
    phone: a.phone,
    resumeUrl: a.resumeUrl,
    coverLetter: a.coverLetter,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

    const { id } = await params;

    // Verify the job belongs to this tenant
    const job = await db.cmsCareerJob.findFirst({ where: { id, tenantId } });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const status = request.nextUrl.searchParams.get('status') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.CmsCareerApplicationWhereInput = { jobId: id, tenantId };

    if (status) where.status = status;

    const [items, total] = await Promise.all([
      db.cmsCareerApplication.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.cmsCareerApplication.count({ where }),
    ]);

    const data = items.map(formatApplication);

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
    console.error('CMS career applications GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

    const { id } = await params;

    // Verify the job belongs to this tenant
    const job = await db.cmsCareerJob.findFirst({ where: { id, tenantId } });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const body = await request.json();
    const { fullName, email, phone, resumeUrl, coverLetter, status } = body;

    if (!fullName) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const application = await db.cmsCareerApplication.create({
      data: {
        tenantId,
        jobId: id,
        fullName,
        email,
        phone: phone || null,
        resumeUrl: resumeUrl || null,
        coverLetter: coverLetter || null,
        status: status || 'new',
      },
    });

    return NextResponse.json(formatApplication(application), { status: 201 });
  } catch (error) {
    console.error('CMS career applications POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}