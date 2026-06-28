/**
 * Google OAuth 2.0 Authorization Code Flow helpers.
 *
 * Implements the official server-side flow described at
 * https://developers.google.com/identity/protocols/oauth2/web-server
 *
 * - Client secret stays on the server (env var)
 * - State parameter provides CSRF protection
 * - ID token is verified against Google's JWKs before trusting any claim
 */

import crypto from 'crypto';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

export interface GoogleProfile {
  sub: string;          // Google account id
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token: string;
  token_type: string;
  scope: string;
}

export function getGoogleClientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!id) throw new Error('GOOGLE_CLIENT_ID is not configured');
  return id;
}

function getGoogleClientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error('GOOGLE_CLIENT_SECRET is not configured');
  return secret;
}

export function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/api/auth/google/callback`;
}

export function isGoogleConfigured(): boolean {
  return Boolean(
    (process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) &&
      process.env.GOOGLE_CLIENT_SECRET
  );
}

/** Build the URL to redirect the user to for Google sign-in. */
export function buildAuthorizationUrl(state: string, nonce: string): string {
  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'select_account',
    state,
    nonce,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/** Exchange the authorization code for tokens. */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
    redirect_uri: getRedirectUri(),
    grant_type: 'authorization_code',
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status}`);
  }
  return (await res.json()) as GoogleTokenResponse;
}

// ---- ID token verification ---------------------------------------------------

interface JwkKey {
  kid: string;
  alg: string;
  kty: string;
  use: string;
  n: string;
  e: string;
}

let jwksCache: { keys: JwkKey[]; fetchedAt: number } | null = null;
const JWKS_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getJwks(): Promise<JwkKey[]> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return jwksCache.keys;
  }
  const res = await fetch(GOOGLE_JWKS_URL);
  if (!res.ok) throw new Error('Failed to fetch Google JWKs');
  const data = (await res.json()) as { keys: JwkKey[] };
  jwksCache = { keys: data.keys, fetchedAt: Date.now() };
  return data.keys;
}

function base64UrlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64');
}

function jwkToPem(key: JwkKey): crypto.KeyObject {
  // crypto.createPublicKey accepts a JWK when format: 'jwk'.
  return crypto.createPublicKey({ key: key as unknown as crypto.JsonWebKeyInput['key'], format: 'jwk' });
}

/**
 * Verify a Google ID token's signature and standard claims. Returns the
 * decoded profile, or throws.
 */
export async function verifyIdToken(idToken: string, expectedNonce?: string): Promise<GoogleProfile> {
  const [headerB64, payloadB64, signatureB64] = idToken.split('.');
  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new Error('Malformed ID token');
  }

  const header = JSON.parse(base64UrlDecode(headerB64).toString('utf8')) as { kid: string; alg: string };
  const payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8')) as Record<string, unknown>;
  const signature = base64UrlDecode(signatureB64);

  if (header.alg !== 'RS256') {
    throw new Error(`Unsupported ID token algorithm: ${header.alg}`);
  }

  const jwks = await getJwks();
  const key = jwks.find((k) => k.kid === header.kid);
  if (!key) throw new Error('No matching JWK for ID token');

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  const valid = verifier.verify(jwkToPem(key), signature);
  if (!valid) throw new Error('Invalid ID token signature');

  // Standard claim checks
  const now = Math.floor(Date.now() / 1000);
  const exp = Number(payload.exp);
  const iat = Number(payload.iat);
  const aud = payload.aud as string;
  const iss = payload.iss as string;

  if (!exp || exp < now) throw new Error('ID token expired');
  if (iat && iat > now + 60) throw new Error('ID token issued in the future');
  if (aud !== getGoogleClientId()) throw new Error('ID token audience mismatch');
  if (!GOOGLE_ISSUERS.includes(iss)) throw new Error('ID token issuer mismatch');
  if (expectedNonce && payload.nonce !== expectedNonce) {
    throw new Error('ID token nonce mismatch');
  }

  return {
    sub: payload.sub as string,
    email: payload.email as string,
    email_verified: Boolean(payload.email_verified),
    name: payload.name as string | undefined,
    given_name: payload.given_name as string | undefined,
    family_name: payload.family_name as string | undefined,
    picture: payload.picture as string | undefined,
    locale: payload.locale as string | undefined,
  };
}

// ---- State / nonce -----------------------------------------------------------

export function generateRandomToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Pack the random state + return-to URL into one cookie-safe token, so we can
 * round-trip the post-login destination through Google.
 */
export function packState(random: string, returnTo: string): string {
  return Buffer.from(JSON.stringify({ r: random, t: returnTo }), 'utf8').toString('base64url');
}

export function unpackState(packed: string): { r: string; t: string } | null {
  try {
    const json = Buffer.from(packed, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as { r: string; t: string };
    if (!parsed.r || typeof parsed.t !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}
