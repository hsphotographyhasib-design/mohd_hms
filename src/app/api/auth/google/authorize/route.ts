import { NextRequest, NextResponse } from 'next/server';

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
 * Generates a PKCE code_verifier, passes it via the `state` parameter
 * (which Google echoes back unchanged), and redirects to Google's consent screen.
 * Using `state` instead of cookies — more reliable through CDNs/proxies.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;

  const clientId = getClientId();
  if (!clientId) {
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Google Sign-In Not Configured</title></head><body>
<script>
  alert('Google Sign-In is not configured. Please contact the administrator to set up GOOGLE_CLIENT_ID.');
  window.location.replace('${origin}/');
</script>
<noscript><p style="padding:40px;color:red;font-family:sans-serif">Google Sign-In is not configured. Please contact the administrator.</p></noscript>
</body></html>`;
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Build redirect_uri from the request
  const redirectUri = `${origin}/api/auth/google/callback`;

  // Generate PKCE
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Encode verifier into the state parameter (Google echoes it back unchanged)
  // Format: base64url(verifier) to keep it URL-safe
  const state = base64url(new TextEncoder().encode(codeVerifier));

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
    state,
  });

  // Redirect to Google
  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}