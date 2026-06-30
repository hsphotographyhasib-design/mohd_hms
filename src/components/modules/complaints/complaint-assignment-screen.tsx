'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, UserCheck, AlertCircle, Clock, Loader2,
  Users, Shield, UserX, Briefcase, Activity,
  X, CheckCircle2, Ban, History, Timer,
  ArrowUpDown, Phone, Mail, Wrench, ArrowUpRight, Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuthStore, useAppStore } from '@/store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ============ TYPES ============

interface Technician {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  employeeNumber: string;
  avatar: string | null;
  departmentId: string | null;
  departmentName: string | null;
  isOnline: boolean;
  lastLogin: string | null;
  activeJobs: number;
  activeWorkOrders: number;
  maxJobs: number;
  workloadPercent: number;
  onLeave: boolean;
  availabilityStatus: 'available' | 'on_leave' | 'offline';
  isCurrentlyAssigned: boolean;
  avgCompletionHours: number | null;
  totalCompleted: number;
  skills: string[];
  currentTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    category: string | null;
    createdAt: string;
  }>;
  canAssign: boolean;
}

interface CurrentAssignment {
  assignedToId: string | null;
  supervisorId: string | null;
  category: string | null;
  assignmentStatus: string;
  assignedAt: string | null;
  slaResponseDeadline: string | null;
  slaUrgent: boolean;
  priority: string;
}

interface AssignmentHistoryEntry {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  description: string;
  createdAt: string;
  performedBy: {
    id: string;
    name: string;
    role: string;
    avatar: string | null;
    employeeNumber: string | null;
  } | null;
  metadata: {
    technicianId?: string;
    technicianName?: string;
    previousTechnicianId?: string;
    previousTechnicianName?: string;
    isReassignment?: boolean;
    reason?: string | null;
    reassignmentCount?: number;
    slaResponseDeadline?: string;
  };
}

interface ComplaintInfo {
  id: string;
  title: string;
  priority: string;
  status: string;
  category: string | null;
  customerName?: string;
  assignedToName?: string;
  assignmentStatus?: string;
  reassignmentCount?: number;
  createdAt: string;
}

// ============ CONSTANTS ============

const STATUS_FILTERS = [
  { value: '', label: 'All', icon: Users, count: 'all' },
  { value: 'available', label: 'Available', icon: UserCheck, count: 'available' },
  { value: 'busy', label: 'Offline', icon: Clock, count: 'offline' },
  { value: 'on_leave', label: 'On Leave', icon: UserX, count: 'onLeave' },
] as const;

const SORT_OPTIONS = [
  { value: 'availability', label: 'Availability' },
  { value: 'workload', label: 'Workload (Low → High)' },
  { value: 'name', label: 'Name (A → Z)' },
  { value: 'recently_active', label: 'Recently Active' },
] as const;

