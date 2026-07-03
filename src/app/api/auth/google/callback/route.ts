import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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

/** Decode a JWT payload without verification (Google already verified it during code exchange) */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // Handle base64url encoding
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * GET /api/auth/google/callback?code=...
 *
 * 1. Reads code_verifier from cookie
 * 2. Exchanges authorization code + PKCE verifier for tokens
 * 3. Decodes id_token to get user info
 * 4. Finds or creates user in DB
 * 5. Redirects to / with token in URL fragment
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
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

    // Read PKCE verifier from cookie
    const cookieStore = await cookies();
    const codeVerifier = cookieStore.get('google_oauth_verifier')?.value;

    // Clear the verifier cookie
    cookieStore.delete('google_oauth_verifier');

    if (!codeVerifier) {
      return redirectToAppWithError(request, 'OAuth session expired. Please try again.');
    }

    // Build redirect_uri (must match exactly what was used in /authorize)
    const url = new URL(request.url);
    const origin = url.origin;
    const redirectUri = `${origin}/api/auth/google/callback`;

    // Exchange code for tokens using PKCE (no client_secret needed)
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error('[Google OAuth] Token exchange failed:', tokenResponse.status, errBody);
      return redirectToAppWithError(request, 'Failed to exchange authorization code with Google.');
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
        user = { ...existingByEmail, googleId, avatar: picture || existingByEmail.avatar };
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
                country: 'Brunei Darussalam',
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

    // Redirect to app with token in URL fragment (fragment is not sent to server)
    const appUrl = `${origin}/#google_auth=1&token=${encodeURIComponent(token)}&user=${encodeURIComponent(userData)}`;
    return NextResponse.redirect(appUrl);
  } catch (error) {
    console.error('[Google OAuth Callback] Unexpected error:', error);
    return redirectToAppWithError(request, getDbFriendlyMessage(error));
  }
}

function redirectToAppWithError(request: NextRequest, message: string) {
  const origin = new URL(request.url).origin;
  const url = new URL('/', origin);
  url.hash = `google_auth=1&error=${encodeURIComponent(message)}`;
  return NextResponse.redirect(url.toString());
}