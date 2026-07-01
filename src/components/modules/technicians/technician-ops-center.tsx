'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Users, CheckCircle, Clock, CalendarOff, AlertTriangle, WifiOff,
  Search, RefreshCw, LayoutGrid, List, Phone, Eye, Briefcase,
  MapPin, Star, X, ChevronRight, Activity, Timer, TrendingUp,
  CircleDot, UserCheck, Wrench, Building2, Mail,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

// ============ TYPES ============

type TechnicianStatus =
  | 'available' | 'assigned' | 'travelling' | 'on_site'
  | 'working' | 'waiting_parts' | 'lunch_break' | 'offline' | 'shift_ended'
  | 'on_leave' | 'emergency';

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
  availabilityStatus: TechnicianStatus;
  isCurrentlyAssigned: boolean;
  avgCompletionHours: number | null;
  totalCompleted: number;
  completionRate: number | null;
  skills: string[];
  currentTasks: CurrentTask[];
  canAssign: boolean;
}

interface CurrentTask {
  id: string;
  title: string;
  complaintNumber?: string;
  customerName?: string;
  site?: string;
  status: string;
  priority: string;
  category: string | null;
  progress?: number;
  createdAt: string;
}

interface TechnicianStats {
  total: number;
  available: number;
  busy: number;
  onLeave: number;
  emergency: number;
  offline: number;
}

interface TechnicianDetail extends Technician {
  bio?: string;
  joinDate?: string;
  shiftStart?: string;
  shiftEnd?: string;
  location?: string;
}

interface PerformanceData {
  completedJobs: number;
  avgSlaHours: number;
  customerRating: number;
  firstTimeFixRate: number;
  reworkRate: number;
  attendancePercent: number;
  punctuality: number;
  avgTravelTime: number;
  revenueGenerated: number;
  laborHours: number;
}

interface TimelineEntry {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  type: 'check_in' | 'job_start' | 'job_complete' | 'travel' | 'break' | 'note' | 'status_change';
}

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  hoursWorked: number;
  status: string;
}

interface Department {
  id: string;
  name: string;
}

// ============ STATUS CONFIG ============

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  available:       { label: 'Available',      bg: 'bg-emerald-500',  text: 'text-white', border: 'border-emerald-500', dot: 'bg-emerald-500' },
  assigned:        { label: 'Assigned',       bg: 'bg-blue-500',     text: 'text-white', border: 'border-blue-500',    dot: 'bg-blue-500' },
  travelling:      { label: 'Travelling',     bg: 'bg-amber-500',    text: 'text-white', border: 'border-amber-500',   dot: 'bg-amber-500' },
  on_site:         { label: 'On Site',        bg: 'bg-yellow-500',   text: 'text-white', border: 'border-yellow-500',  dot: 'bg-yellow-500' },
  working:         { label: 'Working',        bg: 'bg-red-500',      text: 'text-white', border: 'border-red-500',     dot: 'bg-red-500' },
  waiting_parts:   { label: 'Waiting Parts',  bg: 'bg-purple-500',   text: 'text-white', border: 'border-purple-500',  dot: 'bg-purple-500' },
  lunch_break:     { label: 'Lunch Break',    bg: 'bg-gray-300',     text: 'text-gray-800', border: 'border-gray-300', dot: 'bg-gray-400' },
  offline:         { label: 'Offline',        bg: 'bg-gray-500',     text: 'text-white', border: 'border-gray-500',    dot: 'bg-gray-500' },
  shift_ended:     { label: 'Shift Ended',    bg: 'bg-gray-400',     text: 'text-gray-700', border: 'border-gray-400', dot: 'bg-gray-400' },
  on_leave:        { label: 'On Leave',       bg: 'bg-blue-500',     text: 'text-white', border: 'border-blue-500',    dot: 'bg-blue-500' },
  emergency:       { label: 'Emergency',      bg: 'bg-red-500',      text: 'text-white', border: 'border-red-500',     dot: 'bg-red-500' },
};

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  low:      { bg: 'bg-gray-100',    text: 'text-gray-700',   border: 'border-gray-300' },
  medium:   { bg: 'bg-amber-100',   text: 'text-amber-700',  border: 'border-amber-300' },
  high:     { bg: 'bg-orange-100',  text: 'text-orange-700', border: 'border-orange-300' },
  critical: { bg: 'bg-rose-100',    text: 'text-rose-700',   border: 'border-rose-300' },
};

