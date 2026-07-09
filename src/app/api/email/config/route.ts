import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/core/auth/auth-lib';
import { setRuntimeApiKey, getBrevoApiKey, isRuntimeKeyConfigured } from '@/core/email/service/providers/brevo';
import { refreshProviderCache, getActiveProvider } from '@/core/email/service/providers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/email/config — Return current email configuration status (masked key).
 * POST /api/email/config — Set the Brevo API key at runtime.
 */
export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { user } = auth;
  if (user.role !== 'super_admin' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const key = getBrevoApiKey();
  const maskedKey = key
    ? key.slice(0, 6) + '••••••••' + key.slice(-4)
    : null;

  return NextResponse.json({
    provider: getActiveProvider(),
    hasApiKey: !!key,
    isRuntimeKey: isRuntimeKeyConfigured(),
    maskedKey,
    senderEmail: process.env.BREVO_SENDER_EMAIL || 'noreply@mohdhms.com',
    senderName: process.env.BREVO_SENDER_NAME || 'MOHD.HMS ENTERPRISE',
  });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { user } = auth;
  if (user.role !== 'super_admin' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: only administrators can configure email' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required.' }, { status: 400 });
    }

    // Validate format: Brevo keys start with "xkeysib-"
    if (!apiKey.startsWith('xkeysib-')) {
      return NextResponse.json({
        error: 'Invalid Brevo API key format. Keys should start with "xkeysib-".',
      }, { status: 400 });
    }

    // Set the runtime key
    setRuntimeApiKey(apiKey);
    refreshProviderCache();

    // Verify by calling Brevo account API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    let verified = false;
    let accountEmail: string | null = null;

    try {
      const res = await fetch('https://api.brevo.com/v3/account', {
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as { email?: string };
        verified = true;
        accountEmail = data.email || null;
      }
    } catch {
      clearTimeout(timeoutId);
    }

    if (!verified) {
      // Key was invalid — clear it
      setRuntimeApiKey('');
      refreshProviderCache();
      return NextResponse.json({
        error: 'API key verification failed. Please check your Brevo API key.',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Brevo API key configured successfully.',
      provider: getActiveProvider(),
      accountEmail,
    });
  } catch (err) {
    console.error('[Email Config] Error:', err);
    return NextResponse.json({ error: 'Failed to configure email.' }, { status: 500 });
  }
}