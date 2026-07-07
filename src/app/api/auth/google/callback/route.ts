import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

function getClientId(): string | null {
  const candidates = ['GOOGLE_CLIENT_ID', 'NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_ID'];
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

/** Decode base64url to string */
function decodeBase64url(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

/**
 * GET /api/auth/google/callback?code=...&state=...
 *
 * Flow:
 * 1. On Vercel (BACKEND_URL set): proxy the code+state to the Render backend
 *    which handles token exchange + user creation, then render HTML with localStorage.
 * 2. On local dev: handle everything locally with Prisma/SQLite.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const url = new URL(request.url);
  const origin = url.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  if (error) {
    const desc = searchParams.get('error_description') || error;
    return redirectToAppWithError(origin, desc);
  }

  if (!code) {
    return redirectToAppWithError(origin, 'No authorization code received from Google.');
  }

  const clientId = getClientId();
  if (!clientId) {
    return redirectToAppWithError(origin, 'Google Sign-In is not configured. Please contact the administrator.');
  }

  // Decode PKCE verifier from state
  let codeVerifier: string | null = null;
  if (state) {
    try {
      codeVerifier = decodeBase64url(state);
    } catch {
      // ignore
    }
  }

  if (!codeVerifier) {
    return redirectToAppWithError(origin, 'OAuth session expired. Please try again.');
  }

  // ── Production: proxy to Render backend ────────────────────────────────
  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/google/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state, redirectUri }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        return redirectToAppWithError(origin, data.error || 'Google sign-in failed.');
      }

      // Backend returned { token, user } — render HTML to set localStorage
      const token = data.token;
      const userData = JSON.stringify(data.user);

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Signing in...</title></head><body>
<script>
  try {
    localStorage.setItem('cmms_token', ${JSON.stringify(token)});
    localStorage.setItem('cmms_user', ${userData});
    window.location.replace('${origin}/');
  } catch(e) {
    document.body.innerHTML = '<p style="color:red;padding:40px;font-family:sans-serif">Sign-in failed. Please try again.</p>';
  }
</script>
<noscript><p style="padding:40px">JavaScript is required to sign in. Please enable JavaScript and try again.</p></noscript>
</body></html>`;
      return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    } catch (err) {
      console.error('[Google OAuth] Backend proxy error:', err);
      return redirectToAppWithError(origin, 'Backend service unavailable. Please try again.');
    }
  }

  // ── Local dev: handle token exchange locally ───────────────────────────
  try {
    const { db, withRetry, getDbFriendlyMessage } = await import('@/lib/db');
    const { generateToken } = await import('@/lib/auth');

    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

    const tokenBody: Record<string, string> = {
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    };
    if (clientSecret) tokenBody.client_secret = clientSecret;
    if (codeVerifier) tokenBody.code_verifier = codeVerifier;

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tokenBody),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error('[Google OAuth] Token exchange failed:', tokenResponse.status, errBody);
      let detail = 'Failed to exchange authorization code with Google.';
      try {
        const errJson = JSON.parse(errBody);
        if (errJson.error_description) detail = errJson.error_description;
        else if (errJson.error) detail = `Google error: ${errJson.error}`;
      } catch {}
      return redirectToAppWithError(origin, detail);
    }

    const tokenData = await tokenResponse.json() as {
      id_token?: string;
      access_token?: string;
      refresh_token?: string;
    };

    if (!tokenData.id_token) {
      return redirectToAppWithError(origin, 'No ID token received from Google.');
    }

    // Decode the ID token
    const parts = tokenData.id_token.split('.');
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    if (!payload?.sub || !payload?.email) {
      return redirectToAppWithError(origin, 'Invalid ID token from Google.');
    }

    const googleId = payload.sub as string;
    const email = payload.email as string;
    const name = (payload.name as string) || email.split('@')[0];
    const picture = (payload.picture as string) || null;

    // Find or create user
    const existingByGoogle = await withRetry(
      () =>
        db.user.findUnique({
          where: { googleId },
          select: {
            id: true, email: true, name: true, phone: true, avatar: true,
            role: true, tenantId: true, employeeNumber: true, departmentId: true,
            profileCompleted: true, isActive: true,
            tenant: { select: { id: true, name: true, domain: true } },
          },
        }),
      { label: 'google-callback-findByGoogleId' },
    );

    let user = existingByGoogle;

    if (!user) {
      const existingByEmail = await withRetry(
        () =>
          db.user.findFirst({
            where: { email },
            select: {
              id: true, email: true, name: true, phone: true, avatar: true,
              role: true, tenantId: true, employeeNumber: true, departmentId: true,
              profileCompleted: true, isActive: true,
              tenant: { select: { id: true, name: true, domain: true } },
            },
          }),
        { label: 'google-callback-findByEmail' },
      );

      if (existingByEmail) {
        await withRetry(
          () =>
            db.user.update({
              where: { id: existingByEmail.id },
              data: {
                googleId,
                authProvider: 'google',
                avatar: picture || existingByEmail.avatar,
                lastLogin: new Date(),
                isOnline: true,
              },
            }),
          { label: 'google-callback-linkExisting' },
        );
        user = { ...existingByEmail, avatar: picture || existingByEmail.avatar };
      }
    }

    if (user && !user.isActive) {
      return redirectToAppWithError(origin, 'Account is deactivated. Please contact the administrator.');
    }

    if (!user) {
      let tenant = await withRetry(
        () => db.tenant.findFirst({ select: { id: true, name: true, domain: true } }),
        { label: 'google-callback-findTenant' },
      );

      if (!tenant) {
        tenant = await withRetry(
          () =>
            db.tenant.create({
              data: {
                name: 'MOHD.HMS Enterprise',
                domain: 'mohdhms.com',
                address: 'Bandar Seri Begawan, Brunei Darussalam',
                phone: '+673 000 0000',
                email: 'info@mohdhms.com',
              },
              select: { id: true, name: true, domain: true },
            }),
          { label: 'google-callback-createTenant' },
        );
      }

      user = await withRetry(
        () =>
          db.user.create({
            data: {
              tenantId: tenant.id,
              email,
              name,
              avatar: picture || null,
              role: 'customer',
              authProvider: 'google',
              googleId,
              isActive: true,
              isOnline: true,
              lastLogin: new Date(),
              profileCompleted: false,
            },
            select: {
              id: true, email: true, name: true, phone: true, avatar: true,
              role: true, tenantId: true, employeeNumber: true, departmentId: true,
              profileCompleted: true, isActive: true,
              tenant: { select: { id: true, name: true, domain: true } },
            },
          }),
        { label: 'google-callback-createUser' },
      );
    } else {
      withRetry(
        () =>
          db.user.update({
            where: { id: user!.id },
            data: { lastLogin: new Date(), isOnline: true, avatar: picture || user!.avatar },
          }),
        { label: 'google-callback-updateLastLogin' },
      ).catch(() => {});
    }

    const normalizedRole = (user.role as string).toLowerCase() as typeof user.role;
    const token = generateToken({
      userId: user.id,
      tenantId: user.tenantId,
      role: normalizedRole,
      email: user.email,
    });

    const userData = JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar: picture || user.avatar,
      role: normalizedRole,
      tenantId: user.tenantId,
      tenantName: user.tenant?.name,
      tenantDomain: user.tenant?.domain,
      employeeNumber: user.employeeNumber,
      departmentId: user.departmentId,
      profileCompleted: user.profileCompleted,
    });

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Signing in...</title></head><body>
<script>
  try {
    localStorage.setItem('cmms_token', ${JSON.stringify(token)});
    localStorage.setItem('cmms_user', ${userData});
    window.location.replace('${origin}/');
  } catch(e) {
    document.body.innerHTML = '<p style="color:red;padding:40px;font-family:sans-serif">Sign-in failed. Please try again.</p>';
  }
</script>
<noscript><p style="padding:40px">JavaScript is required to sign in. Please enable JavaScript and try again.</p></noscript>
</body></html>`;
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('[Google OAuth Callback] Unexpected error:', error);
    const { getDbFriendlyMessage: gfm } = await import('@/lib/db');
    return redirectToAppWithError(origin, gfm(error));
  }
}

function redirectToAppWithError(origin: string, message: string) {
  const safeMsg = message.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/</g, '\\x3c').replace(/\n/g, ' ');
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Sign-in error</title></head><body>
<script>
  alert('${safeMsg}');
  window.location.replace('${origin}/');
</script>
<noscript><p style="padding:40px;color:red;font-family:sans-serif">${safeMsg}</p></noscript>
</body></html>`;
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}