import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry, getDbFriendlyMessage, getErrorHeaders } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DEFAULT_CONFIG = {
  superAdminTimeout: 60,
  adminTimeout: 45,
  managerTimeout: 45,
  supervisorTimeout: 45,
  technicianTimeout: 30,
  customerTimeout: 30,
  financeTimeout: 45,
  warningBeforeMinutes: 5,
  rememberMeDays: 30,
  maxConcurrentSessions: 5,
  logoutOnPasswordReset: true,
  logoutOnRoleChange: true,
  logoutOnDeactivation: true,
};

// GET: Retrieve session config for the tenant (any role can read)
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId } = auth.user;
    if (!tenantId) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    const config = await withRetry(
      () =>
        db.sessionConfig.findUnique({
          where: { tenantId: tenantId as string },
        }),
      { label: 'sessions-settings-get' }
    );

    return NextResponse.json(config || { tenantId, ...DEFAULT_CONFIG });
  } catch (error) {
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500, headers: getErrorHeaders(error) }
    );
  }
}

// PUT: Update session config (admin/super_admin only)
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, tenantId, role } = auth.user;
    if (!tenantId) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    const userRole = (role as string).toLowerCase();
    if (!['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Only admins can update session settings' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Build the update data — only allow known fields
    const allowedFields = [
      'superAdminTimeout',
      'adminTimeout',
      'managerTimeout',
      'supervisorTimeout',
      'technicianTimeout',
      'customerTimeout',
      'financeTimeout',
      'warningBeforeMinutes',
      'rememberMeDays',
      'maxConcurrentSessions',
      'logoutOnPasswordReset',
      'logoutOnRoleChange',
      'logoutOnDeactivation',
    ] as const;

    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body && body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Upsert
    const config = await withRetry(
      () =>
        db.sessionConfig.upsert({
          where: { tenantId: tenantId as string },
          update: data,
          create: {
            tenantId: tenantId as string,
            ...data,
          },
        }),
      { label: 'sessions-settings-upsert' }
    );

    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500, headers: getErrorHeaders(error) }
    );
  }
}