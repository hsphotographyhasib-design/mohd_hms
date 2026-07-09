'use client';

import React, { useCallback, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import {
  Sun,
  Moon,
  CloudSun,
  ChevronRight,
  PlusCircle,
  Search,
  FileText,
  Headphones,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  MessageSquare,
  Wrench,
  ClipboardList,
  DollarSign,
  Users,
  MonitorSmartphone,
  TrendingUp,
  Clock,
  BarChart3,
  Package,
  ShoppingCart,
  Shield,
} from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { useAuthStore, useAppStore } from '@/app-shell/store';
import { canAccess } from '@/app-shell/store';
import { cn } from '@/core/utils/utils';
import type { ComplaintItem, ComplaintStatus, UserRole, AppView } from '@/core/types';
import { useDashboardKpi, useDashboardRecent } from '@/modules/dashboard/hooks/use-dashboard-queries';

// ─── Animation Variants ─────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05, type: 'spring' as const, stiffness: 300, damping: 30 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 400, damping: 28 },
  },
};

// ─── Helpers ────────────────────────────────────────────────────

function getStatusColor(status: ComplaintStatus): string {
  const map: Record<string, string> = {
    NEW: 'bg-orange-500',
    ASSIGNED: 'bg-sky-500',
    ACCEPTED: 'bg-blue-500',
    WORK_ORDER_CREATED: 'bg-indigo-500',
    IN_PROGRESS: 'bg-blue-600',
    WAITING_CLIENT_CONFIRMATION: 'bg-amber-500',
    CLIENT_CONFIRMED: 'bg-teal-500',
    DRAFT_INVOICE: 'bg-purple-500',
    INVOICE_APPROVED: 'bg-violet-500',
    INVOICE_SENT: 'bg-fuchsia-500',
    PAID: 'bg-green-500',
    CLOSED: 'bg-gray-400',
    REWORK_REQUIRED: 'bg-red-500',
  };
  return map[status] || 'bg-gray-400';
}

