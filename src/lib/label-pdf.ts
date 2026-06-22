import type { LabelTemplate } from './label-templates';

export interface EquipmentLabelData {
  name: string;
  assetNumber: string;
  qrId: string;
  serialNumber?: string;
  category?: string;
  location?: string;
  building?: string;
  room?: string;
  brand?: string;
  model?: string;
  installDate?: string;
  customerName?: string;
  customerPhone?: string;
}

export interface CompanyInfo {
  name: string;
  shortName: string;
  phone: string;
  email: string;
  website: string;
  address: string;
}

/**
 * Generate a complete HTML page for printable equipment labels.
 * The page is self-contained with inline styles for A4 printing.
 * A placeholder div with id="qr-canvas" is included where a QR code SVG will be injected.
 */
export function generateLabelHtml(
  equipment: EquipmentLabelData,
  template: LabelTemplate,
  company: CompanyInfo
): string {
  const { fields, accentColor, showLogo, showQr, showEmergency } = template;

  const wMm = template.width;
  const hMm = template.height;

  // Scale factor: render at 2x for print sharpness (96 DPI assumed)
  const scale = 2;
  const wPx = Math.round((wMm / 25.4) * 96 * scale);
  const hPx = Math.round((hMm / 25.4) * 96 * scale);

  // Build field rows
  const fieldRows = fields
    .map((field) => {
      const value = getFieldValue(equipment, field);
      if (!value) return '';

      const label = getFieldLabel(field);
      const isSmall = template.size === 'small' || template.size === 'sticker';

      if (isSmall && (field === 'name' || field === 'assetNumber')) {
        // Compact layout for small labels
        return `<div style="margin-bottom: 2px;">
          <span style="font-size: ${field === 'name' ? '11px' : '9px'}; font-weight: ${field === 'name' ? '700' : '400'}; color: ${accentColor};">${escapeHtml(value)}</span>
        </div>`;
      }

      return `<tr>
        <td style="padding: ${scale}px ${scale * 2}px; font-size: ${8 * scale}px; color: #64748b; white-space: nowrap; vertical-align: top; width: 30%; border-bottom: 1px solid #f1f5f9;">
          ${label}
        </td>
        <td style="padding: ${scale}px ${scale * 2}px; font-size: ${8 * scale}px; color: #1e293b; font-weight: 600; vertical-align: top; border-bottom: 1px solid #f1f5f9;">
          ${escapeHtml(value)}
        </td>
      </tr>`;
    })
    .filter(Boolean)
    .join('\n');

  const isSmall = template.size === 'small' || template.size === 'sticker';
  const useTable = !isSmall;

  const contentArea = useTable
    ? `<table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
        ${fieldRows}
      </table>`
    : `<div style="padding: ${scale * 3}px;">
        ${fieldRows}
      </div>`;

  // QR placeholder dimensions
  const qrSize = isSmall ? 50 * scale : 80 * scale;

  // Emergency banner (for electrical, generator, fire protection)
  const emergencyBanner = showEmergency
    ? `<div style="
        background: #dc2626;
        color: white;
        text-align: center;
        padding: ${scale * 2}px ${scale * 4}px;
        font-size: ${7 * scale}px;
        font-weight: 700;
        letter-spacing: 2px;
        text-transform: uppercase;
      ">
        ⚠ EMERGENCY CONTACT REQUIRED ⚠
      </div>`
    : '';

  // Company header
  const companyHeader = showLogo
    ? `<div style="
        display: flex;
        align-items: center;
        gap: ${scale * 4}px;
        padding: ${scale * 3}px ${scale * 4}px;
        border-bottom: 2px solid ${accentColor};
      ">
        <div style="
          width: ${28 * scale}px;
          height: ${28 * scale}px;
          background: ${accentColor};
          border-radius: ${scale * 3}px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: ${10 * scale}px;
          font-weight: 800;
          flex-shrink: 0;
        ">
          ${company.shortName?.charAt(0)?.toUpperCase() || 'S'}
        </div>
        <div>
          <div style="font-size: ${9 * scale}px; font-weight: 700; color: ${accentColor}; line-height: 1.2;">
            ${escapeHtml(company.name)}
          </div>
          <div style="font-size: ${6 * scale}px; color: #94a3b8; line-height: 1.2; margin-top: 1px;">
            ${escapeHtml(company.phone)} ${company.email ? '• ' + escapeHtml(company.email) : ''}
          </div>
        </div>
      </div>`
    : '';

  // QR code area
  const qrArea = showQr
    ? `<div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: ${scale * 4}px;
        flex-shrink: 0;
      ">
        <div id="qr-canvas" style="
          width: ${qrSize}px;
          height: ${qrSize}px;
          border: 1px dashed #cbd5e1;
          border-radius: ${scale * 2}px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
        ">
          <!-- QR Code SVG will be injected here -->
          <svg width="${qrSize * 0.8}" height="${qrSize * 0.8}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.15;">
            <rect width="100" height="100" fill="#e2e8f0" rx="4"/>
            <rect x="10" y="10" width="25" height="25" rx="3" fill="#94a3b8"/>
            <rect x="65" y="10" width="25" height="25" rx="3" fill="#94a3b8"/>
            <rect x="10" y="65" width="25" height="25" rx="3" fill="#94a3b8"/>
            <rect x="15" y="15" width="15" height="15" rx="1" fill="#e2e8f0"/>
            <rect x="70" y="15" width="15" height="15" rx="1" fill="#e2e8f0"/>
            <rect x="15" y="70" width="15" height="15" rx="1" fill="#e2e8f0"/>
            <rect x="18" y="18" width="9" height="9" fill="#94a3b8"/>
            <rect x="73" y="18" width="9" height="9" fill="#94a3b8"/>
            <rect x="18" y="73" width="9" height="9" fill="#94a3b8"/>
          </svg>
        </div>
        <div style="
          font-size: ${5.5 * scale}px;
          color: #94a3b8;
          margin-top: ${scale * 2}px;
          text-align: center;
          font-family: 'Courier New', monospace;
          letter-spacing: 0.5px;
          max-width: ${qrSize}px;
          word-break: break-all;
        ">
          ${escapeHtml(equipment.qrId)}
        </div>
      </div>`
    : '';

  // Footer with company info
  const footer = showLogo
    ? `<div style="
        padding: ${scale * 2}px ${scale * 4}px;
        border-top: 1px solid #e2e8f0;
        font-size: ${5 * scale}px;
        color: #94a3b8;
        display: flex;
        justify-content: space-between;
      ">
        <span>${escapeHtml(company.address)}</span>
        <span>${escapeHtml(company.website)}</span>
      </div>`
    : '';

  // Main layout: if small/sticker, stack vertically; otherwise side-by-side
  const mainLayout =
    isSmall || !showQr
      ? `<div style="flex: 1; overflow: hidden;">${contentArea}</div>
         ${qrArea}`
      : `<div style="display: flex; flex: 1; overflow: hidden;">
           <div style="flex: 1; overflow: hidden;">${contentArea}</div>
           ${qrArea}
         </div>`;

  // Metal plate effect for metal type
  const metalOverlay =
    template.size === 'metal'
      ? `<div style="
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            135deg,
            rgba(255,255,255,0.1) 0%,
            transparent 40%,
            transparent 60%,
            rgba(255,255,255,0.05) 100%
          );
          pointer-events: none;
          border-radius: ${scale * 4}px;
        "></div>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Equipment Label - ${escapeHtml(equipment.name)}</title>
  <style>
    @page {
      size: A4;
      margin: 10mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: white;
      color: #1e293b;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      body {
        background: white;
      }
      .no-print {
        display: none !important;
      }
      .label-container {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <!-- Print controls -->
  <div class="no-print" style="
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 1000;
    display: flex;
    gap: 8px;
  ">
    <button onclick="window.print()" style="
      padding: 8px 20px;
      background: ${accentColor};
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    ">Print Label</button>
  </div>

  <!-- Label -->
  <div class="label-container" style="
    width: ${wPx}px;
    height: ${hPx}px;
    margin: 20px auto;
    background: white;
    border: ${template.size === 'metal' ? '2px solid #94a3b8' : '1px solid #e2e8f0'};
    border-radius: ${scale * 4}px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    box-shadow: ${template.size === 'metal' ? '0 2px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)' : '0 1px 4px rgba(0,0,0,0.08)'};
  ">
    ${metalOverlay}
    ${emergencyBanner}
    ${companyHeader}
    ${mainLayout}
    ${footer}
  </div>

  <script>
    // This script provides a hook for injecting a real QR code SVG into the placeholder.
    // Usage: setQrCode('<svg>...</svg>') or it will attempt to load from a data attribute.
    function setQrCode(svgString) {
      const container = document.getElementById('qr-canvas');
      if (container && svgString) {
        container.innerHTML = svgString;
        const svg = container.querySelector('svg');
        if (svg) {
          svg.style.width = '100%';
          svg.style.height = '100%';
        }
      }
    }

    // Listen for postMessage to receive QR code SVG
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'SET_QR_CODE') {
        setQrCode(event.data.svg);
      }
    });
  </script>
</body>
</html>`;

  return html;
}