const KPI_CARDS = [
  { key: 'total' as const, label: 'Total Technicians', icon: Users,         bg: 'bg-gray-50',     border: 'border-gray-200',    text: 'text-gray-700',   iconColor: 'text-gray-500' },
  { key: 'available' as const, label: 'Available',     icon: CheckCircle,   bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700', iconColor: 'text-emerald-500' },
  { key: 'busy' as const,     label: 'Busy',           icon: Clock,         bg: 'bg-orange-50',   border: 'border-orange-200', text: 'text-orange-700',  iconColor: 'text-orange-500' },
  { key: 'onLeave' as const,  label: 'On Leave',       icon: CalendarOff,   bg: 'bg-blue-50',     border: 'border-blue-200',   text: 'text-blue-700',    iconColor: 'text-blue-500' },
  { key: 'emergency' as const, label: 'Emergency',     icon: AlertTriangle, bg: 'bg-red-50',      border: 'border-red-200',    text: 'text-red-700',     iconColor: 'text-red-500' },
  { key: 'offline' as const,  label: 'Offline',        icon: WifiOff,       bg: 'bg-gray-50',     border: 'border-gray-200',   text: 'text-gray-500',    iconColor: 'text-gray-400' },
] as const;

const STATUS_FILTER_OPTIONS = [
  { value: '__all__', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'travelling', label: 'Travelling' },
  { value: 'on_site', label: 'On Site' },
  { value: 'working', label: 'Working' },
  { value: 'waiting_parts', label: 'Waiting Parts' },
  { value: 'lunch_break', label: 'Lunch Break' },
  { value: 'offline', label: 'Offline' },
  { value: 'shift_ended', label: 'Shift Ended' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'emergency', label: 'Emergency' },
];

const SORT_OPTIONS = [
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'availability', label: 'Availability' },
  { value: 'workload', label: 'Workload (Low → High)' },
  { value: 'recently_active', label: 'Recently Active' },
];

function token(): string { return localStorage.getItem('cmms_token') || ''; }

// ============ PULSING DOT ============

function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
    </span>
  );
}

// ============ KPI CARD ============

function KpiCard({ config, count, total }: { config: typeof KPI_CARDS[number]; count: number; total: number }) {
  const Icon = config.icon;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <Card className={cn('border rounded-xl transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default', config.bg, config.border)}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('flex-shrink-0 p-2.5 rounded-lg bg-white/70', config.iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground truncate">{config.label}</p>
          <p className={cn('text-2xl font-bold leading-tight', config.text)}>{count}</p>
        </div>
        {config.key !== 'total' && (
          <span className={cn('text-xs font-semibold tabular-nums', config.text)}>{pct}%</span>
        )}
      </CardContent>
    </Card>
  );
}

// ============ STATUS BADGE ============

