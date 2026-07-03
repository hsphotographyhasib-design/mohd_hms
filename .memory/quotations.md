# Quotations Module

> Auto-generated from codebase scan.

## Overview

Professional quotation management with line items, inventory integration, template-matching design, and conversion to work orders/invoices.

## Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/modules/quotations/quotation-list.tsx` | ~400 | List view with status filters, amounts, conversion badges |
| `src/components/modules/quotations/quotation-detail.tsx` | ~750 | A4-width document layout matching printed template |
| `src/components/modules/quotations/quotation-form.tsx` | ~850 | Create/edit form matching invoice.html template design |
| `src/app/api/quotations/route.ts` | ~200 | GET (list), POST (create) |
| `src/app/api/quotations/create/route.ts` | ~200 | POST (alternate create) |
| `src/app/api/quotations/[id]/route.ts` | ~200 | GET (detail), PUT (update) |
| `src/app/api/quotations/[id]/status/route.ts` | ~50 | PATCH (update status) |
| `src/app/api/quotations/next-number/route.ts` | ~30 | GET (generate QTN number) |
| `src/app/api/quotations/item-suggestions/route.ts` | ~50 | GET (search inventory + past quotations) |
| `src/app/api/quotations/[id]/convert-wo/route.ts` | ~100 | POST (convert to work order) |
| `src/app/api/quotations/[id]/convert-invoice/route.ts` | ~100 | POST (convert to invoice) |

## Quotation Statuses (11 states)

| Status | Description |
|--------|-------------|
| DRAFT | Being prepared |
| REVIEW | Under review |
| APPROVED | Approved by management |
| SENT | Sent to customer |
| ACCEPTED | Customer accepted |
| REJECTED | Customer rejected |
| EXPIRED | Past validUntil date |
| CONVERTED_WO | Converted to work order |
| CONVERTED_INVOICE | Converted to invoice |
| PAID | Payment received |
| CLOSED | Finalized |

## Quotation Number Format

```
QTN/SMSB/01/{year}/{4-digit-sequence}
Example: QTN/SMSB/01/2025/4529
```

## Quotation Form Design (quotation-form.tsx)

Template-matching design based on `upload/invoice.html`:

### Layout:
- **Main + Sidebar**: `1fr 326px` grid
- **Masthead card**: Company branding, QUOTATION title, barcode/QR, metadata table
- **Bill To card**: Customer search with dropdown
- **Ship To card**: Project name, site location, description
- **Line items table**: Clean bordered table (SL, Item, Unit, Qty, Rate, Amount, row actions)
- **Bottom**: Terms & Conditions (editable ordered list), Notes (textarea)
- **Sticky sidebar**: Summary (subtotal, discount, tax, shipping, grand total, amount in words), Actions (9 buttons)
- **Mobile**: Responsive grid, mobile action bar at bottom

### 9 Action Buttons:
1. **Save Draft** - Save as DRAFT
2. **Preview** - Save + navigate to quotation-detail view
3. **Print/PDF** - Save + navigate to detail with autoPrint flag → window.print()
4. **Email** - Opens mailto: with customer email, subject, itemized summary
5. **WhatsApp** - Opens wa.me link with customer phone and pre-filled message
6. **Duplicate** - Creates copy with "(Copy)" suffix
7. **Convert to WO** - Creates work order via API, updates status to CONVERTED_WO
8. **Convert to Invoice** - Creates invoice with all line items, updates status to CONVERTED_INVOICE
9. **Cancel** - Navigate back to list

### Inventory Connection:
- `ItemSuggestionDropdown` searches `/api/quotations/item-suggestions`
- Real-time search from inventory items + past quotation items
- Stock availability indicator shown
- Selecting item pre-fills unit, rate

## Quotation Detail Design (quotation-detail.tsx)

A4-width document layout matching printed template (PRINTED QUOTATION.png):

### Layout:
- Max-width: 210mm, centered
- 3-column header: QUOTATION TO | SITE/DELIVERY TO | OTHER INFORMATION
- Table: Gray headers with black text, 7 columns (SL, Description, Unit, Quantity, Rate, Amount)
- Summary: Right-aligned box below table
- Footer: 4-column grid (NOTES | PREPARED BY | COMPANY STAMP | SCAN TO VIEW)
- THANK YOU! centered below footer
- Disclaimer: "This is a computer generated quotation. No signature is required."

### Color Scheme:
- Section titles: emerald-600
- Table headers: gray-100 background, gray-800 text
- Amount in words: gray-900
- Active status: emerald

## Conversion Logic

### Convert to Work Order:
```ts
POST /api/quotations/[id]/convert-wo
→ Creates WorkOrder with quotation line items
→ Updates quotation status to CONVERTED_WO
```

### Convert to Invoice:
```ts
POST /api/quotations/[id]/convert-invoice
→ Creates Invoice with all line items copied
→ Links invoice.quotationId
→ Sets customer, amounts, terms from quotation
→ Updates quotation status to CONVERTED_INVOICE
```

## Line Item Structure (JSON)

```ts
interface QuotationLineItem {
  id?: string;
  title: string;        // Item name
  description?: string; // Details
  unit: string;         // pcs, hour, lot, etc.
  quantity: number;
  rate: number;         // Per unit price
  amount: number;       // quantity × rate
  category?: string;
  warranty?: string;
}
```

## Currency

Default: `BND` (Brunei Dollar)

## Amount in Words

`src/lib/number-to-words.ts` - Converts numbers to BND words:
```ts
numberToWords(1250.50) → "One Thousand Two Hundred Fifty Dollars and Fifty Cents Only"
```

## Permissions

| Action | Roles |
|--------|-------|
| View | super_admin, admin, manager, customer |
| Create/Edit | super_admin, admin, manager |
| Approve/Reject | super_admin, admin, manager |
| Convert | super_admin, admin, manager |
| Delete | super_admin, admin |