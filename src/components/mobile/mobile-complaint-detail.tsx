'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Phone,
  MessageCircle,
  FileText,
  Wrench,
  MapPin,
  Calendar,
  Building2,
  Layers,
  ImageIcon,
  MessageSquare,
} from 'lucide-react';
import { useAppStore, useAuthStore } from '@/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// ============ HELPERS ============
function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

function generateComplaintRef(createdAt: string): string {
  const d = new Date(createdAt);
  const year = d.getFullYear();
  const dayOfYear = Math.ceil(
    (d.getTime() - new Date(year, 0, 1).getTime()) / 86400000
  );
  return `CMP-${year}-${String(dayOfYear).padStart(3, '0')}`;
}

const STATUS_STEPS = [
  { key: 'NEW', label: 'Complaint Created' },
  { key: 'ASSIGNED', label: 'Technician Assigned' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'FEEDBACK', label: 'Feedback Pending' },
] as const;

const STATUS_ORDER = ['NEW', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'WAITING_CLIENT_CONFIRMATION', 'CLIENT_CONFIRMED', 'DRAFT_INVOICE', 'INVOICE_APPROVED', 'INVOICE_SENT', 'PAID', 'CLOSED'];

function getStepStatus(stepKey: string, complaintStatus: string): 'completed' | 'current' | 'pending' {
  const stepIdx = STATUS_STEPS.findIndex(s => s.key === stepKey);
  let currentIdx = STATUS_ORDER.indexOf(complaintStatus);
  // Map COMPLETED/CLOSED → treat as at least step 4
  if (complaintStatus === 'PAID' || complaintStatus === 'CLOSED') currentIdx = 4;
  if (complaintStatus === 'WORK_ORDER_CREATED') currentIdx = Math.max(currentIdx, 2);
  if (stepIdx < currentIdx) return 'completed';
  if (stepIdx === currentIdx) return 'current';
  return 'pending';
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  NEW: 'bg-slate-100 text-slate-700 border-slate-300',
  ASSIGNED: 'bg-blue-100 text-blue-700 border-blue-300',
  ACCEPTED: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  WORK_ORDER_CREATED: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 border-amber-300',
  WAITING_CLIENT_CONFIRMATION: 'bg-orange-100 text-orange-700 border-orange-300',
  CLIENT_CONFIRMED: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  DRAFT_INVOICE: 'bg-violet-100 text-violet-700 border-violet-300',
  INVOICE_APPROVED: 'bg-purple-100 text-purple-700 border-purple-300',
  INVOICE_SENT: 'bg-sky-100 text-sky-700 border-sky-300',
  PAID: 'bg-green-100 text-green-700 border-green-300',
  CLOSED: 'bg-zinc-100 text-zinc-500 border-zinc-300',
  REWORK_REQUIRED: 'bg-rose-100 text-rose-700 border-rose-300',
};

function statusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parsePhotos(photos?: string | null): string[] {
  if (!photos) return [];
  try {
    const parsed = JSON.parse(photos);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ============ MAIN COMPONENT ============
export function MobileComplaintDetail() {
  const { viewParams, setView } = useAppStore();
  const { user } = useAuthStore();
  const complaintId = viewParams?.id as string;

  const [complaint, setComplaint] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComplaint = useCallback(async () => {
    if (!complaintId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/complaints/${complaintId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Complaint not found');
      const data = await res.json();
      setComplaint(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load complaint');
    } finally {
      setLoading(false);
    }
  }, [complaintId]);

  useEffect(() => {
    fetchComplaint();
  }, [fetchComplaint]);

  // ============ LOADING STATE ============
  if (loading) {
    return (
      <div className="space-y-4 pb-4">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 pb-2">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  // ============ ERROR STATE ============
  if (error || !complaint) {
    return (
      <div className="space-y-4 pb-4">
        <button
          onClick={() => setView('complaints')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="size-5" />
          <span>Back to Complaints</span>
        </button>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center text-sm text-red-600">
            {error || 'Complaint not found'}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ DATA ============
  const status = (complaint.status as string) || 'NEW';
  const title = (complaint.title as string) || '';
  const description = (complaint.description as string) || '';
  const createdAt = (complaint.createdAt as string) || '';
  const customerName = (complaint.customerName as string) || '';
  const equipmentName = (complaint.equipmentName as string) || '';
  const assignedToName = (complaint.assignedToName as string) || '';
  const category = (complaint.category as string) || '';
  const priority = (complaint.priority as string) || 'medium';
  const photos = parsePhotos(complaint.photos as string | null);
  const refNumber = generateComplaintRef(createdAt);
  const workOrders = (complaint.workOrders as Array<Record<string, unknown>>) || [];

  return (
    <div className="space-y-5 pb-4">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-3 pb-1">
        <button
          onClick={() => setView('complaints')}
          className="flex size-9 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Back to complaints"
        >
          <ArrowLeft className="size-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Complaint Details</h1>
      </div>

      {/* ─── Status Badge ─── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Badge
          variant="outline"
          className={cn(
            'px-3 py-1.5 text-xs font-semibold border',
            STATUS_BADGE_STYLES[status] || STATUS_BADGE_STYLES.NEW
          )}
        >
          {statusLabel(status)}
        </Badge>
      </motion.div>

      {/* ─── Info Card ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
      >
        <Card className="border-gray-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Complaint Ref</span>
              <span className="text-sm font-bold text-emerald-700">{refNumber}</span>
            </div>
            <h2 className="text-base font-semibold text-gray-900 leading-snug">{title}</h2>
            <div className="space-y-2">
              {customerName && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building2 className="size-4 text-gray-400 shrink-0" />
                  <span>{customerName}</span>
                </div>
              )}
              {equipmentName && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Layers className="size-4 text-gray-400 shrink-0" />
                  <span>{equipmentName}</span>
                </div>
              )}
              {category && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="size-4 text-gray-400 shrink-0" />
                  <span>{category}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="size-4 text-gray-400 shrink-0" />
                <span>{createdAt ? format(new Date(createdAt), 'MMM d, yyyy HH:mm') : '—'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Description ─── */}
      {description && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{description}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Status Timeline ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
      >
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Status Timeline</h3>
            <div className="relative pl-8">
              {/* Vertical line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />
              {STATUS_STEPS.map((step, idx) => {
                const stepState = getStepStatus(step.key, status);
                const isCompleted = stepState === 'completed';
                const isCurrent = stepState === 'current';
                return (
                  <div key={step.key} className="relative pb-5 last:pb-0">
                    {/* Circle icon */}
                    <div
                      className={cn(
                        'absolute -left-8 top-0.5 flex size-6 items-center justify-center rounded-full border-2',
                        isCompleted && 'border-emerald-500 bg-emerald-500',
                        isCurrent && 'border-emerald-500 bg-white',
                        !isCompleted && !isCurrent && 'border-gray-300 bg-white'
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="size-4 text-white" />
                      ) : isCurrent ? (
                        <div className="size-2 rounded-full bg-emerald-500" />
                      ) : (
                        <Circle className="size-3 text-gray-300" />
                      )}
                    </div>
                    <div className="pt-0">
                      <p
                        className={cn(
                          'text-sm font-medium',
                          isCompleted ? 'text-emerald-700' : isCurrent ? 'text-gray-900' : 'text-gray-400'
                        )}
                      >
                        {step.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Assigned Technician Card ─── */}
      {assignedToName && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
        >
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Assigned Technician</h3>
              <div className="flex items-center gap-3">
                <Avatar className="size-11">
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold">
                    {assignedToName
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{assignedToName}</p>
                  <p className="text-xs text-gray-500">Technician</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-9 text-emerald-600"
                  aria-label="Call technician"
                  onClick={() => toast.info('Calling technician...')}
                >
                  <Phone className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Attachments ─── */}
      {photos.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
        >
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Attachments</h3>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((url, idx) => (
                  <div
                    key={idx}
                    className="shrink-0 size-20 rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
                  >
                    {url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) ? (
                      <img
                        src={url}
                        alt={`Attachment ${idx + 1}`}
                        className="size-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerHTML =
                            '<div class="flex items-center justify-center size-full text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg></div>';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center size-full gap-1 p-1">
                        <FileText className="size-5 text-gray-400" />
                        <span className="text-[9px] text-gray-400 truncate max-w-[60px]">
                          {url.split('/').pop() || 'File'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Linked Work Orders ─── */}
      {workOrders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.28 }}
        >
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                Work Orders ({workOrders.length})
              </h3>
              <div className="space-y-2">
                {workOrders.map((wo) => (
                  <button
                    key={wo.id as string}
                    onClick={() => setView('work-order-detail', { id: wo.id as string })}
                    className="w-full flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-left active:bg-gray-100 transition-colors"
                  >
                    <Wrench className="size-4 text-emerald-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{wo.title as string}</p>
                      <p className="text-xs text-gray-500">{statusLabel(wo.status as string)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Action Buttons ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3 }}
        className="space-y-2"
      >
        {assignedToName && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
              onClick={() => toast.info('Calling technician...')}
            >
              <Phone className="size-4 mr-2" />
              Call Technician
            </Button>
            <Button
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-50 w-full"
              onClick={() => toast.info('Opening WhatsApp...')}
            >
              <MessageSquare className="size-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        )}
        {workOrders.length > 0 && (
          <Button
            variant="outline"
            className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={() =>
              setView('work-order-detail', { id: workOrders[0].id as string })
            }
          >
            <FileText className="size-4 mr-2" />
            View Work Order
          </Button>
        )}
        <Button
          variant="outline"
          className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
          onClick={() => toast.info('Chat feature coming soon')}
        >
          <MessageCircle className="size-4 mr-2" />
          Chat
        </Button>
      </motion.div>
    </div>
  );
}