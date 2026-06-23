import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
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

    const job = await db.cmsCareerJob.findFirst({ where: { id, tenantId } });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    return NextResponse.json({ data: formatJob(job) });
  } catch (error) {
    console.error('CMS career GET by id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
    const { id } = await params;
    const body = await request.json();

    const existing = await db.cmsCareerJob.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const updated = await db.cmsCareerJob.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.department !== undefined && { department: body.department || null }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.requirements !== undefined && { requirements: body.requirements || null }),
        ...(body.salary !== undefined && { salary: body.salary || null }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.applicationDeadline !== undefined && { applicationDeadline: body.applicationDeadline ? new Date(body.applicationDeadline) : null }),
        ...(body.location !== undefined && { location: body.location || null }),
        ...(body.type !== undefined && { type: body.type }),
      },
    });

    return NextResponse.json(formatJob(updated));
  } catch (error) {
    console.error('CMS career PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
    const { id } = await params;

    const existing = await db.cmsCareerJob.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    await db.cmsCareerJob.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CMS career DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}