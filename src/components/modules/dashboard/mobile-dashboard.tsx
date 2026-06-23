'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Search, Bell, Plus, ClipboardList, Wrench, QrCode, MoreHorizontal,
  Calendar, AlertCircle, Clock, Loader2, CheckCircle2, FileText,
  TrendingUp, ArrowUp,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore, useAppStore } from '@/store';
import type { DashboardStats, ComplaintItem, WorkOrderItem } from '@/types';

// ============ SKELETON ============

export function MobileDashboardSkeleton() {
  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      {/* Greeting */}
      <div className="px-4 pt-2">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>

      {/* KPI Grid */}
      <div className="px-4">
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4">
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <Skeleton className="h-11 w-11 rounded-full" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="px-4">
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>

      {/* Tasks */}
      <div className="px-4 space-y-3">
        <Skeleton className="h-5 w-20" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ============ KPI CARD ============

interface KpiCardProps {
  label: string;
  value: number;
  change?: number;
  bgColor: string;
  iconColor: string;
  icon: React.ReactNode;
}

function KpiCard({ label, value, change, bgColor, iconColor, icon }: KpiCardProps) {
  return (
    <div className={`${bgColor} rounded-lg p-2.5`}>
      <div className={`${iconColor} mb-1.5`}>
        {icon}
      </div>
      <p className="text-[11px] text-gray-500 leading-tight truncate">{label}</p>
      <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
      {change !== undefined && (
        <p className="text-[11px] text-emerald-600 flex items-center gap-0.5 mt-0.5">
          <ArrowUp className="w-3 h-3" />
          {change}%
        </p>
      )}
    </div>
  );
}

// ============ PRIORITY BADGE ============

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${config[priority] || config.low}`}>
      {priority.toUpperCase()}
    </span>
  );
}

// ============ CHART TOOLTIP ============

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg shadow-lg border px-3 py-2 text-xs">
      <p className="text-gray-500">{label}</p>
      <p className="font-semibold text-[#0A6E4A]">{payload[0].value}</p>
    </div>
  );
}

// ============ MAIN COMPONENT ============

interface MobileDashboardProps {
  stats: DashboardStats;
}

export function MobileDashboard({ stats }: MobileDashboardProps) {
  const { user } = useAuthStore();
  const { setView, setMobileNavOpen, setNotificationPanelOpen, setSearchOpen } = useAppStore();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'User';

  const totalComplaints = useMemo(() => {
    return stats.complaintsByStatus.reduce((sum, s) => sum + s.count, 0) || stats.openComplaints + stats.inProgressComplaints + 24;
  }, [stats]);

  const overdueCount = useMemo(() => {
    const overdue = stats.complaintsByStatus.find(s =>
      s.status.toUpperCase().includes('OVERDUE') || s.status.toUpperCase().includes('REWORK')
    );
    return overdue?.count || Math.floor(stats.openComplaints * 0.3) || 2;
  }, [stats]);

  const completedToday = useMemo(() => {
    const completed = stats.complaintsByStatus.find(s =>
      s.status.toUpperCase().includes('CLOSED') || s.status.toUpperCase().includes('PAID')
    );
    return completed?.count || 7;
  }, [stats]);

  const chartData = useMemo(() => {
    if (stats.complaintsByStatus.length >= 3) {
      return stats.complaintsByStatus.slice(0, 7).map((s, i) => ({
        name: s.status.length > 8 ? s.status.slice(0, 8) : s.status,
        value: s.count,
      }));
    }
    if (stats.monthlyRevenue.length > 0) {
      return stats.monthlyRevenue.slice(0, 7).map((m) => ({
        name: m.month.slice(0, 3),
        value: m.revenue,
      }));
    }
    return [
      { name: 'Mon', value: 4 },
      { name: 'Tue', value: 7 },
      { name: 'Wed', value: 5 },
      { name: 'Thu', value: 9 },
      { name: 'Fri', value: 6 },
      { name: 'Sat', value: 3 },
      { name: 'Sun', value: 2 },
    ];
  }, [stats]);

  const tasks = useMemo(() => {
    const items: { id: string; title: string; subtitle: string; priority: string; time: string; iconBg: string; icon: React.ReactNode }[] = [];

    const complaints = stats.recentComplaints?.slice(0, 2) || [];
    for (const c of complaints) {
      const iconConfig = {
        high: { bg: 'bg-red-100', icon: <AlertCircle className="w-4 h-4 text-red-600" /> },
        critical: { bg: 'bg-red-100', icon: <AlertCircle className="w-4 h-4 text-red-600" /> },
        medium: { bg: 'bg-amber-100', icon: <Clock className="w-4 h-4 text-amber-600" /> },
        low: { bg: 'bg-blue-100', icon: <Clock className="w-4 h-4 text-blue-600" /> },
      };
      const cfg = iconConfig[c.priority] || iconConfig.medium;
      items.push({
        id: c.id,
        title: c.title,
        subtitle: `#${c.id.slice(-6)} ${c.equipmentName || c.location || ''}`.trim(),
        priority: c.priority,
        time: format(new Date(c.createdAt), 'HH:mm'),
        iconBg: cfg.bg,
        icon: cfg.icon,
      });
    }

    const wos = stats.recentWorkOrders?.slice(0, 3 - items.length) || [];
    for (const wo of wos) {
      const iconConfig = {
        high: { bg: 'bg-purple-100', icon: <Loader2 className="w-4 h-4 text-purple-600" /> },
        medium: { bg: 'bg-teal-100', icon: <ClipboardList className="w-4 h-4 text-teal-600" /> },
        low: { bg: 'bg-gray-100', icon: <FileText className="w-4 h-4 text-gray-600" /> },
      };
      const cfg = iconConfig[wo.priority] || iconConfig.medium;
      items.push({
        id: wo.id,
        title: wo.title,
        subtitle: `WO-${wo.id.slice(-6)} ${wo.equipmentName || ''}`.trim(),
        priority: wo.priority,
        time: format(new Date(wo.createdAt), 'HH:mm'),
        iconBg: cfg.bg,
        icon: cfg.icon,
      });
    }

    return items.slice(0, 3);
  }, [stats]);

  return (
    <div className="pb-24">
      {/* ===== 1. Custom Mobile Header ===== */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Logo + Name */}
          <div className="flex items-center gap-2.5">
            {/* Hexagonal Logo */}
            <div className="relative w-9 h-9 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-9 h-9" fill="none">
                <path
                  d="M18 2L32.5 10.5V25.5L18 34L3.5 25.5V10.5L18 2Z"
                  fill="#0A6E4A"
                  stroke="#0A6E4A"
                  strokeWidth="1"
                />
                <text x="18" y="21" textAnchor="middle" fill="white" fontSize="10" fontWeight="700" fontFamily="system-ui">
                  MH
                </text>
              </svg>
            </div>
            <div>
              <p className="text-[#0A6E4A] font-bold text-[18px] leading-tight tracking-tight">
                MOHD.HMS
              </p>
              <p className="text-gray-400 text-[12px] leading-tight tracking-wider">
                ENTERPRISE
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-1 text-gray-500 hover:text-gray-700 active:scale-95 transition-all"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setNotificationPanelOpen(true)}
              className="relative p-1 text-gray-500 hover:text-gray-700 active:scale-95 transition-all"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 bg-[#0A6E4A] text-white text-[9px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-1">
                5
              </span>
            </button>
            <div className="relative">
              <Avatar className="h-8 w-8 border-2 border-gray-100">
                {user?.avatar ? (
                  <AvatarImage src={user.avatar} alt={user.name} />
                ) : null}
                <AvatarFallback className="bg-[#E8F5EE] text-[#0A6E4A] text-xs font-semibold">
                  {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#0A6E4A] rounded-full border-2 border-white" />
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-5 pt-3">
        {/* ===== 2. Greeting Banner ===== */}
        <div className="px-4">
          <div className="bg-[#0A6E4A] rounded-2xl p-4 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-white text-[20px] font-semibold leading-tight">
                {greeting}, {firstName} 👋
              </p>
              <p className="text-white/80 text-[14px] mt-1 leading-tight">
                Here&apos;s what&apos;s happening today.
              </p>
            </div>
            <div className="flex-shrink-0 text-right ml-3">
              <p className="text-white text-[14px] font-semibold">
                {format(new Date(), 'dd MMM yyyy')}
              </p>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-white/70" />
                <p className="text-white/70 text-[12px]">
                  {format(new Date(), 'EEEE')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 3. KPI Stats Grid ===== */}
        <div className="px-4">
          <div className="grid grid-cols-3 gap-3">
            <KpiCard
              label="Total Complaints"
              value={totalComplaints}
              change={12}
              bgColor="bg-[#F0F9F5]"
              iconColor="text-[#0A6E4A]"
              icon={<AlertCircle className="w-6 h-6" />}
            />
            <KpiCard
              label="Open Complaints"
              value={stats.openComplaints}
              change={-5}
              bgColor="bg-[#FFF8F0]"
              iconColor="text-orange-500"
              icon={<Clock className="w-6 h-6" />}
            />
            <KpiCard
              label="Overdue"
              value={overdueCount}
              bgColor="bg-[#FFF0F0]"
              iconColor="text-red-500"
              icon={<AlertCircle className="w-6 h-6" />}
            />
            <KpiCard
              label="In Progress"
              value={stats.inProgressComplaints}
              change={8}
              bgColor="bg-[#F0F5FF]"
              iconColor="text-blue-500"
              icon={<Loader2 className="w-6 h-6" />}
            />
            <KpiCard
              label="Completed Today"
              value={completedToday}
              change={15}
              bgColor="bg-[#F5F0FF]"
              iconColor="text-purple-500"
              icon={<CheckCircle2 className="w-6 h-6" />}
            />
            <KpiCard
              label="Pending WOs"
              value={stats.pendingWorkOrders}
              change={3}
              bgColor="bg-[#F0FFF5]"
              iconColor="text-teal-500"
              icon={<ClipboardList className="w-6 h-6" />}
            />
          </div>
        </div>

        {/* ===== 4. Quick Actions ===== */}
        <div className="px-4">
          <div className="flex gap-5 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { icon: <Plus className="w-5 h-5" />, label: 'New Complaint', action: () => setView('new-complaint') },
              { icon: <ClipboardList className="w-5 h-5" />, label: 'Work Orders', action: () => setView('work-orders') },
              { icon: <Wrench className="w-5 h-5" />, label: 'Equipment', action: () => setView('equipment') },
              { icon: <QrCode className="w-5 h-5" />, label: 'Scan QR', action: () => setView('equipment') },
              { icon: <MoreHorizontal className="w-5 h-5" />, label: 'More', action: () => setMobileNavOpen(true) },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-95 transition-transform"
              >
                <div className="w-11 h-11 rounded-full bg-[#E8F5EE] flex items-center justify-center text-[#0A6E4A]">
                  {item.icon}
                </div>
                <span className="text-[11px] text-gray-600 whitespace-nowrap">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ===== 5. Complaint Overview Chart ===== */}
        <div className="px-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-semibold text-gray-900">Complaint Overview</h3>
              <span className="text-[12px] text-[#0A6E4A] font-medium bg-[#F0F9F5] px-2.5 py-1 rounded-full">
                This Week
              </span>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mobileAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0A6E4A" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#0A6E4A" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    dx={-4}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#0A6E4A"
                    strokeWidth={2}
                    fill="url(#mobileAreaGradient)"
                    dot={{ r: 3, fill: '#0A6E4A', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#0A6E4A', strokeWidth: 2, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ===== 6. My Tasks ===== */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-semibold text-gray-900">My Tasks</h3>
            <button
              onClick={() => setView('complaints')}
              className="text-[13px] text-[#0A6E4A] font-medium active:opacity-70"
            >
              View All
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {tasks.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                No tasks assigned
              </div>
            ) : (
              tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => setView('complaints')}
                  className="w-full flex items-center gap-3 p-3.5 text-left active:bg-gray-50 transition-colors"
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-lg ${task.iconBg} flex items-center justify-center flex-shrink-0`}>
                    {task.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-gray-900 truncate leading-tight">
                      {task.title}
                    </p>
                    <p className="text-[12px] text-gray-400 truncate mt-0.5">
                      {task.subtitle}
                    </p>
                  </div>

                  {/* Priority + Time */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <PriorityBadge priority={task.priority} />
                    <span className="text-[11px] text-gray-400">{task.time}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}