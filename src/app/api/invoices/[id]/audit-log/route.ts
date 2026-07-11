import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export const dynamic = 'force-dynamic';

/** Valid audit actions for invoices */
const VALID_ACTIONS = ['preview', 'print', 'pdf_download', 'email_sent', 'whatsapp_sent', 'status_change', 'payment_recorded'] as const;
type AuditAction = (typeof VALID_ACTIONS)[number];

/** Extract client IP from request headers */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── 1. Authenticate + RBAC ──────────────────────────────────────
    const auth = verifyRouteAuth(request, { feature: 'invoices', entity: 'invoice', action: 'view' });
    if (auth.error) return auth.error;

    const userId = auth.userId;
    const tenantId = auth.tenantId;

    // ── 2. Parse & validate body ─────────────────────────────────────
    let body: { action?: string; details?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const action = body.action as AuditAction | undefined;
    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // ── 3. Extract metadata ──────────────────────────────────────────
    const { id } = await params;
    const ip = getClientIp(request);
    const timestamp = new Date().toISOString();

    // ── 4. Create audit log entry in DB ──────────────────────────────
    await db.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        entity: 'Invoice',
        entityId: id,
        details: body.details || null,
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    // ── 5. Respond ───────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      message: 'Audit log recorded',
      data: { invoiceId: id, action, userId, ip, timestamp },
    });
  } catch (error) {
    console.error('[Audit Log Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}