import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/google/status
 *
 * Returns whether Google OAuth is configured on the server.
 * The login page calls this on mount to decide whether to enable
 * the "Continue with Google" button.
 */
export async function GET() {
  const clientId = getClientId();
  return NextResponse.json({
    configured: !!clientId,
    message: clientId
      ? 'Google Sign-In is ready.'
      : 'Google Sign-In is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables.',
  });
}

function getClientId(): string | null {
  const candidates = [
    'GOOGLE_CLIENT_ID',
    'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
    'GOOGLE_OAUTH_CLIENT_ID',
  ];
  for (const name of candidates) {
    const val = process.env[name];
    if (val?.includes('.apps.googleusercontent.com')) return val;
  }
  for (const [key, val] of Object.entries(process.env)) {
    if (typeof val === 'string' && val.includes('.apps.googleusercontent.com') && !key.includes('SECRET')) {
      return val;
    }
  }
  return null;
}