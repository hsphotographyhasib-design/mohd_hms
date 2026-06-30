---
Task ID: 2
Agent: Main Agent
Task: Build Enterprise "New Quotation" page for MOHD.HMS ENTERPRISE

Work Log:
- Updated Prisma Quotation model with new fields: barcode, createdBy, exchangeRate, labourCost, materialCost, attachments, VIEWED status
- Pushed schema to database with `bun run db:push`
- Updated `src/lib/quotation-helpers.ts` with extended LineItem type (markup, tax, discount per line) and addNewQuotationFields supporting all new fields
- Created `/api/quotations/smart-search-customer/route.ts` — debounced customer search with keyboard navigation, highlight matching, quotation/invoice count
- Created `/api/quotations/smart-search-inventory/route.ts` — debounced inventory search across inventory master and historical quotation items
- Updated `/api/quotations/create/route.ts` — supports all new fields, audit log creation, customer info in response
- Built `src/components/modules/quotations/new-quotation.tsx` (~560 lines) with:
  - 2-column layout (8/4 left, 4/12 right sticky)
  - Smart Google-like customer search with debounce, keyboard nav, green highlight, "Create New Customer" inline form
  - Smart inventory search with debounce, keyboard nav, stock availability, "Create New Item" link
  - 9 item types (Inventory, Spare Parts, Labour, Service, Equipment Service, Supply Only, Supply & Install, Rental, Consumables)
  - Per-line: discount%, tax%, markup% with auto-calculation formula
  - Collapsible Terms & Conditions, Notes, Attachments (drag & drop simulated)
  - Sticky summary sidebar with subtotal, discount, tax, shipping, labour cost, material cost, grand total, amount in words (using numberToCurrencyWords), margin, profit %
  - 11-step workflow pipeline display
  - Auto-save to localStorage every 30s with draft restore
  - Sticky bottom action bar with Save Draft + Cancel + Preview
- Updated AppShell: added lazy import for NewQuotation, mapped `new-quotation` view to it, kept `quotation-edit` mapped to QuotationForm
- Lint: 0 errors, 7 warnings (all prisma-generated)

Stage Summary:
- Enterprise New Quotation page fully built with smart search, auto-calculation, workflow display, auto-save, inline customer creation
- API routes: smart-search-customer, smart-search-inventory, create (updated)
- Prisma schema extended with barcode, exchangeRate, labourCost, materialCost, attachments, VIEWED status, createdBy
- Zero lint errors