import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const BREVO_API_URL = 'https://api.brevo.com/v3';

function getApiKey(): string | null {
  return process.env.BREVO_API_KEY || null;
}

// ============ GET: List campaigns ============
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const payload = verifyToken(token || '');
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'BREVO_API_KEY not configured' },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';

    const params = new URLSearchParams({ limit, offset });
    if (type) params.set('type', type);
    if (status) params.set('status', status);

    const res = await fetch(`${BREVO_API_URL}/emailCampaigns?${params}`, {
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
    return NextResponse.json({ campaigns: data.campaigns || data, count: data.count });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// ============ POST: Create a new campaign ============
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const payload = verifyToken(token || '');
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'BREVO_API_KEY not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { name, subject, senderName, senderEmail, htmlContent, listIds, scheduledAt, type, replyTo, toField } = body;

    // Validate required fields
    if (!name || !subject || !htmlContent) {
      return NextResponse.json(
        { error: 'Missing required fields: name, subject, and htmlContent are required' },
        { status: 400 }
      );
    }

    if (!senderEmail) {
      return NextResponse.json(
        { error: 'Sender email is required' },
        { status: 400 }
      );
    }

    // Build the campaign payload following Brevo API spec
    const campaignBody: Record<string, unknown> = {
      name,
      subject,
      type: type || 'classic',
      sender: {
        name: senderName || senderEmail.split('@')[0],
        email: senderEmail,
      },
      htmlContent,
      htmlUrl: null,
      templateId: null,
      inlineImageActivation: false,
      mirrorActive: false,
      recurring: false,
      footer: '[DEFAULT_FOOTER]',
      header: '[DEFAULT_HEADER]',
      utm: '[DEFAULT_UTM]',
    };

    // Recipients: either listIds or toField
    if (listIds && listIds.length > 0) {
      campaignBody.recipients = { listIds: listIds.map(Number) };
    } else if (toField) {
      campaignBody.recipients = { exclusionListIds: [] };
      campaignBody.toField = toField;
    }

    // Schedule
    if (scheduledAt) {
      campaignBody.scheduledAt = scheduledAt;
    }

    // Reply-to
    if (replyTo) {
      campaignBody.replyTo = replyTo;
    }

    const res = await fetch(`${BREVO_API_URL}/emailCampaigns`, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(campaignBody),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Brevo API ${res.status}: ${errBody}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ campaign: data, success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create campaign' },
      { status: 500 }
    );
  }
}