/**
 * Enterprise RBAC Permission Matrix — SINGLE SOURCE OF TRUTH
 *
 * MOHD.HMS ENTERPRISE
 *
 * This file defines ALL feature-level and action-level permissions.
 * Both frontend (navigation, buttons) and backend (API routes) MUST
 * import from this file. Never duplicate these maps elsewhere.
 *
 * Supported roles:
 *   super_admin, admin, manager, supervisor, technician, finance, hr, user, customer
 *   (vendor and guest are deprecated but kept for backward compatibility — they
 *    receive no access to any feature)
 */

import type { UserRole } from './types';

// ── Feature-Level Permissions ─────────────────────────────────────────────────
//
// Maps each feature/module name to the list of roles that can access it.
// Used by:
//   - Navigation components (floating nav, sidebar, mobile nav)
//   - Page-level protection
//   - API route feature checks via verifyRouteAuth(request, { feature })
//

export const FEATURE_PERMISSIONS: Record<string, UserRole[]> = {
  // ─── Core operational modules ──────────────────────────────────────────
  dashboard:       ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance', 'hr', 'user', 'customer'],
  complaints:      ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'user', 'customer'],
  'work-orders':   ['super_admin', 'admin', 'manager', 'supervisor', 'technician'],
  equipment:       ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'user', 'customer'],
  pm:              ['super_admin', 'admin', 'manager', 'supervisor', 'technician'],

  // ─── Commercial modules ────────────────────────────────────────────────
  invoices:        ['super_admin', 'admin', 'finance', 'user', 'customer'],
  quotations:      ['super_admin', 'admin', 'supervisor', 'user', 'customer'],
  finance:         ['super_admin', 'admin', 'finance'],
  customers:       ['super_admin', 'admin', 'manager', 'supervisor', 'finance'],

  // ─── Resource management ───────────────────────────────────────────────
  inventory:       ['super_admin', 'admin', 'manager', 'supervisor'],
  purchases:       ['super_admin', 'admin', 'manager'],
  vehicles:        ['super_admin', 'admin', 'manager'],

  // ─── People management ─────────────────────────────────────────────────
  employees:       ['super_admin', 'admin', 'hr'],
  technicians:     ['super_admin', 'admin', 'manager', 'supervisor'],
  hr:              ['super_admin', 'admin', 'hr'],

  // ─── Communication ─────────────────────────────────────────────────────
  notifications:   ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance', 'hr', 'user', 'customer'],
  whatsapp:        ['super_admin', 'admin', 'manager', 'supervisor'],
  email:           ['super_admin', 'admin'],
  irms:            ['super_admin', 'admin', 'manager', 'supervisor', 'technician'],

  // ─── Intelligence ──────────────────────────────────────────────────────
  reports:         ['super_admin', 'admin', 'manager', 'supervisor', 'finance'],

  // ─── System (Super Admin only) ─────────────────────────────────────────
  settings:        ['super_admin'],
  'user-management': ['super_admin'],
  cms:             ['super_admin'],
  documents:       ['super_admin', 'admin'],
  sessions:        ['super_admin', 'admin'],
  'error-logs':    ['super_admin'],
};

// ── Action-Level Permissions ──────────────────────────────────────────────────
//
// Maps `entity.action` to the list of roles that can perform it.
// Used by API route handlers for fine-grained mutation control.
//

