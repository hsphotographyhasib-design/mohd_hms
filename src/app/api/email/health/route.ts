import { NextResponse } from 'next/server';
import { getActiveProvider, isBrevoConfigured } from '@/lib/email-service/providers';
export const dynamic = 'force-dynamic';

interface SmtpCheckResult {
  smtpConnected: boolean;
  smtpAuthenticated: boolean;
  senderVerified: boolean;
  queueRunning: boolean;
  lastEmailSent: string | null;
  avgDeliveryMs: number;
  queueSize: number;
  provider: string;
  error?: string;
}

async function checkBrevo(): Promise<Partial<SmtpCheckResult>> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return { smtpConnected: false, smtpAuthenticated: false, senderVerified: false };
  }
  try {
    const res = await fetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    if (!res.ok) {
      return { smtpConnected: false, smtpAuthenticated: false, senderVerified: false, provider: 'brevo', error: `Brevo account check failed: ${res.status}` };
    }
    const data = (await res.json()) as { email?: string; sender?: { name?: string } };
    if (data.sender?.name) {
      return { smtpConnected: true, smtpAuthenticated: true, senderVerified: true, provider: 'brevo' };
    }
    return { smtpConnected: true, smtpAuthenticated: true, senderVerified: false, provider: 'brevo' };
  } catch (err) {
    return { smtpConnected: false, smtpAuthenticated: false, senderVerified: false, provider: 'brevo', error: err instanceof Error ? err.message : 'Connection failed' };
  }
}
export async function GET() {
  try {
    const [brevoCheck, queueStatus] = await Promise.all([checkBrevo()]);

    // Get queue status
    let queueSize = 0;
    try {
      const { getQueueStatus } = await import('@/lib/email-service');
      const qs = getQueueStatus();
      queueSize = qs.size;
    } catch {}

    // Get last sent email
    let lastEmailSent: string | null;
    let avgDeliveryMs = 0;
    try {
      const { getEmailStats } = await import('@/lib/email-service');
      const stats = await getEmailStats('default');
      lastEmailSent = stats.totalSent > 0 ? 'Recently delivered' : 'Never';
      avgDeliveryMs = 0;
    } catch {}

    const result: SmtpCheckResult = {
    smtpConnected: brevoCheck.smtpConnected,
    smtpAuthenticated: brevoCheck.smtpAuthenticated,
    senderVerified: brevoCheck.senderVerified,
    queueRunning: true,
    lastEmailSent,
    avgDeliveryMs,
    queueSize,
    provider: brevoCheck.provider || getActiveProvider(),
    error: brevoCheck.error,
  };

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ smtpConnected: false, smtpAuthenticated: false, senderVerified: false, queueRunning: false, provider: getActiveProvider(), error: err instanceof Error ? err.message : 'Health check failed' }, { status: 500 });
  }
}
