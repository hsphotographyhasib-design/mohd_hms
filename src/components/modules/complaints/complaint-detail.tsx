'use client';

import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import {
  ArrowLeft, UserCheck, AlertCircle, FileText, Wrench, Star,
  CheckCircle2, Clock, Play, Ban, ChevronDown, Loader2,
  MessageSquare, MapPin, Phone, Building2, Package,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore, useAppStore } from '@/store';
import type { ComplaintItem, WorkOrderItem, SelectOption } from '@/types';
import { toast } from 'sonner';

// ============ HELPERS ============

function StatusBadge({ status }: { status: string }) {
  const v: Record<string, string> = {
    OPEN: 'bg-amber-100 text-amber-800', ASSIGNED: 'bg-sky-100 text-sky-800',
    IN_PROGRESS: 'bg-purple-100 text-purple-800', RESOLVED: 'bg-emerald-100 text-emerald-800',
    CLOSED: 'bg-gray-100 text-gray-600', COMPLETED: 'bg-emerald-100 text-emerald-800',
    PENDING: 'bg-amber-100 text-amber-800', PAID: 'bg-emerald-100 text-emerald-800',
    OVERDUE: 'bg-rose-100 text-rose-800', DRAFT: 'bg-gray-100 text-gray-600',
  };
  return <Badge variant="outline" className={v[status] || ''}>{status.replace(/_/g, ' ')}</Badge>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const v: Record<string, string> = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-rose-100 text-rose-700',
  };
  return <Badge variant="outline" className={v[priority] || ''}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</Badge>;
}

function formatDate(dateStr: string): string {
  try { return format(new Date(dateStr), 'MMM d, yyyy h:mm a'); } catch { return dateStr; }
}

function truncateId(id: string): string {
  return id.length > 8 ? id.substring(0, 8) + '...' : id;
}

const token = () => localStorage.getItem('cmms_token') || '';

const WORKFLOW_STEPS = [
  { key: 'OPEN', label: 'Open', icon: AlertCircle },
  { key: 'ASSIGNED', label: 'Assigned', icon: UserCheck },
  { key: 'IN_PROGRESS', label: 'In Progress', icon: Play },
  { key: 'RESOLVED', label: 'Resolved', icon: CheckCircle2 },
  { key: 'CLOSED', label: 'Closed', icon: Ban },
];

// ============ WORKFLOW STEPPER ============

