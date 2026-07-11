import type { AppView, UserRole } from '@/core/types';
import type { LucideIcon } from 'lucide-react';
import { canAccess } from '@/app-shell/store';
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
  Trash2,
  TrendingUp,
  Check,
  FileDown,
  FileSpreadsheet,
  Users,
  Package,
  Shield,
  Database,
  Bug,
  StickyNote,
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
  CircleDot,
  Filter,
  BellOff,
  Globe,
  MapPin,
  MailCheck,
  MailPlus,
  FileCode,
  LayoutDashboard,
  Megaphone,
  Search,
  UserCog,
  LogOut,
  UserMinus,
  Clock,
  CalendarDays,
  Briefcase,
  Activity,
  HardHat,
  Gauge,
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
// ============================================================

const QUICK_ACTIONS_MAP: QuickActionsMap = {
  // ─── Dashboard ──────────────────────────────────────────
  dashboard: [
    { label: 'Create Complaint', icon: AlertTriangle, view: 'new-complaint', feature: 'complaints', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'customer'] },
    { label: 'Create Work Order', icon: ClipboardList, view: 'work-orders', feature: 'work-orders', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'technician'] },
    { label: 'Create Quotation', icon: FileText, view: 'quotations', feature: 'quotations', roles: ['super_admin', 'admin', 'manager', 'customer'] },
    { label: 'Create Invoice', icon: Receipt, view: 'invoices', feature: 'invoices', roles: ['super_admin', 'admin', 'manager', 'finance'] },
    { label: 'Add Customer', icon: Users, view: 'customers', feature: 'customers', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'finance'] },
    { label: 'Register Equipment', icon: Wrench, view: 'equipment', feature: 'equipment', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'customer'] },
    { label: 'Add Inventory Item', icon: Package, view: 'inventory', feature: 'inventory', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
  ],

  // ─── Complaints ─────────────────────────────────────────
  complaints: [
    { label: 'New Complaint', icon: PlusCircle, view: 'new-complaint', feature: 'complaints', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'customer'] },
    { label: 'Assign Technician', icon: UserCheck, view: 'complaint-assignment', feature: 'complaints', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'Escalate', icon: ArrowUpRight, view: 'complaints', feature: 'complaints', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'Convert to Work Order', icon: ClipboardList, view: 'work-orders', feature: 'work-orders', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'technician'] },
    { label: 'Send Email', icon: Mail, handler: 'compose-email', feature: 'email', roles: ['super_admin', 'admin'] },
    { label: 'Send WhatsApp', icon: MessageCircle, handler: 'send-whatsapp', feature: 'whatsapp', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'Export', icon: Download, view: 'complaints', feature: 'complaints', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'finance'] },
    { label: 'Reassign Technician', icon: UserCheck, view: 'complaint-assignment', feature: 'complaints', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
  ],

  // ─── Work Orders ────────────────────────────────────────
  'work-orders': [
    { label: 'New Work Order', icon: PlusCircle, view: 'new-work-order', feature: 'work-orders', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'technician'] },
    { label: 'Assign Technician', icon: UserCheck, view: 'technicians', feature: 'technicians', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'Schedule Work', icon: CalendarClock, view: 'work-orders', feature: 'work-orders', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'Generate Service Report', icon: FileBarChart, view: 'reports', feature: 'reports', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'finance'] },
    { label: 'Upload Photos', icon: Upload, view: 'work-orders', feature: 'work-orders', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'technician'] },
    { label: 'Start Work', icon: Play, view: 'work-orders', feature: 'work-orders', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'technician'] },
    { label: 'Close Work Order', icon: CheckCircle2, view: 'work-orders', feature: 'work-orders', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
  ],

  // ─── Preventive Maintenance ─────────────────────────────
  pm: [
    { label: 'Schedule Maintenance', icon: Calendar, view: 'pm', feature: 'pm', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'Generate PM Report', icon: FileBarChart, view: 'reports', feature: 'reports', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'finance'] },
    { label: 'View Calendar', icon: CalendarDays, view: 'pm', feature: 'pm', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'technician'] },
  ],

  // ─── Inventory ──────────────────────────────────────────
  inventory: [
    { label: 'Add Item', icon: Plus, view: 'inventory', feature: 'inventory', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'Stock In', icon: Download, view: 'inventory', feature: 'inventory', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'Stock Out', icon: Upload, view: 'inventory', feature: 'inventory', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'Stock Transfer', icon: ArrowRightLeft, view: 'inventory', feature: 'inventory', roles: ['super_admin', 'admin', 'manager'] },
    { label: 'Purchase Request', icon: ShoppingCart, view: 'purchases', feature: 'purchases', roles: ['super_admin', 'admin', 'manager'] },
    { label: 'Print Barcode', icon: Printer, view: 'inventory', feature: 'inventory', roles: ['super_admin', 'admin', 'manager'] },
    { label: 'Generate QR Code', icon: QrCode, view: 'equipment', feature: 'equipment', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'Import Inventory', icon: Upload, handler: 'import-inventory', feature: 'inventory', roles: ['super_admin', 'admin', 'manager'] },
    { label: 'Export Inventory', icon: Download, handler: 'export-inventory', feature: 'inventory', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'finance'] },
    { label: 'Scan QR Code', icon: ScanLine, view: 'equipment', feature: 'equipment', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'technician'] },
  ],

  // ─── Equipment ──────────────────────────────────────────
  equipment: [
    { label: 'Register Equipment', icon: PlusCircle, view: 'equipment', feature: 'equipment', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'customer'] },
    { label: 'Schedule Maintenance', icon: CalendarClock, view: 'pm', feature: 'pm', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'Attach Documents', icon: Paperclip, view: 'equipment', feature: 'equipment', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'Generate QR Code', icon: QrCode, view: 'equipment', feature: 'equipment', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'View History', icon: History, view: 'equipment', feature: 'equipment', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'technician'] },
  ],

  // ─── Customers ──────────────────────────────────────────
  customers: [
    { label: 'Add Customer', icon: PlusCircle, view: 'customers', feature: 'customers', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'finance'] },
    { label: 'New Complaint', icon: AlertTriangle, view: 'new-complaint', feature: 'complaints', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'customer'] },
    { label: 'New Quotation', icon: FileText, view: 'quotations', feature: 'quotations', roles: ['super_admin', 'admin', 'manager', 'customer'] },
    { label: 'New Invoice', icon: Receipt, view: 'invoices', feature: 'invoices', roles: ['super_admin', 'admin', 'manager', 'finance'] },
    { label: 'Send Email', icon: Mail, handler: 'compose-email', feature: 'email', roles: ['super_admin', 'admin'] },
    { label: 'Send WhatsApp', icon: MessageCircle, handler: 'send-whatsapp', feature: 'whatsapp', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
  ],

  // ─── Quotations ─────────────────────────────────────────
  quotations: [
    { label: 'New Quotation', icon: PlusCircle, view: 'new-quotation', feature: 'quotations', roles: ['super_admin', 'admin', 'manager', 'customer'] },
    { label: 'Duplicate', icon: Copy, view: 'quotations', feature: 'quotations', roles: ['super_admin', 'admin', 'manager'] },
    { label: 'Convert to WO', icon: ClipboardList, view: 'work-orders', feature: 'work-orders', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'technician'] },
    { label: 'Convert to Invoice', icon: Receipt, view: 'invoices', feature: 'invoices', roles: ['super_admin', 'admin', 'manager', 'finance'] },
    { label: 'Generate PDF', icon: FileText, view: 'quotations', feature: 'quotations', roles: ['super_admin', 'admin', 'manager', 'finance'] },
    { label: 'Send Email', icon: Mail, handler: 'compose-email', feature: 'email', roles: ['super_admin', 'admin'] },
    { label: 'Send WhatsApp', icon: MessageCircle, handler: 'send-whatsapp', feature: 'whatsapp', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
  ],

  // ─── Invoices ───────────────────────────────────────────
  invoices: [
    { label: 'New Invoice', icon: PlusCircle, view: 'invoices', feature: 'invoices', roles: ['super_admin', 'admin', 'manager', 'finance'] },
    { label: 'Record Payment', icon: DollarSign, view: 'finance', feature: 'finance', roles: ['super_admin', 'admin', 'manager', 'finance'] },
    { label: 'Print Invoice', icon: Printer, view: 'invoices', feature: 'invoices', roles: ['super_admin', 'admin', 'manager', 'finance'] },
    { label: 'Send Invoice', icon: Send, view: 'invoices', feature: 'invoices', roles: ['super_admin', 'admin', 'manager', 'finance'] },
    { label: 'Generate PDF', icon: FileText, view: 'invoices', feature: 'invoices', roles: ['super_admin', 'admin', 'manager', 'finance'] },
  ],

  // ─── Finance ────────────────────────────────────────────
  finance: [
    { label: 'Record Payment', icon: DollarSign, view: 'finance', feature: 'finance', roles: ['super_admin', 'admin', 'manager', 'finance'] },
    { label: 'Add Expense', icon: Receipt, view: 'finance', feature: 'finance', roles: ['super_admin', 'admin', 'manager', 'finance'] },
    { label: 'Financial Report', icon: BarChart3, view: 'reports', feature: 'reports', roles: ['super_admin', 'admin', 'manager', 'finance'] },
    { label: 'Export Ledger', icon: FileSpreadsheet, view: 'finance', feature: 'finance', roles: ['super_admin', 'admin', 'manager', 'finance'] },
    { label: 'Add Income', icon: TrendingUp, handler: 'add-income', feature: 'finance', roles: ['super_admin', 'admin', 'manager', 'finance'] },
  ],

  // ─── Purchases ──────────────────────────────────────────
  purchases: [
    { label: 'New Purchase Order', icon: PlusCircle, view: 'purchases', feature: 'purchases', roles: ['super_admin', 'admin', 'manager'] },
    { label: 'Receive Goods', icon: Truck, view: 'purchases', feature: 'purchases', roles: ['super_admin', 'admin', 'manager'] },
    { label: 'Supplier Payment', icon: CreditCard, view: 'purchases', feature: 'purchases', roles: ['super_admin', 'admin', 'manager', 'finance'] },
    { label: 'Manage Suppliers', icon: Users, view: 'purchases', feature: 'purchases', roles: ['super_admin', 'admin', 'manager'] },
  ],

  // ─── Vehicles ───────────────────────────────────────────
  vehicles: [
    { label: 'Add Vehicle', icon: PlusCircle, view: 'vehicles', feature: 'vehicles', roles: ['super_admin', 'admin', 'manager'] },
    { label: 'Schedule Service', icon: CalendarClock, view: 'vehicles', feature: 'vehicles', roles: ['super_admin', 'admin', 'manager'] },
    { label: 'View History', icon: History, view: 'vehicles', feature: 'vehicles', roles: ['super_admin', 'admin', 'manager'] },
  ],

  // ─── Reports ────────────────────────────────────────────
  reports: [
    { label: 'Generate Report', icon: BarChart3, view: 'reports', feature: 'reports', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'finance'] },
    { label: 'Export PDF', icon: FileDown, view: 'reports', feature: 'reports', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'finance'] },
    { label: 'Export Excel', icon: FileSpreadsheet, view: 'reports', feature: 'reports', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'finance'] },
    { label: 'Print Report', icon: Printer, view: 'reports', feature: 'reports', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'finance'] },
    { label: 'Schedule Report', icon: Clock, view: 'reports', feature: 'reports', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'finance'] },
  ],

  // ─── Notifications ──────────────────────────────────────
  notifications: [
    { label: 'Mark All Read', icon: CheckCircle2, view: 'notifications', feature: 'notifications', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance', 'customer'] },
    { label: 'View All', icon: Eye, view: 'notifications', feature: 'notifications', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance', 'customer'] },
    { label: 'Filter', icon: Filter, view: 'notifications', feature: 'notifications', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance', 'customer'] },
  ],

  // ─── Settings ───────────────────────────────────────────
  settings: [
    { label: 'Add User', icon: UserPlus, view: 'user-management', feature: 'user-management', roles: ['super_admin', 'admin'] },
    { label: 'System Backup', icon: Database, view: 'settings', feature: 'settings', roles: ['super_admin', 'admin'] },
    { label: 'SMTP Settings', icon: Mail, view: 'email-management', feature: 'email', roles: ['super_admin', 'admin'] },
    { label: 'WhatsApp Settings', icon: MessageCircle, view: 'whatsapp-settings', feature: 'whatsapp', roles: ['super_admin', 'admin', 'manager'] },
    { label: 'Google Maps Settings', icon: MapPin, view: 'settings', feature: 'settings', roles: ['super_admin', 'admin'] },
  ],

  // ─── Email Management ───────────────────────────────────
  'email-management': [
    { label: 'Compose Email', icon: MailPlus, handler: 'compose-email', feature: 'email', roles: ['super_admin', 'admin'] },
    { label: 'Send Test Email', icon: MailCheck, handler: 'test-email', feature: 'email', roles: ['super_admin', 'admin'] },
    { label: 'View Logs', icon: FileSearch, view: 'email-management', feature: 'email', roles: ['super_admin', 'admin'] },
    { label: 'Create Template', icon: FileCode, view: 'email-management', feature: 'email', roles: ['super_admin', 'admin'] },
    { label: 'Schedule Email', icon: Clock, handler: 'schedule-email', feature: 'email', roles: ['super_admin', 'admin'] },
  ],

  // ─── WhatsApp ───────────────────────────────────────────
  whatsapp: [
    { label: 'New Message', icon: MessageCircle, view: 'whatsapp-chats', feature: 'whatsapp', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'Send Template', icon: Send, view: 'whatsapp-templates', feature: 'whatsapp', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'Send Bulk', icon: Megaphone, view: 'whatsapp-campaigns', feature: 'whatsapp', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'View Chat History', icon: History, view: 'whatsapp-chats', feature: 'whatsapp', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
  ],

  // ─── CMS Dashboard ──────────────────────────────────────
  'cms-dashboard': [
    { label: 'New Page', icon: PlusCircle, view: 'cms-dashboard', feature: 'cms', roles: ['super_admin', 'admin'] },
    { label: 'Manage Services', icon: Wrench, view: 'cms-services', feature: 'cms', roles: ['super_admin', 'admin'] },
    { label: 'SEO Settings', icon: Globe, view: 'cms-seo', feature: 'cms', roles: ['super_admin', 'admin'] },
    { label: 'View Site', icon: Eye, view: 'cms-dashboard', feature: 'cms', roles: ['super_admin', 'admin'] },
  ],

  // ─── Users ────────────────────────────────────────────
  users: [
    { label: 'Add User', icon: UserPlus, view: 'user-management', feature: 'user-management', roles: ['super_admin', 'admin'] },
    { label: 'View Roles', icon: Shield, view: 'settings', feature: 'user-management', roles: ['super_admin', 'admin'] },
    { label: 'Export Users', icon: Download, view: 'user-management', feature: 'user-management', roles: ['super_admin', 'admin'] },
  ],

  // ─── User Management ────────────────────────────────────
  'user-management': [
    { label: 'Add User', icon: UserPlus, view: 'user-management', feature: 'user-management', roles: ['super_admin', 'admin'] },
    { label: 'View Roles', icon: Shield, view: 'settings', feature: 'user-management', roles: ['super_admin', 'admin'] },
    { label: 'Export Users', icon: Download, view: 'user-management', feature: 'user-management', roles: ['super_admin', 'admin'] },
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
    { label: 'Add Employee', icon: UserPlus, view: 'hr-employees', feature: 'hr', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'Leave Request', icon: CalendarDays, view: 'hr-leave', feature: 'hr', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'Payroll Report', icon: DollarSign, view: 'hr-payroll', feature: 'hr', roles: ['super_admin', 'admin', 'manager'] },
    { label: 'Shift Schedule', icon: Clock, view: 'hr-shifts', feature: 'hr', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
  ],

  // ─── Technicians ────────────────────────────────────────
  technicians: [
    { label: 'Add Technician', icon: UserPlus, view: 'technicians', feature: 'technicians', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'Assign Complaint', icon: ClipboardCheck, view: 'complaint-assignment', feature: 'complaints', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'Assign WO', icon: ClipboardList, view: 'work-orders', feature: 'work-orders', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'View Workload', icon: BarChart3, view: 'technicians', feature: 'technicians', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    { label: 'Technician Status', icon: Activity, view: 'technicians', feature: 'technicians', roles: ['super_admin', 'admin', 'manager', 'supervisor'] },
  ],

  // ─── System Health ──────────────────────────────────────
  'system-health': [
    { label: 'Run Diagnostics', icon: Bug, view: 'system-health', feature: 'settings', roles: ['super_admin', 'admin'] },
    { label: 'View Logs', icon: FileSearch, view: 'system-health', feature: 'settings', roles: ['super_admin', 'admin'] },
    { label: 'Refresh Cache', icon: RefreshCw, view: 'system-health', feature: 'settings', roles: ['super_admin', 'admin'] },
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
 * - If `roles` is set, the user's role must be in that array
 * - Otherwise, if `feature` is set, `canAccess(role, feature)` is checked
 * - If neither is set, the action is always shown
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

  // Filter by role
  return actions.filter((action) => {
    if (action.roles) {
      return action.roles.includes(userRole);
    }
    if (action.feature) {
      return canAccess(userRole, action.feature);
    }
    return true;
  });
}