const AVAILABILITY_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string; label: string; dotColor: string }> = {
  available: { color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', label: 'Available', dotColor: 'bg-emerald-500' },
  offline: { color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', label: 'Offline', dotColor: 'bg-gray-400' },
  on_leave: { color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', label: 'On Leave', dotColor: 'bg-amber-500' },
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  low: { color: 'text-gray-700', bg: 'bg-gray-100', border: 'border-gray-300' },
  medium: { color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-300' },
  high: { color: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-300' },
  critical: { color: 'text-rose-700', bg: 'bg-rose-100', border: 'border-rose-300' },
};

const CATEGORY_COLORS: Record<string, string> = {
  HVAC: 'bg-sky-100 text-sky-700 border-sky-200',
  Electrical: 'bg-amber-100 text-amber-700 border-amber-200',
  Plumbing: 'bg-blue-100 text-blue-700 border-blue-200',
  Generator: 'bg-violet-100 text-violet-700 border-violet-200',
  Mechanical: 'bg-orange-100 text-orange-700 border-orange-200',
  FireProtection: 'bg-rose-100 text-rose-700 border-rose-200',
};

function getToken(): string { return localStorage.getItem('cmms_token') || ''; }

// ============ SLA COUNTDOWN ============

function SlaCountdown({ deadline, urgent }: { deadline: string; urgent: boolean }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [percent, setPercent] = useState(100);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const end = new Date(deadline).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('Expired');
        setPercent(0);
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}m ${secs}s`);

      // 15 minute SLA
      const totalMs = 15 * 60 * 1000;
      setPercent(Math.min(100, Math.max(0, (diff / totalMs) * 100)));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border',
            isExpired ? 'bg-rose-50 border-rose-200' : urgent ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
          )}>
            <Timer className={cn('h-4 w-4', isExpired ? 'text-rose-500' : urgent ? 'text-amber-500' : 'text-emerald-500')} />
            <div className="flex-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">SLA Response</p>
              <p className={cn('text-sm font-bold tabular-nums', isExpired ? 'text-rose-600' : urgent ? 'text-amber-600' : 'text-emerald-600')}>
                {timeLeft}
              </p>
            </div>
            <div className="w-12">
              <Progress value={percent} className={cn('h-1.5', isExpired && '[&>div]:bg-rose-500', urgent && !isExpired && '[&>div]:bg-amber-500')} />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {isExpired ? 'SLA exceeded — escalate immediately' : `Technician must respond within ${timeLeft}`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============ WORKLOAD BAR ============

function WorkloadBar({ current, max, percent }: { current: number; max: number; percent: number }) {
  const color = percent >= 80 ? 'text-rose-600' : percent >= 60 ? 'text-amber-600' : 'text-emerald-600';
  const barColor = percent >= 80 ? '[&>div]:bg-rose-500' : percent >= 60 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <Progress value={percent} className={cn('h-1.5', barColor)} />
      </div>
      <span className={cn('text-[10px] font-bold tabular-nums min-w-[32px] text-right', color)}>
        {current}/{max}
      </span>
    </div>
  );
}

// ============ TECHNICIAN CARD ============

function TechnicianCard({
  tech,
  isSelected,
  onSelect,
  isReassignment,
}: {
  tech: Technician;
  isSelected: boolean;
  onSelect: () => void;
  isReassignment: boolean;
}) {
  const avail = AVAILABILITY_CONFIG[tech.availabilityStatus] || AVAILABILITY_CONFIG.offline;
  const pConfig = PRIORITY_CONFIG[tech.currentTasks[0]?.priority] || PRIORITY_CONFIG.medium;
  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
    >
      <button
        className={cn(
          'w-full text-left rounded-2xl border-2 p-4 transition-all duration-200',
          isSelected
            ? 'border-emerald-500 bg-emerald-50/60 shadow-md shadow-emerald-100'
            : 'border-gray-200 hover:border-emerald-300 hover:shadow-sm bg-white',
          !tech.canAssign && !isSelected && 'opacity-60 cursor-not-allowed'
        )}
        onClick={() => tech.canAssign && onSelect()}
        disabled={!tech.canAssign}
      >
        {/* Top row: Avatar + Name + Status */}
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <Avatar className="h-11 w-11">
              {tech.avatar ? (
                <img src={tech.avatar} alt={tech.name} className="object-cover" />
              ) : (
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-bold">
                  {getInitials(tech.name)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className={cn(
              'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white',
              avail.dotColor
            )} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-gray-900 truncate">{tech.name}</span>
              {tech.isCurrentlyAssigned && (
                <Badge className="text-[9px] h-4 px-1.5 bg-sky-100 text-sky-700 border-sky-200 shrink-0">
                  Current
                </Badge>
              )}
              {tech.role === 'supervisor' && (
                <Badge className="text-[9px] h-4 px-1.5 bg-violet-100 text-violet-700 border-violet-200 shrink-0">
                  Supervisor
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[11px] text-gray-500 font-mono">{tech.employeeNumber || '—'}</span>
              {tech.departmentName && (
                <>
                  <span className="text-gray-300 text-[10px]">·</span>
                  <span className="text-[11px] text-gray-500 flex items-center gap-0.5">
                    <Briefcase className="h-2.5 w-2.5" />{tech.departmentName}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-1">
            <Badge variant="outline" className={cn('text-[10px] h-5 px-2 font-medium border', avail.color, avail.bgColor, avail.borderColor)}>
              {avail.label}
            </Badge>
          </div>
        </div>

        {/* Workload bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Workload</span>
            {tech.workloadPercent >= 80 && (
              <span className="text-[10px] text-rose-500 font-medium">At capacity</span>
            )}
          </div>
          <WorkloadBar current={tech.activeJobs} max={tech.maxJobs} percent={tech.workloadPercent} />
        </div>

        {/* Skills / Category tags */}
        {tech.skills.length > 0 && (
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            <Wrench className="h-3 w-3 text-gray-400 shrink-0" />
            {tech.skills.slice(0, 5).map((skill, i) => (
              <Badge
                key={i}
                variant="outline"
                className={cn(
                  'text-[9px] h-4 px-1.5 border font-medium',
                  CATEGORY_COLORS[skill] || 'bg-gray-100 text-gray-600 border-gray-200'
                )}
              >
                {skill}
              </Badge>
            ))}
            {tech.skills.length > 5 && (
              <span className="text-[9px] text-gray-400">+{tech.skills.length - 5}</span>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
          <div className="flex items-center gap-1" title="Avg completion time">
            <Clock className="h-3 w-3" />
            <span>{tech.avgCompletionHours ? `${tech.avgCompletionHours}h avg` : '—'}</span>
          </div>
          <div className="flex items-center gap-1" title="Completed jobs">
            <CheckCircle2 className="h-3 w-3" />
            <span>{tech.totalCompleted} done</span>
          </div>
          {tech.lastLogin && (
            <div className="flex items-center gap-1" title="Last login">
              <Activity className="h-3 w-3" />
              <span>{formatDistanceToNow(new Date(tech.lastLogin), { addSuffix: true })}</span>
            </div>
          )}
        </div>

        {/* Current tasks (expandable) */}
        {tech.currentTasks.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-gray-100">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">
              Active Tasks ({tech.currentTasks.length})
            </p>
            <div className="space-y-1">
              {tech.currentTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center gap-1.5 text-[11px]">
                  <Badge variant="outline" className={cn('text-[9px] h-3.5 px-1 border shrink-0', pConfig.bg, pConfig.color, pConfig.border)}>
                    {task.priority?.[0]?.toUpperCase()}
                  </Badge>
                  <span className="text-gray-600 truncate flex-1">{task.title}</span>
                  {task.category && (
                    <span className="text-gray-400 text-[9px] shrink-0">{task.category}</span>
                  )}
                </div>
              ))}
              {tech.currentTasks.length > 3 && (
                <p className="text-[9px] text-gray-400 pl-3">+{tech.currentTasks.length - 3} more</p>
              )}
            </div>
          </div>
        )}

        {/* Selected indicator */}
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center justify-center mt-3 pt-2.5 border-t border-emerald-200/60"
          >
            <UserCheck className="h-4 w-4 text-emerald-600 mr-1.5" />
            <span className="text-xs font-semibold text-emerald-700">
              {isReassignment ? 'Will reassign to' : 'Will assign to'} {tech.name}
            </span>
          </motion.div>
        )}

        {/* Disabled reason */}
        {!tech.canAssign && !isSelected && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-rose-500">
            <AlertCircle className="h-3 w-3" />
            {tech.onLeave ? 'On leave' : 'Workload at capacity'}
          </div>
        )}
      </button>
    </motion.div>
  );
}

// ============ ASSIGNMENT HISTORY SIDEBAR ============

function AssignmentHistorySidebar({ complaintId }: { complaintId: string }) {
  const [entries, setEntries] = useState<AssignmentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!complaintId) return;

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`/api/complaints/${complaintId}/assignment-history?pageSize=50`, {
          headers: { Authorization: `Bearer ${getToken()}` },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (mountedRef.current) setEntries(data.entries || []);
      } catch {
        if (mountedRef.current) setEntries([]);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, [complaintId]);

  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Card className="rounded-2xl border-0 shadow-sm bg-white h-fit">
      <CardHeader className="pb-3 px-4 pt-4">
        <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <History className="h-4 w-4 text-emerald-600" />
          Assignment History
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-6">
            <History className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">No assignment history yet</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[360px]">
            <div className="space-y-3 pr-1">
              {entries.map((entry) => {
                const isReassign = entry.action === 'reassigned';
                const isAccept = entry.action === 'accepted';
                const isReject = entry.action === 'rejected';

                return (
                  <div key={entry.id} className="flex gap-2.5">
                    <div className="relative shrink-0">
                      <Avatar className="h-7 w-7">
                        {entry.performedBy?.avatar ? (
                          <img src={entry.performedBy.avatar} alt="" className="object-cover" />
                        ) : (
                          <AvatarFallback className="text-[9px] bg-gray-100 text-gray-600">
                            {entry.performedBy?.name ? getInitials(entry.performedBy.name) : '?'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className={cn(
                        'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white flex items-center justify-center',
                        isAccept && 'bg-emerald-500',
                        isReject && 'bg-rose-500',
                        isReassign && 'bg-amber-500',
                        entry.action === 'assigned' && 'bg-sky-500',
                      )}>
                        {isAccept && <CheckCircle2 className="h-1.5 w-1.5 text-white" />}
                        {isReject && <Ban className="h-1.5 w-1.5 text-white" />}
                        {isReassign && <ArrowUpRight className="h-1.5 w-1.5 text-white" />}
                        {entry.action === 'assigned' && <UserCheck className="h-1.5 w-1.5 text-white" />}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-gray-800 leading-tight">
                        {entry.performedBy?.name || 'System'}
                        {entry.performedBy?.role && (
                          <span className="text-[10px] text-gray-400 font-normal ml-1">
                            ({entry.performedBy.role})
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">
                        {entry.metadata?.technicianName && (
                          <span className="font-medium text-gray-600">{entry.metadata.technicianName}</span>
                        )}
                        {isReassign && entry.metadata?.previousTechnicianName && (
                          <span className="text-gray-400">
                            {' '}replacing <span className="font-medium text-gray-600">{entry.metadata.previousTechnicianName}</span>
                          </span>
                        )}
                        {entry.metadata?.reason && (
                          <span className="block mt-0.5 text-amber-600">Reason: {entry.metadata.reason}</span>
                        )}
                      </p>
                      <p className="text-[9px] text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ============ MAIN COMPONENT ============

interface ComplaintAssignmentScreenProps {
  complaintId?: string;
}

export function ComplaintAssignmentScreen({ complaintId: propComplaintId }: ComplaintAssignmentScreenProps) {
  const { user } = useAuthStore();
  const { viewParams, setView } = useAppStore();
  const complaintId = propComplaintId || viewParams?.id || '';

  // State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('__all__');
  const [sortBy, setSortBy] = useState('availability');
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [currentAssignment, setCurrentAssignment] = useState<CurrentAssignment | null>(null);
  const [complaint, setComplaint] = useState<ComplaintInfo | null>(null);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [complaintLoading, setComplaintLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [reason, setReason] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [detailTab, setDetailTab] = useState<'info' | 'history'>('info');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const isReassignment = currentAssignment?.assignedToId !== null;
  const canAssign = ['super_admin', 'admin', 'supervisor', 'manager'].includes(user?.role || '');

  // Fetch complaint info
  useEffect(() => {
    if (!complaintId) return;
    setComplaintLoading(true);
    fetch(`/api/complaints/${complaintId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => setComplaint(data))
      .catch(() => { toast.error('Complaint not found'); setView('complaints'); })
      .finally(() => setComplaintLoading(false));
  }, [complaintId, setView]);

  // Fetch departments
  useEffect(() => {
    if (!canAssign) return;
    fetch(`/api/departments?pageSize=50`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(data => setDepartments((data.data || data || []).map((d: { id: string; name: string }) => ({ id: d.id, name: d.name }))))
      .catch(() => {});
  }, [canAssign]);

  // Fetch technicians
  useEffect(() => {
    if (!complaintId || !canAssign) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('q', search);
        if (statusFilter) params.set('status', statusFilter);
        if (departmentFilter && departmentFilter !== '__all__') params.set('department', departmentFilter);
        if (sortBy) params.set('sortBy', sortBy);
        params.set('limit', '30');

        const res = await fetch(
          `/api/complaints/${complaintId}/assign-technician?${params.toString()}`,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setTechnicians(data.technicians || []);
        setCurrentAssignment(data.currentAssignment || null);

        // Auto-select current technician for reassignment
        if (data.currentAssignment?.assignedToId && !selectedId) {
          setSelectedId(data.currentAssignment.assignedToId);
        }
      } catch {
        setTechnicians([]);
        toast.error('Failed to load technicians');
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [complaintId, search, statusFilter, departmentFilter, sortBy, canAssign, selectedId]);

  // Reset on complaintId change
  useEffect(() => {
    setSearch('');
    setStatusFilter('');
    setDepartmentFilter('');
    setSortBy('availability');
    setSelectedId(null);
    setSelectedTech(null);
    setReason('');
  }, [complaintId]);

  // Track selected tech
  useEffect(() => {
    if (selectedId) {
      const tech = technicians.find(t => t.id === selectedId);
      setSelectedTech(tech || null);
    } else {
      setSelectedTech(null);
    }
  }, [selectedId, technicians]);

  // Submit assignment
  const handleAssign = useCallback(async () => {
    if (!selectedId || !complaintId) return;
    if (isReassignment && !reason.trim()) {
      toast.error('Provide a reason for reassignment');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/complaints/${complaintId}/assign-technician`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          technicianId: selectedId,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || 'Assignment failed');
      }

      toast.success(data.message || 'Technician assigned successfully');
      // Refresh
      const params = new URLSearchParams();
      params.set('limit', '30');
      const techRes = await fetch(`/api/complaints/${complaintId}/assign-technician?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (techRes.ok) {
        const techData = await techRes.json();
        setTechnicians(techData.technicians || []);
        setCurrentAssignment(techData.currentAssignment || null);
      }
      setSelectedId(null);
      setSelectedTech(null);
      setReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setSubmitting(false);
    }
  }, [selectedId, reason, isReassignment, complaintId]);

  // Counts for filter badges
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0, available: 0, offline: 0, onLeave: 0 };
    for (const t of technicians) {
      counts.all++;
      if (t.availabilityStatus === 'available') counts.available++;
      if (t.availabilityStatus === 'offline') counts.offline++;
      if (t.onLeave) counts.onLeave++;
    }
    return counts;
  }, [technicians]);

  const pConfig = complaint ? PRIORITY_CONFIG[complaint.priority] : PRIORITY_CONFIG.medium;
  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  if (complaintLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-12 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!complaint || !canAssign) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Shield className="h-12 w-12 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">You don't have permission to access this page</p>
        <Button variant="outline" className="mt-4" onClick={() => setView('complaints')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />Back to Complaints
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-gray-500 hover:text-gray-900" onClick={() => setView('complaint-detail', { id: complaintId })}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              {isReassignment ? 'Reassign Technician' : 'Assign Technician'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5 truncate">
              {complaint.title}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('px-2.5 py-1 font-medium border', pConfig.color, pConfig.bg, pConfig.border)}>
              {complaint.priority?.toUpperCase()}
            </Badge>
            {currentAssignment?.slaResponseDeadline && currentAssignment.assignmentStatus === 'PENDING_ACCEPTANCE' && (
              <SlaCountdown deadline={currentAssignment.slaResponseDeadline} urgent={currentAssignment.slaUrgent} />
            )}
          </div>
        </div>

        {/* Complaint info bar */}
        <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 flex items-center gap-4 flex-wrap text-xs text-gray-600">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">Status:</span>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-medium bg-slate-50 text-slate-600 border-slate-200">
              {complaint.status?.replace(/_/g, ' ')}
            </Badge>
          </div>
          {complaint.category && (
            <div className="flex items-center gap-1.5">
              <Wrench className="h-3 w-3 text-gray-400" />
              <span>{complaint.category}</span>
            </div>
          )}
          {complaint.customerName && (
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 text-gray-400" />
              <span>{complaint.customerName}</span>
            </div>
          )}
          {currentAssignment?.assignmentStatus && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Assignment:</span>
              <Badge variant="outline" className={cn(
                'text-[10px] h-5 px-1.5 font-medium',
                currentAssignment.assignmentStatus === 'PENDING_ACCEPTANCE' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                currentAssignment.assignmentStatus === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                currentAssignment.assignmentStatus === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                'bg-gray-50 text-gray-500 border-gray-200'
              )}>
                {currentAssignment.assignmentStatus.replace(/_/g, ' ')}
              </Badge>
            </div>
          )}
          {isReassignment && complaint.reassignmentCount !== undefined && complaint.reassignmentCount > 0 && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertCircle className="h-3 w-3" />
              <span>Reassigned {complaint.reassignmentCount} time(s)</span>
            </div>
          )}
        </div>

        {/* Main 3-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left: Technician list */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search + Filters bar */}
            <Card className="rounded-2xl border-0 shadow-sm bg-white p-4">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name, ID, email, phone..."
                    className="pl-10 h-9 rounded-xl"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                      onClick={() => setSearch('')}
                    >
                      <X className="h-3 w-3 text-gray-500" />
                    </button>
                  )}
                </div>

                {/* Department filter */}
                {departments.length > 0 && (
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="h-9 w-[160px] rounded-xl text-xs">
                      <Briefcase className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Departments</SelectItem>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-9 w-[150px] rounded-xl text-xs">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status filter chips */}
              <div className="flex items-center gap-2 mt-3">
                {STATUS_FILTERS.map((f) => (
                  <Button
                    key={f.value}
                    variant={statusFilter === f.value ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'h-7 text-[11px] gap-1 rounded-lg',
                      statusFilter === f.value
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                    onClick={() => setStatusFilter(f.value)}
                  >
                    <f.icon className="h-3 w-3" />
                    {f.label}
                    <span className={cn(
                      'ml-0.5 text-[10px]',
                      statusFilter === f.value ? 'text-emerald-200' : 'text-gray-400'
                    )}>
                      {filterCounts[f.count]}
                    </span>
                  </Button>
                ))}
              </div>
            </Card>

            {/* Technician cards list */}
            <div className="min-h-[200px]">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-11 w-11 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-5 w-16" />
                      </div>
                      <div className="mt-3">
                        <Skeleton className="h-1.5 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : technicians.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Users className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No technicians found</p>
                  <p className="text-xs mt-1 text-gray-400">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {technicians.map((tech) => (
                      <TechnicianCard
                        key={tech.id}
                        tech={tech}
                        isSelected={selectedId === tech.id}
                        onSelect={() => setSelectedId(tech.id === selectedId ? null : tech.id)}
                        isReassignment={!!isReassignment}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar: Details + Assignment + History */}
          <div className="space-y-4">
            {/* Selected technician details or current assignment */}
            <Card className="rounded-2xl border-0 shadow-sm bg-white">
              <CardHeader className="pb-3 px-4 pt-4">
                <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  {selectedTech ? (
                    <>
                      <UserCheck className="h-4 w-4 text-emerald-600" />
                      {isReassignment ? 'New Assignment' : 'Assignment Target'}
                    </>
                  ) : (
                    <>
                      <Info className="h-4 w-4 text-gray-400" />
                      {currentAssignment?.assignedToName ? 'Current Assignment' : 'No Assignment'}
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {selectedTech ? (
                  <div className="space-y-4">
                    {/* Tech header */}
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-14 w-14">
                          {selectedTech.avatar ? (
                            <img src={selectedTech.avatar} alt="" className="object-cover" />
                          ) : (
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold">
                              {getInitials(selectedTech.name)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className={cn(
                          'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white',
                          AVAILABILITY_CONFIG[selectedTech.availabilityStatus]?.dotColor || 'bg-gray-400'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-900 truncate">{selectedTech.name}</p>
                        <p className="text-xs text-gray-500">{selectedTech.employeeNumber || ''}</p>
                        {selectedTech.departmentName && (
                          <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3" />{selectedTech.departmentName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="space-y-1.5">
                      <a href={`mailto:${selectedTech.email}`} className="flex items-center gap-2 text-xs text-gray-500 hover:text-emerald-600 transition-colors">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{selectedTech.email}</span>
                      </a>
                      {selectedTech.phone && (
                        <a href={`tel:${selectedTech.phone}`} className="flex items-center gap-2 text-xs text-gray-500 hover:text-emerald-600 transition-colors">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{selectedTech.phone}</span>
                        </a>
                      )}
                    </div>

                    <Separator />

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                        <p className="text-lg font-bold text-gray-900">{selectedTech.activeJobs}</p>
                        <p className="text-[10px] text-gray-500">Active Jobs</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                        <p className="text-lg font-bold text-gray-900">{selectedTech.totalCompleted}</p>
                        <p className="text-[10px] text-gray-500">Completed</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                        <p className="text-lg font-bold text-gray-900">
                          {selectedTech.avgCompletionHours ? `${selectedTech.avgCompletionHours}h` : '—'}
                        </p>
                        <p className="text-[10px] text-gray-500">Avg Time</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                        <p className="text-lg font-bold text-gray-900">{selectedTech.workloadPercent}%</p>
                        <p className="text-[10px] text-gray-500">Workload</p>
                      </div>
                    </div>

                    {/* Skills */}
                    {selectedTech.skills.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedTech.skills.map((skill, i) => (
                            <Badge key={i} variant="outline" className={cn(
                              'text-[9px] h-5 px-1.5 border font-medium',
                              CATEGORY_COLORS[skill] || 'bg-gray-100 text-gray-600 border-gray-200'
                            )}>
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Reason input */}
                    <div>
                      <Label className="text-xs text-gray-600 mb-1.5 block">
                        {isReassignment ? 'Reassignment Reason (required)' : 'Assignment Reason (optional)'}
                      </Label>
                      <Textarea
                        placeholder={
                          isReassignment
                            ? 'Why is this being reassigned?'
                            : 'Any notes about this assignment...'
                        }
                        className="text-sm min-h-[60px] resize-none rounded-xl"
                        rows={2}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 h-9 rounded-xl"
                        onClick={() => setSelectedId(null)}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                        onClick={handleAssign}
                        disabled={submitting || !selectedTech.canAssign}
                      >
                        {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                        <UserCheck className="h-4 w-4 mr-1.5" />
                        {isReassignment ? 'Reassign' : 'Assign'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <UserCheck className="h-7 w-7 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium">
                      {isReassignment ? 'Select a new technician' : 'Select a technician to assign'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Click on a technician card from the list
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assignment History */}
            <AssignmentHistorySidebar complaintId={complaintId} />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}