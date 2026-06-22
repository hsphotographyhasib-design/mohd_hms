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
- Print-optimized with inline summary