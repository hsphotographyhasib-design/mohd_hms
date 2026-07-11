import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import type { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

function formatJob(j: {
  id: string;
  tenantId: string;
  title: string;
  department: string | null;
  description: string | null;
  requirements: string | null;
  salary: string | null;
  status: string;
  applicationDeadline: Date | null;
  location: string | null;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: j.id,
    tenantId: j.tenantId,
    title: j.title,
    department: j.department,
    description: j.description,
    requirements: j.requirements,
    salary: j.salary,
    status: j.status,
    applicationDeadline: j.applicationDeadline?.toISOString() ?? null,
    location: j.location,
    type: j.type,
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const search = request.nextUrl.searchParams.get('search') || '';
    const department = request.nextUrl.searchParams.get('department') || '';
    const status = request.nextUrl.searchParams.get('status') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.CmsCareerJobWhereInput = { tenantId };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (department) where.department = department;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      db.cmsCareerJob.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.cmsCareerJob.count({ where }),
    ]);

    const data = items.map(formatJob);

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
    console.error('CMS careers GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

    const body = await request.json();
    const {
      title,
      department,
      description,
      requirements,
      salary,
      status,
      applicationDeadline,
      location,
      type,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const job = await db.cmsCareerJob.create({
      data: {
        tenantId,
        title,
        department: department || null,
        description: description || null,
        requirements: requirements || null,
        salary: salary || null,
        status: status || 'open',
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
        location: location || null,
        type: type || 'fulltime',
      },
    });

    return NextResponse.json(formatJob(job), { status: 201 });
  } catch (error) {
    console.error('CMS careers POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}