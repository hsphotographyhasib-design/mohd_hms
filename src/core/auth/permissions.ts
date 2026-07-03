import type { UserRole } from '@/types';

/**
 * Feature-level permission map.
 * Each key is a feature/section name; the value is the list of roles allowed to access it.
 */
export const PERMISSIONS: Record<string, UserRole[]> = {
  dashboard: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance', 'customer'],
  equipment: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'customer'],
  complaints: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'customer'],
  'work-orders': ['super_admin', 'admin', 'manager', 'supervisor', 'technician'],
  invoices: ['super_admin', 'admin', 'manager', 'finance', 'customer'],
  pm: ['super_admin', 'admin', 'manager', 'supervisor', 'technician'],
  quotations: ['super_admin', 'admin', 'manager', 'customer'],
  inventory: ['super_admin', 'admin', 'manager', 'supervisor'],
  customers: ['super_admin', 'admin', 'manager', 'supervisor', 'finance'],
  employees: ['super_admin', 'admin', 'manager'],
  purchases: ['super_admin', 'admin', 'manager'],
  vehicles: ['super_admin', 'admin', 'manager'],
  finance: ['super_admin', 'admin', 'manager', 'finance'],
  reports: ['super_admin', 'admin', 'manager', 'supervisor', 'finance'],
  notifications: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance', 'customer'],
  settings: ['super_admin', 'admin'],
  cms: ['super_admin', 'admin'],
  whatsapp: ['super_admin', 'admin', 'manager', 'supervisor'],
};