function StatusBadge({ status }: { status: TechnicianStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', cfg.bg, cfg.text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ============ WORKLOAD BAR ============

function WorkloadBar({ percent }: { percent: number }) {
  const color = percent >= 80 ? '[&>div]:bg-red-500' : percent >= 60 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500';
  const textColor = percent >= 80 ? 'text-red-600' : percent >= 60 ? 'text-amber-600' : 'text-emerald-600';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1"><Progress value={Math.min(percent, 100)} className={cn('h-1.5', color)} /></div>
      <span className={cn('text-[10px] font-bold tabular-nums', textColor)}>{percent}%</span>
    </div>
  );
}

// ============ TECHNICIAN GRID CARD ============

function TechnicianGridCard({ tech, onViewDetail }: { tech: Technician; onViewDetail: () => void }) {
  const statusCfg = STATUS_CONFIG[tech.availabilityStatus] || STATUS_CONFIG.offline;
  const initials = tech.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const primaryTask = tech.currentTasks[0];
  const priorityCfg = primaryTask ? PRIORITY_CONFIG[primaryTask.priority] || PRIORITY_CONFIG.medium : null;

  return (
    <Card className={cn(
      'rounded-xl border-l-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden',
      'bg-white',
      statusCfg.border,
    )}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 pb-3">
          <div className="relative flex-shrink-0">
            <Avatar className={cn('h-11 w-11 ring-2 ring-offset-1 ring-offset-white', statusCfg.border)}>
              <AvatarFallback className={cn('text-sm font-bold bg-emerald-50 text-emerald-700', tech.onLeave && 'bg-blue-50 text-blue-700')}>
                {tech.avatar ? <img src={tech.avatar} alt={tech.name} className="h-full w-full rounded-full object-cover" /> : initials}
              </AvatarFallback>
            </Avatar>
            {tech.isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-gray-900 truncate">{tech.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{tech.employeeNumber}</p>
          </div>
          <StatusBadge status={tech.availabilityStatus} />
        </div>

        {/* Dept & Role */}
        <div className="px-4 pb-3 flex items-center gap-3 text-xs text-muted-foreground">
          {tech.departmentName && (
            <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{tech.departmentName}</span>
          )}
          {tech.role && (
            <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{tech.role}</span>
          )}
        </div>

        <Separator className="mx-4" />

        {/* Current Assignment */}
        {primaryTask && (
          <div className="px-4 py-3 bg-gray-50/60">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Current Assignment</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-900 truncate">{primaryTask.complaintNumber || primaryTask.title}</span>
                {priorityCfg && (
                  <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border', priorityCfg.bg, priorityCfg.text, priorityCfg.border)}>
                    {primaryTask.priority}
                  </Badge>
                )}
              </div>
              {primaryTask.customerName && (
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />{primaryTask.customerName}</p>
              )}
              {primaryTask.site && (
                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{primaryTask.site}</p>
              )}
              {primaryTask.category && (
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Wrench className="h-3 w-3" />{primaryTask.category}</p>
              )}
              {typeof primaryTask.progress === 'number' && (
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground">Progress</span>
                    <span className="text-[10px] font-semibold text-emerald-600">{primaryTask.progress}%</span>
                  </div>
                  <Progress value={primaryTask.progress} className="h-1.5 [&>div]:bg-emerald-500" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="px-4 py-3 grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-xs font-bold text-gray-900">{tech.activeJobs}<span className="text-muted-foreground font-normal">/{tech.maxJobs}</span></p>
            <p className="text-[10px] text-muted-foreground">Active Jobs</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-xs font-bold text-emerald-600">{tech.completionRate != null ? `${tech.completionRate}%` : '—'}</p>
            <p className="text-[10px] text-muted-foreground">Completion</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-gray-900">{tech.avgCompletionHours != null ? `${tech.avgCompletionHours}h` : '—'}</p>
            <p className="text-[10px] text-muted-foreground">Avg Time</p>
          </div>
        </div>

        {/* Skills */}
        {tech.skills.length > 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-1">
            {tech.skills.slice(0, 4).map((skill) => (
              <Badge key={skill} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-2 py-0">
                {skill}
              </Badge>
            ))}
            {tech.skills.length > 4 && (
              <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 text-[10px] px-2 py-0">
                +{tech.skills.length - 4}
              </Badge>
            )}
          </div>
        )}

        <Separator className="mx-4" />

        {/* Footer */}
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {tech.lastLogin ? `Last: ${formatDistanceToNow(new Date(tech.lastLogin), { addSuffix: true })}` : 'Never logged in'}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                Actions <ChevronRight className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onViewDetail} className="gap-2 text-xs">
                <Eye className="h-3.5 w-3.5" /> View Detail
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-xs">
                <Briefcase className="h-3.5 w-3.5" /> Assign Job
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-xs">
                <Phone className="h-3.5 w-3.5" /> Call
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ LIST VIEW TABLE ROW ============

function TechnicianListRow({ tech, onViewDetail }: { tech: Technician; onViewDetail: () => void }) {
  const statusCfg = STATUS_CONFIG[tech.availabilityStatus] || STATUS_CONFIG.offline;
  const initials = tech.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const primaryTask = tech.currentTasks[0];

  return (
    <TableRow className="hover:bg-emerald-50/30 cursor-pointer" onClick={onViewDetail}>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs font-bold bg-emerald-50 text-emerald-700">
                {tech.avatar ? <img src={tech.avatar} alt={tech.name} className="h-full w-full rounded-full object-cover" /> : initials}
              </AvatarFallback>
            </Avatar>
            {tech.isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
            )}
          </div>
          <div>
            <p className="font-medium text-sm text-gray-900">{tech.name}</p>
            <p className="text-xs text-muted-foreground">{tech.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground font-mono">{tech.employeeNumber}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{tech.departmentName || '—'}</TableCell>
      <TableCell>
        <StatusBadge status={tech.availabilityStatus} />
      </TableCell>
      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
        {primaryTask ? primaryTask.title : <span className="text-gray-300">No active job</span>}
      </TableCell>
      <TableCell>
        <WorkloadBar percent={tech.workloadPercent} />
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => e.stopPropagation()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetail(); }} className="gap-2 text-xs">
              <Eye className="h-3.5 w-3.5" /> View Detail
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs">
              <Briefcase className="h-3.5 w-3.5" /> Assign Job
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs">
              <Phone className="h-3.5 w-3.5" /> Call
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// ============ DETAIL PANEL: OVERVIEW TAB ============

function OverviewTab({ tech }: { tech: TechnicianDetail }) {
  const statusCfg = STATUS_CONFIG[tech.availabilityStatus] || STATUS_CONFIG.offline;
  const initials = tech.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const summaryCards = [
    { label: 'Active Jobs', value: `${tech.activeJobs}/${tech.maxJobs}`, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
    { label: 'Completed', value: `${tech.totalCompleted}`, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { label: 'Completion Rate', value: tech.completionRate != null ? `${tech.completionRate}%` : '—', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { label: 'Avg Time', value: tech.avgCompletionHours != null ? `${tech.avgCompletionHours}h` : '—', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  ];

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 ring-2 ring-offset-2 ring-offset-white" style={{ ringColor: 'var(--tw-ring-color)' }}>
          <AvatarFallback className={cn('text-xl font-bold bg-emerald-50 text-emerald-700')}>
            {tech.avatar ? <img src={tech.avatar} alt={tech.name} className="h-full w-full rounded-full object-cover" /> : initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900">{tech.name}</h3>
          <p className="text-sm text-muted-foreground">{tech.employeeNumber} · {tech.role}</p>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={tech.availabilityStatus} />
            {tech.isOnline && <span className="text-xs text-emerald-600 font-medium">Online</span>}
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-gray-700 truncate">{tech.email}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="text-gray-700">{tech.phone || '—'}</span>
        </div>
        {tech.departmentName && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-gray-700">{tech.departmentName}</span>
          </div>
        )}
        {tech.location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-gray-700">{tech.location}</span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {summaryCards.map((c) => (
          <Card key={c.label} className={cn('border rounded-lg', c.bg, c.border)}>
            <CardContent className="p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{c.label}</p>
              <p className={cn('text-xl font-bold', c.color)}>{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Current Assignments */}
      {tech.currentTasks.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Current Assignments</h4>
          <div className="space-y-2">
            {tech.currentTasks.map((task) => {
              const pcfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
              return (
                <Card key={task.id} className="border rounded-lg overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900 truncate">{task.complaintNumber || task.title}</span>
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border flex-shrink-0 ml-2', pcfg.bg, pcfg.text, pcfg.border)}>
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {task.customerName && <span>{task.customerName}</span>}
                      {task.site && <span>· {task.site}</span>}
                    </div>
                    {typeof task.progress === 'number' && (
                      <div className="mt-2">
                        <Progress value={task.progress} className="h-1.5 [&>div]:bg-emerald-500" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Skills */}
      {tech.skills.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Skills & Categories</h4>
          <div className="flex flex-wrap gap-1.5">
            {tech.skills.map((skill) => (
              <Badge key={skill} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-2.5 py-1">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ DETAIL PANEL: COMPLAINTS TAB ============

function ComplaintsTab({ techId }: { techId: string }) {
  const [activeComplaints, setActiveComplaints] = useState<CurrentTask[]>([]);
  const [completedComplaints, setCompletedComplaints] = useState<CurrentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [prevId, setPrevId] = useState(techId);
  if (prevId !== techId) { setPrevId(techId); setLoading(true); setActiveComplaints([]); setCompletedComplaints([]); }

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/technicians/${techId}?include=complaints`, {
      headers: { Authorization: 'Bearer ' + token() },
      signal: ctrl.signal,
    })
      .then(r => r.json())
      .then((data: { activeComplaints?: CurrentTask[]; completedComplaints?: CurrentTask[] }) => {
        setActiveComplaints(data.activeComplaints || []);
        setCompletedComplaints(data.completedComplaints || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [techId]);

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Active Complaints ({activeComplaints.length})</h4>
        {activeComplaints.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No active complaints</p>
        ) : (
          <div className="space-y-2">
            {activeComplaints.map((c) => {
              const pcfg = PRIORITY_CONFIG[c.priority] || PRIORITY_CONFIG.medium;
              return (
                <Card key={c.id} className="border rounded-lg">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">{c.complaintNumber || c.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {c.customerName && <span>{c.customerName}</span>}
                        {c.category && <span>· {c.category}</span>}
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border flex-shrink-0 ml-2', pcfg.bg, pcfg.text, pcfg.border)}>
                      {c.priority}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <Separator />
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Recently Completed ({completedComplaints.length})</h4>
        {completedComplaints.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No completed complaints yet</p>
        ) : (
          <div className="space-y-2">
            {completedComplaints.slice(0, 10).map((c) => (
              <Card key={c.id} className="border rounded-lg">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-700">{c.complaintNumber || c.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.customerName}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border bg-emerald-50 text-emerald-700 border-emerald-200 flex-shrink-0 ml-2">
                    Done
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ DETAIL PANEL: WORK ORDERS TAB ============

function WorkOrdersTab({ techId }: { techId: string }) {
  const [activeWOs, setActiveWOs] = useState<CurrentTask[]>([]);
  const [completedWOs, setCompletedWOs] = useState<CurrentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [prevId, setPrevId] = useState(techId);
  if (prevId !== techId) { setPrevId(techId); setLoading(true); setActiveWOs([]); setCompletedWOs([]); }

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/technicians/${techId}?include=workOrders`, {
      headers: { Authorization: 'Bearer ' + token() },
      signal: ctrl.signal,
    })
      .then(r => r.json())
      .then((data: { activeWorkOrders?: CurrentTask[]; completedWorkOrders?: CurrentTask[] }) => {
        setActiveWOs(data.activeWorkOrders || []);
        setCompletedWOs(data.completedWorkOrders || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [techId]);

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Active Work Orders ({activeWOs.length})</h4>
        {activeWOs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No active work orders</p>
        ) : (
          <div className="space-y-2">
            {activeWOs.map((wo) => (
              <Card key={wo.id} className="border rounded-lg">
                <CardContent className="p-3">
                  <p className="text-sm font-semibold text-gray-900">{wo.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {wo.category && <span>{wo.category}</span>}
                    {wo.site && <span>· {wo.site}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Separator />
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Recently Completed ({completedWOs.length})</h4>
        {completedWOs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No completed work orders yet</p>
        ) : (
          <div className="space-y-2">
            {completedWOs.slice(0, 10).map((wo) => (
              <Card key={wo.id} className="border rounded-lg">
                <CardContent className="p-3">
                  <p className="text-sm font-medium text-gray-700">{wo.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{wo.category}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ DETAIL PANEL: TIMELINE TAB ============

function TimelineTab({ techId }: { techId: string }) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [prevId, setPrevId] = useState(techId);
  if (prevId !== techId) { setPrevId(techId); setLoading(true); setEntries([]); }

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/technicians/${techId}/timeline`, {
      headers: { Authorization: 'Bearer ' + token() },
      signal: ctrl.signal,
    })
      .then(r => r.json())
      .then((data: TimelineEntry[]) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [techId]);

  const typeIcon: Record<string, string> = {
    check_in: 'bg-emerald-500',
    job_start: 'bg-blue-500',
    job_complete: 'bg-emerald-600',
    travel: 'bg-amber-500',
    break: 'bg-gray-400',
    note: 'bg-purple-500',
    status_change: 'bg-orange-500',
  };

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>;
  }

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-10">No activity recorded today</p>;
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-2 bottom-2 w-px bg-emerald-200" />
      <div className="space-y-4">
        {entries.map((entry, idx) => (
          <div key={entry.id || idx} className="relative flex gap-3">
            <div className={cn('absolute -left-4 h-3 w-3 rounded-full border-2 border-white mt-1', typeIcon[entry.type] || 'bg-gray-400')} />
            <div className="flex-1 bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-900">{entry.action}</span>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(entry.timestamp), 'HH:mm')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{entry.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ DETAIL PANEL: PERFORMANCE TAB ============

function PerformanceTab({ techId }: { techId: string }) {
  const [perf, setPerf] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [prevId, setPrevId] = useState(techId);
  if (prevId !== techId) { setPrevId(techId); setLoading(true); setPerf(null); }

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/technicians/${techId}/performance`, {
      headers: { Authorization: 'Bearer ' + token() },
      signal: ctrl.signal,
    })
      .then(r => r.json())
      .then((data: PerformanceData) => setPerf(data))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [techId]);

  if (loading) {
    return <div className="grid grid-cols-2 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>;
  }

  if (!perf) {
    return <p className="text-sm text-muted-foreground text-center py-10">No performance data available</p>;
  }

  const metrics = [
    { label: 'Completed Jobs', value: perf.completedJobs, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { label: 'Avg SLA (hrs)', value: perf.avgSlaHours, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { label: 'Customer Rating', value: `${perf.customerRating}/5`, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: Star },
    { label: 'First-Time Fix', value: `${perf.firstTimeFixRate}%`, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    { label: 'Rework Rate', value: `${perf.reworkRate}%`, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    { label: 'Attendance', value: `${perf.attendancePercent}%`, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { label: 'Punctuality', value: `${perf.punctuality}%`, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { label: 'Avg Travel Time', value: `${perf.avgTravelTime} min`, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
    { label: 'Revenue', value: `$${perf.revenueGenerated.toLocaleString()}`, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { label: 'Labor Hours', value: `${perf.laborHours}h`, color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {metrics.map((m) => (
        <Card key={m.label} className={cn('border rounded-lg', m.bg, m.border)}>
          <CardContent className="p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{m.label}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {m.icon && <m.icon className="h-3.5 w-3.5" />}
              <p className={cn('text-xl font-bold', m.color)}>{m.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============ DETAIL PANEL: ATTENDANCE TAB ============

function AttendanceTab({ techId }: { techId: string }) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [prevId, setPrevId] = useState(techId);
  if (prevId !== techId) { setPrevId(techId); setLoading(true); setRecords([]); }

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/technicians/${techId}?include=attendance`, {
      headers: { Authorization: 'Bearer ' + token() },
      signal: ctrl.signal,
    })
      .then(r => r.json())
      .then((data: { attendance?: AttendanceRecord[] }) => setRecords(data.attendance || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [techId]);

  if (loading) {
    return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}</div>;
  }

  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-10">No attendance records this month</p>;
  }

  return (
    <ScrollArea className="max-h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-[10px] uppercase">Date</TableHead>
            <TableHead className="text-[10px] uppercase">Check In</TableHead>
            <TableHead className="text-[10px] uppercase">Check Out</TableHead>
            <TableHead className="text-[10px] uppercase">Hours</TableHead>
            <TableHead className="text-[10px] uppercase">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((rec) => {
            const statusColor = rec.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              rec.status === 'late' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                rec.status === 'absent' ? 'bg-red-50 text-red-700 border-red-200' :
                  'bg-gray-50 text-gray-600 border-gray-200';
            return (
              <TableRow key={rec.id}>
                <TableCell className="text-xs">{format(new Date(rec.date), 'MMM dd, EEE')}</TableCell>
                <TableCell className="text-xs font-mono">{rec.checkIn ? format(new Date(rec.checkIn), 'HH:mm') : '—'}</TableCell>
                <TableCell className="text-xs font-mono">{rec.checkOut ? format(new Date(rec.checkOut), 'HH:mm') : '—'}</TableCell>
                <TableCell className="text-xs font-semibold">{rec.hoursWorked.toFixed(1)}h</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border capitalize', statusColor)}>
                    {rec.status}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

// ============ DETAIL PANEL ============

function TechnicianDetailPanel({ techId, open, onClose }: { techId: string | null; open: boolean; onClose: () => void }) {
  const [detail, setDetail] = useState<TechnicianDetail | null>(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [detailLoading, setDetailLoading] = useState(false);
  const [prevId, setPrevId] = useState(techId);
  if (prevId !== techId) { setPrevId(techId); setDetailLoading(true); setDetail(null); setDetailTab('overview'); }

  useEffect(() => {
    if (!techId || !open) return;
    const ctrl = new AbortController();
    fetch(`/api/technicians/${techId}`, {
      headers: { Authorization: 'Bearer ' + token() },
      signal: ctrl.signal,
    })
      .then(r => r.json())
      .then((data: TechnicianDetail) => setDetail(data))
      .catch(() => {})
      .finally(() => setDetailLoading(false));
    return () => ctrl.abort();
  }, [techId, open]);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 overflow-hidden">
        {detailLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-48 rounded" />
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        ) : detail ? (
          <>
            <SheetHeader className="p-4 pb-0 border-b">
              <SheetTitle className="text-base">Technician Details</SheetTitle>
              <SheetDescription>View full profile, assignments, and performance</SheetDescription>
            </SheetHeader>
            <Tabs value={detailTab} onValueChange={setDetailTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4 h-auto p-0 flex-shrink-0">
                {[
                  { value: 'overview', label: 'Overview', icon: UserCheck },
                  { value: 'complaints', label: 'Complaints', icon: AlertTriangle },
                  { value: 'workOrders', label: 'Work Orders', icon: Wrench },
                  { value: 'timeline', label: 'Timeline', icon: Activity },
                  { value: 'performance', label: 'Performance', icon: TrendingUp },
                  { value: 'attendance', label: 'Attendance', icon: Clock },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="relative px-3 py-2.5 text-xs font-medium data-[state=active]:text-emerald-700 data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-4">
                  <TabsContent value="overview" className="mt-0">
                    <OverviewTab tech={detail} />
                  </TabsContent>
                  <TabsContent value="complaints" className="mt-0">
                    <ComplaintsTab techId={detail.id} />
                  </TabsContent>
                  <TabsContent value="workOrders" className="mt-0">
                    <WorkOrdersTab techId={detail.id} />
                  </TabsContent>
                  <TabsContent value="timeline" className="mt-0">
                    <TimelineTab techId={detail.id} />
                  </TabsContent>
                  <TabsContent value="performance" className="mt-0">
                    <PerformanceTab techId={detail.id} />
                  </TabsContent>
                  <TabsContent value="attendance" className="mt-0">
                    <AttendanceTab techId={detail.id} />
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          </>
        ) : (
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Failed to load technician details.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ============ SKELETON LOADERS ============

function KpiSkeletons() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-1.5" />
              <Skeleton className="h-7 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CardSkeletons() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="border rounded-xl overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-40" />
            <Separator />
            <Skeleton className="h-16 w-full rounded-lg" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-8 rounded" />
              <Skeleton className="h-8 rounded" />
              <Skeleton className="h-8 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============ MAIN COMPONENT ============

export function TechnicianOpsCenter() {
  // State
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TechnicianStats>({ total: 0, available: 0, busy: 0, onLeave: 0, emergency: 0, offline: 0 });
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('__all__');
  const [departmentFilter, setDepartmentFilter] = useState('__all__');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Detail panel
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Debounce
  const searchRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch('/api/departments', { headers: { Authorization: 'Bearer ' + token() } });
      if (res.ok) {
        const data = await res.json();
        setDepartments(Array.isArray(data) ? data : data.data || []);
      }
    } catch { /* ignore */ }
  }, []);

  // Fetch technicians
  const fetchTechnicians = useCallback(async (searchTerm?: string) => {
    if (!mountedRef.current) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter !== '__all__') params.set('status', statusFilter);
      if (departmentFilter !== '__all__') params.set('department', departmentFilter);
      params.set('sort', sortBy);

      const res = await fetch(`/api/technicians?${params.toString()}`, {
        headers: { Authorization: 'Bearer ' + token() },
      });
      if (!res.ok) return;
      const data = await res.json();
      const list: Technician[] = Array.isArray(data) ? data : data.data || data.technicians || [];
      if (mountedRef.current) {
        setTechnicians(list);

        // Compute stats from list
        const s: TechnicianStats = { total: list.length, available: 0, busy: 0, onLeave: 0, emergency: 0, offline: 0 };
        list.forEach(t => {
          if (t.availabilityStatus === 'available') s.available++;
          else if (t.availabilityStatus === 'on_leave') s.onLeave++;
          else if (t.availabilityStatus === 'emergency') s.emergency++;
          else if (t.availabilityStatus === 'offline' || t.availabilityStatus === 'shift_ended') s.offline++;
          else s.busy++;
        });
        setStats(s);
      }
    } catch { /* ignore */ }
    finally { if (mountedRef.current) setLoading(false); }
  }, [statusFilter, departmentFilter, sortBy]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    fetchDepartments();
    fetchTechnicians();
    return () => { mountedRef.current = false; };
  }, [fetchDepartments, fetchTechnicians]);

  // Search debounce
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      fetchTechnicians(search);
    }, 250);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search]);

  // Client-side sort (as backup if API doesn't sort)
  const sortedTechnicians = useMemo(() => {
    const arr = [...technicians];
    switch (sortBy) {
      case 'name':
        return arr.sort((a, b) => a.name.localeCompare(b.name));
      case 'availability':
        return arr.sort((a, b) => {
          const order: Record<string, number> = { available: 0, assigned: 1, travelling: 2, on_site: 3, working: 4, waiting_parts: 5, lunch_break: 6, offline: 7, shift_ended: 8, on_leave: 9, emergency: 10 };
          return (order[a.availabilityStatus] ?? 99) - (order[b.availabilityStatus] ?? 99);
        });
      case 'workload':
        return arr.sort((a, b) => a.workloadPercent - b.workloadPercent);
      case 'recently_active':
        return arr.sort((a, b) => {
          const da = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
          const db = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
          return db - da;
        });
      default:
        return arr;
    }
  }, [technicians, sortBy]);

  const handleViewDetail = useCallback((techId: string) => {
    setSelectedTechId(techId);
    setDetailOpen(true);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchTechnicians(search);
    fetchDepartments();
  }, [fetchTechnicians, fetchDepartments, search]);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* SECTION 1: KPI CARDS */}
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            Technician Operations Center
          </h2>
          <LiveDot />
        </div>

        {loading && technicians.length === 0 ? (
          <KpiSkeletons />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {KPI_CARDS.map((cfg) => (
              <KpiCard key={cfg.key} config={cfg} count={stats[cfg.key]} total={stats.total} />
            ))}
          </div>
        )}

        <Separator />

        {/* SECTION 2: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, phone, department, skill..."
              className="pl-9 h-10 rounded-lg border-gray-200 focus:border-emerald-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px] h-10 rounded-lg">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-[160px] h-10 rounded-lg">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[160px] h-10 rounded-lg">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn('h-8 w-8 p-0 rounded-md', viewMode === 'grid' && 'bg-emerald-600 hover:bg-emerald-700 text-white')}
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Grid View</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn('h-8 w-8 p-0 rounded-md', viewMode === 'list' && 'bg-emerald-600 hover:bg-emerald-700 text-white')}
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>List View</TooltipContent>
            </Tooltip>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-lg border-gray-200 hover:border-emerald-300 hover:text-emerald-600"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </div>

        {/* SECTION 3: TECHNICIAN CARDS / TABLE */}
        {loading && technicians.length === 0 ? (
          <CardSkeletons />
        ) : sortedTechnicians.length === 0 ? (
          <Card className="border border-dashed border-gray-300 rounded-xl">
            <CardContent className="py-16 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-1">No technicians found</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {search || statusFilter !== '__all__' || departmentFilter !== '__all__'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No technician records available in the system.'}
              </p>
              {(search || statusFilter !== '__all__' || departmentFilter !== '__all__') && (
                <Button
                  variant="outline"
                  className="mt-4 rounded-lg border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                  onClick={() => { setSearch(''); setStatusFilter('__all__'); setDepartmentFilter('__all__'); }}
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedTechnicians.map((tech) => (
              <TechnicianGridCard key={tech.id} tech={tech} onViewDetail={() => handleViewDetail(tech.id)} />
            ))}
          </div>
        ) : (
          <Card className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                  <TableHead className="text-xs font-semibold">Technician</TableHead>
                  <TableHead className="text-xs font-semibold">Employee ID</TableHead>
                  <TableHead className="text-xs font-semibold hidden sm:table-cell">Department</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold hidden lg:table-cell">Current Job</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Workload</TableHead>
                  <TableHead className="text-xs font-semibold w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTechnicians.map((tech) => (
                  <TechnicianListRow key={tech.id} tech={tech} onViewDetail={() => handleViewDetail(tech.id)} />
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* SECTION 4: DETAIL PANEL */}
        <TechnicianDetailPanel
          techId={selectedTechId}
          open={detailOpen}
          onClose={() => { setDetailOpen(false); setSelectedTechId(null); }}
        />
      </div>
    </TooltipProvider>
  );
}