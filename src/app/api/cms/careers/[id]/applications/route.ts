import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { headers } from 'next/headers';
import type { JwtPayload } from 'jsonwebtoken';

async function getAuthUser() {
  const headersList = await headers();
  const auth = headersList.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return verifyToken(auth.slice(7));
  } catch {
    return null;
  }
}

function isAdmin(user: JwtPayload | null): user is JwtPayload {
  if (!user) return false;
  return user.role === 'super_admin' || user.role === 'admin';
}

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
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
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
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
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