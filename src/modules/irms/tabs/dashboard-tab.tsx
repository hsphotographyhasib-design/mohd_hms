'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Clock,
  CheckCircle2,
  CalendarClock,
  BarChart3,
  Shield,
  TrendingUp,
  User,
  Wrench,
  ClipboardList,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/app-shell/store';
import { STATUS_STYLES, RESULT_STYLES, formatDate } from './shared';
import type { InspectionItem, InspectorWorkload, EquipmentDueItem, ComplianceSummary } from '../lib';

interface DashboardTabProps {
  searchQuery: string;
}

export default function DashboardTab({ searchQuery }: DashboardTabProps) {
  const [upcoming, setUpcoming] = useState<InspectionItem[]>([]);
  const [recent, setRecent] = useState<InspectionItem[]>([]);
  const [workload, setWorkload] = useState<InspectorWorkload[]>([]);
  const [equipmentDue, setEquipmentDue] = useState<EquipmentDueItem[]>([]);
  const [compliance, setCompliance] = useState<ComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const token = useAuthStore.getState().token;
      const h: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) h['Authorization'] = `Bearer ${token}`;

      const [upcomingRes, recentRes, workloadRes, equipRes, compRes] = await Promise.allSettled([
        fetch('/api/irms/inspections?status=scheduled&pageSize=5', { headers: h }),
        fetch('/api/irms/inspections?status=completed&pageSize=5&sort=newest', { headers: h }),
        fetch('/api/irms/inspections/workload', { headers: h }),
        fetch('/api/irms/inspections?view=equipment-due', { headers: h }),
        fetch('/api/irms/inspections/compliance', { headers: h }),
      ]);

      if (upcomingRes.status === 'fulfilled' && upcomingRes.value.ok) {
        const d = await upcomingRes.value.json();
        setUpcoming(d.items ?? d.data ?? []);
      }
      if (recentRes.status === 'fulfilled' && recentRes.value.ok) {
        const d = await recentRes.value.json();
        setRecent(d.items ?? d.data ?? []);
      }
      if (workloadRes.status === 'fulfilled' && workloadRes.value.ok) {
        const d = await workloadRes.value.json();
        setWorkload(Array.isArray(d) ? d : d.data ?? []);
      }
      if (equipRes.status === 'fulfilled' && equipRes.value.ok) {
        const d = await equipRes.value.json();
        setEquipmentDue(Array.isArray(d) ? d : d.data ?? []);
      }
      if (compRes.status === 'fulfilled' && compRes.value.ok) {
        const d = await compRes.value.json();
        setCompliance(d.data ?? d);
      }
    } catch {
      // Silently fail — empty states will show
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const filteredUpcoming = upcoming.filter(
    (i) => !searchQuery || i.title.toLowerCase().includes(searchQuery.toLowerCase()) || i.equipmentName?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredRecent = recent.filter(
    (i) => !searchQuery || i.title.toLowerCase().includes(searchQuery.toLowerCase()) || i.equipmentName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Upcoming Inspections */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader className="pb-0 px-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <CalendarClock className="h-4 w-4 text-emerald-600" />
            Upcoming Inspections
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {filteredUpcoming.length === 0 ? (
            <EmptyState icon={CalendarClock} message="No upcoming inspections" />
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredUpcoming.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 truncate">{item.equipmentName ?? 'No equipment'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium">{formatDate(item.scheduledDate)}</p>
                    {item.assignedToName && (
                      <p className="text-xs text-gray-500">{item.assignedToName}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className={STATUS_STYLES[item.status] ?? ''}>
                    {item.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Inspection Reports */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader className="pb-0 px-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <ClipboardList className="h-4 w-4 text-emerald-600" />
            Recent Inspection Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {filteredRecent.length === 0 ? (
            <EmptyState icon={ClipboardList} message="No recent reports" />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100 dark:border-gray-800">
                    <th className="pb-2 pr-2 font-medium">ID</th>
                    <th className="pb-2 pr-2 font-medium">Title</th>
                    <th className="pb-2 pr-2 font-medium hidden sm:table-cell">Equipment</th>
                    <th className="pb-2 pr-2 font-medium">Result</th>
                    <th className="pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecent.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
                      <td className="py-2 pr-2 text-xs text-gray-400 font-mono">{item.id.slice(0, 8)}</td>
                      <td className="py-2 pr-2 font-medium truncate max-w-[120px]">{item.title}</td>
                      <td className="py-2 pr-2 text-xs text-gray-500 truncate max-w-[100px] hidden sm:table-cell">{item.equipmentName ?? '—'}</td>
                      <td className="py-2 pr-2">
                        {item.result ? (
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${RESULT_STYLES[item.result] ?? ''}`}>
                            {item.result.toUpperCase()}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2 text-xs text-gray-500">{formatDate(item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inspector Workload */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader className="pb-0 px-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <User className="h-4 w-4 text-emerald-600" />
            Inspector Workload
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {workload.length === 0 ? (
            <EmptyState icon={User} message="No inspector data available" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {workload.map((inspector) => (
                <div
                  key={inspector.id}
                  className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors"
                >
                  <p className="text-sm font-medium truncate">{inspector.name}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs text-gray-500">{inspector.pending} pending</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-blue-500" />
                      <span className="text-xs text-gray-500">{inspector.inProgress} active</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-gray-500">{inspector.completed} done</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Equipment Due for Inspection */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader className="pb-0 px-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <Wrench className="h-4 w-4 text-emerald-600" />
            Equipment Due for Inspection
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {equipmentDue.length === 0 ? (
            <EmptyState icon={Wrench} message="No equipment due for inspection" />
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {equipmentDue.map((eq) => (
                <div
                  key={eq.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    eq.isOverdue
                      ? 'border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10'
                      : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{eq.name}</p>
                    <p className="text-xs text-gray-500">
                      {eq.category ?? 'General'} · Last: {eq.lastInspection ? formatDate(eq.lastInspection) : 'Never'}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className={`text-xs font-medium ${eq.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      Due: {formatDate(eq.nextDue)}
                    </p>
                    {eq.isOverdue && (
                      <Badge variant="secondary" className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0 mt-1">
                        Overdue
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Summary */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] lg:col-span-2">
        <CardHeader className="pb-0 px-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <Shield className="h-4 w-4 text-emerald-600" />
            Compliance Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {compliance ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ComplianceBar label="Pass" count={compliance.pass} total={compliance.total} color="bg-emerald-500" />
              <ComplianceBar label="Fail" count={compliance.fail} total={compliance.total} color="bg-red-500" />
              <ComplianceBar label="Conditional" count={compliance.conditional} total={compliance.total} color="bg-yellow-500" />
              <ComplianceBar label="N/A" count={compliance.na} total={compliance.total} color="bg-gray-400" />
            </div>
          ) : (
            <EmptyState icon={BarChart3} message="No compliance data available" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ComplianceBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-lg font-bold text-gray-900 dark:text-white">{count}</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-500 mt-1">{pct}% of total</p>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-600">
      <Icon className="h-10 w-10 mb-3 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader className="pb-0 px-4">
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent className="px-4 space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-14 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      ))}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] lg:col-span-2">
        <CardHeader className="pb-0 px-4">
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="px-4">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}