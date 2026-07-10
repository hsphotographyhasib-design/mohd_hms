import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { getDbFriendlyMessage, getErrorHeaders } from '@/core/database/db';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;

    const { id } = await params;

    const record = await db.hrJobPosition.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { applications: true } },
      },
    });

    if (!record) {
      return NextResponse.json({ error: 'Job position not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: record.id,
        title: record.title,
        type: record.type,
        vacancies: record.vacancies,
        location: record.location,
        salaryMin: record.salaryMin,
        salaryMax: record.salaryMax,
        description: record.description,
        requirements: record.requirements,
        status: record.status,
        postedDate: record.postedDate.toISOString(),
        closingDate: record.closingDate?.toISOString(),
        departmentId: record.departmentId,
        candidateCount: record._count.applications,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    const msg = getDbFriendlyMessage(error);
    return NextResponse.json({ error: msg }, { status: 500, headers: getErrorHeaders(error) });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;

    const { id } = await params;
    const body = await request.json();

    const existing = await db.hrJobPosition.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: 'Job position not found' }, { status: 404 });
    }

    const { title, type, vacancies, location, salaryMin, salaryMax, description, requirements, closingDate, status } = body;

    const updated = await db.hrJobPosition.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(type !== undefined && { type }),
        ...(vacancies !== undefined && { vacancies }),
        ...(location !== undefined && { location: location || null }),
        ...(salaryMin !== undefined && { salaryMin: salaryMin || null }),
        ...(salaryMax !== undefined && { salaryMax: salaryMax || null }),
        ...(description !== undefined && { description: description || null }),
        ...(requirements !== undefined && { requirements: requirements || null }),
        ...(closingDate !== undefined && { closingDate: closingDate ? new Date(closingDate) : null }),
        ...(status !== undefined && { status }),
      },
    });

    return NextResponse.json({ data: updated, message: 'Job position updated' });
  } catch (error) {
    const msg = getDbFriendlyMessage(error);
    return NextResponse.json({ error: msg }, { status: 500, headers: getErrorHeaders(error) });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'hr' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;

    const { id } = await params;

    const existing = await db.hrJobPosition.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: 'Job position not found' }, { status: 404 });
    }

    // Check if there are associated candidates
    const candidateCount = await db.hrCandidate.count({ where: { jobId: id, tenantId } });
    if (candidateCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${candidateCount} candidate(s) are linked to this job` },
        { status: 400 }
      );
    }

    await db.hrJobPosition.delete({ where: { id } });

    return NextResponse.json({ message: 'Job position deleted' });
  } catch (error) {
    const msg = getDbFriendlyMessage(error);
    return NextResponse.json({ error: msg }, { status: 500, headers: getErrorHeaders(error) });
  }
}