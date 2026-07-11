import { NextRequest, NextResponse } from 'next/server';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export const dynamic = 'force-dynamic';

/** Valid audit actions for quotations */
const VALID_ACTIONS = ['preview', 'print', 'pdf_download', 'email_sent', 'whatsapp_sent'] as const;
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
    const auth = verifyRouteAuth(request, { feature: 'quotations', entity: 'quotation', action: 'view' });
    if (auth.error) return auth.error;

    const userId = auth.userId;
    const userRole = auth.role;

    // ── 2. Parse & validate body ─────────────────────────────────────
    let body: { action?: string };
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

    // ── 4. Console audit log (placeholder for future DB table) ──────
    console.log(
      `[AUDIT] ${action} on quotation ${id} by user ${userId} (${userRole}) from ${ip} at ${timestamp}`
    );

    // ── 5. Respond ───────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      message: 'Audit log recorded',
      data: { quotationId: id, action, userId, ip, timestamp },
    });
  } catch (error) {
    console.error('[Audit Log Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}