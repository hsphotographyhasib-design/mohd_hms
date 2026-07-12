'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserCheck, UserX, CalendarOff, Cake, AlertTriangle,
  UserPlus, DollarSign, Clock, Timer, GraduationCap, Building2,
  Loader2, LayoutDashboard,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import type { AppView } from '@/types';

// ============ HELPERS ============

const token = () => localStorage.getItem('cmms_token') || '';

interface KpiData {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  pendingLeaves: number;
  upcomingBirthdays: number;
  expiringDocuments: number;
  newHiresMonth: number;
  payrollStatus: number;
  activeShifts: number;
  overtimeMonth: number;
  trainingRecords: number;
  deptCount: number;
}

interface KpiCardConfig {
  key: keyof KpiData;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgHover: string;
  view: AppView;
}

const KPI_CARDS: KpiCardConfig[] = [
  { key: 'totalEmployees', label: 'Total Employees', icon: <Users className="h-5 w-5" />, color: 'text-emerald-600', bgHover: 'hover:border-emerald-300 hover:bg-emerald-50/50', view: 'hr-employees' },
  { key: 'presentToday', label: 'Present Today', icon: <UserCheck className="h-5 w-5" />, color: 'text-teal-600', bgHover: 'hover:border-teal-300 hover:bg-teal-50/50', view: 'hr-attendance' },
  { key: 'absentToday', label: 'Absent Today', icon: <UserX className="h-5 w-5" />, color: 'text-rose-600', bgHover: 'hover:border-rose-300 hover:bg-rose-50/50', view: 'hr-attendance' },
  { key: 'pendingLeaves', label: 'Pending Leave Requests', icon: <CalendarOff className="h-5 w-5" />, color: 'text-amber-600', bgHover: 'hover:border-amber-300 hover:bg-amber-50/50', view: 'hr-leave' },
  { key: 'upcomingBirthdays', label: 'Upcoming Birthdays', icon: <Cake className="h-5 w-5" />, color: 'text-pink-600', bgHover: 'hover:border-pink-300 hover:bg-pink-50/50', view: 'hr-employees' },
  { key: 'expiringDocuments', label: 'Expiring Documents', icon: <AlertTriangle className="h-5 w-5" />, color: 'text-orange-600', bgHover: 'hover:border-orange-300 hover:bg-orange-50/50', view: 'hr-documents' },
  { key: 'newHiresMonth', label: 'New Hires This Month', icon: <UserPlus className="h-5 w-5" />, color: 'text-sky-600', bgHover: 'hover:border-sky-300 hover:bg-sky-50/50', view: 'hr-recruitment' },
  { key: 'payrollStatus', label: 'Payroll Processed', icon: <DollarSign className="h-5 w-5" />, color: 'text-green-600', bgHover: 'hover:border-green-300 hover:bg-green-50/50', view: 'hr-payroll' },
  { key: 'activeShifts', label: 'Active Shifts', icon: <Clock className="h-5 w-5" />, color: 'text-violet-600', bgHover: 'hover:border-violet-300 hover:bg-violet-50/50', view: 'hr-shifts' },
  { key: 'overtimeMonth', label: 'Overtime This Month', icon: <Timer className="h-5 w-5" />, color: 'text-fuchsia-600', bgHover: 'hover:border-fuchsia-300 hover:bg-fuchsia-50/50', view: 'hr-overtime' },
  { key: 'trainingRecords', label: 'Training Completed', icon: <GraduationCap className="h-5 w-5" />, color: 'text-cyan-600', bgHover: 'hover:border-cyan-300 hover:bg-cyan-50/50', view: 'hr-training' },
  { key: 'deptCount', label: 'Departments', icon: <Building2 className="h-5 w-5" />, color: 'text-stone-600', bgHover: 'hover:border-stone-300 hover:bg-stone-50/50', view: 'hr-departments' },
];

// ============ MAIN COMPONENT ============

export function HrDashboard() {
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const setView = useAppStore((s) => s.setView);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/hr/dashboard', {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
    } catch {
      toast.error('Failed to load HR dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleCardClick = (card: KpiCardConfig) => {
    setView(card.view);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <LayoutDashboard className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">HR Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your workforce at a glance</p>
        </div>
      </div>

      {/* KPI Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="border">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {KPI_CARDS.map((card) => {
            const value = data?.[card.key] ?? 0;
            return (
              <Card
                key={card.key}
                className={`border cursor-pointer transition-all duration-200 ${card.bgHover} hover:shadow-md active:scale-[0.98]`}
                onClick={() => handleCardClick(card)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCardClick(card); }}
              >
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className={`flex items-center justify-between`}>
                    <div className={`${card.color} opacity-80`}>
                      {card.icon}
                    </div>
                  </div>
                  <p className="text-2xl font-bold tracking-tight">{value}</p>
                  <p className="text-xs font-medium text-muted-foreground leading-tight">{card.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Summary Row */}
      {!loading && data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
                <p className="text-lg font-bold text-emerald-700">
                  {data.totalEmployees > 0
                    ? Math.round(((data.presentToday) / Math.max(data.totalEmployees, 1)) * 100)
                    : 0}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hiring Activity</p>
                <p className="text-lg font-bold text-amber-700">
                  {data.newHiresMonth} new this month
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-rose-200 bg-rose-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Action Required</p>
                <p className="text-lg font-bold text-rose-700">
                  {data.pendingLeaves + data.expiringDocuments} items
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}