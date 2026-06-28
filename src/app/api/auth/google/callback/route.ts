import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';
import { generateToken, generateCustomerNumber } from '@/lib/auth';
import {
  exchangeCodeForTokens,
  unpackState,
  verifyIdToken,
} from '@/lib/google-oauth';

export const dynamic = 'force-dynamic';

const DEFAULT_TENANT_DOMAIN = 'default.facilitypro.com';
const DEFAULT_TENANT_NAME = 'Default Organization';

function redirectWithError(reqUrl: string, code: string) {
  const url = new URL('/', reqUrl);
  url.searchParams.set('googleAuthError', code);
  const res = NextResponse.redirect(url, { status: 302 });
  res.cookies.delete('g_oauth_state');
  res.cookies.delete('g_oauth_nonce');
  return res;
}

async function getOrCreateDefaultTenant() {
  let tenant = await withRetry(
    () => db.tenant.findFirst({ where: { domain: DEFAULT_TENANT_DOMAIN } }),
    { label: 'google-findTenant' }
  );
  if (!tenant) {
    tenant = await withRetry(
      () =>
        db.tenant.create({
          data: {
            name: DEFAULT_TENANT_NAME,
            domain: DEFAULT_TENANT_DOMAIN,
            plan: 'professional',
            maxUsers: 50,
          },
        }),
      { label: 'google-createTenant' }
    );
  }
  return tenant;
}

