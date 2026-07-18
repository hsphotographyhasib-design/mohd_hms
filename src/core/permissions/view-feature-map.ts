/**
 * Maps AppView names to RBAC feature names for page-level protection.
 *
 * This is the single mapping used by the ProtectedViewRouter to determine
 * if a user can see a particular view.
 */

import type { AppView } from '@/core/types';

/**
 * Maps an AppView to its RBAC feature key.
 * Views not listed here (like 'profile', 'login', 'help') are accessible to all authenticated users.
 */
export const VIEW_FEATURE_MAP: Record<string, string> = {
  // Core
  dashboard: 'dashboard',
  equipment: 'equipment',
  'equipment-detail': 'equipment',
  complaints: 'complaints',
  'complaint-detail': 'complaints',
  'new-complaint': 'complaints',
  'complaint-assignment': 'complaints',
  'work-orders': 'work-orders',
  'work-order-detail': 'work-orders',
  'new-work-order': 'work-orders',
  pm: 'pm',

  // Commercial
  invoices: 'invoices',
  'invoice-detail': 'invoices',
  'invoice-edit': 'invoices',
  'new-invoice': 'invoices',
  quotations: 'quotations',
  'quotation-detail': 'quotations',
  'quotation-edit': 'quotations',
  'new-quotation': 'quotations',
  finance: 'finance',
  customers: 'customers',

  // Resources
  inventory: 'inventory',
  purchases: 'purchases',
  vehicles: 'vehicles',

  // People
  employees: 'employees',
  technicians: 'technicians',
  'hr-dashboard': 'hr',
  'hr-employees': 'hr',
  'hr-departments': 'hr',
  'hr-attendance': 'hr',
  'hr-leave': 'hr',
  'hr-shifts': 'hr',
  'hr-payroll': 'hr',
  'hr-overtime': 'hr',
  'hr-recruitment': 'hr',
  'hr-performance': 'hr',
  'hr-training': 'hr',
  'hr-assets': 'hr',
  'hr-documents': 'hr',
  'hr-visitors': 'hr',
  'hr-medical': 'hr',
  'hr-travel': 'hr',
  'hr-expenses': 'hr',
  'hr-disciplinary': 'hr',
  'hr-announcements': 'hr',
  'hr-reports': 'hr',
  'hr-settings': 'hr',

  // Communication
  notifications: 'notifications',
  whatsapp: 'whatsapp',
  'whatsapp-chats': 'whatsapp',
  'whatsapp-templates': 'whatsapp',
  'whatsapp-campaigns': 'whatsapp',
  'whatsapp-settings': 'whatsapp',
  'email-management': 'email',

  // Intelligence
  reports: 'reports',

  // IRMS
  irms: 'irms',

  // System
  settings: 'settings',
  'user-management': 'user-management',
  'system-health': 'settings',

  // CMS
  'cms-dashboard': 'cms',
  'cms-services': 'cms',
  'cms-industries': 'cms',
  'cms-projects': 'cms',
  'cms-blogs': 'cms',
  'cms-testimonials': 'cms',
  'cms-careers': 'cms',
  'cms-contact': 'cms',
  'cms-media': 'cms',
  'cms-seo': 'cms',
  'cms-hero': 'cms',
  'cms-about': 'cms',
  'cms-header': 'cms',
  'cms-footer': 'cms',
  'cms-announcements': 'cms',
  'cms-popups': 'cms',
  'cms-forms': 'cms',
  'cms-activity': 'cms',

  // Customer
  'customer-portal': 'dashboard',

  // Documents
  documents: 'documents',

  // Feedback
  'rate-feedback': 'complaints',
};

/**
 * Views that are always accessible to any authenticated user.
 * No feature check needed.
 */
export const PUBLIC_VIEWS: Set<string> = new Set([
  'profile',
  'login',
  'help',
  'customer-portal',
]);

/**
 * Get the feature key for a view.
 * Returns null if the view is always accessible.
 */
export function getViewFeature(view: string): string | null {
  if (PUBLIC_VIEWS.has(view)) return null;
  return VIEW_FEATURE_MAP[view] || null;
}