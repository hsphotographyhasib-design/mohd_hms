---
Task ID: 1
Agent: Main
Task: Improve Quotation Line Items Data Entry Area for Enterprise-Grade Productivity

Work Log:
- Explored existing quotation module architecture (6 files, ~3200 lines total)
- Identified current 3-column layout (3/5/4 ratio) as too cramped for line items
- Extended QuotationLineItem type with 6 new fields: itemCode, itemType, discount, tax, labourCost, materialCost
- Created new enterprise grid component (quotation-line-items-grid.tsx, 1138 lines) with:
  - 15-column ERP-style editable grid (#, Item Code, Item Name, Description, Category, Type, Unit, Qty, Unit Price, Discount, Tax%, Labour, Material, Total, Actions)
  - Smart column widths (Item Name: 220px, Description: 260px, Qty: 78px, etc.)
  - Sticky header row with z-index layering
  - Sticky # (left:0) and Item Name (left:48px) columns
  - Full keyboard navigation (Tab, Enter, Arrow keys, Ctrl+D, Ctrl+C/V, Escape)
  - Right-click context menu (Insert Above/Below, Duplicate, Move Up/Down, Delete)
  - Live inventory search with keyboard navigation and auto-fill
  - Real-time line amount calculation with per-line discount/tax/labour/material
  - Inline validation (missing item name, invalid quantity/price)
  - Quick Add buttons (Inventory, Labour, Service, Custom)
  - Mobile responsive stacked card view
  - Keyboard shortcut hints bar
  - Row hover/active states
- Redesigned new-quotation.tsx layout:
  - Full-width Quotation Info section (customer search, project details, currency)
  - 75/25 grid+summary split (9-col/3-col)
  - Line items grid occupies 75% width
  - Sticky summary panel on right with per-line and global totals
  - Terms & Conditions, Notes, Attachments in bottom row
  - Preserved all existing functionality (customer search, auto-save, draft restore, save/submit)
- Cleaned up all dead code (removed ~470 lines of unused state/handlers/imports)
- ESLint: 0 errors on modified files

Stage Summary:
- Key artifacts: quotation-line-items-grid.tsx (NEW, 1138 lines), new-quotation.tsx (MODIFIED, 1127 lines), types/index.ts (EXTENDED)
- Layout transformed from cramped 3-column to enterprise 75/25 split
- All 15 columns with smart widths, sticky header + first 2 columns
- Full keyboard navigation and right-click context menu implemented
- Real-time calculations with per-line discount/tax/labour/material costs
- Mobile responsive with stacked card fallback
- Zero compilation errors, zero lint errors
