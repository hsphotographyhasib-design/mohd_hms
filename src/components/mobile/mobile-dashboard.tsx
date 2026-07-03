'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Sun,
  ChevronRight,
  PlusCircle,
  Search,
  FileText,
  Headphones,
  AlertTriangle,
  Loader2,
  Clock,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAuthStore, useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import type { ComplaintItem, ComplaintStatus } from '@/types';

// ─── Animation Variants ─────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 400, damping: 28 },
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
}

function StatCard({ label, value, icon: Icon, bgColor, iconColor, index }: StatCardProps) {
  return (
    <motion.div variants={itemVariants} custom={index}>
      <Card className="rounded-2xl border-0 p-0 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <CardContent className="p-4 flex flex-col items-center gap-2">
          <div
            className={cn(
              'flex size-14 items-center justify-center rounded-full',
              bgColor,
            )}
          >
            <Icon className={cn('size-6', iconColor)} strokeWidth={2} />
          </div>
          <span className="text-2xl font-bold leading-none text-gray-900">
            {value}
          </span>
          <span className="text-[11px] font-medium text-gray-500 leading-tight text-center">
            {label}
          </span>
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
          {/* Status dot */}
          <div className="mt-1.5 shrink-0">
            <span
              className={cn(
                'block size-3 rounded-full ring-2 ring-offset-1',
                getStatusColor(complaint.status),
                complaint.status === 'IN_PROGRESS' ? 'ring-blue-200' : 'ring-gray-100',
              )}
              aria-label={complaint.status}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {complaint.title}
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  getPriorityBadgeColor(complaint.priority),
                )}
              >
                {complaint.priority}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                {complaint.equipmentName && (
                  <>
                    <span className="truncate max-w-[120px]">{complaint.equipmentName}</span>
                    <span className="text-gray-300">&middot;</span>
                  </>
                )}
                {formatDate(complaint.createdAt)}
              </span>
            </div>

            {/* Location / customer name */}
            {complaint.customerName && (
              <p className="mt-1 text-[11px] text-gray-400 truncate">
                {complaint.customerName}
              </p>
            )}
          </div>

          {/* Right arrow */}
          <div className="shrink-0 self-center">
            <ChevronRight className="size-4 text-gray-300" />
          </div>
        </div>

        {/* Status badge */}
        <div className="mt-3 ml-6">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold',
              getStatusColor(complaint.status) === 'bg-blue-600' && 'bg-blue-50 text-blue-700',
              getStatusColor(complaint.status) === 'bg-orange-500' && 'bg-orange-50 text-orange-700',
              getStatusColor(complaint.status) === 'bg-green-500' && 'bg-green-50 text-green-700',
              getStatusColor(complaint.status) === 'bg-sky-500' && 'bg-sky-50 text-sky-700',
              getStatusColor(complaint.status) === 'bg-gray-400' && 'bg-gray-50 text-gray-600',
              getStatusColor(complaint.status) === 'bg-red-500' && 'bg-red-50 text-red-700',
              getStatusColor(complaint.status) === 'bg-amber-500' && 'bg-amber-50 text-amber-700',
              getStatusColor(complaint.status) === 'bg-teal-500' && 'bg-teal-50 text-teal-700',
              !['bg-blue-600', 'bg-orange-500', 'bg-green-500', 'bg-sky-500', 'bg-gray-400', 'bg-red-500', 'bg-amber-500', 'bg-teal-500'].includes(getStatusColor(complaint.status)) && 'bg-gray-50 text-gray-600',
            )}
          >
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

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 mt-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="rounded-2xl border-0 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <CardContent className="p-4 flex flex-col items-center gap-2">
            <Skeleton className="size-14 rounded-full" />
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
        <div
          key={i}
          className="rounded-2xl bg-white p-4 shadow-[0_1px_6px_rgba(0,0,0,0.05)] border border-gray-100"
        >
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

// ─── Quick Actions ──────────────────────────────────────────────

const quickActions = [
  { label: 'New Complaint', icon: PlusCircle, color: 'bg-emerald-50 text-emerald-600', view: 'new-complaint' as const },
  { label: 'Track Request', icon: Search, color: 'bg-sky-50 text-sky-600', view: 'complaints' as const },
  { label: 'My Invoices', icon: FileText, color: 'bg-amber-50 text-amber-600', view: 'invoices' as const },
  { label: 'Support', icon: Headphones, color: 'bg-purple-50 text-purple-600', view: 'help' as const },
];

// ─── Main Component ─────────────────────────────────────────────

