// ============ Provider Registry ============
// Centralizes provider selection and exports a single send function.
// Priority: SMTP > Brevo > Console fallback

import type { SendEmailParams, SendEmailResult, EmailProvider } from '../types';
import { sendViaBrevo, isBrevoConfigured } from './brevo';
import { sendViaSmtp, isSmtpConfigured } from './smtp';
import { sendViaConsole } from './console';

// Determine active provider based on env configuration
function resolveActiveProvider(): EmailProvider {
  if (isSmtpConfigured()) return 'smtp-relay';
  if (isBrevoConfigured()) return 'brevo';
  return 'console';
}

let _cachedProvider: EmailProvider | null = null;

export function getActiveProvider(): EmailProvider {
  if (!_cachedProvider) {
    _cachedProvider = resolveActiveProvider();
    console.log(`[EmailService] Active provider: ${_cachedProvider}`);
  }
  return _cachedProvider;
}

export type ProviderName = EmailProvider;

export async function sendViaProvider(
  params: SendEmailParams,
  provider?: EmailProvider
): Promise<SendEmailResult> {
  const p = provider || getActiveProvider();

  switch (p) {
    case 'smtp-relay':
      return sendViaSmtp(params);
    case 'brevo':
      return sendViaBrevo(params);
    case 'console':
      return sendViaConsole(params);
    default:
      return sendViaConsole(params);
  }
}

export { isBrevoConfigured, isSmtpConfigured };