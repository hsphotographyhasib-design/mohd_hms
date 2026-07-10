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

    const record = await db.hrCandidate.findFirst({
      where: { id, tenantId },
      include: {
        job: { select: { id: true, title: true, type: true, location: true, salaryMin: true, salaryMax: true } },
      },
    });

    if (!record) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: record.id,
        name: record.name,
        email: record.email,
        phone: record.phone,
        source: record.source,
        status: record.status,
        appliedAt: record.appliedAt.toISOString(),
        interviewDate: record.interviewDate?.toISOString(),
        interviewerId: record.interviewerId,
        offerSalary: record.offerSalary,
        offerDate: record.offerDate?.toISOString(),
        notes: record.notes,
        resumeUrl: record.resumeUrl,
        coverLetterUrl: record.coverLetterUrl,
        jobId: record.jobId,
        job: record.job,
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

    const existing = await db.hrCandidate.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const { status, name, email, phone, source, interviewDate, interviewerId, offerSalary, offerDate, notes } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone || null;
    if (source !== undefined) updateData.source = source || null;
    if (status !== undefined) updateData.status = status;
    if (interviewDate !== undefined) updateData.interviewDate = interviewDate ? new Date(interviewDate) : null;
    if (interviewerId !== undefined) updateData.interviewerId = interviewerId || null;
    if (offerSalary !== undefined) updateData.offerSalary = offerSalary || null;
    if (offerDate !== undefined) updateData.offerDate = offerDate ? new Date(offerDate) : null;
    if (notes !== undefined) updateData.notes = notes || null;

    const updated = await db.hrCandidate.update({
      where: { id },
      data: updateData,
      include: { job: { select: { title: true } } },
    });

    return NextResponse.json({ data: updated, message: 'Candidate updated' });
  } catch (error) {
    const msg = getDbFriendlyMessage(error);
    return NextResponse.json({ error: msg }, { status: 500, headers: getErrorHeaders(error) });
  }
}