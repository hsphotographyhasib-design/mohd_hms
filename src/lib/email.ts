/**
 * Lightweight email helper.
 *
 * Default behaviour is environment-aware:
 *   - If RESEND_API_KEY + EMAIL_FROM are set, send via Resend HTTP API.
 *   - Else if SMTP_* env vars are set, send via SMTP_RELAY_URL (a generic
 *     HTTP relay that accepts { to, from, subject, html, text }).
 *   - Else (no provider configured): log the message + reset URL to the
 *     server console so developers can copy the link locally.
 *
 * No SMTP library is bundled to keep the dependency surface minimal —
 * production deployments should set RESEND_API_KEY or SMTP_RELAY_URL.
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  ok: boolean;
  provider: 'resend' | 'smtp-relay' | 'console';
  id?: string;
  error?: string;
}

const FROM_DEFAULT = 'MOHD.HMS ENTERPRISE <no-reply@mohd-hms.local>';

function fromAddress(): string {
  return process.env.EMAIL_FROM || FROM_DEFAULT;
}

async function sendViaResend(p: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY!;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [p.to],
        subject: p.subject,
        html: p.html,
        text: p.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, provider: 'resend', error: `Resend ${res.status}: ${body}` };
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, provider: 'resend', id: data.id };
  } catch (err) {
    return { ok: false, provider: 'resend', error: err instanceof Error ? err.message : 'unknown' };
  }
}

async function sendViaSmtpRelay(p: SendEmailParams): Promise<SendEmailResult> {
  const url = process.env.SMTP_RELAY_URL!;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.SMTP_RELAY_KEY ? { Authorization: `Bearer ${process.env.SMTP_RELAY_KEY}` } : {}),
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: p.to,
        subject: p.subject,
        html: p.html,
        text: p.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, provider: 'smtp-relay', error: `Relay ${res.status}: ${body}` };
    }
    return { ok: true, provider: 'smtp-relay' };
  } catch (err) {
    return { ok: false, provider: 'smtp-relay', error: err instanceof Error ? err.message : 'unknown' };
  }
}

function logToConsole(p: SendEmailParams): SendEmailResult {
  console.log('\n========= EMAIL (dev fallback — no provider configured) =========');
  console.log('To:     ', p.to);
  console.log('From:   ', fromAddress());
  console.log('Subject:', p.subject);
  console.log('---------------- TEXT ----------------');
  console.log(p.text);
  console.log('==================================================================\n');
  return { ok: true, provider: 'console' };
}

export async function sendEmail(p: SendEmailParams): Promise<SendEmailResult> {
  if (process.env.RESEND_API_KEY) return sendViaResend(p);
  if (process.env.SMTP_RELAY_URL) return sendViaSmtpRelay(p);
  return logToConsole(p);
}

/* ------------------------------------------------------------------ */
/*  Email templates                                                    */
/* ------------------------------------------------------------------ */

const BRAND = 'MOHD.HMS ENTERPRISE';
const BRAND_GREEN = '#059669';

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
      <tr><td style="padding:28px 32px 8px 32px;">
        <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:${BRAND_GREEN};color:#ffffff;text-align:center;line-height:48px;font-weight:700;font-size:18px;">M</div>
        <div style="font-size:14px;color:#6b7280;margin-top:12px;">${BRAND}</div>
      </td></tr>
      <tr><td style="padding:8px 32px 32px 32px;color:#111827;font-size:15px;line-height:1.55;">
        ${bodyHtml}
      </td></tr>
      <tr><td style="padding:16px 32px 24px 32px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
        &copy; ${new Date().getFullYear()} ${BRAND}. All rights reserved.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderResetEmail(opts: { resetUrl: string; userName?: string | null }) {
  const subject = `Reset Your ${BRAND} Password`;
  const greeting = opts.userName ? `Hello ${escapeHtml(opts.userName)},` : 'Hello,';
  const html = shell(
    subject,
    `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Reset your password</h1>
    <p style="margin:0 0 14px 0;">${greeting}</p>
    <p style="margin:0 0 14px 0;">We received a request to reset your password.</p>
    <p style="margin:0 0 22px 0;">Click the button below to create a new password.</p>
    <p style="margin:0 0 22px 0;">
      <a href="${escapeHtml(opts.resetUrl)}"
         style="display:inline-block;background:${BRAND_GREEN};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;">
        Reset Password
      </a>
    </p>
    <p style="margin:0 0 6px 0;color:#6b7280;">This link expires in 15 minutes.</p>
    <p style="margin:0 0 22px 0;color:#6b7280;">If you didn&rsquo;t request this, you can safely ignore this email.</p>
    <p style="margin:0;color:#6b7280;font-size:13px;">Or paste this URL into your browser:</p>
    <p style="margin:6px 0 0 0;color:#374151;font-size:13px;word-break:break-all;">${escapeHtml(opts.resetUrl)}</p>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND}</p>
    `
  );
  const text = `${greeting}

We received a request to reset your password.

Reset link (expires in 15 minutes):
${opts.resetUrl}

If you didn't request this, you can safely ignore this email.

Thank you,
${BRAND}`;
  return { subject, html, text };
}

export function renderPasswordChangedEmail(opts: { userName?: string | null; ip?: string | null; when?: Date }) {
  const subject = `Your ${BRAND} password was changed`;
  const greeting = opts.userName ? `Hello ${escapeHtml(opts.userName)},` : 'Hello,';
  const when = (opts.when ?? new Date()).toUTCString();
  const html = shell(
    subject,
    `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Password changed</h1>
    <p style="margin:0 0 14px 0;">${greeting}</p>
    <p style="margin:0 0 14px 0;">Your password has been changed successfully.</p>
    <p style="margin:0 0 14px 0;color:#6b7280;">When: ${escapeHtml(when)}${opts.ip ? `<br/>IP address: ${escapeHtml(opts.ip)}` : ''}</p>
    <p style="margin:0 0 14px 0;">If you did not perform this action, contact support immediately.</p>
    <p style="margin:24px 0 0 0;">Thank you,<br/>${BRAND}</p>
    `
  );
  const text = `${greeting}

Your password has been changed successfully.
When: ${when}${opts.ip ? `\nIP address: ${opts.ip}` : ''}

If you did not perform this action, contact support immediately.

Thank you,
${BRAND}`;
  return { subject, html, text };
}
