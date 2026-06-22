'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { format, subDays, isAfter, parseISO } from 'date-fns';
import {
  Wind, Zap, Droplets, Battery, Cog, ShieldAlert,
  MapPin, Building2, Calendar, Hash, User, Phone, Mail,
  Globe, QrCode, Clock, Wrench, AlertTriangle, CheckCircle2,
  MessageCircle, Share2, Copy, ExternalLink, ChevronRight,
  Scan, Shield, Eye, Camera, Tag, FileText, Info
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ─── Types ───────────────────────────────────────────────────────────────────

interface QrEquipmentData {
  equipment: {
    id: string;
    name: string;
    category: string;
    assetNumber: string;
    qrCode: string;
    qrId: string;
    brand: string | null;
    model: string | null;
    serialNumber: string | null;
    location: string | null;
    building: string | null;
    room: string | null;
    installDate: string | null;
    warrantyExpiry: string | null;
    warrantyInfo: string | null;
    status: string;
    condition: string;
    photos: string | null;
    specifications: string | null;
    notes: string | null;
    scanCount: number;
    lastScannedAt: string | null;
    createdAt: string;
  };
  tenant: {
    id: string;
    name: string;
    domain: string;
    logo: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    website: string | null;
  };
  customer: {
    id: string;
    name: string;
    companyName: string | null;
    phone: string;
    email: string | null;
    address: string | null;
  } | null;
  maintenanceHistory: MaintenanceRecord[];
}

interface MaintenanceRecord {
  id: string;
  type: 'complaint' | 'work_order' | 'pm';
  title: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  assignedToName: string | null;
  complaintNumber?: string;
  workOrderNumber?: string;
  priority?: string;
  description?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  HVAC: Wind,
  Electrical: Zap,
  Plumbing: Droplets,
  Generator: Battery,
  Mechanical: Cog,
  FireProtection: ShieldAlert,
};

const CATEGORY_COLORS: Record<string, string> = {
  HVAC: 'text-blue-600 bg-blue-50',
  Electrical: 'text-amber-600 bg-amber-50',
  Plumbing: 'text-cyan-600 bg-cyan-50',
  Generator: 'text-violet-600 bg-violet-50',
  Mechanical: 'text-slate-600 bg-slate-100',
  FireProtection: 'text-red-600 bg-red-50',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string; bgColor: string }> = {
  active: { label: 'Active', color: 'text-emerald-700', dotColor: 'bg-emerald-500', bgColor: 'bg-emerald-50 border-emerald-200' },
  inactive: { label: 'Inactive', color: 'text-gray-700', dotColor: 'bg-gray-400', bgColor: 'bg-gray-50 border-gray-200' },
  under_maintenance: { label: 'Under Maintenance', color: 'text-amber-700', dotColor: 'bg-amber-500', bgColor: 'bg-amber-50 border-amber-200' },
  decommissioned: { label: 'Decommissioned', color: 'text-gray-700', dotColor: 'bg-gray-400', bgColor: 'bg-gray-50 border-gray-200' },
  critical: { label: 'Critical', color: 'text-red-700', dotColor: 'bg-red-500', bgColor: 'bg-red-50 border-red-200' },
  out_of_service: { label: 'Out of Service', color: 'text-red-700', dotColor: 'bg-red-500', bgColor: 'bg-red-50 border-red-200' },
  overdue_pm: { label: 'Overdue PM', color: 'text-orange-700', dotColor: 'bg-orange-500', bgColor: 'bg-orange-50 border-orange-200' },
};

const CONDITION_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  good: { label: 'Good', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  fair: { label: 'Fair', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  poor: { label: 'Poor', color: 'text-red-700', bgColor: 'bg-red-100' },
  critical: { label: 'Critical', color: 'text-red-800', bgColor: 'bg-red-200' },
};

const MAINTENANCE_TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  complaint: { label: 'Complaint', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' },
  work_order: { label: 'Work Order', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  pm: { label: 'Preventive', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200' },
};

const COMPLAINT_STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  ASSIGNED: 'bg-indigo-100 text-indigo-800',
  ACCEPTED: 'bg-violet-100 text-violet-800',
  WORK_ORDER_CREATED: 'bg-cyan-100 text-cyan-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  WAITING_CLIENT_CONFIRMATION: 'bg-orange-100 text-orange-800',
  CLIENT_CONFIRMED: 'bg-lime-100 text-lime-800',
  DRAFT_INVOICE: 'bg-teal-100 text-teal-800',
  INVOICE_APPROVED: 'bg-emerald-100 text-emerald-800',
  INVOICE_SENT: 'bg-green-100 text-green-800',
  PAID: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-700',
  REWORK_REQUIRED: 'bg-red-100 text-red-800',
};

const WO_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  READONLY: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

// ─── Helper Components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bgColor}`}>
      <span className={`w-2 h-2 rounded-full ${config.dotColor} animate-pulse`} />
      <span className={config.color}>{config.label}</span>
    </span>
  );
}

function ConditionIndicator({ condition }: { condition: string }) {
  const config = CONDITION_CONFIG[condition] || CONDITION_CONFIG.good;
  const percentage = condition === 'good' ? 90 : condition === 'fair' ? 60 : condition === 'poor' ? 30 : 10;
  const barColor = condition === 'good' ? 'bg-emerald-500' : condition === 'fair' ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">Condition</span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${config.color} ${config.bgColor}`}>
          {config.label}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function CategoryIcon({ category, size = 24 }: { category: string; size?: number }) {
  const Icon = CATEGORY_ICONS[category] || Cog;
  const colorClass = CATEGORY_COLORS[category] || 'text-gray-600 bg-gray-100';
  return (
    <div className={`inline-flex items-center justify-center rounded-xl p-3 ${colorClass}`}>
      <Icon size={size} strokeWidth={1.5} />
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <div className="bg-emerald-600 h-14" />
      <div className="max-w-2xl mx-auto px-4 -mt-6 pb-12">
        {/* Hero card skeleton */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Skeleton className="w-20 h-20 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details grid skeleton */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>

        {/* Status card skeleton */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <Skeleton className="h-5 w-32 mb-4" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </CardContent>
        </Card>

        {/* Timeline skeleton */}
        <Card className="mt-6">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-2 h-16 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── 404 Page ────────────────────────────────────────────────────────────────

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <QrCode className="w-10 h-10 text-gray-400" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Equipment Not Found</h1>
        <p className="text-gray-500 mb-6">
          This QR code doesn&apos;t match any equipment in our system.
          It may have been deactivated or the link may be incorrect.
        </p>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-400">
            If you believe this is an error, please contact the property management team.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Error Page ──────────────────────────────────────────────────────────────

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-400" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Something Went Wrong</h1>
        <p className="text-gray-500 mb-6">{message}</p>
        <Button
          onClick={() => window.location.reload()}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}

// ─── Timeline Card ───────────────────────────────────────────────────────────

function TimelineCard({ record, index, isLast }: { record: MaintenanceRecord; index: number; isLast: boolean }) {
  const typeConfig = MAINTENANCE_TYPE_CONFIG[record.type] || MAINTENANCE_TYPE_CONFIG.work_order;
  const statusColor = record.type === 'complaint'
    ? COMPLAINT_STATUS_COLORS[record.status]
    : WO_STATUS_COLORS[record.status];

  return (
    <div className="flex gap-3 relative">
      {/* Timeline line and dot */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 ${
            record.type === 'complaint'
              ? 'border-red-300 bg-red-50'
              : record.type === 'pm'
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-blue-300 bg-blue-50'
          }`}
        >
          {record.type === 'complaint' ? (
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          ) : record.type === 'pm' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <Wrench className="w-3.5 h-3.5 text-blue-600" />
          )}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
      </div>

      {/* Card content */}
      <div className={`flex-1 pb-6 ${isLast ? '' : ''}`}>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${typeConfig.bgColor}`}>
                {typeConfig.label}
              </span>
              {record.complaintNumber && (
                <span className="text-xs text-gray-400 font-mono">#{record.complaintNumber}</span>
              )}
              {record.workOrderNumber && (
                <span className="text-xs text-gray-400 font-mono">WO-{record.workOrderNumber}</span>
              )}
            </div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColor || 'bg-gray-100 text-gray-600'}`}>
              {record.status.replace(/_/g, ' ')}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">{record.title}</h4>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(parseISO(record.createdAt), 'MMM d, yyyy')}
            </span>
            {record.assignedToName && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {record.assignedToName}
              </span>
            )}
          </div>
          {record.priority && (
            <div className="mt-2">
              <span className={`text-xs font-medium ${
                record.priority === 'critical' ? 'text-red-600' :
                record.priority === 'high' ? 'text-orange-600' :
                record.priority === 'medium' ? 'text-amber-600' :
                'text-gray-500'
              }`}>
                Priority: {record.priority}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function EquipmentQrPage() {
  const params = useParams();
  const qrId = params.qrId as string;

  const [data, setData] = useState<QrEquipmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('30days');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    description: '',
  });

  // Fetch equipment data
  useEffect(() => {
    if (!qrId) return;

    const fetchEquipment = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/qr/lookup/${qrId}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          throw new Error('Failed to load equipment data');
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, [qrId]);

  // Log scan
  useEffect(() => {
    if (!qrId) return;

    const logScan = async () => {
      try {
        await fetch('/api/qr/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrId }),
        });
      } catch {
        // Silent fail - scan logging is not critical
      }
    };

    logScan();
  }, [qrId]);

  // Filter maintenance history by date range
  const filteredHistory = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    let daysBack: number;
    switch (activeTab) {
      case '30days': daysBack = 30; break;
      case '90days': daysBack = 90; break;
      case '6months': daysBack = 180; break;
      case '1year': daysBack = 365; break;
      default: daysBack = 30;
    }
    const cutoff = subDays(now, daysBack);
    return data.maintenanceHistory
      .filter(r => isAfter(parseISO(r.createdAt), cutoff))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data, activeTab]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !formData.description.trim()) {
      toast.error('Please provide a description of the issue');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/qr/service-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: data.equipment.id,
          qrId: data.equipment.qrId,
          tenantId: data.tenant.id,
          customerName: formData.name || undefined,
          customerPhone: formData.phone || undefined,
          customerEmail: formData.email || undefined,
          description: formData.description,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to submit' }));
        throw new Error(err.error || err.message || 'Failed to submit service request');
      }

      toast.success('Service request submitted successfully! We will get back to you shortly.');
      setFormData({ name: '', phone: '', email: '', description: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit service request');
    } finally {
      setSubmitting(false);
    }
  }, [data, formData]);

  // Handle share
  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: data ? `${data.equipment.name} - Equipment Details` : 'Equipment Details',
          text: data ? `View details for ${data.equipment.name} (${data.equipment.assetNumber})` : 'View equipment details',
          url,
        });
      } catch {
        // User cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
      } catch {
        toast.error('Failed to copy link');
      }
    }
  }, [data]);

  // Handle copy link
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
  }, []);

  // Render states
  if (loading) return <LoadingSkeleton />;
  if (notFound) return <NotFoundPage />;
  if (error) return <ErrorPage message={error} />;
  if (!data) return <NotFoundPage />;

  const { equipment, tenant, customer, maintenanceHistory } = data;
  const CategoryIconComp = CATEGORY_ICONS[equipment.category] || Cog;
  const statusConfig = STATUS_CONFIG[equipment.status] || STATUS_CONFIG.active;

  // Parse specifications if present
  let specs: Record<string, string> | null = null;
  if (equipment.specifications) {
    try { specs = JSON.parse(equipment.specifications); } catch { specs = null; }
  }

  // Parse photos if present
  let photos: string[] = [];
  if (equipment.photos) {
    try { photos = JSON.parse(equipment.photos); } catch { photos = []; }
  }

  // WhatsApp link
  const waPhone = tenant.phone || customer?.phone || '';
  const waMessage = encodeURIComponent(
    `Hi, I'm reporting an issue with equipment: ${equipment.name} (${equipment.assetNumber}) at ${equipment.location || 'N/A'}.`
  );
  const whatsappUrl = `https://wa.me/${waPhone.replace(/[^0-9+]/g, '')}?text=${waMessage}`;

  const tenantPhone = tenant.phone || customer?.phone || '';
  const tenantEmail = tenant.email || customer?.email || '';

  // Equipment photo or placeholder
  const hasPhoto = photos.length > 0 && photos[0].length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Header Bar ──────────────────────────────────────────────────── */}
      <header className="bg-emerald-600 text-white">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {tenant.logo ? (
            <img
              src={tenant.logo}
              alt={tenant.name}
              className="w-8 h-8 rounded-lg object-cover bg-white/20"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold truncate">{tenant.name}</h1>
            {tenant.address && (
              <p className="text-xs text-emerald-100 truncate">{tenant.address}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Scan className="w-4 h-4 text-emerald-200" />
            <span className="text-xs text-emerald-200 font-medium">QR Portal</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 -mt-4 pb-12">
        {/* ─── Equipment Hero Card ───────────────────────────────────────── */}
        <Card className="shadow-lg overflow-hidden">
          <div className="p-5">
            <div className="flex items-start gap-4">
              {/* Photo or Category Icon */}
              <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50 border border-gray-100">
                {hasPhoto ? (
                  <img
                    src={photos[0]}
                    alt={equipment.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <CategoryIcon category={equipment.category} size={32} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 truncate">{equipment.name}</h2>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      <Tag className="w-3.5 h-3.5" />
                      {equipment.category}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <StatusBadge status={equipment.status} />
                </div>
              </div>
            </div>

            {/* QR Verification Badge */}
            <div className="mt-4 flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-100">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-800">QR Verified Equipment</p>
                <p className="text-xs text-emerald-600 font-mono mt-0.5">ID: {equipment.qrId}</p>
              </div>
              <QRCodeSVG
                value={window.location.href}
                size={40}
                level="M"
                bgColor="#ffffff"
                fgColor="#059669"
              />
            </div>
          </div>
        </Card>

        {/* ─── Live Status Card ──────────────────────────────────────────── */}
        <Card className="mt-4 shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-600" />
              Equipment Status
            </h3>
            <div className={`rounded-xl p-4 border ${statusConfig.bgColor}`}>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${statusConfig.dotColor} ${equipment.status === 'active' ? 'animate-pulse' : ''}`} />
                <span className={`text-base font-semibold ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              </div>
              {equipment.status === 'under_maintenance' && (
                <p className="text-xs text-amber-700 mt-2 ml-6">
                  This equipment is currently undergoing maintenance. Service will be restored soon.
                </p>
              )}
              {equipment.status === 'critical' && (
                <p className="text-xs text-red-700 mt-2 ml-6">
                  This equipment has critical issues. Technicians have been notified.
                </p>
              )}
              {equipment.status === 'out_of_service' && (
                <p className="text-xs text-red-700 mt-2 ml-6">
                  This equipment is currently out of service. Please contact support for details.
                </p>
              )}
            </div>
            <div className="mt-4">
              <ConditionIndicator condition={equipment.condition} />
            </div>
          </CardContent>
        </Card>

        {/* ─── Equipment Details Grid ─────────────────────────────────────── */}
        <Card className="mt-4 shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-600" />
              Equipment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Asset Number */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                  <Hash className="w-3 h-3" />Asset No.
                </p>
                <p className="text-sm font-semibold text-gray-900 font-mono">{equipment.assetNumber}</p>
              </div>

              {/* Serial Number */}
              {equipment.serialNumber && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                    <Hash className="w-3 h-3" />Serial No.
                  </p>
                  <p className="text-sm font-semibold text-gray-900 font-mono">{equipment.serialNumber}</p>
                </div>
              )}

              {/* Brand & Model */}
              {equipment.brand && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                    <Tag className="w-3 h-3" />Brand
                  </p>
                  <p className="text-sm font-semibold text-gray-900">{equipment.brand}{equipment.model ? ` ${equipment.model}` : ''}</p>
                </div>
              )}

              {/* Location */}
              {equipment.location && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />Location
                  </p>
                  <p className="text-sm font-semibold text-gray-900">{equipment.location}</p>
                </div>
              )}

              {/* Building */}
              {equipment.building && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />Building
                  </p>
                  <p className="text-sm font-semibold text-gray-900">{equipment.building}{equipment.room ? ` - ${equipment.room}` : ''}</p>
                </div>
              )}

              {/* Install Date */}
              {equipment.installDate && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />Installed
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {format(parseISO(equipment.installDate), 'MMM d, yyyy')}
                  </p>
                </div>
              )}

              {/* Warranty Expiry */}
              {equipment.warrantyExpiry && (
                <div className={`rounded-lg p-3 ${
                  isAfter(new Date(), parseISO(equipment.warrantyExpiry))
                    ? 'bg-red-50 border border-red-100'
                    : 'bg-gray-50'
                }`}>
                  <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                    <Shield className="w-3 h-3" />Warranty
                  </p>
                  <p className={`text-sm font-semibold ${
                    isAfter(new Date(), parseISO(equipment.warrantyExpiry))
                      ? 'text-red-700'
                      : 'text-gray-900'
                  }`}>
                    {format(parseISO(equipment.warrantyExpiry), 'MMM d, yyyy')}
                    {isAfter(new Date(), parseISO(equipment.warrantyExpiry)) && ' (Expired)'}
                  </p>
                </div>
              )}

              {/* Warranty Info */}
              {equipment.warrantyInfo && (
                <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                  <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                    <FileText className="w-3 h-3" />Warranty Info
                  </p>
                  <p className="text-sm text-gray-700">{equipment.warrantyInfo}</p>
                </div>
              )}
            </div>

            {/* Specifications */}
            {specs && Object.keys(specs).length > 0 && (
              <div className="mt-4">
                <Separator className="mb-4" />
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Specifications</h4>
                <div className="space-y-2">
                  {Object.entries(specs).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center py-1">
                      <span className="text-sm text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="text-sm font-semibold text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {equipment.notes && (
              <div className="mt-4">
                <Separator className="mb-4" />
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{equipment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Customer Info (if available) ──────────────────────────────── */}
        {customer && (
          <Card className="mt-4 shadow-sm">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Property / Customer
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-900 font-medium">{customer.name}</span>
                </div>
                {customer.companyName && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{customer.companyName}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{customer.address}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Maintenance History Timeline ───────────────────────────────── */}
        <Card className="mt-4 shadow-sm">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Maintenance History
              </CardTitle>
              <span className="text-xs text-gray-400">
                {filteredHistory.length} record{filteredHistory.length !== 1 ? 's' : ''}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full h-9">
                <TabsTrigger value="30days" className="flex-1 text-xs">30 Days</TabsTrigger>
                <TabsTrigger value="90days" className="flex-1 text-xs">90 Days</TabsTrigger>
                <TabsTrigger value="6months" className="flex-1 text-xs">6 Months</TabsTrigger>
                <TabsTrigger value="1year" className="flex-1 text-xs">1 Year</TabsTrigger>
              </TabsList>

              {['30days', '90days', '6months', '1year'].map((tab) => (
                <TabsContent key={tab} value={tab}>
                  {filteredHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      </div>
                      <p className="text-sm text-gray-500 font-medium">No maintenance records</p>
                      <p className="text-xs text-gray-400 mt-1">
                        This equipment has no maintenance activity in this period.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4">
                      {filteredHistory.map((record, index) => (
                        <TimelineCard
                          key={record.id}
                          record={record}
                          index={index}
                          isLast={index === filteredHistory.length - 1}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* ─── Service Request Form ──────────────────────────────────────── */}
        <Card className="mt-4 shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              Submit a Service Request
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-3">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Issue Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the issue you're experiencing with this equipment..."
                  rows={4}
                  required
                  className="mt-1.5 resize-none border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="reporter-name" className="text-sm font-medium text-gray-700">
                    Your Name <span className="text-gray-400">(optional)</span>
                  </Label>
                  <Input
                    id="reporter-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="John Doe"
                    className="mt-1.5 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <Label htmlFor="reporter-phone" className="text-sm font-medium text-gray-700">
                    Phone <span className="text-gray-400">(optional)</span>
                  </Label>
                  <Input
                    id="reporter-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 234 567 890"
                    className="mt-1.5 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="reporter-email" className="text-sm font-medium text-gray-700">
                  Email <span className="text-gray-400">(optional)</span>
                </Label>
                <Input
                  id="reporter-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                  className="mt-1.5 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || !formData.description.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Submit Service Request
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ─── Support Buttons ────────────────────────────────────────────── */}
        <Card className="mt-4 shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-600" />
              Quick Support
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {/* WhatsApp */}
              {tenantPhone && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl px-4 py-3 transition-colors group"
                >
                  <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-800">WhatsApp</p>
                    <p className="text-xs text-green-600">Chat with us</p>
                  </div>
                </a>
              )}

              {/* Call */}
              {tenantPhone && (
                <a
                  href={`tel:${tenantPhone}`}
                  className="flex items-center gap-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl px-4 py-3 transition-colors group"
                >
                  <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Phone className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Call</p>
                    <p className="text-xs text-blue-600">{tenantPhone}</p>
                  </div>
                </a>
              )}

              {/* Email */}
              {tenantEmail && (
                <a
                  href={`mailto:${tenantEmail}?subject=Service Request - ${equipment.name} (${equipment.assetNumber})`}
                  className="flex items-center gap-2.5 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl px-4 py-3 transition-colors group"
                >
                  <div className="w-9 h-9 bg-violet-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Mail className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-violet-800">Email</p>
                    <p className="text-xs text-violet-600">Send a message</p>
                  </div>
                </a>
              )}

              {/* Share / Copy Link */}
              <button
                onClick={handleShare}
                className="flex items-center gap-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 transition-colors group w-full"
              >
                <div className="w-9 h-9 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Share2 className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800">Share</p>
                  <p className="text-xs text-gray-500">Copy link</p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* ─── Scan Info ─────────────────────────────────────────────────── */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
            <Scan className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-gray-500">
              This asset has been scanned{' '}
              <span className="font-semibold text-gray-900">{equipment.scanCount.toLocaleString()}</span>{' '}
              time{equipment.scanCount !== 1 ? 's' : ''}
            </span>
          </div>
          {equipment.lastScannedAt && (
            <p className="text-xs text-gray-400 mt-2">
              Last scanned {format(parseISO(equipment.lastScannedAt), 'MMM d, yyyy \'at\' h:mm a')}
            </p>
          )}
        </div>

        {/* ─── Footer ─────────────────────────────────────────────────────── */}
        <footer className="mt-8 text-center pb-4">
          <Separator className="mb-4" />
          <div className="flex items-center justify-center gap-2">
            {tenant.logo ? (
              <img src={tenant.logo} alt={tenant.name} className="w-5 h-5 rounded" />
            ) : (
              <Building2 className="w-4 h-4 text-gray-400" />
            )}
            <p className="text-xs text-gray-400">
              Powered by <span className="font-medium text-gray-500">{tenant.name}</span>
            </p>
          </div>
          <p className="text-xs text-gray-300 mt-1">
            FacilityPro CMMS &middot; Smart Facility Management
          </p>
        </footer>
      </main>
    </div>
  );
}

// ─── Send Icon (inline since it may not be in lucide) ────────────────────────
function Send({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
      <path d="m21.854 2.147-10.94 10.939" />
    </svg>
  );
}