export function MobileDashboard() {
  const { user } = useAuthStore();
  const { setView } = useAppStore();
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [totalComplaints, setTotalComplaints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Fetch complaints list
  const fetchComplaints = useCallback(async () => {
    const token = localStorage.getItem('cmms_token');
    if (!token) return;

    try {
      setLoading(true);
      const res = await fetch('/api/complaints?page=1&pageSize=5', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setComplaints(json.data || []);
    } catch {
      // Silently handle — data stays empty
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch total count for stats
  const fetchStats = useCallback(async () => {
    const token = localStorage.getItem('cmms_token');
    if (!token) return;

    try {
      setStatsLoading(true);
      const res = await fetch('/api/complaints?pageSize=1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setTotalComplaints(json.total || 0);
    } catch {
      // Silently handle
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
    fetchStats();
  }, [fetchComplaints, fetchStats]);

  // Compute stats from complaints list
  // TODO: Fetch dedicated stats endpoint for accurate in-progress/completed/pending-feedback counts
  const inProgressCount = complaints.filter((c) =>
    ['ASSIGNED', 'ACCEPTED', 'WORK_ORDER_CREATED', 'IN_PROGRESS'].includes(c.status),
  ).length;
  const completedCount = complaints.filter((c) =>
    ['PAID', 'CLOSED'].includes(c.status),
  ).length;
  const pendingFeedbackCount = complaints.filter((c) =>
    ['WAITING_CLIENT_CONFIRMATION'].includes(c.status),
  ).length;

  const handleComplaintClick = (id: string) => {
    setView('complaint-detail', { id });
  };

  const handleQuickAction = (view: string) => {
    setView(view as 'new-complaint' | 'complaints' | 'invoices' | 'help' | 'dashboard');
  };

  return (
    <motion.div
      className="min-h-screen bg-white"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Welcome Card ──────────────────────────────────── */}
      {loading && statsLoading ? (
        <WelcomeSkeleton />
      ) : (
        <motion.div variants={itemVariants} className="mx-4 mt-4">
          <div
            className="relative overflow-hidden rounded-2xl p-5 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #0B5E3C 100%)',
            }}
          >
            {/* Decorative circles */}
            <div className="pointer-events-none absolute -top-6 -right-6 size-28 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 size-32 rounded-full bg-white/5" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                    <Sun className="size-5 text-yellow-200" fill="currentColor" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-emerald-100">
                      {greeting}
                    </p>
                    <h1 className="text-lg font-bold leading-tight text-white">
                      Hello, {user?.name?.split(' ')[0] || 'User'}
                    </h1>
                  </div>
                </div>
              </div>
              <p className="text-[11px] font-medium text-emerald-200/80 mb-1">
                {dateStr}
              </p>
              <p className="text-[12px] text-white/70">
                Here&apos;s an overview of your requests
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Stats Grid ─────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="px-4 mt-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Statistics</h2>
      </motion.div>

      {statsLoading ? (
        <StatsSkeleton />
      ) : (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-2 gap-3 px-4"
        >
          <StatCard
            label="Total Complaints"
            value={totalComplaints}
            icon={AlertTriangle}
            bgColor="bg-orange-50"
            iconColor="text-orange-500"
            index={0}
          />
          <StatCard
            label="In Progress"
            value={inProgressCount}
            icon={Loader2}
            bgColor="bg-blue-50"
            iconColor="text-blue-600"
            index={1}
          />
          <StatCard
            label="Completed"
            value={completedCount}
            icon={CheckCircle2}
            bgColor="bg-green-50"
            iconColor="text-green-600"
            index={2}
          />
          <StatCard
            label="Pending Feedback"
            value={pendingFeedbackCount}
            icon={MessageSquare}
            bgColor="bg-yellow-50"
            iconColor="text-yellow-600"
            index={3}
          />
        </motion.div>
      )}

      {/* ── Quick Actions ──────────────────────────────────── */}
      <motion.div variants={itemVariants} className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.label}
                variants={itemVariants}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleQuickAction(action.view)}
                className="flex flex-col items-center gap-2 rounded-2xl bg-gray-50 p-3 transition-colors active:bg-gray-100 hover:bg-gray-100"
              >
                <div
                  className={cn(
                    'flex size-11 items-center justify-center rounded-xl',
                    action.color,
                  )}
                >
                  <Icon className="size-5" strokeWidth={2} />
                </div>
                <span className="text-[10px] font-semibold text-gray-700 leading-tight text-center">
                  {action.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Recent Complaints ──────────────────────────────── */}
      <motion.div variants={itemVariants} className="px-4 mt-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Recent Complaints</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 h-7"
            onClick={() => setView('complaints')}
          >
            View All
            <ChevronRight className="size-3.5 ml-0.5" />
          </Button>
        </div>

        {loading ? (
          <ComplaintsSkeleton />
        ) : complaints.length === 0 ? (
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="flex size-16 items-center justify-center rounded-full bg-gray-50 mb-3">
              <Clock className="size-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">No complaints yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Tap &quot;New Complaint&quot; to get started
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {complaints.map((complaint, i) => (
              <ComplaintCard
                key={complaint.id}
                complaint={complaint}
                onClick={handleComplaintClick}
                index={i}
              />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}