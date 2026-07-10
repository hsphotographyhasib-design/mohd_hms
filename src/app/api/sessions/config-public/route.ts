import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry, getDbFriendlyMessage, getErrorHeaders } from '@/core/database/db';
import { verifyAuthOnly } from '@/core/middleware/api-auth';

export const dynamic = 'force-dynamic';

// Role → timeout field mapping in SessionConfig
const ROLE_TIMEOUT_MAP: Record<string, string> = {
  super_admin: 'superAdminTimeout',
  admin: 'adminTimeout',
  manager: 'managerTimeout',
  supervisor: 'supervisorTimeout',
  technician: 'technicianTimeout',
  customer: 'customerTimeout',
  finance: 'financeTimeout',
};

// Default fallback values (minutes)
const DEFAULT_TIMEOUT = 45;
const DEFAULT_WARNING = 5;
const DEFAULT_MAX_SESSIONS = 5;

// GET: Public session config — returns only timeout values for the user's role
export async function GET(request: NextRequest) {
  try {
    const auth = verifyAuthOnly(request);
    if (auth.error) return auth.error;

    const { tenantId, role } = auth;

    const config = await withRetry(
      () =>
        db.sessionConfig.findUnique({
          where: { tenantId: tenantId as string },
        }),
      { label: 'sessions-configPublic-get' }
    );

    const userRole = (role as string).toLowerCase();
    const timeoutField = ROLE_TIMEOUT_MAP[userRole] || 'adminTimeout';
    const idleTimeoutMinutes = config
      ? (config as Record<string, unknown>)[timeoutField]
      : DEFAULT_TIMEOUT;

    const warningBeforeMinutes = config?.warningBeforeMinutes ?? DEFAULT_WARNING;
    const maxConcurrentSessions = config?.maxConcurrentSessions ?? DEFAULT_MAX_SESSIONS;

    return NextResponse.json({
      idleTimeout: (idleTimeoutMinutes as number) * 60 * 1000, // convert minutes → ms
      warningBefore: (warningBeforeMinutes as number) * 60 * 1000,
      maxConcurrentSessions,
    });
  } catch (error) {
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500, headers: getErrorHeaders(error) }
    );
  }
}