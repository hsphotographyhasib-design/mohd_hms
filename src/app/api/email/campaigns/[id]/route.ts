import { NextRequest, NextResponse } from 'next/server';

const BREVO_API_URL = 'https://api.brevo.com/v3';

function getApiKey(): string | null {
  return process.env.BREVO_API_KEY || null;
}

// ============ GET: Get campaign details ============
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'BREVO_API_KEY not configured' },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;

    const res = await fetch(`${BREVO_API_URL}/emailCampaigns/${id}`, {
      headers: {
        'api-key': apiKey,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Brevo API ${res.status}: ${errBody}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ campaign: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

// ============ DELETE: Delete a campaign ============
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'BREVO_API_KEY not configured' },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;

    const res = await fetch(`${BREVO_API_URL}/emailCampaigns/${id}`, {
      method: 'DELETE',
      headers: {
        'api-key': apiKey,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Brevo API ${res.status}: ${errBody}` },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}

// ============ POST: Send campaign now or update ============
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'BREVO_API_KEY not configured' },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    if (action === 'sendNow') {
      const res = await fetch(`${BREVO_API_URL}/emailCampaigns/${id}/sendNow`, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        return NextResponse.json(
          { error: `Brevo API ${res.status}: ${errBody}` },
          { status: res.status }
        );
      }

      const data = await res.json();
      return NextResponse.json({ success: true, data });
    }

    if (action === 'test') {
      const { emails } = body;
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return NextResponse.json(
          { error: 'Provide at least one email address for testing' },
          { status: 400 }
        );
      }
      const res = await fetch(`${BREVO_API_URL}/emailCampaigns/${id}/sendTest`, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ emailTo: emails }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        return NextResponse.json(
          { error: `Brevo API ${res.status}: ${errBody}` },
          { status: res.status }
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "sendNow" or "test"' },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to perform action' },
      { status: 500 }
    );
  }
}