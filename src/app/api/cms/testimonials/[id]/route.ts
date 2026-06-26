import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { headers } from 'next/headers';
import type { JwtPayload } from 'jsonwebtoken';
export const dynamic = 'force-dynamic';

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

    const testimonial = await db.cmsTestimonial.findFirst({ where: { id, tenantId } });
    if (!testimonial) return NextResponse.json({ error: 'Testimonial not found' }, { status: 404 });

    return NextResponse.json({ data: formatTestimonial(testimonial) });
  } catch (error) {
    console.error('CMS testimonial GET by id error:', error);
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

    const existing = await db.cmsTestimonial.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Testimonial not found' }, { status: 404 });

    const updated = await db.cmsTestimonial.update({
      where: { id },
      data: {
        ...(body.customerName !== undefined && { customerName: body.customerName }),
        ...(body.company !== undefined && { company: body.company || null }),
        ...(body.photo !== undefined && { photo: body.photo || null }),
        ...(body.rating !== undefined && { rating: body.rating }),
        ...(body.comment !== undefined && { comment: body.comment }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.displayOrder !== undefined && { displayOrder: body.displayOrder }),
        ...(body.isEnabled !== undefined && { isEnabled: body.isEnabled }),
      },
    });

    return NextResponse.json(formatTestimonial(updated));
  } catch (error) {
    console.error('CMS testimonial PUT error:', error);
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

    const existing = await db.cmsTestimonial.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Testimonial not found' }, { status: 404 });

    await db.cmsTestimonial.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CMS testimonial DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}