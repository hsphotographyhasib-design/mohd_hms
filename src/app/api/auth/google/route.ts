import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { db, withRetry, getDbFriendlyMessage } from '@/lib/db';
import { generateToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ──────────────────────────────────────────────
// GOOGLE AUTH CONFIG (env var scanning)
// ──────────────────────────────────────────────

/**
 * Find GOOGLE_CLIENT_ID from environment variables.
 * Mirrors the same scanning logic used for DATABASE_URL — checks
 * well-known names first, then scans all env vars.
 */
function findGoogleClientId(): string | null {
  // 1. Well-known names
  const candidates = [
    'GOOGLE_CLIENT_ID',
    'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
    'GOOGLE_OAUTH_CLIENT_ID',
  ];
  for (const name of candidates) {
    const val = process.env[name];
    if (val && val.includes('.apps.googleusercontent.com')) {
      console.log(`[Google Auth] Found client ID in env: ${name}`);
      return val;
    }
  }

  // 2. Scan all env vars for a Google client ID value
  for (const [key, val] of Object.entries(process.env)) {
    if (
      val &&
      typeof val === 'string' &&
      val.includes('.apps.googleusercontent.com') &&
      !key.includes('SECRET')
    ) {
      console.log(`[Google Auth] Found client ID in env (scan): ${key}`);
      return val;
    }
  }

  return null;
}

function findGoogleClientSecret(): string | undefined {
  const candidates = ['GOOGLE_CLIENT_SECRET', 'GOOGLE_OAUTH_CLIENT_SECRET'];
  for (const name of candidates) {
    if (process.env[name]) return process.env[name];
  }
  return undefined;
}

// ──────────────────────────────────────────────
// GOOGLE AUTH CLIENT (singleton per process)
// ──────────────────────────────────────────────

let googleClient: OAuth2Client | null = null;
let _resolvedClientId: string | null = null;

function getGoogleClientId(): string | null {
  if (_resolvedClientId === null) {
    _resolvedClientId = findGoogleClientId();
  }
  return _resolvedClientId;
}

function getGoogleClient(): OAuth2Client | null {
  if (!googleClient) {
    const clientId = getGoogleClientId();
    const clientSecret = findGoogleClientSecret();
    if (!clientId) {
      console.error('[Google Auth] GOOGLE_CLIENT_ID not found in any environment variable.');
      return null;
    }
    googleClient = new OAuth2Client(clientId, clientSecret);
  }
  return googleClient;
}

/**
 * POST /api/auth/google
 *
 * Accepts a Google ID token (from Google Identity Services / One Tap),
 * verifies it server-side using google-auth-library, then finds or creates the user.
 *
 * Body: { token: string }
 * Returns: { token: string, user: AuthUser }
 */
export async function POST(request: NextRequest) {
  try {
    const { token: googleToken } = await request.json();

    if (!googleToken || typeof googleToken !== 'string') {
      return NextResponse.json(
        { error: 'Google token is required' },
        { status: 400 },
      );
    }

    // ── 0. Check if Google auth is configured ──
    const clientId = getGoogleClientId();
    if (!clientId) {
      return NextResponse.json(
        { error: 'Google Sign-In is not configured on the server. Please contact the administrator.' },
        { status: 503 },
      );
    }

    // ── 1. Verify the Google ID token using google-auth-library ──
    const googleUser = await verifyGoogleToken(googleToken, clientId);
    if (!googleUser) {
      return NextResponse.json(
        { error: 'Invalid Google token. Please try again.' },
        { status: 401 },
      );
    }

    const { sub: googleId, email, name, picture } = googleUser;

    if (!email) {
      return NextResponse.json(
        { error: 'Google account has no email address' },
        { status: 400 },
      );
    }

    // ── 2. Find existing user by googleId ──
    const existingByGoogle = await withRetry(
      () =>
        db.user.findUnique({
          where: { googleId },
          select: {
            id: true, email: true, name: true, phone: true, avatar: true,
            role: true, tenantId: true, employeeNumber: true, departmentId: true,
            profileCompleted: true, isActive: true, tenant: { select: { id: true, name: true, domain: true } },
          },
        }),
      { label: 'google-findByGoogleId' },
    );

    if (existingByGoogle) {
      if (!existingByGoogle.isActive) {
        return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
      }
      // Update last login + avatar + google link (best-effort)
      withRetry(
        () =>
          db.user.update({
            where: { id: existingByGoogle.id },
            data: {
              lastLogin: new Date().toISOString(),
              isOnline: true,
              avatar: picture || existingByGoogle.avatar,
              authProvider: 'google',
            },
          }),
        { label: 'google-updateExisting' },
      ).catch(() => {});

      const normalizedRole = (existingByGoogle.role as string).toLowerCase() as typeof existingByGoogle.role;
      const token = generateToken({
        userId: existingByGoogle.id,
        tenantId: existingByGoogle.tenantId,
        role: normalizedRole,
        email: existingByGoogle.email,
      });

      return NextResponse.json({
        token,
        user: {
          id: existingByGoogle.id,
          email: existingByGoogle.email,
          name: existingByGoogle.name,
          phone: existingByGoogle.phone,
          avatar: picture || existingByGoogle.avatar,
          role: normalizedRole,
          tenantId: existingByGoogle.tenantId,
          tenantName: existingByGoogle.tenant?.name,
          tenantDomain: existingByGoogle.tenant?.domain,
          employeeNumber: existingByGoogle.employeeNumber,
          departmentId: existingByGoogle.departmentId,
          profileCompleted: existingByGoogle.profileCompleted,
        },
      });
    }

    // ── 3. Check if user exists with same email (link accounts) ──
    const existingByEmail = await withRetry(
      () =>
        db.user.findFirst({
          where: { email },
          select: {
            id: true, email: true, name: true, phone: true, avatar: true,
            role: true, tenantId: true, employeeNumber: true, departmentId: true,
            profileCompleted: true, isActive: true, tenant: { select: { id: true, name: true, domain: true } },
          },
        }),
      { label: 'google-findByEmail' },
    );

    if (existingByEmail) {
      if (!existingByEmail.isActive) {
        return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
      }
      // Link Google account to existing email user
      await withRetry(
        () =>
          db.user.update({
            where: { id: existingByEmail.id },
            data: {
              googleId,
              authProvider: 'google',
              avatar: picture || existingByEmail.avatar,
              lastLogin: new Date().toISOString(),
              isOnline: true,
            },
          }),
        { label: 'google-linkExisting' },
      );

      const normalizedRole = (existingByEmail.role as string).toLowerCase() as typeof existingByEmail.role;
      const token = generateToken({
        userId: existingByEmail.id,
        tenantId: existingByEmail.tenantId,
        role: normalizedRole,
        email: existingByEmail.email,
      });

      return NextResponse.json({
        token,
        user: {
          id: existingByEmail.id,
          email: existingByEmail.email,
          name: existingByEmail.name,
          phone: existingByEmail.phone,
          avatar: picture || existingByEmail.avatar,
          role: normalizedRole,
          tenantId: existingByEmail.tenantId,
          tenantName: existingByEmail.tenant?.name,
          tenantDomain: existingByEmail.tenant?.domain,
          employeeNumber: existingByEmail.employeeNumber,
          departmentId: existingByEmail.departmentId,
          profileCompleted: existingByEmail.profileCompleted,
        },
      });
    }

    // ── 4. Auto-create new user (Google sign-up) ──
    // Find or create default tenant
    let tenant = await withRetry(
      () => db.tenant.findFirst({ select: { id: true, name: true, domain: true } }),
      { label: 'google-findTenant' },
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
        { label: 'google-createTenant' },
      );
    }

    const newUser = await withRetry(
      () =>
        db.user.create({
          data: {
            tenantId: tenant.id,
            email,
            name: name || email.split('@')[0],
            avatar: picture || null,
            role: 'customer',
            authProvider: 'google',
            googleId,
            isActive: true,
            isOnline: true,
            lastLogin: new Date().toISOString(),
            profileCompleted: false,
          },
          select: {
            id: true, email: true, name: true, phone: true, avatar: true,
            role: true, tenantId: true, employeeNumber: true, departmentId: true,
            profileCompleted: true, isActive: true, tenant: { select: { id: true, name: true, domain: true } },
          },
        }),
      { label: 'google-createUser' },
    );

    const normalizedRole = (newUser.role as string).toLowerCase() as typeof newUser.role;
    const token = generateToken({
      userId: newUser.id,
      tenantId: newUser.tenantId,
      role: normalizedRole,
      email: newUser.email,
    });

    return NextResponse.json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        phone: newUser.phone,
        avatar: newUser.avatar,
        role: normalizedRole,
        tenantId: newUser.tenantId,
        tenantName: newUser.tenant?.name,
        tenantDomain: newUser.tenant?.domain,
        employeeNumber: newUser.employeeNumber,
        departmentId: newUser.departmentId,
        profileCompleted: newUser.profileCompleted,
      },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    const message = getDbFriendlyMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ──────────────────────────────────────────────
// GOOGLE TOKEN VERIFICATION (google-auth-library)
// ──────────────────────────────────────────────

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

async function verifyGoogleToken(idToken: string, clientId: string): Promise<GoogleUserInfo | null> {
  try {
    const client = getGoogleClient();
    if (!client) {
      console.error('[Google Auth] Cannot verify token — OAuth2Client not initialized');
      return null;
    }

    // Verify the ID token: checks signature, audience (client_id), expiry, issuer
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      console.error('Google token payload missing required fields');
      return null;
    }

    // Verify email is verified by Google
    if (!payload.email_verified) {
      console.error('Google email not verified');
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email!,
      email_verified: payload.email_verified,
      name: payload.name || '',
      picture: payload.picture,
      given_name: payload.given_name,
      family_name: payload.family_name,
    };
  } catch (error) {
    console.error('Google token verification error:', error);
    return null;
  }
}