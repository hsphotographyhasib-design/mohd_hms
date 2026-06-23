import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { checkEscalations } from '@/lib/workflow/escalation-rules';

// ── POST: Trigger escalation checks ────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (payload.role as string) || 'technician';

    // 2. Role check — only admin/super_admin/manager can trigger
    const allowedRoles = ['super_admin', 'admin', 'manager'];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: only admin, super_admin, or manager can trigger escalation checks' },
        { status: 403 },
      );
    }

    // 3. Parse optional tenantId from body
    let tenantId = payload.tenantId as string;
    try {
      const body = await request.json();
      if (body.tenantId && typeof body.tenantId === 'string') {
        // Only allow if the user is super_admin (cross-tenant access)
        if (userRole === 'super_admin') {
          tenantId = body.tenantId;
        }
      }
    } catch {
      // No body or invalid JSON — use user's own tenantId
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 },
      );
    }

    // 4. Run escalation checks
    const result = await checkEscalations(tenantId);

    return NextResponse.json({
      success: true,
      triggered: result.triggered,
      details: result.details,
    });
  } catch (error) {
    console.error('Escalation check error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── GET: Return escalation rule definitions ────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // 1. Auth check
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (payload.role as string) || 'technician';

    // 2. Role check — admin-only visibility for rule definitions
    const allowedRoles = ['super_admin', 'admin', 'manager'];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: escalation rules are visible to admins and managers only' },
        { status: 403 },
      );
    }

    // 3. Import rules and return with human-readable thresholds
    const { ESCALATION_RULES } = await import('@/lib/workflow/escalation-rules');

    const rulesWithReadableThresholds = ESCALATION_RULES.map((rule) => ({
      status: rule.status,
      threshold: formatThreshold(rule.thresholdMs),
      thresholdMs: rule.thresholdMs,
      severity: rule.severity,
      label: rule.label,
      description: rule.description,
      notifyRoles: rule.notifyRoles,
      notifyCustomer: rule.notifyCustomer,
      notifySupervisor: rule.notifySupervisor,
    }));

    return NextResponse.json({ rules: rulesWithReadableThresholds });
  } catch (error) {
    console.error('Escalation rules GET error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatThreshold(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}