import { NextRequest, NextResponse } from 'next/server';
import {
  buildAuthorizationUrl,
  generateRandomToken,
  isGoogleConfigured,
  packState,
} from '@/lib/google-oauth';

export const dynamic = 'force-dynamic';

/**
 * Initiates the Google OAuth 2.0 Authorization Code Flow.
 *
 * Generates random state + nonce, stores them in HttpOnly cookies for CSRF /
 * replay protection on the callback, then redirects the user to Google.
 */
export async function GET(request: NextRequest) {
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(
      new URL('/?googleAuthError=not_configured', request.url),
      { status: 302 }
    );
  }

  const url = new URL(request.url);
  const returnTo = url.searchParams.get('returnTo') || '/';

  const randomState = generateRandomToken();
  const nonce = generateRandomToken();
  const state = packState(randomState, returnTo);

  const authUrl = buildAuthorizationUrl(state, nonce);
  const response = NextResponse.redirect(authUrl, { status: 302 });

  const cookieOpts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10, // 10 minutes — handshake should complete well before this
  };

  response.cookies.set('g_oauth_state', randomState, cookieOpts);
  response.cookies.set('g_oauth_nonce', nonce, cookieOpts);

  return response;
}
