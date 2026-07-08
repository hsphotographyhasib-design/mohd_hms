# Task 3 — email-backend-agent

## Files Created
1. **`/api/email/compose/route.ts`** — POST endpoint for composing and sending/scheduling emails with full RBAC
2. **`/api/email/customers/search/route.ts`** — GET endpoint for searching customers by name, email, phone, company, customer number
3. **`/api/email/test/route.ts`** — POST endpoint (super_admin/admin only) for sending a branded test email with config diagnostics
4. **`/api/email/customer-history/route.ts`** — GET endpoint for paginated email history per customer (RBAC: super_admin, admin, supervisor, manager)

## Files Updated
5. **`/api/email/send/route.ts`** — Switched to `verifyAuth`, added support for: `sender`, `senderName`, `bodyHtml`, `bodyText`, `priority`, `category`, `replyTo`, `createdById`, `customerId`. After `emailServiceSend` creates the log, a follow-up update sets the new fields.
6. **`/lib/email-service/index.ts`** — Added `clickedAt` and `spamAt` timestamp updates in `updateEmailStatus()` for `click` and `spam` events.

## Design Decisions
- Compose route creates EmailLog directly via `db.emailLog.create()` for full field control, then sends via provider
- Template rendering uses the existing named-function registry (`templates[templateId as keyof typeof templates]`)
- Finance role restricted to modules starting with 'invoice' or 'finance'
- Customer search uses Prisma `contains` across 5 fields with `isActive: true` filter
- Test email uses `renderEmailShell()` for consistent branding and shows Brevo/SMTP configuration status