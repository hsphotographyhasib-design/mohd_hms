import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = await db.irmUser.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { inspectorReports: true, assessmentReports: true, activities: true },
        },
      },
    });

    return NextResponse.json(users);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const user = await db.irmUser.create({
      data: {
        email: body.email,
        name: body.name,
        role: body.role || 'Inspector',
        phone: body.phone,
        avatar: body.avatar,
        active: body.active !== undefined ? body.active : true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}