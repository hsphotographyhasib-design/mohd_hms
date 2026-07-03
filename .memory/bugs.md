# Known Bugs & Fixes

> Auto-generated from codebase scan. Tracks resolved issues to prevent regression.

## Bug #1: `module` Variable Name Conflict

**Date**: During DMS development
**File**: `src/app/api/documents/route.ts`
**Issue**: `const module = searchParams.get('module')` triggers Next.js ESLint error. `module` is a reserved word in the ESLint config.
**Fix**: Renamed to `modFilter` (or any non-reserved name).
**Lesson**: **NEVER use `module` as a variable name in API routes.** Always use alternatives like `modFilter`, `moduleType`, `moduleName`.

## Bug #2: Document Model No uploadedBy Relation

**Date**: During DMS development
**File**: `src/app/api/documents/route.ts`
**Issue**: Used `include: { uploadedByUser: true }` but `uploadedBy` is a plain string field (userId), not a Prisma relation/FK.
**Fix**: Changed to batch query: `db.user.findMany({ where: { id: { in: [...uploaderIds] } } })` then manual name mapping.
**Lesson**: Check Prisma schema for actual relations vs string reference fields. The `uploadedBy` field stores a userId string but has no `@relation`.

## Bug #3: Sandbox Inactive Error

**Date**: During development
**Issue**: User reported `{"error":"sandbox is inactive"}` when trying to access the app.
**Fix**: Kill old processes and restart dev server. Related to environment resource limits.
**Lesson**: Environment has memory constraints. Only one dev server instance should run at a time.

## Bug #4: Quotation Form autoPrint Type Mismatch

**Date**: During quotation form rebuild
**Files**: `quotation-form.tsx`, `quotation-detail.tsx`, `app-shell.tsx`
**Issue**: `autoPrint` prop was typed as `boolean` but `viewParams` values are always `string`.
**Fix**: Changed prop type to accept string, compare with `=== 'true'`.
**Lesson**: **viewParams values are ALWAYS strings.** Use `viewParams?.autoPrint === 'true'` not boolean casting.

## Bug #5: Quotation Form 7 Broken Buttons

**Date**: Initial quotation form
**File**: `src/components/modules/quotations/quotation-form.tsx`
**Issue**: 7 buttons (Preview, Generate PDF, Email, WhatsApp, Duplicate, Convert to WO, Convert to Invoice) had NO onClick handlers.
**Fix**: Implemented all 7 handlers:
- Preview: save → navigate to detail
- Generate PDF: save → navigate with autoPrint → window.print()
- Email: mailto link with formatted content
- WhatsApp: wa.me link with pre-filled message
- Duplicate: create copy with "(Copy)" suffix
- Convert to WO: API call + status update
- Convert to Invoice: API call + status update

## Bug #6: CSS Parse Error in Print Styles

**Date**: During invoice template matching
**File**: `src/app/globals.css`
**Issue**: Escaped `print\\:hidden` class in raw CSS caused parse error.
**Fix**: Corrected the escaping in the CSS.

## Bug #7: OOM During Development

**Date**: Ongoing
**Issue**: Dev server OOMs in this environment when too many operations run simultaneously. Cannot run dev server + Chrome (agent browser) at the same time.
**Workaround**: Use static verification (lint + TSC) instead of browser testing. Restart dev server between sessions if needed.
**Lesson**: Keep dev server running with `NODE_OPTIONS="--max-old-space-size=1024"`. Avoid `bun run build`.

## Bug #8: AppView Type Errors

**Date**: Various
**Issue**: Using wrong view names (e.g., 'quotation-form' instead of 'quotation-edit').
**Fix**: Always reference the `AppView` type union in `src/types/index.ts`.
**Lesson**: Available views: login, dashboard, equipment, equipment-detail, complaints, complaint-detail, new-complaint, work-orders, work-order-detail, invoices, invoice-detail, pm, quotations, quotation-detail, quotation-edit, new-quotation, inventory, customers, employees, purchases, vehicles, finance, reports, documents, document-detail, notifications, settings, profile, cms-*, whatsapp-*