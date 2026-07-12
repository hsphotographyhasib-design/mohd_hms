'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Send,
  Loader2,
  Upload,
  X,
  QrCode,
  FileText,
  CheckCircle2,
  CalendarIcon,
  AlertTriangle,
  MapPin,
  Building2,
  User,
  Wrench,
  Shield,
  Clock,
  Info,
  Camera,
  FileUp,
  Users,
  ClipboardCheck,
  Zap,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────

interface FormData {
  // Section 1 - Basic Information
  title: string;
  description: string;
  source: string;
  reference: string;
  // Section 2 - Customer & Location
  customerId: string;
  customerName: string;
  siteLocation: string;
  building: string;
  floorArea: string;
  // Section 3 - Equipment
  equipmentId: string;
  equipmentName: string;
  equipmentDetails: EquipmentDetails | null;
  // Section 4 - Assignment
  supervisorId: string;
  technicianId: string;
  team: string;
  priority: string;
  // Section 5 - Work Details
  workType: string;
  category: string;
  subCategory: string;
  sla: string;
  estimatedHours: string;
  // Section 6 - Schedule
  scheduledDate: Date | undefined;
  startTime: string;
  dueDate: Date | undefined;
  dueTime: string;
  // Section 7 - Additional Information
  checklistId: string;
  internalNotes: string;
  // Section 9 - Safety
  permitRequired: boolean;
  lockoutTagout: boolean;
  highRiskWork: boolean;
  safetyEquipment: boolean;
  safetyNotes: string;
}

interface EquipmentDetails {
  category: string;
  assetNumber: string;
  brand: string;
  model: string;
  serialNumber: string;
  location: string;
  building: string;
  room: string;
  status: string;
  condition: string;
  warrantyExpiry: string;
  customerId: string;
}

interface CustomerDetails {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  address: string;
  email: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file?: File;
}

interface SearchItem {
  id: string;
  name: string;
}

// ─── Constants ──────────────────────────────────────────────────────

const SOURCE_OPTIONS = [
  { value: 'Complaint', icon: AlertTriangle, desc: 'From customer complaint' },
  { value: 'Preventive Maintenance', icon: Clock, desc: 'Scheduled PM task' },
  { value: 'Manual', icon: FileText, desc: 'Manual entry' },
  { value: 'Quotation', icon: FileText, desc: 'Converted from quotation' },
  { value: 'Service Request', icon: Users, desc: 'Customer service request' },
  { value: 'Inspection Report', icon: ClipboardCheck, desc: 'From inspection' },
];

const WORK_TYPE_OPTIONS = [
  { value: 'Corrective', desc: 'Fix a problem' },
  { value: 'Preventive', desc: 'Scheduled maintenance' },
  { value: 'Emergency', desc: 'Urgent breakdown' },
  { value: 'Inspection', desc: 'Inspection task' },
  { value: 'Installation', desc: 'New installation' },
  { value: 'Breakdown', desc: 'Equipment breakdown' },
];

const PRIORITY_OPTIONS = [
  { value: 'Emergency', color: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500' },
  { value: 'High', color: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500' },
  { value: 'Medium', color: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  { value: 'Low', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
];

const CATEGORY_OPTIONS = [
  'HVAC', 'Electrical', 'Plumbing', 'Generator', 'Mechanical',
  'Fire Protection', 'Building Maintenance', 'Civil Works',
  'Cleaning', 'Landscaping', 'Painting', 'Carpentry',
  'IT & Communications', 'Security Systems', 'Lift & Escalator',
  'Pest Control', 'Other',
];

const INITIAL_FORM: FormData = {
  title: '',
  description: '',
  source: '',
  reference: '',
  customerId: '',
  customerName: '',
  siteLocation: '',
  building: '',
  floorArea: '',
  equipmentId: '',
  equipmentName: '',
  equipmentDetails: null,
  supervisorId: '',
  technicianId: '',
  team: '',
  priority: '',
  workType: '',
  category: '',
  subCategory: '',
  sla: '',
  estimatedHours: '',
  scheduledDate: undefined,
  startTime: '',
  dueDate: undefined,
  dueTime: '',
  checklistId: '',
  internalNotes: '',
  permitRequired: false,
  lockoutTagout: false,
  highRiskWork: false,
  safetyEquipment: false,
  safetyNotes: '',
};

const DRAFT_KEY = 'cmms_wo_draft';

// ─── Helpers ────────────────────────────────────────────────────────

const getToken = () => localStorage.getItem('cmms_token') || '';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <Camera className="w-4 h-4 text-sky-500" />;
  if (type.includes('pdf')) return <FileText className="w-4 h-4 text-rose-500" />;
  if (type.includes('sheet') || type.includes('excel')) return <FileText className="w-4 h-4 text-emerald-500" />;
  return <FileUp className="w-4 h-4 text-gray-500" />;
}

// ─── Animation Variants ─────────────────────────────────────────────

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' },
  }),
};

