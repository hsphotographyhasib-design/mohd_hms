import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

function formatIndustry(i: {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  image: string | null;
  icon: string | null;
  displayOrder: number;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: i.id,
    tenantId: i.tenantId,
    name: i.name,
    description: i.description,
    image: i.image,
    icon: i.icon,
    displayOrder: i.displayOrder,
    isEnabled: i.isEnabled,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;

    const { id } = await params;

    const industry = await db.cmsIndustry.findFirst({ where: { id, tenantId } });
    if (!industry) return NextResponse.json({ error: 'Industry not found' }, { status: 404 });

    return NextResponse.json({ data: formatIndustry(industry) });
  } catch (error) {
    console.error('CMS industry GET by id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await request.json();

    const existing = await db.cmsIndustry.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Industry not found' }, { status: 404 });

    const updated = await db.cmsIndustry.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.image !== undefined && { image: body.image || null }),
        ...(body.icon !== undefined && { icon: body.icon || null }),
        ...(body.displayOrder !== undefined && { displayOrder: body.displayOrder }),
        ...(body.isEnabled !== undefined && { isEnabled: body.isEnabled }),
      },
    });

    return NextResponse.json(formatIndustry(updated));
  } catch (error) {
    console.error('CMS industry PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;

    const { id } = await params;

    const existing = await db.cmsIndustry.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Industry not found' }, { status: 404 });

    await db.cmsIndustry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CMS industry DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}