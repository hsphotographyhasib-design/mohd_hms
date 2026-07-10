import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'documents' });
    if (auth.error) return auth.error;
    const { tenantId } = auth;
    const body = await request.json();
    const { checksum } = body;

    if (!checksum) {
      return NextResponse.json({ error: 'checksum is required' }, { status: 400 });
    }

    const existing = await db.document.findFirst({
      where: {
        tenantId,
        checksum,
        isActive: true,
      },
      select: {
        id: true,
        originalName: true,
        size: true,
        version: true,
        createdAt: true,
        module: true,
      },
    });

    if (existing) {
      return NextResponse.json({
        isDuplicate: true,
        duplicateOf: existing,
        message: `A file with the same content already exists: ${existing.originalName}`,
      });
    }

    return NextResponse.json({ isDuplicate: false });
  } catch (error) {
    console.error('Duplicate check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}