function getClientInfo(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const ua = userAgent.toLowerCase();
  const device = /mobile|android|iphone/.test(ua)
    ? 'mobile'
    : /tablet|ipad/.test(ua)
    ? 'tablet'
    : 'desktop';
  const browser = ua.includes('chrome')
    ? 'Chrome'
    : ua.includes('firefox')
    ? 'Firefox'
    : ua.includes('safari')
    ? 'Safari'
    : ua.includes('edge')
    ? 'Edge'
    : 'Other';
  return { ipAddress: ip, userAgent, device, browser };
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  if (errorParam) return redirectWithError(request.url, errorParam);
  if (!code || !state) return redirectWithError(request.url, 'missing_code');

  // CSRF: state cookie must match the random component of the returned state.
  const storedState = request.cookies.get('g_oauth_state')?.value;
  const storedNonce = request.cookies.get('g_oauth_nonce')?.value;
  const unpacked = unpackState(state);
  if (!unpacked || !storedState || unpacked.r !== storedState) {
    return redirectWithError(request.url, 'state_mismatch');
  }

  // Exchange the code for tokens.
  let tokens: Awaited<ReturnType<typeof exchangeCodeForTokens>>;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch (err) {
    console.error('Google token exchange error:', err);
    return redirectWithError(request.url, 'token_exchange_failed');
  }

  // Verify the ID token before trusting any claim.
  let profile;
  try {
    profile = await verifyIdToken(tokens.id_token, storedNonce);
  } catch (err) {
    console.error('Google ID token verification error:', err);
    return redirectWithError(request.url, 'id_token_invalid');
  }

  if (!profile.email) {
    return redirectWithError(request.url, 'missing_email');
  }

  const { ipAddress, userAgent, device, browser } = getClientInfo(request);

  try {
    const tenant = await getOrCreateDefaultTenant();

    // Find by googleId OR by email within the tenant. Email match takes care
    // of "duplicate account protection" — we link rather than re-create.
    const existing = await withRetry(
      () =>
        db.user.findFirst({
          where: {
            tenantId: tenant.id,
            OR: [
              ({ googleId: profile.sub } as unknown as Record<string, unknown>),
              { email: profile.email },
            ] as unknown as never,
          },
        }),
      { label: 'google-findUser' }
    );

    let user;
    let isNewUser = false;

    if (existing) {
      // Existing user — link Google, refresh name/avatar/lastLogin.
      const updates: Record<string, unknown> = {
        googleId: profile.sub,
        provider: 'google',
        emailVerified: profile.email_verified || (existing as { emailVerified?: boolean }).emailVerified,
        lastLogin: new Date(),
        isOnline: true,
      };
      if (profile.name && profile.name !== existing.name) updates.name = profile.name;
      if (profile.picture && profile.picture !== existing.avatar) updates.avatar = profile.picture;

      user = await withRetry(
        () =>
          db.user.update({
            where: { id: existing.id },
            data: updates as never,
          }),
        { label: 'google-updateUser' }
      );
    } else {
      // New user — register as CUSTOMER with a matching Customer record.
      const customerNumber = generateCustomerNumber();
      user = await withRetry(
        () =>
          db.user.create({
            data: {
              tenantId: tenant.id,
              email: profile.email,
              name: profile.name || profile.email.split('@')[0],
              avatar: profile.picture,
              role: 'customer',
              googleId: profile.sub,
              provider: 'google',
              emailVerified: profile.email_verified,
              profileCompleted: false,
              isActive: true,
              lastLogin: new Date(),
              isOnline: true,
            } as never,
          }),
        { label: 'google-createUser' }
      );
      isNewUser = true;

      // Customer profile / portal record. Phone is required at the DB level
      // but the customer must complete it after login, so we use a placeholder
      // that gets overwritten by the profile completion screen.
      try {
        await withRetry(
          () =>
            db.customer.create({
              data: {
                tenantId: tenant.id,
                name: user.name,
                email: profile.email,
                phone: '',
                customerNumber,
              },
            }),
          { label: 'google-createCustomer' }
        );
      } catch (err) {
        // Non-fatal — the user can still log in, the customer profile can be
        // created later when they complete their phone number.
        console.warn('Google sign-up: customer record creation failed', err);
      }

      // Notify tenant admins of the new registration.
      try {
        const admins = await db.user.findMany({
          where: { tenantId: tenant.id, role: { in: ['admin', 'super_admin'] }, isActive: true },
          select: { id: true },
        });
        if (admins.length) {
          await db.notification.createMany({
            data: admins.map((a) => ({
              tenantId: tenant.id,
              userId: a.id,
              type: 'new_customer_registered',
              title: 'New customer registered',
              message: `${user.name} (${profile.email}) signed up via Google.`,
              data: JSON.stringify({
                userId: user.id,
                email: profile.email,
                provider: 'google',
                registeredAt: new Date().toISOString(),
              }),
            })),
          });
        }
      } catch (err) {
        console.warn('Google sign-up: admin notification failed', err);
      }
    }

    // Audit log — role assignment / sign-in.
    try {
      await db.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          action: isNewUser ? 'user_registered_google' : 'user_login_google',
          entity: 'User',
          entityId: user.id,
          newValue: JSON.stringify({
            provider: 'google',
            role: user.role,
            emailVerified: profile.email_verified,
          }),
          ipAddress,
          userAgent,
          device,
        },
      });
    } catch (err) {
      console.warn('Google sign-in: audit log failed', err);
    }

    // Auth audit log (login history).
    try {
      await db.authAuditLog.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          email: user.email,
          event: isNewUser ? 'google_signup_success' : 'google_login_success',
          success: true,
          ipAddress,
          userAgent,
          device,
          browser,
          metadata: JSON.stringify({ provider: 'google', googleSub: profile.sub }),
        },
      });
    } catch (err) {
      console.warn('Google sign-in: auth audit log failed', err);
    }

    // Issue our session JWT.
    const role = (user.role as string).toLowerCase();
    const sessionToken = generateToken({
      userId: user.id,
      tenantId: user.tenantId,
      role,
      email: user.email,
    });

    // Stash the token + user payload in a short-lived HttpOnly cookie. The
    // client-side handoff page calls /api/auth/google/session once to read
    // and clear it, then writes the auth state into localStorage just like
    // the email / WhatsApp flows.
    const handoff = Buffer.from(
      JSON.stringify({
        token: sessionToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          avatar: user.avatar,
          role,
          tenantId: user.tenantId,
          tenantName: tenant.name,
          tenantDomain: tenant.domain,
          employeeNumber: user.employeeNumber,
          departmentId: user.departmentId,
          profileCompleted: user.profileCompleted,
        },
      }),
      'utf8'
    ).toString('base64url');

    const returnTo = unpacked.t && unpacked.t.startsWith('/') ? unpacked.t : '/';
    const redirectUrl = new URL('/auth/google/complete', request.url);
    redirectUrl.searchParams.set('returnTo', returnTo);
    if (isNewUser) redirectUrl.searchParams.set('isNew', '1');

    const response = NextResponse.redirect(redirectUrl, { status: 302 });

    response.cookies.set('g_session_handoff', handoff, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60, // single-use, 1 minute
    });

    // Clear the OAuth handshake cookies.
    response.cookies.delete('g_oauth_state');
    response.cookies.delete('g_oauth_nonce');

    return response;
  } catch (err) {
    console.error('Google OAuth callback error:', err);

    // Best-effort failure audit.
    try {
      await db.authAuditLog.create({
        data: {
          email: profile.email,
          event: 'google_login_failed',
          success: false,
          ipAddress,
          userAgent,
          device,
          browser,
          metadata: JSON.stringify({ provider: 'google', error: String(err) }),
        },
      });
    } catch {
      /* swallow */
    }

    return redirectWithError(request.url, 'server_error');
  }
}
