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
    const jobId = request.nextUrl.searchParams.get('jobId') || '';
    const search = request.nextUrl.searchParams.get('search') || '';
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '50');
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (jobId) where.jobId = jobId;
    if (search) {
      (where as Record<string, unknown[]>).OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [records, total] = await Promise.all([
      db.hrCandidate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { appliedAt: 'desc' },
        include: {
          job: { select: { id: true, title: true } },
        },
      }),
      db.hrCandidate.count({ where }),
    ]);

    const data = records.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      source: r.source,
      status: r.status,
      appliedAt: r.appliedAt.toISOString(),
      interviewDate: r.interviewDate?.toISOString(),
      interviewerId: r.interviewerId,
      offerSalary: r.offerSalary,
      offerDate: r.offerDate?.toISOString(),
      notes: r.notes,
      resumeUrl: r.resumeUrl,
      coverLetterUrl: r.coverLetterUrl,
      jobId: r.jobId,
      jobTitle: r.job?.title || '',
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
    const { jobId, name, email, phone, source, resumeUrl, coverLetterUrl, notes } = body;

    if (!jobId || !name || !email) {
      return NextResponse.json({ error: 'jobId, name, and email are required' }, { status: 400 });
    }

    // Verify job exists
    const job = await db.hrJobPosition.findFirst({ where: { id: jobId, tenantId } });
    if (!job) {
      return NextResponse.json({ error: 'Job position not found' }, { status: 404 });
    }

    const record = await db.hrCandidate.create({
      data: {
        tenantId,
        jobId,
        name,
        email,
        phone: phone || null,
        source: source || null,
        status: 'applied',
        resumeUrl: resumeUrl || null,
        coverLetterUrl: coverLetterUrl || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ data: record, message: 'Candidate added' });
  } catch (error) {
    const msg = getDbFriendlyMessage(error);
    return NextResponse.json({ error: msg }, { status: 500, headers: getErrorHeaders(error) });
  }
}