export const ACTION_PERMISSIONS: Record<string, Record<string, UserRole[]>> = {
  // ─── Complaint actions ────────────────────────────────────────────────
  complaint: {
    create:                ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'customer'],
    view:                  ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance', 'user', 'customer'],
    update_fields:         ['super_admin', 'admin', 'manager', 'supervisor', 'technician'],
    delete:                ['super_admin', 'admin'],
    assign_technician:     ['super_admin', 'admin', 'supervisor', 'manager'],
    reassign_technician:   ['super_admin', 'admin', 'supervisor', 'manager'],
    override_status:       ['super_admin', 'admin'],
    approve_completion:    ['super_admin', 'admin', 'supervisor', 'manager'],
    start_work:            ['super_admin', 'admin', 'supervisor', 'manager', 'technician'],
    complete_work:         ['super_admin', 'admin', 'supervisor', 'manager', 'technician'],
    client_confirm:        ['customer', 'super_admin', 'admin'],
    client_reject:         ['customer', 'super_admin', 'admin'],
    accept:                ['technician'],
    reject:                ['technician'],
    view_timeline:         ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance', 'user', 'customer'],
    view_assignment_history: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance'],
    escalate:              ['super_admin', 'admin', 'manager', 'supervisor'],
  },

  // ─── Work Order actions ───────────────────────────────────────────────
  'work-order': {
    create:          ['super_admin', 'admin', 'manager', 'supervisor'],
    view:            ['super_admin', 'admin', 'manager', 'supervisor', 'technician'],
    update:          ['super_admin', 'admin', 'manager', 'supervisor', 'technician'],
    delete:          ['super_admin', 'admin'],
    assign:          ['super_admin', 'admin', 'supervisor', 'manager'],
    start:           ['super_admin', 'admin', 'supervisor', 'manager', 'technician'],
    complete:        ['super_admin', 'admin', 'supervisor', 'manager', 'technician'],
    provide_feedback:['customer', 'super_admin', 'admin'],
    convert_to_wo:   ['super_admin', 'admin', 'manager', 'supervisor'],
  },

  // ─── Invoice actions ──────────────────────────────────────────────────
  // Finance: Create, Edit, Approve, Record Payment
  // Customer: View own, Download PDF, Print
  invoice: {
    create:          ['super_admin', 'admin', 'finance'],
    view:            ['super_admin', 'admin', 'finance', 'customer'],
    update:          ['super_admin', 'admin', 'finance'],
    delete:          ['super_admin', 'admin'],
    approve:         ['super_admin', 'admin', 'finance'],
    send:            ['super_admin', 'admin', 'finance'],
    send_whatsapp:   ['super_admin', 'admin', 'finance'],
    send_email:      ['super_admin', 'admin', 'finance'],
    record_payment:  ['super_admin', 'admin', 'finance'],
    generate_pdf:    ['super_admin', 'admin', 'finance', 'customer'],
    print:           ['super_admin', 'admin', 'finance', 'customer'],
    download:        ['super_admin', 'admin', 'finance', 'customer'],
  },

  // ─── Quotation actions ────────────────────────────────────────────────
  // Customer: View own quotations only
  // Supervisor/Admin: Create, Edit, Send
  quotation: {
    create:          ['super_admin', 'admin', 'supervisor'],
    view:            ['super_admin', 'admin', 'supervisor', 'customer'],
    update:          ['super_admin', 'admin', 'supervisor'],
    delete:          ['super_admin', 'admin'],
    send:            ['super_admin', 'admin', 'supervisor'],
    send_whatsapp:   ['super_admin', 'admin', 'supervisor'],
    send_email:      ['super_admin', 'admin', 'supervisor'],
    convert_to_wo:   ['super_admin', 'admin', 'supervisor'],
    convert_to_invoice: ['super_admin', 'admin', 'finance'],
    generate_pdf:    ['super_admin', 'admin', 'supervisor', 'customer'],
    print:           ['super_admin', 'admin', 'supervisor', 'customer'],
  },

  // ─── Equipment actions ────────────────────────────────────────────────
  equipment: {
    create:          ['super_admin', 'admin', 'manager'],
    view:            ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'customer'],
    update:          ['super_admin', 'admin', 'manager', 'supervisor', 'technician'],
    delete:          ['super_admin', 'admin'],
    bulk_qr:         ['super_admin', 'admin'],
  },

  // ─── Inventory actions ────────────────────────────────────────────────
  inventory: {
    create:          ['super_admin', 'admin', 'manager'],
    view:            ['super_admin', 'admin', 'manager', 'supervisor'],
    update:          ['super_admin', 'admin', 'manager'],
    delete:          ['super_admin', 'admin'],
    adjust:          ['super_admin', 'admin', 'manager'],
    manage_warehouse: ['super_admin', 'admin', 'manager'],
    manage_category:  ['super_admin', 'admin', 'manager'],
    manage_supplier:  ['super_admin', 'admin', 'manager'],
    manage_price_book: ['super_admin', 'admin'],
    manage_stock:     ['super_admin', 'admin', 'manager', 'supervisor'],
  },

  // ─── Customer actions ─────────────────────────────────────────────────
  customer: {
    create:          ['super_admin', 'admin', 'manager', 'supervisor'],
    view:            ['super_admin', 'admin', 'manager', 'supervisor', 'finance'],
    update:          ['super_admin', 'admin', 'manager', 'supervisor'],
    delete:          ['super_admin', 'admin'],
    export:          ['super_admin', 'admin', 'manager'],
  },

  // ─── Employee actions ─────────────────────────────────────────────────
  employee: {
    create:          ['super_admin', 'admin', 'hr'],
    view:            ['super_admin', 'admin', 'hr'],
    update:          ['super_admin', 'admin', 'hr'],
    delete:          ['super_admin', 'admin'],
  },

  // ─── HR actions ───────────────────────────────────────────────────────
  hr_module: {
    manage_travel:    ['super_admin', 'admin', 'hr'],
    manage_leave:     ['super_admin', 'admin', 'hr'],
    manage_attendance: ['super_admin', 'admin', 'hr'],
    manage_payroll:   ['super_admin', 'admin', 'hr'],
    manage_disciplinary: ['super_admin', 'admin', 'hr'],
    manage_assets:    ['super_admin', 'admin', 'hr'],
    manage_medical:   ['super_admin', 'admin', 'hr'],
    manage_expenses:  ['super_admin', 'admin', 'hr'],
    manage_performance: ['super_admin', 'admin', 'hr'],
    manage_recruitment: ['super_admin', 'admin', 'hr'],
    manage_training:  ['super_admin', 'admin', 'hr'],
    manage_visitors:  ['super_admin', 'admin', 'hr'],
    manage_shifts:    ['super_admin', 'admin', 'hr'],
    manage_holidays:  ['super_admin', 'admin', 'hr'],
    manage_documents: ['super_admin', 'admin', 'hr'],
    manage_announcements: ['super_admin', 'admin', 'hr'],
    manage_settings:  ['super_admin', 'admin', 'hr'],
    view_reports:     ['super_admin', 'admin', 'hr'],
  },

  // ─── Purchase actions ─────────────────────────────────────────────────
  purchase: {
    create:          ['super_admin', 'admin', 'manager'],
    view:            ['super_admin', 'admin', 'manager'],
    update:          ['super_admin', 'admin', 'manager'],
    delete:          ['super_admin', 'admin'],
    approve:         ['super_admin', 'admin', 'manager'],
  },

  // ─── Vehicle actions ──────────────────────────────────────────────────
  vehicle: {
    create:          ['super_admin', 'admin'],
    view:            ['super_admin', 'admin', 'manager'],
    update:          ['super_admin', 'admin'],
    delete:          ['super_admin', 'admin'],
  },

  // ─── Finance actions ──────────────────────────────────────────────────
  finance_module: {
    create:          ['super_admin', 'admin', 'finance'],
    view:            ['super_admin', 'admin', 'finance'],
    update:          ['super_admin', 'admin', 'finance'],
    delete:          ['super_admin', 'admin'],
    record_payment:  ['super_admin', 'admin', 'finance'],
    approve:         ['super_admin', 'admin', 'finance'],
    export:          ['super_admin', 'admin', 'finance'],
  },

  // ─── Report actions ───────────────────────────────────────────────────
  report: {
    view:            ['super_admin', 'admin', 'manager', 'supervisor', 'finance'],
    export:          ['super_admin', 'admin', 'manager', 'finance'],
    print:           ['super_admin', 'admin', 'manager', 'finance'],
  },

  // ─── User management actions (Super Admin only) ──────────────────────
  'user-management': {
    create:          ['super_admin'],
    view:            ['super_admin'],
    update:          ['super_admin'],
    delete:          ['super_admin'],
    manage_roles:    ['super_admin'],
    deactivate:      ['super_admin'],
  },

  // ─── System actions (Super Admin only) ───────────────────────────────
  system: {
    view_settings:   ['super_admin'],
    update_settings: ['super_admin'],
    view_errors:     ['super_admin'],
    view_health:     ['super_admin'],
    manage_cms:      ['super_admin'],
    manage_whatsapp: ['super_admin'],
    manage_email:    ['super_admin'],
    seed_data:       ['super_admin'],
    debug:           ['super_admin'],
  },

  // ─── Notification actions ─────────────────────────────────────────────
  notification: {
    view:            ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance', 'hr', 'customer'],
    mark_read:       ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance', 'hr', 'customer'],
    send:            ['super_admin', 'admin', 'manager', 'supervisor'],
    manage_devices:  ['super_admin', 'admin'],
  },

  // ─── WhatsApp actions ─────────────────────────────────────────────────
  whatsapp_module: {
    view:            ['super_admin', 'admin', 'manager', 'supervisor'],
    send:            ['super_admin', 'admin', 'manager', 'supervisor'],
    manage_templates:['super_admin', 'admin'],
    manage_campaigns:['super_admin', 'admin', 'manager', 'supervisor'],
    manage_settings: ['super_admin', 'admin'],
    view_reports:    ['super_admin', 'admin', 'manager', 'supervisor'],
    manage_ai:       ['super_admin', 'admin'],
  },

  // ─── Email actions ────────────────────────────────────────────────────
  email_module: {
    view:            ['super_admin', 'admin'],
    send:            ['super_admin', 'admin'],
    manage_templates:['super_admin', 'admin'],
    manage_campaigns:['super_admin', 'admin'],
    view_logs:       ['super_admin', 'admin'],
    manage_settings: ['super_admin', 'admin'],
  },

  // ─── CMS actions ──────────────────────────────────────────────────────
  cms_module: {
    view:            ['super_admin'],
    create:          ['super_admin'],
    update:          ['super_admin'],
    delete:          ['super_admin'],
    publish:         ['super_admin'],
    manage_pages:    ['super_admin'],
    manage_seo:      ['super_admin'],
    manage_media:    ['super_admin'],
    manage_builder:  ['super_admin'],
  },

  // ─── IRMS / Inspection actions ───────────────────────────────────────
  inspection: {
    create:          ['super_admin', 'admin', 'manager', 'supervisor', 'technician'],
    view:            ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance'],
    update:          ['super_admin', 'admin', 'manager', 'supervisor', 'technician'],
    delete:          ['super_admin', 'admin'],
    assign:          ['super_admin', 'admin', 'manager', 'supervisor'],
    approve:         ['super_admin', 'admin', 'supervisor', 'manager'],
    complete:        ['super_admin', 'admin', 'supervisor', 'manager', 'technician'],
    upload_photos:   ['super_admin', 'admin', 'supervisor', 'manager', 'technician'],
    sign:            ['super_admin', 'admin', 'supervisor', 'manager', 'technician'],
    export:          ['super_admin', 'admin', 'manager', 'supervisor', 'finance'],
    manage_templates:['super_admin', 'admin'],
    view_analytics:  ['super_admin', 'admin', 'manager', 'supervisor'],
  },

  // ─── PM actions ───────────────────────────────────────────────────────
  pm_module: {
    create:          ['super_admin', 'admin', 'manager'],
    view:            ['super_admin', 'admin', 'manager', 'supervisor', 'technician'],
    update:          ['super_admin', 'admin', 'manager'],
    delete:          ['super_admin', 'admin'],
    execute:         ['super_admin', 'admin', 'supervisor', 'manager', 'technician'],
  },

  // ─── Document actions ─────────────────────────────────────────────────
  document: {
    create:          ['super_admin', 'admin'],
    view:            ['super_admin', 'admin'],
    update:          ['super_admin', 'admin'],
    delete:          ['super_admin', 'admin'],
    download:        ['super_admin', 'admin'],
    manage_versions: ['super_admin', 'admin'],
  },
};

