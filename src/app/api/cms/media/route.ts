import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';
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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const search = request.nextUrl.searchParams.get('search') || '';
    const folder = request.nextUrl.searchParams.get('folder') || '';
    const category = request.nextUrl.searchParams.get('category') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.CmsMediaWhereInput = { tenantId };

    if (search) {
      where.OR = [
        { fileName: { contains: search } },
        { originalName: { contains: search } },
        { alt: { contains: search } },
      ];
    }
    if (folder) where.folder = folder;
    if (category) where.category = category;

    const [items, total] = await Promise.all([
      db.cmsMedia.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.cmsMedia.count({ where }),
    ]);

    const data = items.map(formatMedia);

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
    console.error('CMS media GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
    const body = await request.json();
    const {
      fileName,
      originalName,
      mimeType,
      size,
      url,
      thumbnailUrl,
      folder,
      category,
      alt,
      width,
      height,
    } = body;

    if (!fileName) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 });
    }
    if (!mimeType) {
      return NextResponse.json({ error: 'MIME type is required' }, { status: 400 });
    }

    const media = await db.cmsMedia.create({
      data: {
        tenantId,
        fileName,
        originalName: originalName || fileName,
        mimeType,
        size: size ?? 0,
        url: url || `/uploads/placeholder/${fileName}`,
        thumbnailUrl: thumbnailUrl || null,
        folder: folder || null,
        category: category || null,
        alt: alt || null,
        width: width ?? null,
        height: height ?? null,
        uploadedById: user.userId || null,
      },
    });

    return NextResponse.json(formatMedia(media), { status: 201 });
  } catch (error) {
    console.error('CMS media POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}