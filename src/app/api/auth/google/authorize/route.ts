import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

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

/** Generate a cryptographically random code_verifier (43 chars, URL-safe) */
function generateCodeVerifier(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return base64url(arr);
}

/** Generate code_challenge = BASE64URL(SHA256(code_verifier)) */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64url(new Uint8Array(hash));
}

function base64url(buffer: Uint8Array): string {
  const bin = Array.from(buffer)
    .map((b) => String.fromCharCode(b))
    .join('');
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * GET /api/auth/google/authorize
 *
 * Generates a PKCE code_verifier, stores it in a short-lived cookie,
 * and redirects the user to Google's OAuth consent screen.
 */
export async function GET(request: NextRequest) {
  const clientId = getClientId();
  if (!clientId) {
    return NextResponse.json(
      { error: 'Google Sign-In is not configured. Please contact the administrator.' },
      { status: 503 },
    );
  }

  // Build redirect_uri from the request
  const url = new URL(request.url);
  const origin = url.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  // Generate PKCE
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store verifier in a short-lived httpOnly cookie (10 minutes)
  const cookieStore = await cookies();
  cookieStore.set('google_oauth_verifier', codeVerifier, {
    httpOnly: true,
    secure: origin.startsWith('https'),
    sameSite: 'lax',
    path: '/api/auth/google/callback',
    maxAge: 600, // 10 minutes
  });

  // Build Google auth URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  // Redirect to Google
  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}