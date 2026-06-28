import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    const { userId, tcVersion, privacyVersion, userAgent } = await request.json();

    if (!userId || !tcVersion || !privacyVersion) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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