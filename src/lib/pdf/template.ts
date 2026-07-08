import QRCode from 'qrcode';
import { COMPANY, COMPANY_COLORS } from '@/lib/company';
import type { PrintableDocumentData, PrintableParty } from './types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function icon(path: string): string {
  return `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

const ICONS = {
  phone: icon('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>'),
  mail: icon('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>'),
  globe: icon('<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'),
  billTo: icon('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/>'),
  shipTo: icon('<path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>'),
  payment: icon('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>'),
  user: icon('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
};

function renderParty(title: string, titleIcon: string, party: PrintableParty): string {
  const addressLines = (party.addressLines || [])
    .filter(Boolean)
    .map((line) => `<div class="addr-line">${escapeHtml(line)}</div>`)
    .join('');

  const rows: string[] = [];
  if (party.phone) rows.push(`<div class="row">${ICONS.phone}<span>${escapeHtml(party.phone)}</span></div>`);
  if (party.email) rows.push(`<div class="row">${ICONS.mail}<span>${escapeHtml(party.email)}</span></div>`);
  if (party.contact) {
    const suffix = party.contactLabel ? ` ${escapeHtml(party.contactLabel)}` : '';
    rows.push(`<div class="row">${ICONS.user}<span>${escapeHtml(party.contact)}${suffix}</span></div>`);
  }

  return `
    <div class="card">
      <div class="card-title">${titleIcon} ${title}</div>
      <div class="name-strong">${escapeHtml(party.name.toUpperCase())}</div>
      ${addressLines}
      ${rows.length ? `<div class="contact">${rows.join('')}</div>` : ''}
    </div>`;
}

export async function renderPrintableDocumentHtml(doc: PrintableDocumentData): Promise<string> {
  const [companyFirst, ...companyRest] = COMPANY.name.split(' ');
  const companySub = companyRest.join(' ') || companyFirst;

  const qrDataUrl = await QRCode.toDataURL(doc.qrValue, { margin: 0, width: 200 });

  const metaRows = doc.meta
    .map((m) => `<div class="mrow"><span class="mk">${escapeHtml(m.label)}</span><span class="mc">:</span><span class="mv">${escapeHtml(m.value)}</span></div>`)
    .join('');

  const thirdCardHtml = doc.thirdCard
    ? `<div class="card">
        <div class="card-title">${ICONS.payment} ${escapeHtml(doc.thirdCard.title)}</div>
        <div class="kv">${doc.thirdCard.rows
          .map((r) => `<span class="k">${escapeHtml(r.label)}</span><span class="c">:</span><span class="v${r.highlight ? ' green' : ' b'}">${escapeHtml(r.value)}</span>`)
          .join('')}</div>
      </div>`
    : '';

  const itemRows = doc.items.length
    ? doc.items
        .map(
          (item, i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td>
          <div class="title-field"><span class="it-title">${escapeHtml(item.title)}</span></div>
          ${item.description ? `<div class="it-desc">${escapeHtml(item.description)}</div>` : ''}
        </td>
        <td class="c">${escapeHtml(item.unit || 'Nos')}</td>
        <td class="c">${item.quantity}</td>
        <td class="c">${fmtMoney(item.rate)}</td>
        <td class="c">${fmtMoney(item.amount)}</td>
      </tr>`
        )
        .join('')
    : `<tr><td colspan="6" class="c" style="padding:24px;color:#9aa1a8;">No line items</td></tr>`;

  const termsHtml = doc.terms.map((t) => `<li>${escapeHtml(t)}</li>`).join('');
  const notesHtml = doc.notes.map((n) => `<p>${escapeHtml(n)}</p>`).join('');

  const statusBadgeHtml = doc.statusBadge
    ? `<div><span class="paid-badge">${escapeHtml(doc.statusBadge.label)}</span></div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(doc.docType)} - ${escapeHtml(doc.docNumber)}</title>
<style>
  :root{
    --green:${COMPANY_COLORS.greenBright};
    --green-dark:${COMPANY_COLORS.primary};
    --green-soft:${COMPANY_COLORS.greenSoft};
    --ink:${COMPANY_COLORS.ink};
    --muted:${COMPANY_COLORS.muted};
    --label:${COMPANY_COLORS.ink2};
    --line:${COMPANY_COLORS.line};
    --line-2:#d8dcd9;
    --table-head:#f2f3f2;
  }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{
    background:#e9ecef;
    font-family:-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
    color:var(--ink);
    -webkit-font-smoothing:antialiased;
  }
  .page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:13mm 12mm 9mm;box-sizing:border-box;position:relative;}
  .header{display:flex;justify-content:space-between;gap:14px;}
  .brand{width:42%;}
  .brand-top{display:flex;align-items:flex-start;gap:11px;}
  .logo{width:46px;height:46px;border-radius:9px;background:var(--green);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:24px;letter-spacing:-1px;flex:none;}
  .company-name{font-size:24px;font-weight:800;line-height:1.05;letter-spacing:.2px;color:#222;white-space:nowrap;}
  .company-sub{font-size:12px;font-weight:600;letter-spacing:5px;color:var(--green);margin-top:3px;}
  .brand-meta{margin-top:13px;font-size:10px;color:#3f4a44;line-height:1.85;}
  .brand-meta .row{display:flex;align-items:center;gap:7px;}
  .ic{width:13px;height:13px;flex:none;color:var(--green);}
  .center{width:30%;text-align:center;padding-top:2px;}
  .center .title{font-size:30px;font-weight:800;color:var(--green);letter-spacing:1px;line-height:1;}
  .center .qno{font-size:14px;font-weight:700;margin-top:8px;color:#222;letter-spacing:.3px;}
  .paid-badge{display:inline-block;margin-top:8px;background:var(--green-soft);color:var(--green-dark);border:1px solid #bfe9cf;font-size:11px;font-weight:800;letter-spacing:1.5px;padding:3px 14px;border-radius:20px;}
  .barcode{height:44px;margin:10px auto 4px;width:88%;background-image:repeating-linear-gradient(90deg,#111 0 2px,#fff 2px 4px,#111 4px 7px,#fff 7px 9px,#111 9px 10px,#fff 10px 13px,#111 13px 15px,#fff 15px 18px,#111 18px 19px,#fff 19px 22px,#111 22px 25px,#fff 25px 26px);background-size:26px 100%;}
  .center .qno-sm{font-size:10.5px;font-weight:700;color:#222;letter-spacing:.3px;}
  .meta{width:30%;font-size:10px;}
  .meta .mrow{display:grid;grid-template-columns:auto 10px 1fr;column-gap:4px;padding:2.5px 0;align-items:baseline;}
  .meta .mk{color:var(--label);}
  .meta .mc{color:var(--muted);}
  .meta .mv{font-weight:700;color:#222;text-align:right;}
  .divider{height:2px;background:var(--green);margin:13px 0 14px;border-radius:2px;}
  .info-grid{display:grid;grid-template-columns:${doc.thirdCard ? '1fr 1fr 1fr' : '1fr 1fr'};gap:12px;}
  .card{border:1px solid var(--line-2);border-radius:9px;padding:13px 14px;}
  .card-title{display:flex;align-items:center;gap:8px;color:var(--green);font-weight:800;font-size:11px;letter-spacing:.4px;margin-bottom:10px;}
  .card-title .ic{width:15px;height:15px;}
  .name-strong{font-weight:800;font-size:11.5px;color:#1f2a24;margin-bottom:4px;}
  .addr-line{font-size:10px;color:#3f4a44;line-height:1.55;}
  .contact{margin-top:11px;display:flex;flex-direction:column;gap:7px;}
  .contact .row{display:flex;align-items:center;gap:8px;font-size:10px;color:#3f4a44;}
  .kv{display:grid;grid-template-columns:auto 10px 1fr;column-gap:4px;row-gap:7px;font-size:10px;align-items:baseline;}
  .kv .k{color:var(--label);}
  .kv .c{color:var(--muted);}
  .kv .v{color:#3f4a44;}
  .kv .v.b{font-weight:800;color:#1f2a24;}
  .kv .v.green{font-weight:800;color:var(--green-dark);}
  .table{width:100%;border-collapse:collapse;margin-top:16px;font-size:10.5px;}
  .table thead th{background:var(--table-head);border:1px solid var(--line-2);padding:10px 10px;font-weight:800;color:#222;text-align:left;font-size:10px;}
  .table thead th.th-c{text-align:center;}
  .table tbody td{border:1px solid var(--line-2);padding:11px 10px;vertical-align:top;color:#2b332e;}
  .table .c{text-align:center;}
  .title-field{display:flex;align-items:center;justify-content:space-between;gap:10px;border:none;background:transparent;padding:0;}
  .it-title{font-weight:800;color:#1f2a24;}
  .it-desc{color:#5b6470;line-height:1.55;font-size:10px;margin-top:6px;padding-left:2px;}
  .lower{display:grid;grid-template-columns:1.15fr 1fr;gap:18px;margin-top:16px;}
  .terms{border:1px solid var(--line-2);border-radius:9px;padding:14px 16px;}
  .terms h4{color:var(--green);font-weight:800;font-size:11px;letter-spacing:.4px;margin:0 0 10px;}
  .terms ol{margin:0;padding-left:18px;}
  .terms li{font-size:9.7px;color:#43504a;line-height:1.95;}
  .totals .trow{display:flex;justify-content:space-between;align-items:center;font-size:11px;padding:7px 2px;border-bottom:1px solid var(--line);}
  .totals .trow .tk{font-weight:700;color:#222;}
  .totals .trow .tv{color:#222;}
  .grand{display:flex;justify-content:space-between;align-items:center;padding:11px 2px 13px;}
  .grand .gk{font-size:16px;font-weight:800;color:#222;}
  .grand .gv{font-size:18px;font-weight:800;color:var(--green);}
  .words{background:var(--green-soft);border-radius:8px;padding:11px 13px;margin-top:6px;}
  .words .wt{color:var(--green-dark);font-weight:800;font-size:10px;letter-spacing:.4px;margin-bottom:5px;}
  .words .wv{font-weight:800;font-size:11px;color:#1f2a24;letter-spacing:.2px;}
  .foot{display:grid;grid-template-columns:1.05fr 1.15fr 1fr 1fr;gap:14px;margin-top:20px;}
  .fblock h5{color:var(--green);font-weight:800;font-size:11px;letter-spacing:.4px;margin:0 0 12px;}
  .fblock p{font-size:10px;color:#43504a;line-height:1.6;margin:0 0 10px;}
  .sign-img{font-family:"Segoe Script","Brush Script MT","Snell Roundhand",cursive;font-size:28px;color:#1a1a1a;line-height:1;margin:6px 0 8px;font-style:italic;}
  .sign-line{border-top:1px solid #9aa1a8;width:80%;margin:18px 0 7px;}
  .sign-name{font-weight:800;font-size:10.5px;color:#1f2a24;}
  .sign-role{font-size:10px;color:#5b6560;}
  .stamp-wrap{display:flex;justify-content:flex-start;}
  .stamp{width:108px;height:108px;}
  .qr-wrap{display:flex;flex-direction:column;align-items:flex-start;}
  .qr{width:96px;height:96px;}
  .qr-cap{font-size:9.3px;color:#5b6560;text-align:left;line-height:1.5;margin-top:9px;}
  .notes-line{border-top:1px solid #c9cecb;width:78%;margin-top:18px;}
  .page-foot{border-top:2px solid var(--green);margin-top:18px;padding-top:11px;text-align:center;}
  .page-foot .gen{font-size:9.7px;color:#7a837e;font-style:italic;}
  .page-foot .thanks{color:var(--green);font-weight:800;font-size:11.5px;letter-spacing:.6px;margin-top:6px;}
  @page{size:A4;margin:0;}
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="brand">
      <div class="brand-top">
        <div class="logo">${escapeHtml(COMPANY.shortName)}</div>
        <div class="company-block">
          <div class="company-name">${escapeHtml(companyFirst)}</div>
          <div class="company-sub">${escapeHtml(companySub.toUpperCase())}</div>
        </div>
      </div>
      <div class="brand-meta">
        <div class="addr">${escapeHtml(COMPANY.address)}</div>
        <div class="addr">${escapeHtml(COMPANY.city)}</div>
        <div style="height:6px"></div>
        <div class="row">${ICONS.phone}<span>${escapeHtml(COMPANY.phone)}</span></div>
        <div class="row">${ICONS.mail}<span>${escapeHtml(COMPANY.email)}</span></div>
        <div class="row">${ICONS.globe}<span>${escapeHtml(COMPANY.website)}</span></div>
      </div>
    </div>

    <div class="center">
      <div class="title">${escapeHtml(doc.docType)}</div>
      <div class="qno">${escapeHtml(doc.docNumber)}</div>
      ${statusBadgeHtml}
      <div class="barcode"></div>
      <div class="qno-sm">${escapeHtml(doc.docNumber)}</div>
    </div>

    <div class="meta">${metaRows}</div>
  </div>

  <div class="divider"></div>

  <div class="info-grid">
    ${renderParty('BILL TO', ICONS.billTo, doc.billTo)}
    ${renderParty(doc.docType === 'INVOICE' ? 'SHIP / DELIVERY TO' : 'SITE / DELIVERY', ICONS.shipTo, doc.shipTo)}
    ${thirdCardHtml}
  </div>

  <table class="table">
    <thead>
      <tr>
        <th class="th-c" style="width:6%">SL</th>
        <th style="width:43%">Item Title</th>
        <th class="th-c" style="width:10%">Unit</th>
        <th class="th-c" style="width:12%">Quantity</th>
        <th class="th-c" style="width:14%">Rate (${escapeHtml(doc.currency)})</th>
        <th class="th-c" style="width:15%">Amount (${escapeHtml(doc.currency)})</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="lower">
    <div class="terms">
      <h4>TERMS &amp; CONDITIONS</h4>
      <ol>${termsHtml}</ol>
    </div>

    <div class="totals">
      <div class="trow"><span class="tk">Subtotal</span><span class="tv">${escapeHtml(doc.currency)} ${fmtMoney(doc.subtotal)}</span></div>
      <div class="trow"><span class="tk">Discount</span><span class="tv">${escapeHtml(doc.currency)} ${fmtMoney(doc.discount)}</span></div>
      <div class="trow"><span class="tk">Tax (${doc.taxRate}%)</span><span class="tv">${escapeHtml(doc.currency)} ${fmtMoney(doc.tax)}</span></div>
      <div class="trow"><span class="tk">Shipping</span><span class="tv">${escapeHtml(doc.currency)} ${fmtMoney(doc.shipping)}</span></div>
      <div class="grand"><span class="gk">GRAND TOTAL</span><span class="gv">${escapeHtml(doc.currency)} ${fmtMoney(doc.total)}</span></div>
      <div class="words">
        <div class="wt">AMOUNT IN WORDS</div>
        <div class="wv">${escapeHtml(doc.amountInWords)}</div>
      </div>
    </div>
  </div>

  <div class="foot">
    <div class="fblock">
      <h5>NOTES</h5>
      ${notesHtml}
      <div class="notes-line"></div>
    </div>

    <div class="fblock">
      <h5>AUTHORIZED BY</h5>
      ${doc.authorizedByName ? `<div class="sign-img">${escapeHtml(doc.authorizedByName.split(' ')[0])}</div>` : ''}
      <div class="sign-line"></div>
      <div class="sign-name">${escapeHtml(doc.authorizedByName || '—')}</div>
      <div class="sign-role">${escapeHtml(doc.authorizedByRole || 'Authorised Signature')}</div>
    </div>

    <div class="fblock">
      <h5>COMPANY STAMP</h5>
      <div class="stamp-wrap">
        <svg class="stamp" viewBox="0 0 120 120">
          <defs>
            <path id="topArc" d="M 14,60 A 46,46 0 0 1 106,60"/>
          </defs>
          <circle cx="60" cy="60" r="55" fill="none" stroke="${COMPANY_COLORS.greenBright}" stroke-width="2"/>
          <circle cx="60" cy="60" r="48" fill="none" stroke="${COMPANY_COLORS.greenBright}" stroke-width="1"/>
          <text font-size="7.6" font-weight="700" letter-spacing="1" fill="${COMPANY_COLORS.greenBright}" font-family="Arial"><textPath href="#topArc" startOffset="50%" text-anchor="middle">${escapeHtml(COMPANY.name.toUpperCase())}</textPath></text>
          <g transform="translate(60,60)"><rect x="-15" y="-15" width="30" height="30" rx="6" fill="${COMPANY_COLORS.greenBright}"/><text x="0" y="6" font-size="17" font-weight="800" fill="#fff" text-anchor="middle" font-family="Arial">${escapeHtml(COMPANY.shortName)}</text></g>
          <text x="60" y="92" font-size="7" font-weight="700" letter-spacing="1.5" fill="${COMPANY_COLORS.greenBright}" text-anchor="middle" font-family="Arial">${escapeHtml(COMPANY.regNo)}</text>
          <line x1="30" y1="78" x2="44" y2="78" stroke="${COMPANY_COLORS.greenBright}" stroke-width="1"/>
          <line x1="76" y1="78" x2="90" y2="78" stroke="${COMPANY_COLORS.greenBright}" stroke-width="1"/>
        </svg>
      </div>
    </div>

    <div class="fblock">
      <h5>SCAN TO VIEW</h5>
      <div class="qr-wrap">
        <img class="qr" src="${qrDataUrl}" alt="QR code" />
        <div class="qr-cap">Scan this QR code to view<br>this ${doc.docType.toLowerCase()} online.</div>
      </div>
    </div>
  </div>

  <div class="page-foot">
    <div class="gen">This is a computer generated ${doc.docType.toLowerCase()}. No signature is required.</div>
    <div class="thanks">THANK YOU!</div>
  </div>

</div>
</body>
</html>`;
}
