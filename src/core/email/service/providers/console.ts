// ============ Console Fallback Provider ============
// Logs emails to server console when no real provider is configured.

import type { SendEmailParams, SendEmailResult, EmailProvider } from '../types';

const FROM = 'MOHD.HMS ENTERPRISE <noreply@mohdhms.com>';

export function sendViaConsole(params: SendEmailParams): SendEmailResult {
  console.log('\n========= EMAIL (console fallback — no provider configured) =========');
  console.log('To:     ', params.to);
  console.log('CC:     ', params.cc?.join(', ') || '(none)');
  console.log('BCC:    ', params.bcc?.join(', ') || '(none)');
  console.log('From:   ', FROM);
  console.log('Subject:', params.subject);
  console.log('Module: ', params.module || '(none)');
  console.log('Template:', params.templateName || '(none)');
  if (params.attachments?.length) {
    console.log('Attachments:', params.attachments.map((a) => a.filename).join(', '));
  }
  console.log('---------------- TEXT ----------------');
  console.log(params.text || '(no text part)');
  console.log('======================================================================\n');
  return { ok: true, provider: 'console' as EmailProvider };
}