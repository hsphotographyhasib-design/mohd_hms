import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Read the short-lived handoff cookie set by /api/auth/google/callback and
 * hand its contents to the client as JSON. The cookie is single-use and is
 * cleared on the response.
 */
export async function GET(request: NextRequest) {
  const handoff = request.cookies.get('g_session_handoff')?.value;
  if (!handoff) {
    return NextResponse.json({ error: 'No active sign-in session' }, { status: 404 });
  }

  let payload: { token: string; user: Record<string, unknown> };
  try {
    const json = Buffer.from(handoff, 'base64url').toString('utf8');
    payload = JSON.parse(json);
  } catch {
    const res = NextResponse.json({ error: 'Invalid session handoff' }, { status: 400 });
    res.cookies.delete('g_session_handoff');
    return res;
  }

  const res = NextResponse.json({ token: payload.token, user: payload.user });
  res.cookies.delete('g_session_handoff');
  return res;
}