// ── Role Hierarchy ────────────────────────────────────────────────────────────
//
// Higher number = more privilege. Used for hasMinRole() checks.
// This is the ONLY place the hierarchy is defined.
//

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  admin:       90,
  manager:     80,
  supervisor:  70,
  finance:     60,
  hr:          55,
  technician:  50,
  user:        40,
  customer:    10,
  vendor:      5,
  guest:       0,
};

// ── Permission Check Functions ────────────────────────────────────────────────

/**
 * Check if a user role can access a named feature.
 * This is the SINGLE canAccess implementation used everywhere.
 */
export function canAccessFeature(userRole: UserRole, feature: string): boolean {
  const allowed = FEATURE_PERMISSIONS[feature];
  if (!allowed) return false; // Unknown feature → deny by default
  return allowed.includes(userRole);
}

/**
 * Check if a user role can perform a specific action on an entity.
 */
export function canPerformAction(userRole: UserRole, entity: string, action: string): boolean {
  const entityActions = ACTION_PERMISSIONS[entity];
  if (!entityActions) return false;
  const allowedRoles = entityActions[action];
  if (!allowedRoles) return false;
  return allowedRoles.includes(userRole);
}

/**
 * Check if a user role meets or exceeds a minimum role in the hierarchy.
 */
export function hasMinRole(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

/**
 * Check if a user role is in a list of required roles.
 */
export function hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  if (requiredRoles.length === 0) return true;
  return requiredRoles.includes(userRole);
}