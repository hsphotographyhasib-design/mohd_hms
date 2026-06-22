---
Task ID: 1
Agent: Main
Task: Build premium invoice/quotation detail pages matching uploaded reference image

Work Log:
- Analyzed uploaded invoice reference image with VLM to extract exact layout specifications
- Updated Prisma schema: Added 15 new fields to Invoice model (shipping, taxRate, currency, referenceNo, poReference, paymentTerms, transactionId, bankName, bankAccountName, bankAccountNo, notes, terms, shipToName, shipToAddress, shipToPhone, shipToContact, preparedBy)
- Added quotation→invoices relation and User.preparedInvoices relation
- Updated Invoice API routes (list + detail) to include full customer details, quotation reference, creator/preparer names, all new fields
- Updated Quotation API to include companyName and pic in customer select
- Extended InvoiceItem type with 20+ new fields and added InvoiceLineItem interface
- Created `/src/lib/number-to-words.ts` utility for BND currency conversion
- Updated invoice number format to `INV/SMSB/01/{year}/{seq}`
- Built complete `invoice-detail.tsx` (840+ lines) matching reference image exactly
- Built complete `quotation-detail.tsx` (740+ lines) with same design language
- Implemented two-column layout: main invoice card + sticky summary sidebar (desktop), stacked (mobile)
- Added Code128 barcode generation (jsbarcode) and QR code (qrcode.react)
- Added all sections: Company header, Bill To/Ship To, line items table, Terms, Attachments, Notes with signature/stamp
- Added Summary sidebar with subtotal/discount/tax/shipping/grand total, amount in words, payment info, action buttons
- Added payment recording dialog, cancel dialog, reject dialog
- Added print/email/WhatsApp/print actions
- Updated seed data with proper invoice format (title/description/unit/quantity/rate/amount line items)
- Browser-verified both pages: Invoice 10/10, Quotation 10/10 completeness

Stage Summary:
- Invoice and quotation detail pages fully match the uploaded reference image
- All 13 sections present: company header, barcode/QR, invoice/quotation details, Bill To, Ship To, line items table, Terms, Attachments, Notes with signature/stamp, Summary sidebar, Amount in words, Payment information, Action buttons
- Desktop: two-column layout with sticky sidebar. Mobile: stacked with summary card below
- Print-optimized with inline summary---
Task ID: 1
Agent: Main Agent
Task: Redesign invoice/quotation detail pages to match uploaded printed invoice template photo

Work Log:
- Analyzed uploaded invoice template (PRINTED INVOICE.png) using VLM to extract exact layout details
- Identified 17 key elements: company header, green INVOICE title, green bar with invoice number, barcode, invoice details section, payment info section, Bill To, Ship To, 7-column items table, summary panel, amount in words, terms & conditions, signature area, company stamp, QR code, "Thank You!" text, contact info, page indicator
- Completely rewrote `src/components/modules/invoices/invoice-detail.tsx` — changed from sidebar layout to single A4-width document layout matching template
- Completely rewrote `src/components/modules/quotations/quotation-detail.tsx` — same template-matching design with quotation-specific fields
- Added comprehensive print CSS in `src/app/globals.css` for A4 paper output with `print-color-adjust: exact` for green headers, backgrounds, and all colored elements
- Fixed CSS parse error (escaped `print\\:hidden` class in raw CSS)
- Verified both pages in browser using agent-browser — all 17/17 elements confirmed present by VLM analysis

Stage Summary:
- Invoice and quotation detail pages now render as professional A4-width documents matching the uploaded template
- Key changes: single-column centered layout (max-width: 210mm), green header bar with barcode, 7-column table with separate Description column, inline summary panel, footer with signature/stamp/QR/thank-you
- Print CSS ensures colors render correctly on paper
- All existing functionality preserved (workflow actions, payment dialog, email/WhatsApp/Print, status badges)
