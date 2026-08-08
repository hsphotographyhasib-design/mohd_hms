import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = verifyRouteAuth(req, { feature: 'irms' });
  if (auth.error) return auth.error;
  try {
    const q = req.nextUrl.searchParams.get('q') || '';
    const status = req.nextUrl.searchParams.get('status') || '';

    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { number: { contains: q } },
        { customer: { contains: q } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const projects = await db.irmProject.findMany({
      where,
      include: { _count: { select: { reports: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(projects);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch projects';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = verifyRouteAuth(req, { feature: 'irms' });
  if (auth.error) return auth.error;
  try {
    const body = await req.json();
    const { status: inputStatus, ...data } = body;

    const project = await db.irmProject.create({
      data: {
        ...data,
        status: inputStatus || 'active',
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}