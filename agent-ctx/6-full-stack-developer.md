---
Task ID: 6
Agent: full-stack-developer
Task: Build IRMS backend API routes with RBAC

Work Log:
- Created /api/irms/inspections/route.ts (GET list, POST create)
- Created /api/irms/inspections/dashboard-stats/route.ts
- Created /api/irms/inspections/[id]/route.ts (GET, PUT, DELETE)
- Created /api/irms/inspections/[id]/complete/route.ts
- Created /api/irms/inspections/analytics/route.ts
- Created /api/irms/templates/route.ts (GET list, POST create)
- Created /api/irms/templates/[id]/route.ts (GET, PUT, DELETE)
- Created /api/irms/inspections/reports/route.ts

Stage Summary:
- All 8 API route files created with full RBAC enforcement
- Customer role blocked at API level on every endpoint
- Technician role scoped to assigned inspections only
- Dashboard stats endpoint provides KPI data (total, scheduled today, pending, completed, overdue, failed, pass rate)
- Analytics endpoint provides 12-month trend, status/priority breakdown, top inspectors, pass/fail by equipment
- Reports endpoint supports 5 report types: inspection_report, monthly_summary, compliance_report, equipment_history, inspector_performance
- Template routes use transactions for atomic create/update with cascade of checklist items
- Delete template blocked if inspections reference it
- Status transition validation on inspection updates
- All files pass ESLint with zero errors