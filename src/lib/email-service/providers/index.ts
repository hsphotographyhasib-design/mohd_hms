// ============ Provider Registry ============
// Centralizes provider selection and exports a single send function.
// Future providers (SES, SendGrid, Mailgun, Postmark) can be added here.

import type { SendEmailParams, SendEmailResult, EmailProvider } from '../types';
import { sendViaBrevo, isBrevoConfigured } from './brevo';
import { sendViaConsole } from './console';

// Determine active provider based on env configuration
function getActiveProvider(): EmailProvider {
  if (isBrevoConfigured()) return 'brevo';
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.SMTP_RELAY_URL) return 'smtp-relay';
  return 'console';
}

export type ProviderName = EmailProvider;

export async function sendViaProvider(
  params: SendEmailParams,
  provider?: EmailProvider
): Promise<SendEmailResult> {
  const p = provider || getActiveProvider();

  switch (p) {
    case 'brevo':
      return sendViaBrevo(params);
    case 'console':
      return sendViaConsole(params);
    // Future providers:
    // case 'ses': return sendViaSES(params);
    // case 'sendgrid': return sendViaSendGrid(params);
    // case 'mailgun': return sendViaMailgun(params);
    // case 'postmark': return sendViaPostmark(params);
    default:
      return sendViaConsole(params);
  }
}

export { getActiveProvider, isBrevoConfigured };