// ─── Section Header Component ───────────────────────────────────────

function SectionHeader({ number, title, icon: Icon, description }: {
  number: number; title: string; icon?: React.ElementType; description?: string;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3 mb-1">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white text-sm font-bold shrink-0 shadow-sm shadow-emerald-200">
          {number}
        </div>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4.5 h-4.5 text-emerald-600" />}
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        </div>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground ml-11">{description}</p>
      )}
    </div>
  );
}

// ─── Search Combobox Component ──────────────────────────────────────

function SearchCombobox({
  label,
  required,
  placeholder,
  value,
  displayValue,
  onChange,
  onSearch,
  items,
  loading,
}: {
  label: string;
  required?: boolean;
  placeholder: string;
  value: string;
  displayValue: string;
  onChange: (id: string, name: string) => void;
  onSearch: (query: string) => void;
  items: SearchItem[];
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(displayValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(displayValue);
  }, [displayValue]);

  const handleSelect = useCallback(
    (item: SearchItem) => {
      onChange(item.id, item.name);
      setQuery(item.name);
      setOpen(false);
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    onChange('', '');
    setQuery('');
    inputRef.current?.focus();
  }, [onChange]);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onSearch(e.target.value);
            if (e.target.value && !open) setOpen(true);
          }}
          onFocus={() => {
            if (query) {
              onSearch(query);
              setOpen(true);
            }
          }}
          onBlur={() => {
            setTimeout(() => setOpen(false), 200);
          }}
          className="pr-8 h-9 text-sm"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <AnimatePresence>
          {open && (items.length > 0 || loading) && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 top-full mt-1 w-full bg-white rounded-lg border shadow-lg max-h-48 overflow-y-auto"
            >
              {loading && (
                <div className="px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Searching...
                </div>
              )}
              {!loading &&
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 transition-colors"
                    onMouseDown={() => handleSelect(item)}
                  >
                    {item.name}
                  </button>
                ))}
              {!loading && items.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-400">No results found</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Equipment Detail Card ──────────────────────────────────────────

function EquipmentDetailCard({ details }: { details: EquipmentDetails }) {
  const statusColor: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-600',
    under_maintenance: 'bg-amber-100 text-amber-700',
    decommissioned: 'bg-red-100 text-red-700',
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-3 p-4 bg-emerald-50/50 border border-emerald-200/50 rounded-xl space-y-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5" /> Equipment Details
        </p>
        <Badge variant="outline" className={statusColor[details.status] || ''}>
          {details.status?.replace(/_/g, ' ')}
        </Badge>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-muted-foreground block">Asset No.</span>
          <span className="font-medium font-mono">{details.assetNumber}</span>
        </div>
        <div>
          <span className="text-muted-foreground block">Category</span>
          <span className="font-medium">{details.category}</span>
        </div>
        {details.brand && (
          <div>
            <span className="text-muted-foreground block">Brand / Model</span>
            <span className="font-medium">{details.brand}{details.model ? ` ${details.model}` : ''}</span>
          </div>
        )}
        {details.serialNumber && (
          <div>
            <span className="text-muted-foreground block">Serial No.</span>
            <span className="font-medium font-mono">{details.serialNumber}</span>
          </div>
        )}
        {details.location && (
          <div>
            <span className="text-muted-foreground block">Location</span>
            <span className="font-medium">{details.location}</span>
          </div>
        )}
        {details.building && (
          <div>
            <span className="text-muted-foreground block">Building</span>
            <span className="font-medium">{details.building}</span>
          </div>
        )}
        {details.condition && (
          <div>
            <span className="text-muted-foreground block">Condition</span>
            <span className="font-medium capitalize">{details.condition}</span>
          </div>
        )}
        {details.warrantyExpiry && (
          <div>
            <span className="text-muted-foreground block">Warranty Until</span>
            <span className="font-medium">{details.warrantyExpiry}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Customer Info Card ─────────────────────────────────────────────

function CustomerInfoCard({ customer }: { customer: CustomerDetails }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-3 p-4 bg-sky-50/50 border border-sky-200/50 rounded-xl space-y-2"
    >
      <p className="text-sm font-semibold text-sky-800 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" /> Customer Details
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {customer.companyName && customer.companyName !== customer.name && (
          <div>
            <span className="text-muted-foreground block">Company</span>
            <span className="font-medium">{customer.companyName}</span>
          </div>
        )}
        {customer.phone && (
          <div>
            <span className="text-muted-foreground block">Phone</span>
            <span className="font-medium">{customer.phone}</span>
          </div>
        )}
        {customer.email && (
          <div>
            <span className="text-muted-foreground block">Email</span>
            <span className="font-medium">{customer.email}</span>
          </div>
        )}
        {customer.address && (
          <div className="col-span-2">
            <span className="text-muted-foreground block">Address</span>
            <span className="font-medium">{customer.address}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function NewWorkOrderForm() {
  const setView = useAppStore((s) => s.setView);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [nextWoNumber, setNextWoNumber] = useState<string>('');
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);

  // Search results
  const [customerResults, setCustomerResults] = useState<SearchItem[]>([]);
  const [equipmentResults, setEquipmentResults] = useState<SearchItem[]>([]);
  const [supervisors, setSupervisors] = useState<SearchItem[]>([]);
  const [technicians, setTechnicians] = useState<SearchItem[]>([]);
  const [checklists, setChecklists] = useState<SearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(true);

  // Auto-save refs
  const formRef = useRef(form);
  const initialFormRef = useRef(INITIAL_FORM);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasRestoredDraft = useRef(false);

  // Keep formRef in sync
  formRef.current = form;

  // ─── Progress Calculation ─────────────────────────────────────────
  const completedSections = [
    form.title.trim().length > 0,
    form.source.length > 0,
    form.customerId.length > 0,
    form.equipmentId.length > 0,
    form.technicianId.length > 0 || form.priority.length > 0,
    form.workType.length > 0,
    form.scheduledDate !== undefined,
    form.internalNotes.length > 0 || form.checklistId.length > 0,
  ].filter(Boolean).length;

  const progressPercent = Math.round((completedSections / 8) * 100);

  // ─── Load WO number preview on mount ──────────────────────────────
  useEffect(() => {
    const fetchWoPreview = async () => {
      try {
        const res = await fetch('/api/work-orders/next-number', {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.nextNumber) setNextWoNumber(data.nextNumber);
        }
      } catch {
        // Fallback: generate locally
        const year = new Date().getFullYear();
        setNextWoNumber(`WO/HMS/${year}/000001`);
      }
    };
    fetchWoPreview();
  }, []);

  // ─── Load dropdown data on mount ─────────────────────────────────
  useEffect(() => {
    const loadDropdowns = async () => {
      setDropdownLoading(true);
      try {
        const [empSupRes, empTechRes, clRes] = await Promise.allSettled([
          fetch('/api/employees?role=supervisor', { headers: { Authorization: `Bearer ${getToken()}` } }),
          fetch('/api/employees?role=technician', { headers: { Authorization: `Bearer ${getToken()}` } }),
          fetch('/api/work-orders/checklists', { headers: { Authorization: `Bearer ${getToken()}` } }),
        ]);

        if (empSupRes.status === 'fulfilled' && empSupRes.value.ok) {
          const empData = await empSupRes.value.json();
          const empList: SearchItem[] = (empData.data || empData || []).map(
            (e: { id: string; name: string }) => ({ id: e.id, name: e.name }),
          );
          setSupervisors(empList);
        }

        if (empTechRes.status === 'fulfilled' && empTechRes.value.ok) {
          const techData = await empTechRes.value.json();
          const techList: SearchItem[] = (techData.data || techData || []).map(
            (e: { id: string; name: string }) => ({ id: e.id, name: e.name }),
          );
          setTechnicians(techList);
        }

        if (clRes.status === 'fulfilled' && clRes.value.ok) {
          const clData = await clRes.value.json();
          const clList: SearchItem[] = (clData.data || clData || []).map(
            (c: { id: string; name: string }) => ({ id: c.id, name: c.name }),
          );
          setChecklists(clList);
        }
      } catch {
        // Silently fail
      } finally {
        setDropdownLoading(false);
      }
    };
    loadDropdowns();
  }, []);

  // ─── Restore draft from localStorage ─────────────────────────────
  useEffect(() => {
    if (hasRestoredDraft.current) return;
    hasRestoredDraft.current = true;

    const restoreDraft = async () => {
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setForm((prev) => ({
            ...prev,
            ...parsed,
            scheduledDate: parsed.scheduledDate ? new Date(parsed.scheduledDate) : undefined,
            dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
          }));
          initialFormRef.current = {
            ...INITIAL_FORM,
            ...parsed,
            scheduledDate: parsed.scheduledDate ? new Date(parsed.scheduledDate) : undefined,
            dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
          };
          toast.info('Draft restored');
        }
      } catch {
        // Ignore parse errors
      }
    };
    restoreDraft();
  }, []);

  // ─── Auto-save every 30 seconds ──────────────────────────────────
  useEffect(() => {
    autoSaveTimerRef.current = setInterval(() => {
      const current = formRef.current;
      const hasChanges = JSON.stringify(current) !== JSON.stringify(initialFormRef.current);
      if (!hasChanges) return;

      const draftPayload = {
        ...current,
        scheduledDate: current.scheduledDate?.toISOString(),
        dueDate: current.dueDate?.toISOString(),
      };

      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftPayload));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    }, 30000);

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, []);

  // ─── Field updater ────────────────────────────────────────────────
  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ─── Search handlers ──────────────────────────────────────────────
  const searchCustomers = useCallback(async (q: string) => {
    if (!q.trim()) { setCustomerResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list: SearchItem[] = (data.data || data || []).map(
          (c: { id: string; name: string; companyName?: string }) => ({
            id: c.id,
            name: c.companyName || c.name,
          }),
        );
        setCustomerResults(list);
      }
    } catch {
      // Ignore
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const searchEquipment = useCallback(async (q: string) => {
    if (!q.trim()) { setEquipmentResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/equipment?search=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list: SearchItem[] = (data.data || data || []).map(
          (e: { id: string; name: string; assetNumber?: string }) => ({
            id: e.id,
            name: `${e.name}${e.assetNumber ? ` (${e.assetNumber})` : ''}`,
          }),
        );
        setEquipmentResults(list);
      }
    } catch {
      // Ignore
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // ─── Customer select: load details + auto-fill ────────────────────
  const handleCustomerSelect = useCallback(async (id: string, name: string) => {
    updateField('customerId', id);
    updateField('customerName', name);
    setCustomerDetails(null);

    try {
      const res = await fetch(`/api/customers/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCustomerDetails({
          id: data.id,
          name: data.name,
          companyName: data.companyName || '',
          phone: data.phone || '',
          address: data.address || '',
          email: data.email || '',
        });
        // Auto-fill site location and building from customer data
        if (data.address) updateField('siteLocation', data.address);
      }
    } catch {
      // Ignore
    }
  }, [updateField]);

  // ─── Equipment select: load details + auto-fill category ──────────
  const handleEquipmentSelect = useCallback(async (id: string, name: string) => {
    updateField('equipmentId', id);
    updateField('equipmentName', name);
    setForm((prev) => ({ ...prev, equipmentDetails: null }));

    try {
      const res = await fetch(`/api/equipment/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        const details: EquipmentDetails = {
          category: data.category || '',
          assetNumber: data.assetNumber || '',
          brand: data.brand || '',
          model: data.model || '',
          serialNumber: data.serialNumber || '',
          location: data.location || '',
          building: data.building || '',
          room: data.room || '',
          status: data.status || 'active',
          condition: data.condition || '',
          warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry).toLocaleDateString() : '',
          customerId: data.customerId || '',
        };
        setForm((prev) => ({ ...prev, equipmentDetails: details }));

        // Auto-fill category and building from equipment
        if (data.category) updateField('category', data.category);
        if (data.building) updateField('building', data.building);
        if (data.location) updateField('siteLocation', data.location);
      }
    } catch {
      // Ignore
    }
  }, [updateField]);

  // ─── QR Scan placeholder ──────────────────────────────────────────
  const handleQrScan = useCallback(() => {
    toast.info('QR Scanner will be available in the mobile app');
  }, []);

  // ─── File handling ────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    e.target.value = '';
  }, []);

  const addFiles = useCallback((files: File[]) => {
    const newFiles: UploadedFile[] = files
      .filter((f) => f.size <= 10 * 1024 * 1024)
      .map((f) => ({
        id: crypto.randomUUID(),
        name: f.name,
        size: f.size,
        type: f.type,
        file: f,
      }));
    if (files.length > newFiles.length) {
      toast.warning(`${files.length - newFiles.length} file(s) exceed 10MB limit`);
    }
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // ─── Source change → auto-populate reference ───────────────────────
  const handleSourceChange = useCallback(
    (val: string) => {
      updateField('source', val);
      const prefixes: Record<string, string> = {
        Complaint: 'CMP-',
        'Preventive Maintenance': 'PM-',
        Manual: 'MAN-',
        Quotation: 'QUO-',
        'Service Request': 'SR-',
        'Inspection Report': 'INSP-',
      };
      updateField('reference', prefixes[val] ? `${prefixes[val]}${Date.now().toString(36).toUpperCase()}` : '');
    },
    [updateField],
  );

  // ─── Validation ───────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const required: (keyof FormData)[] = [
      'title',
      'source',
      'customerId',
      'technicianId',
      'priority',
      'workType',
      'category',
      'scheduledDate',
    ];

    for (const key of required) {
      if (!form[key] || (typeof form[key] === 'string' && !form[key]?.toString().trim())) {
        const fieldLabels: Record<string, string> = {
          title: 'Title',
          source: 'Source',
          customerId: 'Customer',
          technicianId: 'Technician',
          priority: 'Priority',
          workType: 'Work Type',
          category: 'Category',
          scheduledDate: 'Scheduled Date',
        };
        toast.error(`${fieldLabels[key] || key} is required`);
        return false;
      }
    }
    return true;
  }, [form]);

  // ─── Submit ───────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (isDraft: boolean) => {
      if (!isDraft && !validate()) return;

      setSubmitting(true);
      try {
        // Build attachments array
        const attachmentsPayload = uploadedFiles.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type,
          uploadedAt: new Date().toISOString(),
        }));

        const payload = {
          title: form.title,
          description: form.description,
          source: form.source,
          reference: form.reference,
          customerId: form.customerId,
          equipmentId: form.equipmentId,
          priority: form.priority,
          workType: form.workType,
          type: form.workType,
          category: form.category,
          subCategory: form.subCategory,
          sla: form.sla,
          estimatedHours: form.estimatedHours,
          assignedToId: form.technicianId,
          supervisorId: form.supervisorId,
          teamId: form.team || null,
          scheduledDate: form.scheduledDate?.toISOString(),
          startTime: form.startTime || null,
          dueDate: form.dueDate?.toISOString() || null,
          dueTime: form.dueTime || null,
          building: form.building || null,
          floor: form.floorArea || null,
          internalNotes: form.internalNotes,
          checklistId: form.checklistId || null,
          notes: form.internalNotes,
          isDraft,
          permitRequired: form.permitRequired,
          lockoutTagout: form.lockoutTagout,
          lockoutTagoutRequired: form.lockoutTagout,
          highRiskWork: form.highRiskWork,
          safetyEquipment: form.safetyEquipment,
          safetyEquipmentReq: form.safetyEquipment,
          safetyNotes: form.safetyNotes || null,
          attachments: attachmentsPayload.length > 0 ? attachmentsPayload : undefined,
        };

        const res = await fetch('/api/work-orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to create work order');

        localStorage.removeItem(DRAFT_KEY);
        toast.success(
          isDraft
            ? `Draft saved: ${data.workOrderNumber || 'WO Draft'}`
            : `Work order created: ${data.workOrderNumber}`,
        );
        setView('work-orders');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setSubmitting(false);
      }
    },
    [form, uploadedFiles, validate, setView],
  );

  // ─── Cancel ───────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    setShowCancelDialog(true);
  }, []);

  const confirmCancel = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setShowCancelDialog(false);
    setView('work-orders');
  }, [setView]);

  // ─── Priority badge helper ────────────────────────────────────────
  const getPriorityBadge = (val: string) => {
    const found = PRIORITY_OPTIONS.find((p) => p.value === val);
    if (!found) return null;
    return <Badge variant="outline" className={found.color}>{found.value}</Badge>;
  };

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-24">
      {/* ── Sticky Header ── */}
      <div className="sticky top-[68px] z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => setView('work-orders')}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Work Orders
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-gray-900">New Work Order</h1>
              {nextWoNumber && (
                <Badge variant="outline" className="font-mono text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                  {nextWoNumber}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="hidden sm:inline-flex text-xs"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save Draft
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 mr-1.5" />
              )}
              Create WO
            </Button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="flex items-center gap-3 mt-2">
          <Progress value={progressPercent} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{progressPercent}%</span>
        </div>
      </div>

      {/* Auto-save indicator */}
      <AnimatePresence>
        {draftSaved && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-20 right-6 z-50 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Draft auto-saved
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Form Sections ── */}
      <div className="space-y-4">
        {/* ──── Section 1 — Basic Information ──── */}
        <motion.div
          custom={0}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
            <CardHeader className="pb-0 px-5 pt-4">
              <SectionHeader
                number={1}
                title="Basic Information"
                icon={FileText}
                description="Title, description, source, and auto-generated WO number"
              />
            </CardHeader>
            <CardContent className="p-5 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-medium">
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. AC Unit Repair - Block A, Level 3"
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-medium">Description</Label>
                  <Textarea
                    placeholder="Describe the work to be performed in detail..."
                    rows={3}
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    className="text-sm resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Source <span className="text-red-500">*</span>
                  </Label>
                  <Select value={form.source} onValueChange={handleSourceChange}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <opt.icon className="w-3.5 h-3.5 text-gray-400" />
                            <div>
                              <span className="text-sm">{opt.value}</span>
                              <span className="text-xs text-muted-foreground ml-1.5">— {opt.desc}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Reference No.</Label>
                  <Input
                    placeholder="Auto-populated or enter manually"
                    value={form.reference}
                    onChange={(e) => updateField('reference', e.target.value)}
                    className="h-9 text-sm font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ──── Section 2 — Customer & Location ──── */}
        <motion.div
          custom={1}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
            <CardHeader className="pb-0 px-5 pt-4">
              <SectionHeader
                number={2}
                title="Customer & Location"
                icon={MapPin}
                description="Select customer and specify the work site location"
              />
            </CardHeader>
            <CardContent className="p-5 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <SearchCombobox
                    label="Customer"
                    required
                    placeholder="Search by name, company, or phone..."
                    value={form.customerId}
                    displayValue={form.customerName}
                    onChange={handleCustomerSelect}
                    onSearch={searchCustomers}
                    items={customerResults}
                    loading={searchLoading}
                  />
                </div>

                {/* Customer details card */}
                <AnimatePresence>
                  {customerDetails && (
                    <div className="md:col-span-2">
                      <CustomerInfoCard customer={customerDetails} />
                    </div>
                  )}
                </AnimatePresence>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Site / Location <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <Input
                      placeholder="Enter site or location"
                      value={form.siteLocation}
                      onChange={(e) => updateField('siteLocation', e.target.value)}
                      className="pl-8 h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Building</Label>
                  <div className="relative">
                    <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <Input
                      placeholder="Enter building name"
                      value={form.building}
                      onChange={(e) => updateField('building', e.target.value)}
                      className="pl-8 h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Floor / Area</Label>
                  <Input
                    placeholder="e.g. Level 3, Room 302"
                    value={form.floorArea}
                    onChange={(e) => updateField('floorArea', e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ──── Section 3 — Equipment ──── */}
        <motion.div
          custom={2}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
            <CardHeader className="pb-0 px-5 pt-4">
              <SectionHeader
                number={3}
                title="Equipment"
                icon={Wrench}
                description="Search, select, or scan equipment via QR code"
              />
            </CardHeader>
            <CardContent className="p-5 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <SearchCombobox
                    label="Equipment"
                    required
                    placeholder="Search by name, asset no., or QR..."
                    value={form.equipmentId}
                    displayValue={form.equipmentName}
                    onChange={handleEquipmentSelect}
                    onSearch={searchEquipment}
                    items={equipmentResults}
                    loading={searchLoading}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Quick: QR Scan</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Scan QR or use search above"
                      value={form.equipmentName}
                      readOnly
                      className="h-9 text-sm bg-gray-50 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleQrScan}
                      className="shrink-0 h-9 w-9 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 border-emerald-200"
                      title="Scan QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Equipment details card */}
              <AnimatePresence>
                {form.equipmentDetails && (
                  <div className="mt-2">
                    <EquipmentDetailCard details={form.equipmentDetails} />
                  </div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* ──── Section 4 — Assignment ──── */}
        <motion.div
          custom={3}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
            <CardHeader className="pb-0 px-5 pt-4">
              <SectionHeader
                number={4}
                title="Assignment"
                icon={User}
                description="Assign supervisor, technician, and set priority"
              />
            </CardHeader>
            <CardContent className="p-5 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Supervisor</Label>
                  <Select
                    value={form.supervisorId}
                    onValueChange={(val) => updateField('supervisorId', val)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={dropdownLoading ? 'Loading...' : 'Select supervisor'} />
                    </SelectTrigger>
                    <SelectContent>
                      {supervisors.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Technician <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.technicianId}
                    onValueChange={(val) => updateField('technicianId', val)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={dropdownLoading ? 'Loading...' : 'Select technician'} />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Team</Label>
                  <Input
                    placeholder="Enter team name (optional)"
                    value={form.team}
                    onChange={(e) => updateField('team', e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Priority <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.priority}
                    onValueChange={(val) => updateField('priority', val)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select priority">
                        {form.priority && getPriorityBadge(form.priority)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${p.dot}`} />
                            <Badge variant="outline" className={`${p.color} text-xs`}>
                              {p.value}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ──── Section 5 — Work Details ──── */}
        <motion.div
          custom={4}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
            <CardHeader className="pb-0 px-5 pt-4">
              <SectionHeader
                number={5}
                title="Work Details"
                icon={ClipboardCheck}
                description="Type, category, SLA, and estimated effort"
              />
            </CardHeader>
            <CardContent className="p-5 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Work Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.workType}
                    onValueChange={(val) => updateField('workType', val)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select work type" />
                    </SelectTrigger>
                    <SelectContent>
                      {WORK_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{opt.value}</span>
                            <span className="text-xs text-muted-foreground">— {opt.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.category}
                    onValueChange={(val) => updateField('category', val)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Sub Category</Label>
                  <Input
                    placeholder="Enter sub category"
                    value={form.subCategory}
                    onChange={(e) => updateField('subCategory', e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">SLA</Label>
                  <Input
                    placeholder="e.g. 24h response, 48h resolution"
                    value={form.sla}
                    onChange={(e) => updateField('sla', e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Estimated Hours</Label>
                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    placeholder="e.g. 2.5"
                    value={form.estimatedHours}
                    onChange={(e) => updateField('estimatedHours', e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ──── Section 6 — Schedule ──── */}
        <motion.div
          custom={5}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
            <CardHeader className="pb-0 px-5 pt-4">
              <SectionHeader
                number={6}
                title="Schedule"
                icon={Clock}
                description="Set scheduled date, start time, and due date"
              />
            </CardHeader>
            <CardContent className="p-5 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Scheduled Date <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-left font-normal h-9 text-sm"
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-gray-400" />
                        {form.scheduledDate
                          ? format(form.scheduledDate, 'PPP')
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={form.scheduledDate}
                        onSelect={(date) => updateField('scheduledDate', date ?? undefined)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Start Time</Label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => updateField('startTime', e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-left font-normal h-9 text-sm"
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-gray-400" />
                        {form.dueDate
                          ? format(form.dueDate, 'PPP')
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={form.dueDate}
                        onSelect={(date) => updateField('dueDate', date ?? undefined)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Due Time</Label>
                  <Input
                    type="time"
                    value={form.dueTime}
                    onChange={(e) => updateField('dueTime', e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ──── Section 7 — Additional Information ──── */}
        <motion.div
          custom={6}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
            <CardHeader className="pb-0 px-5 pt-4">
              <SectionHeader
                number={7}
                title="Additional Information"
                icon={Info}
                description="Attach checklist and add internal notes"
              />
            </CardHeader>
            <CardContent className="p-5 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Checklist Template</Label>
                  <Select
                    value={form.checklistId}
                    onValueChange={(val) => updateField('checklistId', val)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select checklist (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {checklists.map((cl) => (
                        <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Safety Notes</Label>
                  <Textarea
                    placeholder="Additional safety requirements..."
                    rows={3}
                    value={form.safetyNotes}
                    onChange={(e) => updateField('safetyNotes', e.target.value)}
                    className="text-sm resize-none"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-medium">
                    Internal Notes
                    <span className="text-muted-foreground ml-1">(not visible to customer)</span>
                  </Label>
                  <Textarea
                    placeholder="Add internal notes for the team..."
                    rows={3}
                    value={form.internalNotes}
                    onChange={(e) => updateField('internalNotes', e.target.value)}
                    className="text-sm resize-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ──── Section 8 — Attachments ──── */}
        <motion.div
          custom={7}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
            <CardHeader className="pb-0 px-5 pt-4">
              <SectionHeader
                number={8}
                title="Attachments"
                icon={FileUp}
                description="Upload photos, documents, or other files (max 10MB each)"
              />
            </CardHeader>
            <CardContent className="p-5 pt-2">
              <div className="space-y-3">
                {/* Drop zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    relative flex flex-col items-center justify-center gap-2
                    border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
                    transition-all duration-200
                    ${isDragOver
                      ? 'border-emerald-500 bg-emerald-50/50 scale-[1.01]'
                      : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50/50'
                    }
                  `}
                  onClick={() => document.getElementById('wo-file-input')?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      document.getElementById('wo-file-input')?.click();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload attachments"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isDragOver ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                    <Upload className={`w-4 h-4 transition-colors ${isDragOver ? 'text-emerald-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Drop files here or click to browse
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      JPG, PNG, PDF, DOC, XLS — Max 10MB per file
                    </p>
                  </div>
                  <input
                    id="wo-file-input"
                    type="file"
                    className="hidden"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileInput}
                  />
                </div>

                {/* Uploaded files list */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Separator />
                    <p className="text-xs font-medium text-muted-foreground">
                      {uploadedFiles.length} file(s) attached
                    </p>
                    {uploadedFiles.map((file) => (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {getFileIcon(file.type)}
                          <span className="text-sm text-gray-700 truncate">{file.name}</span>
                          <span className="text-xs text-gray-400 shrink-0 tabular-nums">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors shrink-0 p-1 rounded hover:bg-red-50"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ──── Section 9 — Safety & Compliance ──── */}
        <motion.div
          custom={8}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
            <CardHeader className="pb-0 px-5 pt-4">
              <SectionHeader
                number={9}
                title="Safety & Compliance"
                icon={Shield}
                description="Flag safety requirements for this work order"
              />
            </CardHeader>
            <CardContent className="p-5 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'permitRequired' as const, title: 'Permit Required', desc: 'Work permit needed before starting', icon: FileText },
                  { key: 'lockoutTagout' as const, title: 'Lockout / Tagout Required', desc: 'Energy isolation required', icon: Zap },
                  { key: 'highRiskWork' as const, title: 'High Risk Work', desc: 'Confined space, heights, etc.', icon: AlertTriangle },
                  { key: 'safetyEquipment' as const, title: 'Safety Equipment Required', desc: 'PPE and safety gear needed', icon: Shield },
                ].map((item) => (
                  <label
                    key={item.key}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-150
                      ${form[item.key]
                        ? 'border-emerald-200 bg-emerald-50/50 shadow-sm shadow-emerald-100'
                        : 'border-gray-100 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Checkbox
                      checked={form[item.key]}
                      onCheckedChange={(checked) => updateField(item.key, !!checked)}
                      className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <item.icon className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-sm font-medium text-gray-700">{item.title}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                    {form[item.key] && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Bottom Sticky Action Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700 text-xs"
              >
                Cancel
              </Button>
              {nextWoNumber && (
                <span className="hidden sm:inline text-xs text-muted-foreground font-mono">
                  {nextWoNumber}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSubmit(true)}
                disabled={submitting}
                className="text-xs"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save Draft
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs min-w-[140px]"
                onClick={() => handleSubmit(false)}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Create Work Order
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cancel Confirmation Dialog ── */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Discard Work Order?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to discard this work order
              and go back? Any saved draft will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}