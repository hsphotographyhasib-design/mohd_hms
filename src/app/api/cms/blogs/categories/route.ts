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

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function formatCategory(c: {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: c.id,
    tenantId: c.tenantId,
    name: c.name,
    slug: c.slug,
    description: c.description,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;

    const categories = await db.cmsBlogCategory.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: categories.map(formatCategory) });
  } catch (error) {
    console.error('CMS blog categories GET error:', error);
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
    const { name, description, slug: customSlug } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const slug = customSlug || generateSlug(name);

    const category = await db.cmsBlogCategory.create({
      data: {
        tenantId,
        name,
        slug,
        description: description || null,
      },
    });

    return NextResponse.json(formatCategory(category), { status: 201 });
  } catch (error) {
    console.error('CMS blog categories POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}