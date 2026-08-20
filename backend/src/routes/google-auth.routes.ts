import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { generateToken } from '../lib/auth.js';

const router = Router();

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
  return Buffer.from(padded, 'base64').toString('utf-8');
}

/** Decode a JWT payload without verification (Google already verified it during code exchange) */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * POST /google/callback
 *
 * Called by the Vercel frontend to exchange a Google authorization code for tokens
 * and create/find the user. Returns { token, user } so the Vercel callback can
 * render the HTML that sets localStorage.
 *
 * Body: { code, state, redirectUri }
 */
router.route('/callback').post(async (req: Request, res: Response) => {
  try {
    const { code, state, redirectUri } = req.body as {
      code: string;
      state: string;
      redirectUri: string;
    };

    if (!code || !state || !redirectUri) {
      res.status(400).json({ error: 'Missing code, state, or redirectUri' });
      return;
    }

    const clientId = getClientId();
    if (!clientId) {
      res.status(503).json({ error: 'Google Sign-In is not configured on the server.' });
      return;
    }

    // Decode PKCE verifier from state parameter
    let codeVerifier: string | null = null;
    if (state) {
      try {
        codeVerifier = decodeBase64url(state);
      } catch {
        console.error('[Google OAuth] Failed to decode state parameter');
      }
    }

    if (!codeVerifier) {
      res.status(400).json({ error: 'OAuth session expired. Please try again.' });
      return;
    }

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
      let detail = 'Failed to exchange authorization code with Google.';
      try {
        const errJson = JSON.parse(errBody);
        if (errJson.error_description) detail = errJson.error_description;
        else if (errJson.error) detail = `Google error: ${errJson.error}`;
      } catch {}
      res.status(400).json({ error: detail });
      return;
    }

    const tokenData = await tokenResponse.json() as {
      id_token?: string;
      access_token?: string;
      refresh_token?: string;
    };

    if (!tokenData.id_token) {
      res.status(400).json({ error: 'No ID token received from Google.' });
      return;
    }

    // Decode the ID token to get user info
    const payload = decodeJwtPayload(tokenData.id_token);
    if (!payload || !payload.sub || !payload.email) {
      res.status(400).json({ error: 'Invalid ID token from Google.' });
      return;
    }

    const googleId = payload.sub as string;
    const email = payload.email as string;
    const name = (payload.name as string) || email.split('@')[0];
    const picture = (payload.picture as string) || null;

    // ── Find or create user ──
    const existingByGoogle = await db.user.findUnique({
      where: { googleId },
      select: {
        id: true, email: true, name: true, phone: true, avatar: true,
        role: true, tenantId: true, employeeNumber: true, departmentId: true,
        profileCompleted: true, isActive: true,
      },
    });

    let user = existingByGoogle;

    if (!user) {
      // Check if user exists with same email (link accounts)
      const existingByEmail = await db.user.findFirst({
        where: { email },
        select: {
          id: true, email: true, name: true, phone: true, avatar: true,
          role: true, tenantId: true, employeeNumber: true, departmentId: true,
          profileCompleted: true, isActive: true,
        },
      });

      if (existingByEmail) {
        // Link Google account
        await db.user.update({
          where: { id: existingByEmail.id },
          data: {
            googleId,
            authProvider: 'google',
            avatar: picture || existingByEmail.avatar,
            lastLogin: new Date(),
            isOnline: true,
          },
        });
        user = { ...existingByEmail, avatar: picture || existingByEmail.avatar };
      }
    }

    if (user && !user.isActive) {
      res.status(403).json({ error: 'Account is deactivated. Please contact the administrator.' });
      return;
    }

    if (!user) {
      // Auto-create new user
      let tenant = await db.tenant.findFirst({ select: { id: true, name: true, domain: true } });

      if (!tenant) {
        tenant = await db.tenant.create({
          data: {
            name: 'MOHD.HMS Enterprise',
            domain: 'mohdhms.com',
            address: 'Bandar Seri Begawan, Brunei Darussalam',
            phone: '+673 000 0000',
            email: 'info@mohdhms.com',
          },
          select: { id: true, name: true, domain: true },
        });
      }

      user = await db.user.create({
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
        },
      });

      // Notify admins (best-effort)
      try {
        const admins = await db.user.findMany({
          where: { tenantId: tenant.id, role: { in: ['super_admin', 'admin'] }, isActive: true },
          select: { id: true },
        });
        if (admins.length > 0) {
          await db.notification.createMany({
            data: admins.map((admin: any) => ({
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
    } else {
      // Update last login
      db.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date(), isOnline: true, avatar: picture || user.avatar },
      }).catch(() => {});
    }

    // Fetch tenant name separately (Supabase REST doesn't support include)
    let tenantName: string | null = null;
    let tenantDomain: string | null = null;
    try {
      if (user.tenantId) {
        const tenant = await db.tenant.findUnique({ where: { id: user.tenantId } });
        tenantName = (tenant as any)?.name || null;
        tenantDomain = (tenant as any)?.domain || null;
      }
    } catch { /* ignore */ }

    // Generate our JWT
    const normalizedRole = (user.role as string).toLowerCase() as typeof user.role;
    const token = generateToken({
      userId: user.id,
      tenantId: user.tenantId,
      role: normalizedRole,
      email: user.email,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatar: picture || user.avatar,
        role: normalizedRole,
        tenantId: user.tenantId,
        tenantName,
        tenantDomain,
        employeeNumber: user.employeeNumber,
        departmentId: user.departmentId,
        profileCompleted: user.profileCompleted,
      },
    });
  } catch (error) {
    console.error('[Google OAuth Callback] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error', debug: (error as any)?.message || String(error) });
  }
});

export default router;