function getStatusBadgeStyle(status: ComplaintStatus): string {
  const map: Record<string, string> = {
    NEW: 'bg-orange-50 text-orange-700',
    ASSIGNED: 'bg-sky-50 text-sky-700',
    ACCEPTED: 'bg-blue-50 text-blue-700',
    WORK_ORDER_CREATED: 'bg-indigo-50 text-indigo-700',
    IN_PROGRESS: 'bg-blue-50 text-blue-700',
    WAITING_CLIENT_CONFIRMATION: 'bg-amber-50 text-amber-700',
    CLIENT_CONFIRMED: 'bg-teal-50 text-teal-700',
    DRAFT_INVOICE: 'bg-purple-50 text-purple-700',
    INVOICE_APPROVED: 'bg-violet-50 text-violet-700',
    INVOICE_SENT: 'bg-sky-50 text-sky-700',
    PAID: 'bg-green-50 text-green-700',
    CLOSED: 'bg-gray-100 text-gray-600',
    REWORK_REQUIRED: 'bg-red-50 text-red-700',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
}

function getStatusLabel(status: ComplaintStatus): string {
  const map: Record<string, string> = {
    NEW: 'New',
    ASSIGNED: 'Assigned',
    ACCEPTED: 'Accepted',
    WORK_ORDER_CREATED: 'WO Created',
    IN_PROGRESS: 'In Progress',
    WAITING_CLIENT_CONFIRMATION: 'Awaiting',
    CLIENT_CONFIRMED: 'Confirmed',
    DRAFT_INVOICE: 'Draft Invoice',
    INVOICE_APPROVED: 'Inv. Approved',
    INVOICE_SENT: 'Inv. Sent',
    PAID: 'Paid',
    CLOSED: 'Closed',
    REWORK_REQUIRED: 'Rework',
  };
  return map[status] || status;
}

function getPriorityBadgeColor(priority: string): string {
  switch (priority) {
    case 'critical': return 'bg-red-100 text-red-700';
    case 'high': return 'bg-orange-100 text-orange-700';
    case 'medium': return 'bg-yellow-100 text-yellow-700';
    case 'low': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

// ─── Stat Card ──────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  bgColor: string;
  iconColor: string;
  index: number;
  onClick?: () => void;
}

function StatCard({ label, value, icon: Icon, bgColor, iconColor, index, onClick }: StatCardProps) {
  return (
    <motion.div variants={itemVariants} custom={index}>
      <Card
        className={cn(
          'rounded-2xl border-0 p-0 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden transition-all active:scale-[0.96]',
          onClick && 'cursor-pointer hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:-translate-y-0.5'
        )}
        onClick={onClick}
      >
        <CardContent className="p-4 flex flex-col items-center gap-2">
          <div className={cn('flex size-12 items-center justify-center rounded-full', bgColor)}>
            <Icon className={cn('size-5', iconColor)} strokeWidth={2} />
          </div>
          <span className="text-2xl font-bold leading-none text-gray-900">{value}</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-medium text-gray-500 leading-tight text-center">{label}</span>
            {onClick && <ChevronRight className="size-3 text-gray-300" />}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Complaint Card ─────────────────────────────────────────────

interface ComplaintCardProps {
  complaint: ComplaintItem;
  onClick: (id: string) => void;
  index: number;
}

function ComplaintCard({ complaint, onClick, index }: ComplaintCardProps) {
  return (
    <motion.div variants={itemVariants} custom={index}>
      <button
        type="button"
        onClick={() => onClick(complaint.id)}
        className="w-full text-left rounded-2xl bg-white p-4 shadow-[0_1px_6px_rgba(0,0,0,0.05)] border border-gray-100 transition-shadow active:shadow-md active:scale-[0.99] hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
      >
        <div className="flex items-start gap-3">
          <div className="mt-1.5 shrink-0">
            <span className={cn('block size-3 rounded-full ring-2 ring-offset-1', getStatusColor(complaint.status), 'ring-gray-100')} aria-label={complaint.status} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-gray-900 truncate">{complaint.title}</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold', getPriorityBadgeColor(complaint.priority))}>
                {complaint.priority}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                {complaint.equipmentName && <><span className="truncate max-w-[120px]">{complaint.equipmentName}</span><span className="text-gray-300">&middot;</span></>}
                {formatDate(complaint.createdAt)}
              </span>
            </div>
            {complaint.customerName && <p className="mt-1 text-[11px] text-gray-400 truncate">{complaint.customerName}</p>}
          </div>
          <div className="shrink-0 self-center">
            <ChevronRight className="size-4 text-gray-300" />
          </div>
        </div>
        <div className="mt-3 ml-6">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold', getStatusBadgeStyle(complaint.status))}>
            {getStatusLabel(complaint.status)}
          </span>
        </div>
      </button>
    </motion.div>
  );
}

// ─── Loading Skeletons ──────────────────────────────────────────

function WelcomeSkeleton() {
  return (
    <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-5">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="size-10 rounded-full bg-white/20" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32 bg-white/20" />
          <Skeleton className="h-3 w-44 bg-white/15" />
        </div>
      </div>
      <Skeleton className="h-3 w-64 bg-white/15" />
    </div>
  );
}

function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={cn('grid gap-3 px-4 mt-5', count === 6 ? 'grid-cols-3' : 'grid-cols-2')}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="rounded-2xl border-0 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <CardContent className="p-4 flex flex-col items-center gap-2">
            <Skeleton className="size-12 rounded-full" />
            <Skeleton className="h-7 w-8" />
            <Skeleton className="h-3 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ComplaintsSkeleton() {
  return (
    <div className="px-4 mt-6 space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-white p-4 shadow-[0_1px_6px_rgba(0,0,0,0.05)] border border-gray-100">
          <div className="flex items-start gap-3">
            <Skeleton className="size-3 rounded-full mt-1.5 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-12 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Role-specific Quick Actions ────────────────────────────────

interface QuickAction {
  label: string;
  icon: React.ElementType;
  color: string;
  view: AppView;
  feature?: string;
  roles?: UserRole[];
}

const BASE_QUICK_ACTIONS: QuickAction[] = [
  { label: 'New Complaint', icon: PlusCircle, color: 'bg-emerald-50 text-emerald-600', view: 'new-complaint', feature: 'complaints', roles: ['super_admin', 'admin', 'manager', 'supervisor', 'customer'] },
  { label: 'My Invoices', icon: FileText, color: 'bg-amber-50 text-amber-600', view: 'invoices', feature: 'invoices' },
  { label: 'Support', icon: Headphones, color: 'bg-purple-50 text-purple-600', view: 'help' },
  { label: 'Equipment', icon: MonitorSmartphone, color: 'bg-cyan-50 text-cyan-600', view: 'equipment', feature: 'equipment' },
  { label: 'Work Orders', icon: ClipboardList, color: 'bg-blue-50 text-blue-600', view: 'work-orders', feature: 'work-orders' },
  { label: 'Customers', icon: Users, color: 'bg-pink-50 text-pink-600', view: 'customers', feature: 'customers' },
  { label: 'Reports', icon: BarChart3, color: 'bg-orange-50 text-orange-600', view: 'reports', feature: 'reports' },
  { label: 'Inventory', icon: Package, color: 'bg-teal-50 text-teal-600', view: 'inventory', feature: 'inventory' },
  { label: 'Purchases', icon: ShoppingCart, color: 'bg-indigo-50 text-indigo-600', view: 'purchases', feature: 'purchases' },
  { label: 'User Mgmt', icon: Shield, color: 'bg-gray-100 text-gray-600', view: 'user-management', feature: 'user-management', roles: ['super_admin', 'admin'] },
  { label: 'Finance', icon: DollarSign, color: 'bg-green-50 text-green-600', view: 'finance', feature: 'finance' },
  { label: 'Employees', icon: Users, color: 'bg-violet-50 text-violet-600', view: 'employees', feature: 'employees' },
];

// ─── Main Component ─────────────────────────────────────────────

export function MobileDashboard() {
  const { user } = useAuthStore();
  const { setView } = useAppStore();
  const kpi = useDashboardKpi();
  const recent = useDashboardRecent();

  const kpiData = kpi.data;
  const complaints = recent.data?.recentComplaints || [];
  const loading = recent.isLoading;
  const statsLoading = kpi.isLoading;
  const role = user?.role || 'customer';

  // Greeting
  const hour = new Date().getHours();
  const greetingIcon = hour < 12 ? Sun : hour < 17 ? CloudSun : Moon;
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Data fetched via TanStack Query hooks (useDashboardKpi, useDashboardRecent)
  // with automatic caching (30s KPI, 1min recent) and background refresh

  // ─── Role-based stat cards ──────────────────────────────────
  const getStatCards = useCallback((): { props: StatCardProps; key: string }[] => {
    const s = kpiData;
    if (!s) {
      // Fallback: compute from complaints
      const inProgress = complaints.filter((c) => ['ASSIGNED', 'ACCEPTED', 'WORK_ORDER_CREATED', 'IN_PROGRESS'].includes(c.status)).length;
      const completed = complaints.filter((c) => ['PAID', 'CLOSED'].includes(c.status)).length;
      const pending = complaints.filter((c) => ['NEW'].includes(c.status)).length;
      const awaiting = complaints.filter((c) => ['WAITING_CLIENT_CONFIRMATION'].includes(c.status)).length;

      if (role === 'technician') {
        return [
          { key: 'tasks', props: { label: 'My Tasks', value: inProgress, icon: ClipboardList, bgColor: 'bg-blue-50', iconColor: 'text-blue-600', index: 0 } },
          { key: 'completed', props: { label: 'Completed', value: completed, icon: CheckCircle2, bgColor: 'bg-green-50', iconColor: 'text-green-600', index: 1 } },
          { key: 'pending', props: { label: 'Pending', value: pending, icon: Clock, bgColor: 'bg-orange-50', iconColor: 'text-orange-600', index: 2 } },
          { key: 'awaiting', props: { label: 'Awaiting', value: awaiting, icon: MessageSquare, bgColor: 'bg-yellow-50', iconColor: 'text-yellow-600', index: 3 } },
        ];
      }

      return [
        { key: 'total', props: { label: 'Total Complaints', value: complaints.length, icon: AlertTriangle, bgColor: 'bg-orange-50', iconColor: 'text-orange-500', index: 0 } },
        { key: 'inprogress', props: { label: 'In Progress', value: inProgress, icon: Loader2, bgColor: 'bg-blue-50', iconColor: 'text-blue-600', index: 1 } },
        { key: 'completed', props: { label: 'Completed', value: completed, icon: CheckCircle2, bgColor: 'bg-green-50', iconColor: 'text-green-600', index: 2 } },
        { key: 'awaiting', props: { label: 'Pending Feedback', value: awaiting, icon: MessageSquare, bgColor: 'bg-yellow-50', iconColor: 'text-yellow-600', index: 3 } },
      ];
    }

    // With KPI data
    if (role === 'technician') {
      return [
        { key: 'tasks', props: { label: 'My Tasks', value: s.pendingWorkOrders + s.inProgressComplaints, icon: ClipboardList, bgColor: 'bg-blue-50', iconColor: 'text-blue-600', index: 0 } },
        { key: 'pendingwo', props: { label: 'Pending WOs', value: s.pendingWorkOrders, icon: Wrench, bgColor: 'bg-orange-50', iconColor: 'text-orange-500', index: 1 } },
        { key: 'completedwo', props: { label: 'Completed', value: s.completedWorkOrders, icon: CheckCircle2, bgColor: 'bg-green-50', iconColor: 'text-green-600', index: 2 } },
        { key: 'equipment', props: { label: 'Equipment', value: s.totalEquipment, icon: MonitorSmartphone, bgColor: 'bg-cyan-50', iconColor: 'text-cyan-600', index: 3 } },
      ];
    }

    if (['finance'].includes(role)) {
      return [
        { key: 'revenue', props: { label: 'Total Revenue', value: s.totalRevenue || 0, icon: DollarSign, bgColor: 'bg-emerald-50', iconColor: 'text-emerald-600', index: 0 } },
        { key: 'pendinginv', props: { label: 'Pending Inv.', value: s.pendingInvoices, icon: FileText, bgColor: 'bg-orange-50', iconColor: 'text-orange-500', index: 1 } },
        { key: 'overdue', props: { label: 'Overdue', value: s.overdueInvoices, icon: AlertTriangle, bgColor: 'bg-red-50', iconColor: 'text-red-500', index: 2 } },
        { key: 'customers', props: { label: 'Customers', value: s.totalCustomers, icon: Users, bgColor: 'bg-blue-50', iconColor: 'text-blue-600', index: 3 } },
      ];
    }

    if (['manager', 'supervisor'].includes(role)) {
      return [
        { key: 'open', props: { label: 'Open', value: s.openComplaints, icon: AlertTriangle, bgColor: 'bg-orange-50', iconColor: 'text-orange-500', index: 0 } },
        { key: 'inprogress', props: { label: 'In Progress', value: s.inProgressComplaints, icon: Loader2, bgColor: 'bg-blue-50', iconColor: 'text-blue-600', index: 1 } },
        { key: 'pendingwo', props: { label: 'Pending WOs', value: s.pendingWorkOrders, icon: Wrench, bgColor: 'bg-amber-50', iconColor: 'text-amber-600', index: 2 } },
        { key: 'completed', props: { label: 'Completed', value: s.completedWorkOrders, icon: CheckCircle2, bgColor: 'bg-green-50', iconColor: 'text-green-600', index: 3 } },
      ];
    }

    if (['super_admin', 'admin'].includes(role)) {
      return [
        { key: 'equipment', props: { label: 'Equipment', value: s.totalEquipment, icon: MonitorSmartphone, bgColor: 'bg-cyan-50', iconColor: 'text-cyan-600', index: 0 } },
        { key: 'open', props: { label: 'Open', value: s.openComplaints, icon: AlertTriangle, bgColor: 'bg-orange-50', iconColor: 'text-orange-500', index: 1 } },
        { key: 'revenue', props: { label: 'Revenue', value: s.totalRevenue || 0, icon: TrendingUp, bgColor: 'bg-emerald-50', iconColor: 'text-emerald-600', index: 2 } },
        { key: 'employees', props: { label: 'Employees', value: s.totalEmployees, icon: Users, bgColor: 'bg-blue-50', iconColor: 'text-blue-600', index: 3 } },
        { key: 'pm', props: { label: 'PM Compliance', value: s.pmCompliance || 0, icon: Clock, bgColor: 'bg-purple-50', iconColor: 'text-purple-600', index: 4 } },
        { key: 'lowstock', props: { label: 'Low Stock', value: s.lowStockItems, icon: Package, bgColor: 'bg-red-50', iconColor: 'text-red-500', index: 5 } },
      ];
    }

    // Customer fallback
    return [
      { key: 'total', props: { label: 'My Complaints', value: s.openComplaints + s.inProgressComplaints, icon: AlertTriangle, bgColor: 'bg-orange-50', iconColor: 'text-orange-500', index: 0 } },
      { key: 'inprogress', props: { label: 'In Progress', value: s.inProgressComplaints, icon: Loader2, bgColor: 'bg-blue-50', iconColor: 'text-blue-600', index: 1 } },
      { key: 'completed', props: { label: 'Completed', value: s.completedWorkOrders, icon: CheckCircle2, bgColor: 'bg-green-50', iconColor: 'text-green-600', index: 2 } },
      { key: 'invoices', props: { label: 'Invoices', value: s.pendingInvoices, icon: FileText, bgColor: 'bg-amber-50', iconColor: 'text-amber-600', index: 3 } },
    ];
  }, [kpiData, complaints, role]);

  const statCards = getStatCards();
  const GreetingIcon = greetingIcon;

  // ─── Role-filtered quick actions ─────────────────────────────
  const quickActions = useMemo(() => {
    return BASE_QUICK_ACTIONS.filter((action) => {
      if (!action.feature) return true;
      if (action.roles) return action.roles.includes(role);
      return canAccess(role, action.feature);
    }).slice(0, 4); // Max 4 quick actions on mobile
  }, [role]);

  // ─── Role-based section title ────────────────────────────────
  const recentSectionTitle = useMemo(() => {
    if (['technician'].includes(role)) return 'Assigned Complaints';
    if (['super_admin', 'admin', 'manager', 'supervisor'].includes(role)) return 'Recent Complaints';
    return 'My Complaints';
  }, [role]);

  const handleComplaintClick = (id: string) => {
    setView('complaint-detail', { id });
  };

  const handleQuickAction = (view: AppView) => {
    setView(view);
  };

  // ─── KPI card → view navigation mapping ──────────────────
  const STAT_CARD_NAV: Record<string, AppView> = {
    tasks: 'work-orders',
    pending: 'complaints',
    awaiting: 'complaints',
    total: 'complaints',
    inprogress: 'complaints',
    completed: 'complaints',
    completedwo: 'work-orders',
    pendingwo: 'work-orders',
    pendinginv: 'invoices',
    overdue: 'invoices',
    revenue: 'invoices',
    customers: 'customers',
    employees: 'employees',
    equipment: 'equipment',
    pm: 'pm',
    lowstock: 'inventory',
    invoices: 'invoices',
    open: 'complaints',
  };

  const handleStatCardClick = useCallback((key: string) => {
    const targetView = STAT_CARD_NAV[key];
    if (targetView) {
      setView(targetView);
    }
  }, [setView]);

  return (
    <motion.div className="min-h-screen bg-white" variants={containerVariants} initial="hidden" animate="visible">
      {/* ── Welcome Card — always visible ────────────── */}
      {(
        <motion.div variants={itemVariants} className="mx-4 mt-4">
          <div className="relative overflow-hidden rounded-2xl p-5 shadow-lg" style={{ background: 'linear-gradient(135deg, #059669 0%, #0B5E3C 100%)' }}>
            <div className="pointer-events-none absolute -top-6 -right-6 size-28 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 size-32 rounded-full bg-white/5" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                    <GreetingIcon className="size-5 text-yellow-200" fill="currentColor" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-emerald-100">{greeting}</p>
                    <h1 className="text-lg font-bold leading-tight text-white">Hello, {user?.name?.split(' ')[0] || 'User'}</h1>
                  </div>
                </div>
                {role !== 'customer' && (
                  <Badge className="bg-white/15 text-white border-white/20 text-[10px] font-semibold backdrop-blur-sm">
                    {role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] font-medium text-emerald-200/80 mb-1">{dateStr}</p>
              <p className="text-[12px] text-white/70">
                {role === 'technician' ? "Here's your task overview" : 
                 role === 'customer' ? "Here's an overview of your requests" :
                 "Here's your operational overview"}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Stats Grid ─────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="px-4 mt-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Statistics</h2>
      </motion.div>
      {statsLoading && !kpiData ? (
        <StatsSkeleton count={statCards.length} />
      ) : (
        <motion.div variants={containerVariants} className={cn('grid gap-3 px-4', statCards.length > 4 ? 'grid-cols-3' : 'grid-cols-2')}>
          {statCards.map(({ key, props }) => (
            <StatCard key={key} {...props} onClick={() => handleStatCardClick(key)} />
          ))}
        </motion.div>
      )}

      {/* ── Quick Actions ──────────────────────────────────── */}
      <motion.div variants={itemVariants} className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <motion.button key={action.label} variants={itemVariants} whileTap={{ scale: 0.92 }}
                onClick={() => handleQuickAction(action.view)}
                className="flex flex-col items-center gap-2 rounded-2xl bg-gray-50 p-3 transition-colors active:bg-gray-100 hover:bg-gray-100">
                <div className={cn('flex size-11 items-center justify-center rounded-xl', action.color)}>
                  <Icon className="size-5" strokeWidth={2} />
                </div>
                <span className="text-[10px] font-semibold text-gray-700 leading-tight text-center">{action.label}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Recent Complaints ──────────────────────────────── */}
      <motion.div variants={itemVariants} className="px-4 mt-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">{recentSectionTitle}</h2>
          {canAccess(role, 'complaints') && (
            <Button variant="ghost" size="sm" className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 h-7" onClick={() => setView('complaints')}>
              View All <ChevronRight className="size-3.5 ml-0.5" />
            </Button>
          )}
        </div>
        {loading ? (
          <ComplaintsSkeleton />
        ) : complaints.length === 0 ? (
          <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-gray-50 mb-3">
              <Clock className="size-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">No complaints yet</p>
            <p className="text-xs text-gray-400 mt-1">
              {canAccess(role, 'complaints') ? 'Tap "New Complaint" to get started' : 'Complaints will appear here'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {complaints.map((complaint, i) => (
              <ComplaintCard key={complaint.id} complaint={complaint} onClick={handleComplaintClick} index={i} />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}