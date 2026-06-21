import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { ESCALATION_RULES } from '@/lib/workflow/escalation-rules';

// ── GET: Return configured escalation rules (read-only) ───────────────────

export async function GET(_request: NextRequest) {
  try {
    // 1. Auth check
    const authHeader = _request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (payload.role as string) || 'technician';

    // 2. Role check — admin/manager/supervisor visibility
    const allowedRoles = ['super_admin', 'admin', 'manager', 'supervisor'];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: escalation rules are visible to supervisors, managers, and admins only' },
        { status: 403 },
      );
    }

    // 3. Return rules with human-readable thresholds
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