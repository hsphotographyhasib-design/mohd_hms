---
Task ID: hr-modules-1
Agent: main
Task: Build 3 HR modules (Payroll, Overtime, Recruitment) with API routes

Work Log:
- Created 7 API routes under /api/hr/:
  - /api/hr/payroll/route.ts (GET with month/year filter + stats, POST for process/single create)
  - /api/hr/overtime/route.ts (GET with status/employee/date filters + stats, POST create)
  - /api/hr/overtime/[id]/route.ts (PUT for supervisor_approve, hr_approve, reject, and general update)
  - /api/hr/recruitment/jobs/route.ts (GET with status/search filter, POST create)
  - /api/hr/recruitment/jobs/[id]/route.ts (GET single, PUT update, DELETE with candidate check)
  - /api/hr/recruitment/candidates/route.ts (GET with status/jobId/search filter, POST create)
  - /api/hr/recruitment/candidates/[id]/route.ts (GET single with job include, PUT for status/fields update)
- Created 3 frontend components under src/components/modules/hr/:
  - hr-payroll.tsx (~220 lines): Stats bar, month/year selector, payroll table with colored status badges (DRAFT/PROCESSED/PAID), Process Payroll button, Generate Payslips toast, detail dialog
  - hr-overtime.tsx (~400 lines): Stats bar (pending/approved/rejected/hours/amount), filter by status/date range, OT table with approval workflow buttons, create OT request dialog
  - hr-recruitment.tsx (~430 lines): Tab view (Jobs/Candidates), job cards with CRUD dialog, candidate table with pipeline status badges, pipeline visual, candidate detail dialog with status transition buttons
- Registered all 3 components in app-shell.tsx ViewRouter (desktop + mobile)
- All API routes use verifyAuth, db from @/lib/db, getDbFriendlyMessage/getErrorHeaders
- All components follow existing patterns: 'use client', named exports, token auth via localStorage, toast from sonner, shadcn/ui components
- ESLint passes with zero errors on all new files

Stage Summary:
- **Created**: 7 API routes for payroll, overtime, recruitment
- **Created**: 3 production-quality HR components (1050+ total lines)
- **Updated**: app-shell.tsx to route hr-payroll, hr-overtime, hr-recruitment views
- **Verified**: ESLint clean, follows all project conventions