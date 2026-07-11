export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyToken } from '@/core/auth/auth-lib';
import { db } from '@/core/database/db';

export async function POST() {
  let token: string | undefined;

  try {
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  } catch {
    // headers() may fail in some contexts — that's fine
  }

  if (token) {
    try {
      const payload = verifyToken(token);
      if (payload?.userId) {
        // Fire-and-forget: set isOnline = false
        db.user.update({ where: { id: payload.userId }, data: { isOnline: false } }).catch(() => {});
        // Fire-and-forget: revoke all login sessions
        db.loginSession.updateMany({ where: { userId: payload.userId, isRevoked: false }, data: { isRevoked: true } }).catch(() => {});
      }
    } catch {
      // Token invalid or expired — still return success
    }
  }

  return NextResponse.json({ success: true });
}