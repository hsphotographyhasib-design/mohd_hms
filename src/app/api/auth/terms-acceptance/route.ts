import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/terms-acceptance
 *
 * Records a user's acceptance of Terms & Conditions and Privacy Policy.
 * Called after first successful login following acceptance.
 *
 * Body: { userId: string, tcVersion: string, privacyVersion: string, userAgent?: string }
 * Returns: { ok: true }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth: verify caller is the user they claim to be
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { userId, tcVersion, privacyVersion, userAgent } = await request.json();

    if (!userId || !tcVersion || !privacyVersion) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Security: ensure the caller can only accept terms for themselves
    if (payload.userId !== userId && payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown';

    await db.termsAcceptance.create({
      data: {
        userId,
        tcVersion,
        privacyVersion,
        ip: ip.slice(0, 45),
        userAgent: (userAgent || '').slice(0, 500),
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Audit logging should never block login — fail silently
    return NextResponse.json({ ok: true });
  }
}