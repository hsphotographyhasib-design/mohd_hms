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

function formatProject(p: {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  featuredImage: string | null;
  images: string | null;
  beforeAfterImages: string | null;
  completionStatus: string;
  isFeatured: boolean;
  galleryImages: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  displayOrder: number;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    tenantId: p.tenantId,
    title: p.title,
    slug: p.slug,
    description: p.description,
    category: p.category,
    featuredImage: p.featuredImage,
    images: p.images,
    beforeAfterImages: p.beforeAfterImages,
    completionStatus: p.completionStatus,
    isFeatured: p.isFeatured,
    galleryImages: p.galleryImages,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    displayOrder: p.displayOrder,
    status: p.status,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
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

    const project = await db.cmsProject.findFirst({ where: { id, tenantId } });
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    return NextResponse.json({ data: formatProject(project) });
  } catch (error) {
    console.error('CMS project GET by id error:', error);
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

    const existing = await db.cmsProject.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const updated = await db.cmsProject.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.category !== undefined && { category: body.category || null }),
        ...(body.featuredImage !== undefined && { featuredImage: body.featuredImage || null }),
        ...(body.images !== undefined && { images: body.images || null }),
        ...(body.beforeAfterImages !== undefined && { beforeAfterImages: body.beforeAfterImages || null }),
        ...(body.completionStatus !== undefined && { completionStatus: body.completionStatus }),
        ...(body.isFeatured !== undefined && { isFeatured: body.isFeatured }),
        ...(body.galleryImages !== undefined && { galleryImages: body.galleryImages || null }),
        ...(body.seoTitle !== undefined && { seoTitle: body.seoTitle || null }),
        ...(body.seoDescription !== undefined && { seoDescription: body.seoDescription || null }),
        ...(body.displayOrder !== undefined && { displayOrder: body.displayOrder }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.publishedAt !== undefined && { publishedAt: body.publishedAt ? new Date(body.publishedAt) : null }),
      },
    });

    return NextResponse.json(formatProject(updated));
  } catch (error) {
    console.error('CMS project PUT error:', error);
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

    const existing = await db.cmsProject.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    await db.cmsProject.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CMS project DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}