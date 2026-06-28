import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { db, withRetry, getDbFriendlyMessage } from '@/lib/db';
import { generateToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ──────────────────────────────────────────────
// GOOGLE AUTH CLIENT (singleton per process)
// ──────────────────────────────────────────────

let googleClient: OAuth2Client | null = null;

function getGoogleClient(): OAuth2Client {
  if (!googleClient) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID is not configured in environment variables.');
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

    // ── 1. Verify the Google ID token using google-auth-library ──
    const googleUser = await verifyGoogleToken(googleToken);
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
    const message = error instanceof Error && error.message.includes('GOOGLE_CLIENT_ID')
      ? 'Google Sign-In is not configured on the server.'
      : getDbFriendlyMessage(error);
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

async function verifyGoogleToken(idToken: string): Promise<GoogleUserInfo | null> {
  try {
    const client = getGoogleClient();

    // Verify the ID token: checks signature, audience (client_id), expiry, issuer
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
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