/**
 * Escape HTML special characters to prevent XSS in the label
 */
function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return str.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * Get the display label for a field key
 */
function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    name: 'Equipment Name',
    assetNumber: 'Asset No.',
    qrId: 'QR ID',
    serialNumber: 'Serial No.',
    category: 'Category',
    location: 'Location',
    building: 'Building',
    room: 'Room / Area',
    brand: 'Brand',
    model: 'Model',
    installDate: 'Install Date',
    customerName: 'Customer',
    customerPhone: 'Phone',
  };
  return labels[field] || field;
}

/**
 * Get the value for a field from equipment data
 */
function getFieldValue(
  equipment: EquipmentLabelData,
  field: string
): string | undefined {
  switch (field) {
    case 'name':
      return equipment.name;
    case 'assetNumber':
      return equipment.assetNumber;
    case 'qrId':
      return equipment.qrId;
    case 'serialNumber':
      return equipment.serialNumber;
    case 'category':
      return equipment.category;
    case 'location':
      return equipment.location;
    case 'building':
      return equipment.building;
    case 'room':
      return equipment.room;
    case 'brand':
      return equipment.brand;
    case 'model':
      return equipment.model;
    case 'installDate':
      return equipment.installDate
        ? new Date(equipment.installDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : undefined;
    case 'customerName':
      return equipment.customerName;
    case 'customerPhone':
      return equipment.customerPhone;
    default:
      return undefined;
  }
}

/**
 * Generate multiple labels in a single HTML page (for batch printing)
 */
export function generateBatchLabelHtml(
  items: Array<{
    equipment: EquipmentLabelData;
    template: LabelTemplate;
  }>,
  company: CompanyInfo
): string {
  const labels = items
    .map(
      ({ equipment, template }) =>
        generateLabelHtml(equipment, template, company)
    )
    .join('\n');

  // Extract the body content from each generated label and combine
  const bodyContents: string[] = [];

  for (const { equipment, template } of items) {
    const html = generateLabelHtml(equipment, template, company);
    // Extract content between <body> and </body>
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      bodyContents.push(bodyMatch[1]);
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Equipment Labels - Batch Print</title>
  <style>
    @page {
      size: A4;
      margin: 8mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: white;
      color: #1e293b;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      .no-print { display: none !important; }
      .label-container {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
    .batch-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      justify-content: center;
      align-items: flex-start;
    }
  </style>
</head>
<body>
  <div class="no-print" style="
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 1000;
    display: flex;
    gap: 8px;
  ">
    <button onclick="window.print()" style="
      padding: 8px 20px;
      background: #1e293b;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    ">Print All Labels</button>
  </div>

  <div class="batch-grid">
    ${bodyContents.join('\n')}
  </div>

  <script>
    function setQrCode(svgString) {
      const container = document.getElementById('qr-canvas');
      if (container && svgString) {
        container.innerHTML = svgString;
        const svg = container.querySelector('svg');
        if (svg) {
          svg.style.width = '100%';
          svg.style.height = '100%';
        }
      }
    }
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'SET_QR_CODE') {
        setQrCode(event.data.svg);
      }
    });
  </script>
</body>
</html>`;
}