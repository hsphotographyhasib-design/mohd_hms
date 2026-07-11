import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

function formatMedia(m: {
  id: string;
  tenantId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl: string | null;
  folder: string | null;
  category: string | null;
  alt: string | null;
  width: number | null;
  height: number | null;
  uploadedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: m.id,
    tenantId: m.tenantId,
    fileName: m.fileName,
    originalName: m.originalName,
    mimeType: m.mimeType,
    size: m.size,
    url: m.url,
    thumbnailUrl: m.thumbnailUrl,
    folder: m.folder,
    category: m.category,
    alt: m.alt,
    width: m.width,
    height: m.height,
    uploadedById: m.uploadedById,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'cms' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;

    const { id } = await params;

    const media = await db.cmsMedia.findFirst({ where: { id, tenantId } });
    if (!media) return NextResponse.json({ error: 'Media not found' }, { status: 404 });

    return NextResponse.json({ data: formatMedia(media) });
  } catch (error) {
    console.error('CMS media GET by id error:', error);
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
    const { tenantId } = auth;

    const { id } = await params;

    const existing = await db.cmsMedia.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Media not found' }, { status: 404 });

    await db.cmsMedia.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CMS media DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}