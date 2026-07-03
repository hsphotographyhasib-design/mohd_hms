import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry, getDbFriendlyMessage } from '@/lib/db';
import { generateToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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

/** Decode a JWT payload without verification (Google already verified it during code exchange) */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * GET /api/auth/google/callback?code=...&state=...
 *
 * 1. Reads code_verifier from the `state` parameter (passed through Google)
 * 2. Exchanges authorization code + PKCE verifier for tokens
 * 3. Decodes id_token to get user info
 * 4. Finds or creates user in DB
 * 5. Returns HTML page that sets localStorage and navigates to app
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      const desc = searchParams.get('error_description') || error;
      console.error('[Google OAuth Callback] Error:', error, desc);
      return redirectToAppWithError(request, desc);
    }

    if (!code) {
      return redirectToAppWithError(request, 'No authorization code received from Google.');
    }

    const clientId = getClientId();
    if (!clientId) {
      return redirectToAppWithError(request, 'Google Sign-In is not configured on the server.');
    }

    // Decode PKCE verifier from state parameter (encoded by /authorize)
    let codeVerifier: string | null = null;
    if (state) {
      try {
        codeVerifier = decodeBase64url(state);
      } catch {
        console.error('[Google OAuth] Failed to decode state parameter');
      }
    }

    if (!codeVerifier) {
      return redirectToAppWithError(request, 'OAuth session expired. Please try again.');
    }

    // Build redirect_uri (must match exactly what was used in /authorize)
    const url = new URL(request.url);
    const origin = url.origin;
    const redirectUri = `${origin}/api/auth/google/callback`;

    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

    // Exchange code for tokens
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
      // Include actual error details for debugging
      let detail = 'Failed to exchange authorization code with Google.';
      try {
        const errJson = JSON.parse(errBody);
        if (errJson.error_description) detail = errJson.error_description;
        else if (errJson.error) detail = `Google error: ${errJson.error}`;
      } catch {}
      return redirectToAppWithError(request, detail);
    }

    const tokenData = await tokenResponse.json() as {
      id_token?: string;
      access_token?: string;
      refresh_token?: string;
    };

    if (!tokenData.id_token) {
      return redirectToAppWithError(request, 'No ID token received from Google.');
    }

    // Decode the ID token to get user info
    const payload = decodeJwtPayload(tokenData.id_token);
    if (!payload || !payload.sub || !payload.email) {
      return redirectToAppWithError(request, 'Invalid ID token from Google.');
    }

    const googleId = payload.sub as string;
    const email = payload.email as string;
    const name = (payload.name as string) || email.split('@')[0];
    const picture = (payload.picture as string) || null;

    // ── Find or create user ──
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
      // Check if user exists with same email (link accounts)
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
        // Link Google account
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
      return redirectToAppWithError(request, 'Account is deactivated. Please contact the administrator.');
    }

    if (!user) {
      // Auto-create new user
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

      // Notify admins about new Google registration (best-effort)
      (async () => {
        try {
          const admins = await db.user.findMany({
            where: { tenantId: tenant.id, role: { in: ['super_admin', 'admin'] }, isActive: true },
            select: { id: true },
          });
          if (admins.length > 0) {
            await db.notification.createMany({
              data: admins.map((admin) => ({
                tenantId: tenant.id,
                userId: admin.id,
                title: 'New User Registered',
                message: `${name} has registered via Google as a customer.`,
                type: 'info',
                isRead: false,
              })),
            });
          }
        } catch {}
      })();
    } else {
      // Update last login
      withRetry(
        () =>
          db.user.update({
            where: { id: user!.id },
            data: { lastLogin: new Date(), isOnline: true, avatar: picture || user!.avatar },
          }),
        { label: 'google-callback-updateLastLogin' },
      ).catch(() => {});
    }

    // Generate our JWT
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

    // Return an HTML page that sets localStorage and navigates to app
    // (hash fragments in server redirects can be stripped by CDNs/proxies)
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Signing in...</title></head><body>
<script>
  try {
    localStorage.setItem('cmms_token', ${JSON.stringify(token)});
    localStorage.setItem('cmms_user', ${JSON.stringify(userData)});
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
    return redirectToAppWithError(request, getDbFriendlyMessage(error));
  }
}

function redirectToAppWithError(request: NextRequest, message: string) {
  const origin = new URL(request.url).origin;
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