function WorkflowStepper({ status }: { status: string }) {
  const currentIndex = WORKFLOW_STEPS.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center justify-between w-full px-2 py-4">
      {WORKFLOW_STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isFuture = idx > currentIndex;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCompleted
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : isCurrent
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-600 ring-4 ring-emerald-100'
                      : 'bg-gray-100 border-gray-300 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  isCompleted || isCurrent ? 'text-emerald-700' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < WORKFLOW_STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 mt-[-20px] ${
                  idx < currentIndex ? 'bg-emerald-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============ LOADING SKELETON ============

function DetailSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// ============ MAIN COMPONENT ============

export function ComplaintDetail() {
  const setView = useAppStore((s) => s.setView);
  const viewParams = useAppStore((s) => s.viewParams);
  const user = useAuthStore((s) => s.user);
  const complaintId = viewParams?.id;

  const [complaint, setComplaint] = useState<ComplaintItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [technicians, setTechnicians] = useState<SelectOption[]>([]);
  const [selectedTech, setSelectedTech] = useState('');

  // Status dropdown
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const fetchComplaint = useCallback(async () => {
    if (!complaintId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/complaints/${complaintId}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error('Failed to load complaint');
      const json = await res.json();
      setComplaint(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [complaintId]);

  useEffect(() => { fetchComplaint(); }, [fetchComplaint]);

  const fetchTechnicians = async () => {
    try {
      const res = await fetch('/api/employees?role=technician&pageSize=100', {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      setTechnicians(
        (json.data || []).map((e: { id: string; name: string }) => ({
          label: e.name,
          value: e.id,
        }))
      );
    } catch {
      toast.error('Failed to load technicians');
    }
  };

  const handleAssign = async () => {
    if (!selectedTech) { toast.error('Select a technician'); return; }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/complaints/${complaintId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ assignedToId: selectedTech, status: 'ASSIGNED' }),
      });
      if (!res.ok) throw new Error();
      toast.success('Technician assigned successfully');
      setAssignDialogOpen(false);
      setSelectedTech('');
      fetchComplaint();
    } catch {
      toast.error('Failed to assign technician');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(true);
    setStatusDropdownOpen(false);
    try {
      const body: Record<string, string> = { status: newStatus };
      const res = await fetch(`/api/complaints/${complaintId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
      fetchComplaint();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const role = user?.role || '';
  const isSupervisor = ['super_admin', 'admin', 'manager', 'supervisor'].includes(role);
  const isTechnician = role === 'technician';
  const isAssignedToMe = complaint?.assignedToId === user?.id;

  if (loading) return <DetailSkeleton />;
  if (error) {
    return (
      <div className="p-4 md:p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <AlertCircle className="h-12 w-12 text-rose-500" />
            <p className="text-lg font-medium text-rose-600">{error}</p>
            <Button variant="outline" onClick={() => setView('complaints')}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!complaint) return null;

  const nextStatuses: string[] = [];
  if (isSupervisor) {
    if (complaint.status === 'OPEN') nextStatuses.push('ASSIGNED');
    if (complaint.status === 'ASSIGNED' || complaint.status === 'IN_PROGRESS') nextStatuses.push('IN_PROGRESS', 'RESOLVED');
    if (complaint.status === 'RESOLVED') nextStatuses.push('CLOSED');
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Back Button + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setView('complaints')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Complaint Details</h1>
      </div>

      {/* Complaint Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">ID: {truncateId(complaint.id)}</span>
              </div>
              <h2 className="text-xl font-semibold">{complaint.title}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={complaint.status} />
                <PriorityBadge priority={complaint.priority} />
                <span className="text-sm text-muted-foreground">
                  {formatDate(complaint.createdAt)}
                </span>
              </div>
            </div>
            {complaint.category && (
              <Badge variant="outline" className="text-xs">
                {complaint.category}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Workflow Stepper */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Progress</h3>
          <WorkflowStepper status={complaint.status} />
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Description */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{complaint.description || 'No description provided.'}</p>
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-600" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Name:</span>
                <span className="text-sm text-muted-foreground">{complaint.customerName || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">ID:</span>
                <span className="font-mono text-xs text-muted-foreground">{complaint.customerId ? truncateId(complaint.customerId) : '—'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Equipment Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wrench className="h-4 w-4 text-emerald-600" />
              Equipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Name:</span>
                <span className="text-sm text-muted-foreground">{complaint.equipmentName || 'Not linked'}</span>
              </div>
              {complaint.equipmentId && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">ID:</span>
                  <span className="font-mono text-xs text-muted-foreground">{truncateId(complaint.equipmentId)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Assignment Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-600" />
              Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {complaint.assignedToName ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium">{complaint.assignedToName}</span>
                  <Badge variant="outline" className="bg-sky-50 text-sky-700 text-xs">Technician</Badge>
                </div>
                {complaint.supervisorName && (
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-teal-600" />
                    <span className="text-sm text-muted-foreground">
                      Supervisor: {complaint.supervisorName}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not yet assigned</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Work Orders Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-emerald-600" />
            Related Work Orders
            {(complaint.workOrders || []).length > 0 && (
              <Badge variant="secondary" className="ml-1">{complaint.workOrders!.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(complaint.workOrders || []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No work orders linked</div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(complaint.workOrders || []).map((wo: WorkOrderItem) => (
                    <TableRow
                      key={wo.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setView('work-order-detail', { id: wo.id })}
                    >
                      <TableCell className="font-medium max-w-[250px] truncate">{wo.title}</TableCell>
                      <TableCell><StatusBadge status={wo.status} /></TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          wo.type === 'corrective' ? 'bg-amber-50 text-amber-700' :
                          wo.type === 'preventive' ? 'bg-emerald-50 text-emerald-700' :
                          'bg-rose-50 text-rose-700'
                        }>
                          {wo.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(wo.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolution Notes (if resolved/closed) */}
      {(complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-700">
              <MessageSquare className="h-4 w-4" />
              Resolution Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {complaint.resolutionNotes ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{complaint.resolutionNotes}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No resolution notes recorded.</p>
            )}
            {complaint.resolvedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Resolved: {formatDate(complaint.resolvedAt)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Customer Rating (if closed with rating) */}
      {complaint.status === 'CLOSED' && complaint.customerRating != null && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Customer Rating:</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < (complaint.customerRating || 0)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">({complaint.customerRating}/5)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {/* Supervisor/Admin: Assign Technician */}
            {isSupervisor && !complaint.assignedToId && (
              <Button
                variant="outline"
                onClick={() => { fetchTechnicians(); setAssignDialogOpen(true); }}
                disabled={actionLoading}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Assign Technician
              </Button>
            )}

            {/* Supervisor/Admin: Status Change Dropdown */}
            {isSupervisor && nextStatuses.length > 0 && (
              <div className="relative">
                <Button variant="outline" onClick={() => setStatusDropdownOpen(!statusDropdownOpen)} disabled={actionLoading}>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Change Status
                </Button>
                {statusDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-white border rounded-lg shadow-lg py-1 min-w-[180px]">
                    {nextStatuses.map((s) => (
                      <button
                        key={s}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors"
                        onClick={() => handleStatusChange(s)}
                      >
                        Mark {s.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Technician: Accept & Start */}
            {isTechnician && isAssignedToMe && complaint.status === 'ASSIGNED' && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleStatusChange('IN_PROGRESS')}
                disabled={actionLoading}
              >
                {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Play className="h-4 w-4 mr-2" />
                Accept & Start
              </Button>
            )}

            {/* Technician: Complete */}
            {isTechnician && isAssignedToMe && complaint.status === 'IN_PROGRESS' && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleStatusChange('RESOLVED')}
                disabled={actionLoading}
              >
                {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assign Technician Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Technician</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Select a technician to assign to this complaint. The complaint status will be changed to ASSIGNED.
            </p>
            <div>
              <label className="text-sm font-medium">Technician</label>
              <Select value={selectedTech} onValueChange={setSelectedTech}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select a technician" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleAssign}
              disabled={actionLoading || !selectedTech}
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
