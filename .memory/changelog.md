# Changelog

> Development history tracked from worklog.md.

## Session 1: Invoice/Quotation Detail Pages
- Analyzed uploaded invoice reference image with VLM
- Updated Prisma schema: 15 new Invoice fields (shipping, taxRate, currency, bank details, etc.)
- Built `invoice-detail.tsx` (840+ lines) matching reference image
- Built `quotation-detail.tsx` (740+ lines) with same design language
- Implemented Code128 barcode (jsbarcode) and QR code (qrcode.react)
- Added number-to-words utility for BND currency
- Invoice number format: `INV/SMSB/01/{year}/{seq}`

## Session 2: Template-Matching Redesign
- Completely rewrote invoice-detail.tsx to match PRINTED INVOICE.png
- Completely rewrote quotation-detail.tsx to match PRINTED QUOTATION.png
- Single A4-width document layout (max-width: 210mm)
- Green header bar with barcode
- Print CSS with `print-color-adjust: exact`

## Session 3: Quotation Template Pixel-Perfect Fixes
- VLM analysis of PRINTED QUOTATION.png: 25 elements verified
- 7 discrepancy fixes: section titles to green, table headers to gray, "Quantity" column, summary repositioned, etc.
- Footer restructured to 4-column grid: NOTES | PREPARED BY | COMPANY STAMP | SCAN TO VIEW

## Session 4: Fix Quotation Form Buttons
- Fixed 7 buttons with no onClick handlers
- Implemented: Preview, Generate PDF, Email, WhatsApp, Duplicate, Convert to WO, Convert to Invoice
- Added `saveQuotationAndGetId()` helper
- Added `allowedDevOrigins` to next.config.ts

## Session 5: Quotation Form Rebuild
- Completely rewrote quotation-form.tsx (~850 lines) based on invoice.html template
- Main + Sidebar layout (1fr 326px)
- Masthead card, Bill To/Ship To cards, line items table, terms/notes
- Sticky sidebar with summary + 9 action buttons
- Inventory-connected item suggestions
- Mobile responsive with mobile action bar

## Session 6: QR Asset Management System
- Added EquipmentQrCode, ScanLog models + new Equipment fields
- Backfilled 10 equipment records with QR IDs
- Created `src/lib/qr-utils.ts` (generateQrId, buildQrUrl, parseDevice, etc.)
- Created `src/lib/label-templates.ts` (10 templates, 5 sizes)
- Created `src/lib/label-pdf.ts` (A4 label generator)
- Built 6 API routes (lookup, scan, get/regen QR, analytics, bulk QR, service request)
- Built public equipment page at `/equipment/[qrId]`
- Replaced placeholder QR with real scannable QR in equipment-detail.tsx

## Session 7: Enterprise Document Management System
- Added 4 Prisma models: Document, DocumentVersion, UploadSession, DocumentAuditLog
- Created storage abstraction layer (src/lib/storage/provider.ts)
- Added document types + constants to types/index.ts
- Built 8 API routes: upload (init/chunk/complete/pause/resume/cancel), documents CRUD, versions, audit, duplicates
- Built document-list.tsx (~460 lines): stats, filters, table, upload dialog with chunked upload
- Built document-detail.tsx (~440 lines): preview, version history, audit log, info sidebar
- Integrated into sidebar, app-shell, types

## Session 8: AI Memory Directory System
- Scanned entire codebase (247 files, 60,862 lines)
- Created .memory/ directory with 22 markdown files + 3 cache JSON files
- Generated comprehensive documentation for all modules

## Session 9: Memory Update & Upgrade
- Updated database.md: 35 → 51 models (added CMS×18, WhatsApp×9, HR×2, Document×4, Fleet×2)
- Fixed all field/relation/index/unique counts from Prisma schema
- Updated cache/schemas.json: 51 models with verified counts
- Updated cache/hashes.json: replaced all placeholder hashes with real SHA256 hashes (247 files)
- Updated cache/ast-summary.json: 105 routes, 111 components, 51 models, correct largest file list
- Updated routes.md: fixed CMS header reference, added catch-all route note, added settings route
- Updated dependencies.md: reorganized 76 deps into 14 categories
- Updated project.md: version 0.2.0 → 0.3.0, corrected API route/component counts
- All 25 memory files now reflect current codebase state