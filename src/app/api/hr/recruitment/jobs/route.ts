import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { getDbFriendlyMessage, getErrorHeaders } from '@/core/database/db';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const status = request.nextUrl.searchParams.get('status') || '';
    const search = request.nextUrl.searchParams.get('search') || '';
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '50');
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (search) {
      (where as Record<string, unknown[]>).OR = [
        { title: { contains: search, mode: 'insensitive' as const } },
        { location: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [records, total] = await Promise.all([
      db.hrJobPosition.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { postedDate: 'desc' },
        include: {
          _count: { select: { applications: true } },
        },
      }),
      db.hrJobPosition.count({ where }),
    ]);

    const data = records.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      vacancies: r.vacancies,
      location: r.location,
      salaryMin: r.salaryMin,
      salaryMax: r.salaryMax,
      description: r.description,
      requirements: r.requirements,
      status: r.status,
      postedDate: r.postedDate.toISOString(),
      closingDate: r.closingDate?.toISOString(),
      departmentId: r.departmentId,
      candidateCount: r._count.applications,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return NextResponse.json({ data, total, page, pageSize });
  } catch (error) {
    const msg = getDbFriendlyMessage(error);
    return NextResponse.json({ error: msg }, { status: 500, headers: getErrorHeaders(error) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const body = await request.json();
    const { title, departmentId, type, vacancies, location, salaryMin, salaryMax, description, requirements, closingDate } = body;

    if (!title) {
      return NextResponse.json({ error: 'Job title is required' }, { status: 400 });
    }

    const record = await db.hrJobPosition.create({
      data: {
        tenantId,
        title,
        departmentId: departmentId || null,
        type: type || 'full_time',
        vacancies: vacancies || 1,
        location: location || null,
        salaryMin: salaryMin || null,
        salaryMax: salaryMax || null,
        description: description || null,
        requirements: requirements || null,
        closingDate: closingDate ? new Date(closingDate) : null,
        status: 'open',
      },
    });

    return NextResponse.json({ data: record, message: 'Job position created' });
  } catch (error) {
    const msg = getDbFriendlyMessage(error);
    return NextResponse.json({ error: msg }, { status: 500, headers: getErrorHeaders(error) });
  }
}