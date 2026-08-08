import type { AppView, UserRole } from '@/core/types';
import type { LucideIcon } from 'lucide-react';
import { canAccess } from '@/app-shell/store';
import { ACTION_PERMISSIONS } from '@/core/permissions/rbac/permissions-matrix';
import {
  Plus,
  PlusCircle,
  UserCheck,
  UserPlus,
  Mail,
  MessageCircle,
  Download,
  FileText,
  QrCode,
  Play,
  Printer,
  Upload,
  Calendar,
  CalendarClock,
  Settings,
  Wrench,
  BarChart3,
  FileBarChart,
  DollarSign,
  Receipt,
  Eye,
  RefreshCw,
  CheckCircle2,
  TrendingUp,
  FileDown,
  FileSpreadsheet,
  Users,
  Package,
  Shield,
  Database,
  Bug,
  AlertTriangle,
  ClipboardList,
  ArrowUpRight,
  Copy,
  Send,
  ClipboardCheck,
  ScanLine,
  Paperclip,
  History,
  ArrowRightLeft,
  ShoppingCart,
  Truck,
  CreditCard,
  Filter,
  Globe,
  MapPin,
  MailCheck,
  MailPlus,
  FileCode,
  LayoutDashboard,
  Megaphone,
  LogOut,
  Clock,
  CalendarDays,
  Activity,
  FileSearch,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export interface QuickActionItem {
  label: string;
  icon: LucideIcon;
  view?: AppView;
  handler?: string; // For special actions (e.g., 'compose-email', 'send-whatsapp', 'test-email')
  feature?: string;
  /** RBAC entity key (e.g. 'complaint', 'work-order') — maps to ACTION_PERMISSIONS */
  entity?: string;
  /** RBAC action key (e.g. 'create', 'assign_technician') — maps to ACTION_PERMISSIONS[entity] */
  actionName?: string;
  /** @deprecated Inline role arrays are being replaced by entity/actionName matrix lookups.
   *  Only kept for actions that have no ACTION_PERMISSIONS mapping. */
  roles?: UserRole[];
}

export type QuickActionsMap = Record<string, QuickActionItem[]>;

// ============================================================
// PREFIX MAPPING
// Maps detail views back to their parent module
// ============================================================

const VIEW_PREFIX_MAP: Record<string, string> = {
  'new-complaint': 'complaints',
  'complaint-detail': 'complaints',
  'complaint-assignment': 'complaints',
  'new-work-order': 'work-orders',
  'work-order-detail': 'work-orders',
  'equipment-register': 'equipment',
  'equipment-detail': 'equipment',
  'invoice-detail': 'invoices',
  'new-quotation': 'quotations',
  'quotation-detail': 'quotations',
  'quotation-edit': 'quotations',
  'session-settings': 'session-management',
  // CMS sub-views
  'cms-services': 'cms-dashboard',
  'cms-industries': 'cms-dashboard',
  'cms-projects': 'cms-dashboard',
  'cms-blogs': 'cms-dashboard',
  'cms-testimonials': 'cms-dashboard',
  'cms-careers': 'cms-dashboard',
  'cms-contact': 'cms-dashboard',
  'cms-media': 'cms-dashboard',
  'cms-seo': 'cms-dashboard',
  'cms-hero': 'cms-dashboard',
  'cms-about': 'cms-dashboard',
  'cms-header': 'cms-dashboard',
  'cms-footer': 'cms-dashboard',
  'cms-announcements': 'cms-dashboard',
  'cms-popups': 'cms-dashboard',
  'cms-forms': 'cms-dashboard',
  'cms-activity': 'cms-dashboard',
  // WhatsApp sub-views
  'whatsapp-chats': 'whatsapp',
  'whatsapp-templates': 'whatsapp',
  'whatsapp-campaigns': 'whatsapp',
  'whatsapp-settings': 'whatsapp',
  // HR sub-views
  'hr-employees': 'hr-dashboard',
  'hr-departments': 'hr-dashboard',
  'hr-attendance': 'hr-dashboard',
  'hr-leave': 'hr-dashboard',
  'hr-shifts': 'hr-dashboard',
  'hr-payroll': 'hr-dashboard',
  'hr-overtime': 'hr-dashboard',
  'hr-recruitment': 'hr-dashboard',
  'hr-performance': 'hr-dashboard',
  'hr-training': 'hr-dashboard',
  'hr-assets': 'hr-dashboard',
  'hr-documents': 'hr-dashboard',
  'hr-visitors': 'hr-dashboard',
  'hr-medical': 'hr-dashboard',
  'hr-travel': 'hr-dashboard',
  'hr-expenses': 'hr-dashboard',
  'hr-disciplinary': 'hr-dashboard',
  'hr-announcements': 'hr-dashboard',
  'hr-reports': 'hr-dashboard',
  'hr-settings': 'hr-dashboard',
};

// ============================================================
// MODULE ACTION DEFINITIONS
// Roles are derived from ACTION_PERMISSIONS matrix via entity/actionName.
// Only actions without a matrix mapping retain inline roles.
// ============================================================

const QUICK_ACTIONS_MAP: QuickActionsMap = {
  // ─── Dashboard ──────────────────────────────────────────
  dashboard: [
    { label: 'Create Complaint', icon: AlertTriangle, view: 'new-complaint', feature: 'complaints', entity: 'complaint', actionName: 'create' },
    { label: 'Create Work Order', icon: ClipboardList, view: 'work-orders', feature: 'work-orders', entity: 'work-order', actionName: 'create' },
    { label: 'Create Quotation', icon: FileText, view: 'quotations', feature: 'quotations', entity: 'quotation', actionName: 'create' },
    { label: 'Create Invoice', icon: Receipt, view: 'invoices', feature: 'invoices', entity: 'invoice', actionName: 'create' },
    { label: 'Add Customer', icon: Users, view: 'customers', feature: 'customers', entity: 'customer', actionName: 'create' },
    { label: 'Register Equipment', icon: Wrench, view: 'equipment', feature: 'equipment', entity: 'equipment', actionName: 'create' },
    { label: 'Add Inventory Item', icon: Package, view: 'inventory', feature: 'inventory', entity: 'inventory', actionName: 'create' },
  ],

  // ─── Complaints ─────────────────────────────────────────
  complaints: [
    { label: 'New Complaint', icon: PlusCircle, view: 'new-complaint', feature: 'complaints', entity: 'complaint', actionName: 'create' },
    { label: 'Assign Technician', icon: UserCheck, view: 'complaint-assignment', feature: 'complaints', entity: 'complaint', actionName: 'assign_technician' },
    { label: 'Escalate', icon: ArrowUpRight, view: 'complaints', feature: 'complaints', entity: 'complaint', actionName: 'escalate' },
    { label: 'Convert to Work Order', icon: ClipboardList, view: 'work-orders', feature: 'work-orders', entity: 'work-order', actionName: 'convert_to_wo' },
    { label: 'Send Email', icon: Mail, handler: 'compose-email', feature: 'email', entity: 'email_module', actionName: 'send' },
    { label: 'Send WhatsApp', icon: MessageCircle, handler: 'send-whatsapp', feature: 'whatsapp', entity: 'whatsapp_module', actionName: 'send' },
    { label: 'Export', icon: Download, view: 'complaints', feature: 'complaints', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'finance'] },
    { label: 'Reassign Technician', icon: UserCheck, view: 'complaint-assignment', feature: 'complaints', entity: 'complaint', actionName: 'reassign_technician' },
  ],

  // ─── Work Orders ────────────────────────────────────────
  'work-orders': [
    { label: 'New Work Order', icon: PlusCircle, view: 'new-work-order', feature: 'work-orders', entity: 'work-order', actionName: 'create' },
    { label: 'Assign Technician', icon: UserCheck, view: 'technicians', feature: 'technicians', entity: 'work-order', actionName: 'assign' },
    { label: 'Schedule Work', icon: CalendarClock, view: 'work-orders', feature: 'work-orders', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'Generate Service Report', icon: FileBarChart, view: 'reports', feature: 'reports', entity: 'report', actionName: 'view' },
    { label: 'Upload Photos', icon: Upload, view: 'work-orders', feature: 'work-orders', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'technician'] },
    { label: 'Start Work', icon: Play, view: 'work-orders', feature: 'work-orders', entity: 'work-order', actionName: 'start' },
    { label: 'Close Work Order', icon: CheckCircle2, view: 'work-orders', feature: 'work-orders', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
  ],

  // ─── Preventive Maintenance ─────────────────────────────
  pm: [
    { label: 'Schedule Maintenance', icon: Calendar, view: 'pm', feature: 'pm', entity: 'pm_module', actionName: 'create' },
    { label: 'Generate PM Report', icon: FileBarChart, view: 'reports', feature: 'reports', entity: 'report', actionName: 'view' },
    { label: 'View Calendar', icon: CalendarDays, view: 'pm', feature: 'pm', entity: 'pm_module', actionName: 'view' },
  ],

  // ─── Inventory ──────────────────────────────────────────
  inventory: [
    { label: 'Add Item', icon: Plus, view: 'inventory', feature: 'inventory', entity: 'inventory', actionName: 'create' },
    { label: 'Stock In', icon: Download, view: 'inventory', feature: 'inventory', entity: 'inventory', actionName: 'adjust' },
    { label: 'Stock Out', icon: Upload, view: 'inventory', feature: 'inventory', entity: 'inventory', actionName: 'adjust' },
    { label: 'Stock Transfer', icon: ArrowRightLeft, view: 'inventory', feature: 'inventory', entity: 'inventory', actionName: 'adjust' },
    { label: 'Purchase Request', icon: ShoppingCart, view: 'purchases', feature: 'purchases', entity: 'purchase', actionName: 'create' },
    { label: 'Print Barcode', icon: Printer, view: 'inventory', feature: 'inventory', roles: ['super_admin', 'admin', 'manager'] },
    { label: 'Generate QR Code', icon: QrCode, view: 'equipment', feature: 'equipment', entity: 'equipment', actionName: 'bulk_qr' },
    { label: 'Import Inventory', icon: Upload, handler: 'import-inventory', feature: 'inventory', roles: ['super_admin', 'admin', 'manager'] },
    { label: 'Export Inventory', icon: Download, handler: 'export-inventory', feature: 'inventory', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'finance'] },
    { label: 'Scan QR Code', icon: ScanLine, view: 'equipment', feature: 'equipment', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'technician'] },
  ],

  // ─── Equipment ──────────────────────────────────────────
  equipment: [
    { label: 'Register Equipment', icon: PlusCircle, view: 'equipment', feature: 'equipment', entity: 'equipment', actionName: 'create' },
    { label: 'Schedule Maintenance', icon: CalendarClock, view: 'pm', feature: 'pm', entity: 'pm_module', actionName: 'create' },
    { label: 'Attach Documents', icon: Paperclip, view: 'equipment', feature: 'equipment', entity: 'document', actionName: 'upload' },
    { label: 'Generate QR Code', icon: QrCode, view: 'equipment', feature: 'equipment', entity: 'equipment', actionName: 'bulk_qr' },
    { label: 'View History', icon: History, view: 'equipment', feature: 'equipment', entity: 'equipment', actionName: 'view' },
  ],

  // ─── Customers ──────────────────────────────────────────
  customers: [
    { label: 'Add Customer', icon: PlusCircle, view: 'customers', feature: 'customers', entity: 'customer', actionName: 'create' },
    { label: 'New Complaint', icon: AlertTriangle, view: 'new-complaint', feature: 'complaints', entity: 'complaint', actionName: 'create' },
    { label: 'New Quotation', icon: FileText, view: 'quotations', feature: 'quotations', entity: 'quotation', actionName: 'create' },
    { label: 'New Invoice', icon: Receipt, view: 'invoices', feature: 'invoices', entity: 'invoice', actionName: 'create' },
    { label: 'Send Email', icon: Mail, handler: 'compose-email', feature: 'email', entity: 'email_module', actionName: 'send' },
    { label: 'Send WhatsApp', icon: MessageCircle, handler: 'send-whatsapp', feature: 'whatsapp', entity: 'whatsapp_module', actionName: 'send' },
  ],

  // ─── Quotations ─────────────────────────────────────────
  quotations: [
    { label: 'New Quotation', icon: PlusCircle, view: 'new-quotation', feature: 'quotations', entity: 'quotation', actionName: 'create' },
    { label: 'Duplicate', icon: Copy, view: 'quotations', feature: 'quotations', entity: 'quotation', actionName: 'create' },
    { label: 'Convert to WO', icon: ClipboardList, view: 'work-orders', feature: 'work-orders', entity: 'work-order', actionName: 'convert_to_wo' },
    { label: 'Convert to Invoice', icon: Receipt, view: 'invoices', feature: 'invoices', entity: 'quotation', actionName: 'convert_to_invoice' },
    { label: 'Generate PDF', icon: FileText, view: 'quotations', feature: 'quotations', entity: 'quotation', actionName: 'generate_pdf' },
    { label: 'Send Email', icon: Mail, handler: 'compose-email', feature: 'email', entity: 'email_module', actionName: 'send' },
    { label: 'Send WhatsApp', icon: MessageCircle, handler: 'send-whatsapp', feature: 'whatsapp', entity: 'whatsapp_module', actionName: 'send' },
  ],

  // ─── Invoices ───────────────────────────────────────────
  invoices: [
    { label: 'New Invoice', icon: PlusCircle, view: 'invoices', feature: 'invoices', entity: 'invoice', actionName: 'create' },
    { label: 'Record Payment', icon: DollarSign, view: 'finance', feature: 'finance', entity: 'invoice', actionName: 'record_payment' },
    { label: 'Print Invoice', icon: Printer, view: 'invoices', feature: 'invoices', entity: 'invoice', actionName: 'print' },
    { label: 'Send Invoice', icon: Send, view: 'invoices', feature: 'invoices', entity: 'invoice', actionName: 'send' },
    { label: 'Generate PDF', icon: FileText, view: 'invoices', feature: 'invoices', entity: 'invoice', actionName: 'generate_pdf' },
  ],

  // ─── Finance ────────────────────────────────────────────
  finance: [
    { label: 'Record Payment', icon: DollarSign, view: 'finance', feature: 'finance', entity: 'finance_module', actionName: 'record_payment' },
    { label: 'Add Expense', icon: Receipt, view: 'finance', feature: 'finance', entity: 'finance_module', actionName: 'create' },
    { label: 'Financial Report', icon: BarChart3, view: 'reports', feature: 'reports', entity: 'report', actionName: 'view' },
    { label: 'Export Ledger', icon: FileSpreadsheet, view: 'finance', feature: 'finance', entity: 'finance_module', actionName: 'export' },
    { label: 'Add Income', icon: TrendingUp, handler: 'add-income', feature: 'finance', entity: 'finance_module', actionName: 'create' },
  ],

  // ─── Purchases ──────────────────────────────────────────
  purchases: [
    { label: 'New Purchase Order', icon: PlusCircle, view: 'purchases', feature: 'purchases', entity: 'purchase', actionName: 'create' },
    { label: 'Receive Goods', icon: Truck, view: 'purchases', feature: 'purchases', roles: ['super_admin', 'admin', 'manager'] },
    { label: 'Supplier Payment', icon: CreditCard, view: 'purchases', feature: 'purchases', roles: ['super_admin', 'admin', 'manager', 'finance'] },
    { label: 'Manage Suppliers', icon: Users, view: 'purchases', feature: 'purchases', roles: ['super_admin', 'admin', 'manager'] },
  ],

  // ─── Vehicles ───────────────────────────────────────────
  vehicles: [
    { label: 'Add Vehicle', icon: PlusCircle, view: 'vehicles', feature: 'vehicles', entity: 'vehicle', actionName: 'create' },
    { label: 'Schedule Service', icon: CalendarClock, view: 'vehicles', feature: 'vehicles', roles: ['super_admin', 'admin', 'manager'] },
    { label: 'View History', icon: History, view: 'vehicles', feature: 'vehicles', entity: 'vehicle', actionName: 'view' },
  ],

  // ─── Reports ────────────────────────────────────────────
  reports: [
    { label: 'Generate Report', icon: BarChart3, view: 'reports', feature: 'reports', entity: 'report', actionName: 'view' },
    { label: 'Export PDF', icon: FileDown, view: 'reports', feature: 'reports', entity: 'report', actionName: 'export' },
    { label: 'Export Excel', icon: FileSpreadsheet, view: 'reports', feature: 'reports', entity: 'report', actionName: 'export' },
    { label: 'Print Report', icon: Printer, view: 'reports', feature: 'reports', entity: 'report', actionName: 'print' },
    { label: 'Schedule Report', icon: Clock, view: 'reports', feature: 'reports', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'finance'] },
  ],

  // ─── Notifications ──────────────────────────────────────
  notifications: [
    { label: 'Mark All Read', icon: CheckCircle2, view: 'notifications', feature: 'notifications', entity: 'notification', actionName: 'mark_read' },
    { label: 'View All', icon: Eye, view: 'notifications', feature: 'notifications', entity: 'notification', actionName: 'view' },
    { label: 'Filter', icon: Filter, view: 'notifications', feature: 'notifications', entity: 'notification', actionName: 'view' },
  ],

  // ─── Settings ───────────────────────────────────────────
  settings: [
    { label: 'Add User', icon: UserPlus, view: 'user-management', feature: 'user-management', entity: 'user-management', actionName: 'create' },
    { label: 'System Backup', icon: Database, view: 'settings', feature: 'settings', roles: ['super_admin', 'admin'] },
    { label: 'SMTP Settings', icon: Mail, view: 'email-management', feature: 'email', entity: 'system', actionName: 'manage_email' },
    { label: 'WhatsApp Settings', icon: MessageCircle, view: 'whatsapp-settings', feature: 'whatsapp', entity: 'system', actionName: 'manage_whatsapp' },
    { label: 'Google Maps Settings', icon: MapPin, view: 'settings', feature: 'settings', roles: ['super_admin', 'admin'] },
  ],

  // ─── Email Management ───────────────────────────────────
  'email-management': [
    { label: 'Compose Email', icon: MailPlus, handler: 'compose-email', feature: 'email', entity: 'email_module', actionName: 'send' },
    { label: 'Send Test Email', icon: MailCheck, handler: 'test-email', feature: 'email', entity: 'email_module', actionName: 'send' },
    { label: 'View Logs', icon: FileSearch, view: 'email-management', feature: 'email', entity: 'email_module', actionName: 'view_logs' },
    { label: 'Create Template', icon: FileCode, view: 'email-management', feature: 'email', entity: 'email_module', actionName: 'manage_templates' },
    { label: 'Schedule Email', icon: Clock, handler: 'schedule-email', feature: 'email', entity: 'email_module', actionName: 'send' },
  ],

  // ─── WhatsApp ───────────────────────────────────────────
  whatsapp: [
    { label: 'New Message', icon: MessageCircle, view: 'whatsapp-chats', feature: 'whatsapp', entity: 'whatsapp_module', actionName: 'send' },
    { label: 'Send Template', icon: Send, view: 'whatsapp-templates', feature: 'whatsapp', entity: 'whatsapp_module', actionName: 'manage_templates' },
    { label: 'Send Bulk', icon: Megaphone, view: 'whatsapp-campaigns', feature: 'whatsapp', entity: 'whatsapp_module', actionName: 'manage_campaigns' },
    { label: 'View Chat History', icon: History, view: 'whatsapp-chats', feature: 'whatsapp', entity: 'whatsapp_module', actionName: 'view' },
  ],

  // ─── CMS Dashboard ──────────────────────────────────────
  'cms-dashboard': [
    { label: 'New Page', icon: PlusCircle, view: 'cms-dashboard', feature: 'cms', entity: 'cms_module', actionName: 'create' },
    { label: 'Manage Services', icon: Wrench, view: 'cms-services', feature: 'cms', entity: 'cms_module', actionName: 'manage_pages' },
    { label: 'SEO Settings', icon: Globe, view: 'cms-seo', feature: 'cms', entity: 'cms_module', actionName: 'manage_seo' },
    { label: 'View Site', icon: Eye, view: 'cms-dashboard', feature: 'cms', entity: 'cms_module', actionName: 'view' },
  ],

  // ─── Users ────────────────────────────────────────────
  users: [
    { label: 'Add User', icon: UserPlus, view: 'user-management', feature: 'user-management', entity: 'user-management', actionName: 'create' },
    { label: 'View Roles', icon: Shield, view: 'settings', feature: 'user-management', entity: 'user-management', actionName: 'manage_roles' },
    { label: 'Export Users', icon: Download, view: 'user-management', feature: 'user-management', entity: 'user-management', actionName: 'view' },
  ],

  // ─── User Management ────────────────────────────────────
  'user-management': [
    { label: 'Add User', icon: UserPlus, view: 'user-management', feature: 'user-management', entity: 'user-management', actionName: 'create' },
    { label: 'View Roles', icon: Shield, view: 'settings', feature: 'user-management', entity: 'user-management', actionName: 'manage_roles' },
    { label: 'Export Users', icon: Download, view: 'user-management', feature: 'user-management', entity: 'user-management', actionName: 'view' },
  ],

  // ─── Session Management ─────────────────────────────────
  'session-management': [
    { label: 'Logout All Devices', icon: LogOut, view: 'settings', feature: 'session-management', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance', 'customer'] },
    { label: 'Session Settings', icon: Settings, view: 'settings', feature: 'session-management', roles: ['super_admin', 'admin'] },
  ],

  // ─── Session Settings ───────────────────────────────────
  'session-settings': [
    { label: 'Logout All Devices', icon: LogOut, view: 'settings', feature: 'session-management', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance', 'customer'] },
    { label: 'View Settings', icon: Settings, view: 'settings', feature: 'session-management', roles: ['super_admin', 'admin'] },
  ],

  // ─── HR Dashboard ───────────────────────────────────────
  'hr-dashboard': [
    { label: 'Add Employee', icon: UserPlus, view: 'hr-employees', feature: 'hr', entity: 'employee', actionName: 'create' },
    { label: 'Leave Request', icon: CalendarDays, view: 'hr-leave', feature: 'hr', entity: 'hr_module', actionName: 'manage_leave' },
    { label: 'Payroll Report', icon: DollarSign, view: 'hr-payroll', feature: 'hr', entity: 'hr_module', actionName: 'manage_payroll' },
    { label: 'Shift Schedule', icon: Clock, view: 'hr-shifts', feature: 'hr', entity: 'hr_module', actionName: 'manage_shifts' },
  ],

  // ─── Technicians ────────────────────────────────────────
  technicians: [
    { label: 'Add Technician', icon: UserPlus, view: 'technicians', feature: 'technicians', entity: 'employee', actionName: 'create' },
    { label: 'Assign Complaint', icon: ClipboardCheck, view: 'complaint-assignment', feature: 'complaints', entity: 'complaint', actionName: 'assign_technician' },
    { label: 'Assign WO', icon: ClipboardList, view: 'work-orders', feature: 'work-orders', entity: 'work-order', actionName: 'assign' },
    { label: 'View Workload', icon: BarChart3, view: 'technicians', feature: 'technicians', entity: 'employee', actionName: 'view' },
    { label: 'Technician Status', icon: Activity, view: 'technicians', feature: 'technicians', entity: 'employee', actionName: 'view' },
  ],

  // ─── System Health ──────────────────────────────────────
  'system-health': [
    { label: 'Run Diagnostics', icon: Bug, view: 'system-health', feature: 'settings', entity: 'system', actionName: 'debug' },
    { label: 'View Logs', icon: FileSearch, view: 'system-health', feature: 'settings', entity: 'system', actionName: 'view_errors' },
    { label: 'Refresh Cache', icon: RefreshCw, view: 'system-health', feature: 'settings', entity: 'system', actionName: 'update_settings' },
  ],
};

// ============================================================
// DEFAULT ACTIONS (fallback for unrecognized views)
// ============================================================

const DEFAULT_ACTIONS: QuickActionItem[] = [
  { label: 'Go to Dashboard', icon: LayoutDashboard, view: 'dashboard' },
];

// ============================================================
// RESOLVER FUNCTION
// ============================================================

/**
 * Resolves the given AppView to a list of quick actions filtered by the user's role.
 *
 * Resolution order:
 * 1. Exact match in QUICK_ACTIONS_MAP
 * 2. Prefix match via VIEW_PREFIX_MAP
 * 3. Fallback to DEFAULT_ACTIONS
 *
 * Each action is filtered by:
 * - If `entity` + `actionName` is set → derive roles from ACTION_PERMISSIONS matrix
 * - Otherwise, if `roles` is set → check the inline role array
 * - Otherwise, if `feature` is set → `canAccess(role, feature)` is checked
 * - If none of the above → action is always shown
 */
export function getQuickActionsForView(
  view: AppView | undefined,
  userRole: UserRole
): QuickActionItem[] {
  if (!view) return DEFAULT_ACTIONS;

  // 1. Try exact match
  let actions = QUICK_ACTIONS_MAP[view];

  // 2. Try prefix mapping
  if (!actions) {
    const mappedView = VIEW_PREFIX_MAP[view];
    if (mappedView) {
      actions = QUICK_ACTIONS_MAP[mappedView];
    }
  }

  // 3. Fallback
  if (!actions) {
    return DEFAULT_ACTIONS;
  }

  // Filter by role — prefer ACTION_PERMISSIONS matrix, then inline roles, then feature check
  return actions.filter((item) => {
    // 1. Matrix-derived roles (entity+actionName in ACTION_PERMISSIONS)
    if (item.entity && item.actionName) {
      const matrixRoles = ACTION_PERMISSIONS[item.entity]?.[item.actionName];
      if (matrixRoles) return matrixRoles.includes(userRole);
      // Entity+action specified but not in matrix — fall through to other checks
    }

    // 2. Inline roles fallback (for actions without matrix mapping)
    if (item.roles) {
      return item.roles.includes(userRole);
    }

    // 3. Feature-level check
    if (item.feature) {
      return canAccess(userRole, item.feature);
    }

    // 4. No access control defined — always show
    return true;
  });
}
