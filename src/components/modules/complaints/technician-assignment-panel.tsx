'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, UserCheck, AlertCircle, Clock, Loader2,
  Users, Shield, UserX, Briefcase, Maximize2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';

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
  onLeave: boolean;
  availabilityStatus: 'available' | 'on_leave' | 'offline';
  isCurrentlyAssigned: boolean;
}

export interface TechnicianAssignmentPanelProps {
  complaintId: string;
  isReassignment: boolean;
  currentTechnicianName?: string;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============ CONSTANTS ============

const STATUS_FILTERS = [
  { value: '', label: 'All', icon: Users },
  { value: 'available', label: 'Available', icon: UserCheck },
  { value: 'busy', label: 'Busy', icon: Clock },
  { value: 'on_leave', label: 'On Leave', icon: UserX },
] as const;

const AVAILABILITY_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string; label: string }> = {
  available: { color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', label: 'Available' },
  offline: { color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', label: 'Offline' },
  on_leave: { color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', label: 'On Leave' },
};

const getToken = () => localStorage.getItem('cmms_token') || '';

// ============ COMPONENT ============

export function TechnicianAssignmentPanel({
  complaintId,
  isReassignment,
  currentTechnicianName,
  onSuccess,
  open,
  onOpenChange,
}: TechnicianAssignmentPanelProps) {
  // State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // Fetch technicians when dialog opens or filters change
  useEffect(() => {
    if (!open || !complaintId) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('q', search);
        if (statusFilter) params.set('status', statusFilter);
        params.set('limit', '20');

        const res = await fetch(
          `/api/complaints/${complaintId}/assign-technician?${params.toString()}`,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setTechnicians(data.technicians || []);

        // Auto-select current technician if reassigning
        if (data.currentAssignment?.assignedToId) {
          setSelectedId(data.currentAssignment.assignedToId);
        }
      } catch {
        setTechnicians([]);
        toast.error('Failed to load technicians');
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [open, complaintId, search, statusFilter]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSearch('');
      setStatusFilter('');
      setSelectedId(null);
      setReason('');
    }
  }, [open]);

  // Submit assignment
  const handleAssign = useCallback(async () => {
    if (!selectedId) {
      toast.error('Select a technician');
      return;
    }
    if (isReassignment && !reason.trim()) {
      toast.error('Provide a reason for reassignment');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/complaints/${complaintId}/assign-technician`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            technicianId: selectedId,
            reason: reason.trim() || undefined,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        const err = data.details || data.error || 'Assignment failed';
        throw new Error(err);
      }

      toast.success(data.message || 'Technician assigned successfully');
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setSubmitting(false);
    }
  }, [selectedId, reason, isReassignment, complaintId, onSuccess, onOpenChange]);

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 space-y-3 shrink-0">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Shield className="h-5 w-5 text-emerald-600" />
              {isReassignment ? 'Reassign Technician' : 'Assign Technician'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {isReassignment
                ? `Currently assigned to ${currentTechnicianName || 'unknown'}. Select a new technician below.`
                : 'Search and select a technician to assign to this complaint.'}
            </DialogDescription>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              onClick={() => { onOpenChange(false); useAppStore.getState().setView('complaint-assignment', { id: complaintId }); }}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Open full assignment screen
            </button>
          </DialogHeader>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, employee ID, email, phone..."
              className="pl-10 h-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <Button
                key={f.value}
                variant={statusFilter === f.value ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'h-8 text-xs gap-1.5',
                  statusFilter === f.value
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'text-gray-600'
                )}
                onClick={() => setStatusFilter(f.value)}
              >
                <f.icon className="h-3.5 w-3.5" />
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Technician list */}
        <div className="flex-1 min-h-0 border-t border-gray-100">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : technicians.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm">No technicians found</p>
              <p className="text-xs mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <ScrollArea className="h-[320px]">
              <div className="p-4 space-y-2">
                {technicians.map((tech) => {
                  const avail = AVAILABILITY_CONFIG[tech.availabilityStatus] || AVAILABILITY_CONFIG.offline;
                  const isSelected = selectedId === tech.id;
                  return (
                    <button
                      key={tech.id}
                      className={cn(
                        'w-full text-left rounded-xl border-2 p-3 transition-all',
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                          : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                      )}
                      onClick={() => setSelectedId(tech.id)}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            {tech.avatar ? (
                              <img src={tech.avatar} alt={tech.name} className="object-cover" />
                            ) : (
                              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-bold">
                                {getInitials(tech.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          {/* Online indicator */}
                          <div
                            className={cn(
                              'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white',
                              tech.isOnline && !tech.onLeave ? 'bg-emerald-500' : 'bg-gray-400'
                            )}
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-gray-900 truncate">
                              {tech.name}
                            </span>
                            {tech.isCurrentlyAssigned && (
                              <Badge className="text-[10px] h-4 px-1.5 bg-blue-100 text-blue-700 border-blue-200">
                                Current
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500 font-mono">
                              {tech.employeeNumber || '—'}
                            </span>
                            {tech.departmentName && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Briefcase className="h-3 w-3" />
                                  {tech.departmentName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Status + Jobs */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] h-5 px-2 font-medium border',
                              avail.color, avail.bgColor, avail.borderColor
                            )}
                          >
                            {avail.label}
                          </Badge>
                          <span className="text-[10px] text-gray-500">
                            {tech.activeJobs} active {tech.activeJobs === 1 ? 'job' : 'jobs'}
                          </span>
                        </div>
                      </div>

                      {/* Selected check */}
                      {isSelected && (
                        <div className="flex items-center justify-center mt-2 pt-2 border-t border-emerald-200/50">
                          <UserCheck className="h-4 w-4 text-emerald-600 mr-1.5" />
                          <span className="text-xs font-medium text-emerald-700">
                            {isReassignment ? 'Will reassign to' : 'Will assign to'} {tech.name}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer: Reason + Submit */}
        <div className="px-6 pb-6 pt-4 border-t border-gray-100 space-y-3 shrink-0">
          {/* Assignment reason */}
          <div>
            <Label className="text-xs text-gray-600 mb-1.5 block">
              {isReassignment ? 'Reassignment Reason (required)' : 'Assignment Reason (optional)'}
            </Label>
            <Textarea
              placeholder={
                isReassignment
                  ? 'Why is this being reassigned? (e.g. Technician unavailable, customer request, workload balancing...)'
                  : 'Any notes about this assignment...'
              }
              className="text-sm min-h-[60px] resize-none"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="h-9"
            >
              Cancel
            </Button>
            <Button
              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleAssign}
              disabled={submitting || !selectedId}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              <UserCheck className="h-4 w-4 mr-1.5" />
              {isReassignment ? 'Reassign Technician' : 'Assign Technician'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}