// ============ Base Email Template ============
// Provides the branded HTML shell used by all email templates.

const BRAND = 'MOHD.HMS ENTERPRISE';
const BRAND_GREEN = '#16A34A'; // As specified in requirements
const BRAND_GREEN_LIGHT = '#F0FDF4';
const BRAND_GREEN_BORDER = '#BBF7D0';
const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#6B7280';
const TEXT_MUTED = '#9CA3AF';
const BG_PAGE = '#F3F4F6';
const BG_WHITE = '#FFFFFF';
const BORDER_COLOR = '#E5E7EB';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ShellOptions {
  title: string;
  previewText?: string;
  bodyHtml: string;
  footerHtml?: string;
  ctaUrl?: string;
  ctaText?: string;
}

/**
 * Renders the full branded HTML email with:
 * - MOHD.HMS ENTERPRISE green accent branding
 * - Mobile responsive layout
 * - Logo placeholder
 * - Footer with contact details
 */
export function renderEmailShell(opts: ShellOptions): string {
  const year = new Date().getFullYear();
  const preview = opts.previewText || opts.title;
  const footer = opts.footerHtml || `
    <p style="margin:0 0 4px 0;">MOHD.HMS ENTERPRISE</p>
    <p style="margin:0 0 4px 0;">Smart Facility Maintenance Management System</p>
    <p style="margin:0;">Brunei Darussalam</p>
  `;

  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${esc(opts.title)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background:${BG_PAGE};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${TEXT_PRIMARY};-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  <!-- Preview text -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    ${esc(preview)}
  </div>
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BG_PAGE};padding:24px 16px;">
    <tr><td align="center">

      <!-- Main Card -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;background:${BG_WHITE};border-radius:16px;overflow:hidden;border:1px solid ${BORDER_COLOR};box-shadow:0 1px 3px rgba(0,0,0,0.06);">

        <!-- Header / Logo -->
        <tr>
          <td style="padding:28px 32px 20px 32px;border-bottom:3px solid ${BRAND_GREEN};">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td>
                  <div style="display:inline-block;width:44px;height:44px;border-radius:12px;background:${BRAND_GREEN};color:#ffffff;text-align:center;line-height:44px;font-weight:700;font-size:18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">M</div>
                </td>
                <td style="padding-left:12px;">
                  <div style="font-size:16px;font-weight:700;color:${TEXT_PRIMARY};line-height:1.2;">${BRAND}</div>
                  <div style="font-size:11px;color:${TEXT_MUTED};letter-spacing:0.5px;text-transform:uppercase;">Facility Maintenance Management</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px 32px 32px;font-size:15px;line-height:1.6;color:${TEXT_PRIMARY};">
            ${opts.bodyHtml}
          </td>
        </tr>

        ${opts.ctaUrl && opts.ctaText ? `
        <!-- CTA Button -->
        <tr>
          <td style="padding:0 32px 28px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr><td align="center">
                <a href="${esc(opts.ctaUrl)}"
                   target="_blank"
                   style="display:inline-block;background:${BRAND_GREEN};color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:10px;font-weight:600;font-size:15px;mso-padding-alt:0;text-align:center;">
                  <!--[if mso]><i style="mso-font-width:300%;mso-text-raise:21" hidden>&nbsp;</i><![endif]-->
                  <span style="mso-text-raise:10px;">${esc(opts.ctaText)}</span>
                  <!--[if mso]><i style="mso-font-width:300%;" hidden>&nbsp;</i><![endif]-->
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        ` : ''}

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px 24px 32px;border-top:1px solid ${BORDER_COLOR};background:${BRAND_GREEN_LIGHT};">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="font-size:12px;color:${TEXT_SECONDARY};line-height:1.5;">
                  ${footer}
                </td>
              </tr>
              <tr>
                <td style="padding-top:12px;font-size:11px;color:${TEXT_MUTED};">
                  &copy; ${year} ${BRAND}. All rights reserved.
                </td>
              </tr>
              <tr>
                <td style="padding-top:8px;">
                  <a href="#" style="color:${BRAND_GREEN};text-decoration:none;font-size:11px;">Unsubscribe</a>
                  <span style="color:${TEXT_MUTED};font-size:11px;margin:0 6px;">|</span>
                  <a href="#" style="color:${BRAND_GREEN};text-decoration:none;font-size:11px;">Privacy Policy</a>
                  <span style="color:${TEXT_MUTED};font-size:11px;margin:0 6px;">|</span>
                  <a href="#" style="color:${BRAND_GREEN};text-decoration:none;font-size:11px;">Terms &amp; Conditions</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
      <!-- End Main Card -->

    </td></tr>
  </table>
</body>
</html>`;
}

// Re-export for convenience
export { esc, BRAND, BRAND_GREEN, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED };