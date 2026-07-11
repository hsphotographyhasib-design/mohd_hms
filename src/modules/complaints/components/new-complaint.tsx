'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import { Separator } from '@/shared/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { useAppStore, useAuthStore } from '@/app-shell/store';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  ImagePlus,
  Info,
  Loader2,
  Mail,
  MapPin,
  Monitor,
  Navigation,
  Phone,
  Plus,
  Send,
  Shield,
  Tag,
  Upload,
  User,
  X,
} from 'lucide-react';
import { SmartCustomerSearch } from './smart-customer-search';
import { QuickCustomerCreate } from './quick-customer-create';
import { EquipmentAutofill } from './equipment-autofill';
import { GoogleMapsPicker } from './google-maps-picker';

// ============ TYPES ============

type RequestType = 'complaint' | 'service_request' | 'maintenance' | 'emergency';

interface FormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  subcategory: string;
  contactMethod: string;
  responseTime: string;
  requestType: RequestType;
  customerId: string;
  equipmentId: string;
  location: string;
  building: string;
  floor: string;
  room: string;
  gpsLocation: string;
  files: File[];
}

interface CustomerDetails {
  id: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  building?: string;
  floor?: string;
  unit?: string;
  customerNumber?: string;
}

interface EquipmentOption {
  id: string;
  name: string;
  category?: string;
}

const CATEGORIES = [
  { value: 'HVAC', label: 'HVAC', subcategories: ['Air Conditioning', 'Heating', 'Ventilation', 'Chiller', 'AHU'] },
  { value: 'Electrical', label: 'Electrical', subcategories: ['Power Outage', 'Wiring', 'Panel', 'Lighting', 'Generator'] },
  { value: 'Plumbing', label: 'Plumbing', subcategories: ['Leak', 'Drainage', 'Water Supply', 'Pumps', 'Fixtures'] },
  { value: 'Generator', label: 'Generator', subcategories: ['Starting Failure', 'Fuel Issue', 'Load Transfer', 'Maintenance'] },
  { value: 'Mechanical', label: 'Mechanical', subcategories: ['Motor', 'Pump', 'Bearing', 'Vibration', 'Alignment'] },
  { value: 'FireProtection', label: 'Fire Protection', subcategories: ['Alarm', 'Sprinkler', 'Extinguisher', 'Detection System'] },
  { value: 'Civil', label: 'Civil', subcategories: ['Structural', 'Waterproofing', 'Painting', 'Flooring'] },
  { value: 'General', label: 'General', subcategories: ['Cleaning', 'Pest Control', 'Landscaping', 'Other'] },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-emerald-500' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
];

const STEPS = [
  { id: 1, label: 'Complaint Details', sublabel: 'Basic information' },
  { id: 2, label: 'Equipment & Location', sublabel: 'Where the issue is' },
  { id: 3, label: 'Attachments', sublabel: 'Photos & documents' },
  { id: 4, label: 'Review & Submit', sublabel: 'Confirm & submit' },
];

const REQUEST_TYPES: { value: RequestType; label: string; color: string; activeColor: string }[] = [
  { value: 'complaint', label: 'Complaint', color: 'border-gray-200 text-gray-600', activeColor: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
  { value: 'service_request', label: 'Service Request', color: 'border-gray-200 text-gray-600', activeColor: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
  { value: 'maintenance', label: 'Maintenance', color: 'border-gray-200 text-gray-600', activeColor: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
  { value: 'emergency', label: 'Emergency', color: 'border-gray-200 text-gray-600', activeColor: 'border-red-500 bg-red-50 text-red-700' },
];

const emptyForm: FormData = {
  title: '',
  description: '',
  priority: 'medium',
  category: '',
  subcategory: '',
  contactMethod: 'whatsapp',
  responseTime: '',
  requestType: 'complaint',
  customerId: '',
  equipmentId: '',
  location: '',
  building: '',
  floor: '',
  room: '',
  gpsLocation: '',
  files: [],
};

function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

// ============ COMPONENT ============

export function NewComplaint() {
  const { setView } = useAppStore();
  const { user } = useAuthStore();
  const isCustomer = user?.role === 'customer';

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetails | null>(null);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [linkingCustomer, setLinkingCustomer] = useState(false);

  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Auto-link customer for customer role on mount
  // Uses /api/customers/self which finds or auto-creates the Customer record
  useEffect(() => {
    if (!isCustomer || !user) return;

    const findLinkedCustomer = async () => {
      setLinkingCustomer(true);
      try {
        const res = await fetch('/api/customers/self', {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          const c = await res.json();
          if (c?.id) {
            setSelectedCustomer(c);
            updateField('customerId', c.id);
            // Auto-fill location from customer
            if (c.address) updateField('location', c.address);
            if (c.building) updateField('building', c.building);
            if (c.floor) updateField('floor', c.floor);
            if (c.unit) updateField('room', c.unit);
          }
        }
      } catch { /* ignore */ }
      finally { setLinkingCustomer(false); }
    };
    findLinkedCustomer();
  }, [isCustomer, user?.id, updateField]);

  const subcategories = useMemo(() => {
    const cat = CATEGORIES.find((c) => c.value === form.category);
    return cat?.subcategories ?? [];
  }, [form.category]);

  const selectedPriority = useMemo(() => {
    return PRIORITIES.find((p) => p.value === form.priority);
  }, [form.priority]);

  // Handle customer selection (staff mode)
  const handleCustomerSelect = useCallback((customerId: string, customerData: any) => {
    if (!customerId) {
      setSelectedCustomer(null);
      updateField('customerId', '');
      return;
    }
    const c: CustomerDetails = customerData;
    setSelectedCustomer(c);
    updateField('customerId', customerId);
    // Auto-fill location from customer
    if (c.address) updateField('location', c.address);
    if (c.building) updateField('building', c.building);
    if (c.floor) updateField('floor', c.floor);
    if (c.unit) updateField('room', c.unit);
  }, [updateField]);

  // Handle customer created from QuickCustomerCreate
  const handleCustomerCreated = useCallback((customer: any) => {
    const c: CustomerDetails = customer;
    setSelectedCustomer(c);
    updateField('customerId', c.id);
    if (c.address) updateField('location', c.address);
    if (c.building) updateField('building', c.building);
    if (c.floor) updateField('floor', c.floor);
    if (c.unit) updateField('room', c.unit);
  }, [updateField]);

  // Handle equipment selection
  const handleEquipmentChange = useCallback((equipmentId: string, equipmentData: any) => {
    setSelectedEquipment(equipmentData);
    updateField('equipmentId', equipmentId);
  }, [updateField]);

  // Handle GPS coords change
  const handleGpsChange = useCallback((coords: { lat: number; lng: number } | null, _address?: string) => {
    setGpsCoords(coords);
    if (coords) {
      updateField('gpsLocation', `${coords.lat},${coords.lng}`);
    } else {
      updateField('gpsLocation', '');
    }
  }, [updateField]);

  // File handling
  const handleFileAdd = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setForm((prev) => {
      const newFiles = [...prev.files, ...files].slice(0, 5);
      return { ...prev, files: newFiles };
    });
    // Create preview URLs
    const newUrls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls((prev) => [...prev, ...newUrls].slice(0, 5));
    e.target.value = '';
  }, []);

  const handleFileRemove = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
    setPreviewUrls((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Step validation
  const canProceed = useCallback((): boolean => {
    switch (step) {
      case 1:
        return !!form.title.trim() && !!form.description.trim() && !!form.category;
      case 2:
        if (isCustomer) {
          // Customer mode: pass if customer is linked (or still linking)
          return !!form.customerId || linkingCustomer;
        }
        // Staff mode: must select a customer
        return !!form.customerId;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  }, [step, form, isCustomer, linkingCustomer]);

  // Submit
  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const photos = form.files.length > 0
        ? form.files.map((f) => f.name)
        : undefined;

      const body: Record<string, any> = {
        customerId: form.customerId,
        title: form.title,
        description: form.description,
        priority: form.requestType === 'emergency' ? 'critical' : form.priority,
        category: form.category,
        photos,
      };

      if (form.equipmentId) body.equipmentId = form.equipmentId;

      // Build locationInfo
      const locationInfo = {
        location: form.location,
        building: form.building,
        floor: form.floor,
        room: form.room,
        gpsLocation: gpsCoords ? `${gpsCoords.lat},${gpsCoords.lng}` : form.gpsLocation,
      };
      body.locationInfo = locationInfo;

      // Append extra metadata to description
      const extras: string[] = [];
      if (form.subcategory) extras.push(`Subcategory: ${form.subcategory}`);
      if (form.requestType !== 'complaint') extras.push(`Type: ${form.requestType.replace('_', ' ')}`);
      if (form.contactMethod) extras.push(`Preferred Contact: ${form.contactMethod}`);
      if (form.responseTime) extras.push(`Response Time: ${form.responseTime}`);
      if (form.location) extras.push(`Location: ${form.location}`);
      if (form.building) extras.push(`Building: ${form.building}`);
      if (form.floor) extras.push(`Floor: ${form.floor}`);
      if (form.room) extras.push(`Room: ${form.room}`);

      if (extras.length > 0) {
        body.description = form.description + '\n\n---\n' + extras.join('\n');
      }

      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Submission failed' }));
        throw new Error(err.error || 'Failed to create complaint');
      }

      const result = await res.json();
      toast.success('Complaint submitted successfully!', {
        description: result.complaintNumber
          ? `Complaint ${result.complaintNumber} created and will be reviewed by our team.`
          : 'Your complaint has been created and will be reviewed by our team.',
      });
      setView('complaints');
    } catch (err: any) {
      toast.error('Submission failed', {
        description: err.message || 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }, [form, gpsCoords, setView]);

  // Breadcrumb items
  const breadcrumbs = [
    { label: 'Dashboard', onClick: () => setView('dashboard') },
    { label: 'Complaints', onClick: () => setView('complaints') },
    { label: 'New Complaint' },
  ];

  return (
    <div className="p-4 md:p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm mb-6" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-300">/</span>}
            {crumb.onClick ? (
              <button
                onClick={crumb.onClick}
                className="text-gray-500 hover:text-emerald-600 transition-colors"
              >
                {crumb.label}
              </button>
            ) : (
              <span className="text-emerald-600 font-medium">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ─── Left Sidebar ─── */}
        <aside className="lg:col-span-3">
          <div className="space-y-6">
            {/* Header Card */}
            <Card className="border-emerald-100">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-emerald-700">New Complaint</h2>
                    <p className="text-xs text-muted-foreground">Submit a new complaint or service request</p>
                  </div>
                </div>

                {/* Illustration */}
                <div className="bg-emerald-50 rounded-xl p-4 mb-4 flex items-center justify-center">
                  <div className="text-center">
                    <ClipboardList className="h-12 w-12 text-emerald-300 mx-auto mb-2" />
                    <p className="text-xs text-emerald-600 font-medium">Complaint Form</p>
                  </div>
                </div>

                {/* How it works */}
                <h3 className="font-semibold text-sm mb-3">How it works</h3>
                <div className="space-y-3">
                  {[
                    { num: '1', title: 'Submit Complaint', desc: 'Provide details about the issue', icon: FileText },
                    { num: '2', title: 'Review & Assign', desc: 'Our team will review and assign', icon: ClipboardList },
                    { num: '3', title: 'Resolution', desc: "We'll resolve and update you", icon: CheckCircle2 },
                  ].map((item) => (
                    <div key={item.num} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                        <item.icon className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-sm mb-2">Need immediate help?</h3>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-emerald-600" />
                  <a href="tel:+6730000000" className="text-emerald-600 font-medium hover:underline">
                    +673 000 0000
                  </a>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Available 24/7 for emergencies</p>
              </CardContent>
            </Card>

            {/* Security Note */}
            <div className="flex items-start gap-2 px-1">
              <Shield className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your information is secure and will only be used to resolve your complaint.
                Complaint ID will be generated after submission for tracking purposes.
              </p>
            </div>
          </div>
        </aside>

        {/* ─── Main Content ─── */}
        <main className="lg:col-span-9">
          {/* Progress Steps */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                        step >= s.id
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {step > s.id ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        s.id
                      )}
                    </div>
                    <p className={`text-xs mt-1.5 text-center max-w-[100px] ${
                      step >= s.id ? 'text-emerald-700 font-medium' : 'text-muted-foreground'
                    }`}>
                      {s.label}
                    </p>
                    {step === s.id && (
                      <p className="text-[10px] text-emerald-500">{s.sublabel}</p>
                    )}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-3 mt-[-16px] ${
                      step > s.id ? 'bg-emerald-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          {step === 1 && <Step1Details form={form} updateField={updateField} subcategories={subcategories} selectedPriority={selectedPriority} />}
          {step === 2 && (
            <Step2Equipment
              form={form}
              updateField={updateField}
              isCustomer={isCustomer}
              user={user}
              selectedCustomer={selectedCustomer}
              linkingCustomer={linkingCustomer}
              onCustomerSelect={handleCustomerSelect}
              onCustomerCreated={handleCustomerCreated}
              showCreateCustomer={showCreateCustomer}
              onShowCreateCustomer={setShowCreateCustomer}
              selectedEquipment={selectedEquipment}
              onEquipmentChange={handleEquipmentChange}
              gpsCoords={gpsCoords}
              onGpsChange={handleGpsChange}
            />
          )}
          {step === 3 && <Step3Attachments form={form} handleFileAdd={handleFileAdd} handleFileRemove={handleFileRemove} previewUrls={previewUrls} />}
          {step === 4 && (
            <Step4Review
              form={form}
              selectedPriority={selectedPriority}
              isCustomer={isCustomer}
              user={user}
              selectedCustomer={selectedCustomer}
              selectedEquipment={selectedEquipment}
              gpsCoords={gpsCoords}
            />
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
              {step === 1 && (
                <Button variant="outline" onClick={() => setView('complaints')} className="gap-2">
                  Cancel
                </Button>
              )}
            </div>
            <div>
              {step < 4 && (
                <Button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canProceed()}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Next Step
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              {step === 4 && (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit Complaint
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Quick Customer Create Dialog */}
          {!isCustomer && (
            <QuickCustomerCreate
              open={showCreateCustomer}
              onOpenChange={setShowCreateCustomer}
              onCustomerCreated={handleCustomerCreated}
              tenantId={user?.tenantId || ''}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ============ STEP 1: COMPLAINT DETAILS ============

function Step1Details({
  form,
  updateField,
  subcategories,
  selectedPriority,
}: {
  form: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  subcategories: string[];
  selectedPriority: { value: string; label: string; color: string } | undefined;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold">Basic Complaint Information</h2>
          <p className="text-sm text-muted-foreground">Please provide detailed information about your complaint</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {/* Title */}
          <div className="md:col-span-2">
            <Label htmlFor="title" className="flex items-center gap-1">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Brief title for the complaint"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value.slice(0, 100))}
              className="mt-1.5"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">A short, descriptive title for quick identification</p>
              <span className="text-xs text-muted-foreground">{form.title.length}/100</span>
            </div>
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <Label htmlFor="description" className="flex items-center gap-1">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the issue in detail..."
              value={form.description}
              onChange={(e) => updateField('description', e.target.value.slice(0, 1000))}
              className="mt-1.5 min-h-[120px]"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">Please provide as much detail as possible about the problem</p>
              <span className="text-xs text-muted-foreground">{form.description.length}/1000</span>
            </div>
          </div>

          {/* Priority */}
          <div>
            <Label className="flex items-center gap-1">
              Priority <span className="text-red-500">*</span>
            </Label>
            <Select value={form.priority} onValueChange={(v) => updateField('priority', v as FormData['priority'])}>
              <SelectTrigger className="mt-1.5">
                <div className="flex items-center gap-2">
                  {selectedPriority && <div className={`w-2 h-2 rounded-full ${selectedPriority.color}`} />}
                  <SelectValue placeholder="Select priority" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${p.color}`} />
                      {p.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Select the urgency level</p>
          </div>

          {/* Category */}
          <div>
            <Label className="flex items-center gap-1">
              Category <span className="text-red-500">*</span>
            </Label>
            <Select value={form.category} onValueChange={(v) => { updateField('category', v); updateField('subcategory', ''); }}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Choose the most appropriate category</p>
          </div>

          {/* Subcategory */}
          <div>
            <Label>Subcategory</Label>
            <Select value={form.subcategory} onValueChange={(v) => updateField('subcategory', v)} disabled={!form.category}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select subcategory" />
              </SelectTrigger>
              <SelectContent>
                {subcategories.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Choose specific issue type (if applicable)</p>
          </div>

          {/* Preferred Contact Method */}
          <div>
            <Label className="flex items-center gap-1">
              Preferred Contact Method <span className="text-red-500">*</span>
            </Label>
            <Select value={form.contactMethod} onValueChange={(v) => updateField('contactMethod', v)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="phone">Phone Call</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="portal">Portal Notification</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">How would you like us to contact you?</p>
          </div>

          {/* Preferred Response Time */}
          <div>
            <Label>Preferred Response Time</Label>
            <Select value={form.responseTime} onValueChange={(v) => updateField('responseTime', v)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select preferred time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asap">ASAP</SelectItem>
                <SelectItem value="same_day">Same Day</SelectItem>
                <SelectItem value="24h">Within 24 Hours</SelectItem>
                <SelectItem value="48h">Within 48 Hours</SelectItem>
                <SelectItem value="1week">Within 1 Week</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">When should we respond to this complaint?</p>
          </div>

          {/* Request Type */}
          <div className="md:col-span-2">
            <Label>Request Type</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {REQUEST_TYPES.map((rt) => (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => updateField('requestType', rt.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                    form.requestType === rt.value ? rt.activeColor : rt.color
                  } hover:opacity-80`}
                >
                  {rt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ STEP 2: EQUIPMENT & LOCATION (REWRITTEN — DUAL MODE) ============

function Step2Equipment({
  form,
  updateField,
  isCustomer,
  user,
  selectedCustomer,
  linkingCustomer,
  onCustomerSelect,
  onCustomerCreated,
  showCreateCustomer,
  onShowCreateCustomer,
  selectedEquipment,
  onEquipmentChange,
  gpsCoords,
  onGpsChange,
}: {
  form: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  isCustomer: boolean;
  user: any;
  selectedCustomer: CustomerDetails | null;
  linkingCustomer: boolean;
  onCustomerSelect: (customerId: string, customerData: any) => void;
  onCustomerCreated: (customer: any) => void;
  showCreateCustomer: boolean;
  onShowCreateCustomer: (open: boolean) => void;
  selectedEquipment: any;
  onEquipmentChange: (equipmentId: string, equipmentData: any) => void;
  gpsCoords: { lat: number; lng: number } | null;
  onGpsChange: (coords: { lat: number; lng: number } | null, address?: string) => void;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold">Equipment & Location</h2>
          <p className="text-sm text-muted-foreground">Specify where the issue is located</p>
        </div>

        <div className="space-y-6">
          {/* ── CUSTOMER MODE ── */}
          {isCustomer && (
            <>
              {/* Green info card: submitting as */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Submitting as: {user?.name || 'Customer'}</p>
                    <p className="text-xs text-emerald-600">{user?.email || ''}</p>
                  </div>
                </div>

                {linkingCustomer && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Linking your customer profile...</span>
                  </div>
                )}

                {!linkingCustomer && selectedCustomer && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="text-sm font-medium">{selectedCustomer.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">{selectedCustomer.email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium">{selectedCustomer.phone || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="text-sm font-medium">{selectedCustomer.address || '—'}</p>
                    </div>
                  </div>
                )}

                {!linkingCustomer && !selectedCustomer && (
                  <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Could not link your customer profile. Please contact support.</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── STAFF MODE ── */}
          {!isCustomer && (
            <>
              {/* Smart Customer Search */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Customer <span className="text-red-500">*</span>
                </Label>
                <SmartCustomerSearch
                  value={form.customerId}
                  onChange={onCustomerSelect}
                  tenantId={user?.tenantId || ''}
                  placeholder="Search customer by name, email, phone…"
                  onCreateNew={() => onShowCreateCustomer(true)}
                />
                <p className="text-xs text-muted-foreground">Search and select the customer for this complaint</p>

                {/* Create New Customer button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                  onClick={() => onShowCreateCustomer(true)}
                >
                  <Plus className="size-4" />
                  Create New Customer
                </Button>
              </div>

              {/* Selected Customer Summary Card */}
              {selectedCustomer && (
                <div className="rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">{selectedCustomer.name}</p>
                      {selectedCustomer.companyName && selectedCustomer.companyName !== selectedCustomer.name && (
                        <p className="text-xs text-emerald-600">{selectedCustomer.companyName}</p>
                      )}
                    </div>
                    {selectedCustomer.customerNumber && (
                      <span className="ml-auto text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-mono border border-emerald-200">
                        {selectedCustomer.customerNumber}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedCustomer.email && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="size-3.5 shrink-0" />
                        <span>{selectedCustomer.email}</span>
                      </div>
                    )}
                    {selectedCustomer.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="size-3.5 shrink-0" />
                        <span>{selectedCustomer.phone}</span>
                      </div>
                    )}
                    {selectedCustomer.address && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:col-span-2">
                        <MapPin className="size-3.5 shrink-0" />
                        <span>{selectedCustomer.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── EQUIPMENT (Both modes) ── */}
          <EquipmentAutofill
            customerId={form.customerId}
            value={form.equipmentId}
            onChange={onEquipmentChange}
          />

          <Separator />

          {/* ── LOCATION DETAILS (Both modes) ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <span className="font-medium text-sm">Location Details</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div>
                <Label>Location / Area</Label>
                <Input
                  placeholder="e.g., Main Building, Block A"
                  value={form.location}
                  onChange={(e) => updateField('location', e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Building</Label>
                <Input
                  placeholder="e.g., Tower 1, Building C"
                  value={form.building}
                  onChange={(e) => updateField('building', e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Floor</Label>
                <Input
                  placeholder="e.g., 3rd Floor, Ground Floor"
                  value={form.floor}
                  onChange={(e) => updateField('floor', e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Room / Unit</Label>
                <Input
                  placeholder="e.g., Room 301, Unit A-12"
                  value={form.room}
                  onChange={(e) => updateField('room', e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* ── GPS LOCATION (Both modes) ── */}
          <GoogleMapsPicker
            value={gpsCoords}
            onChange={onGpsChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ============ STEP 3: ATTACHMENTS ============

function Step3Attachments({
  form,
  handleFileAdd,
  handleFileRemove,
  previewUrls,
}: {
  form: FormData;
  handleFileAdd: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileRemove: (index: number) => void;
  previewUrls: string[];
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold">Attachments</h2>
          <p className="text-sm text-muted-foreground">Upload photos and documents related to the complaint</p>
        </div>

        {/* Upload Area */}
        <label
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
            form.files.length >= 5
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-400 hover:bg-emerald-50/60'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
            {form.files.length >= 5 ? (
              <ImagePlus className="h-6 w-6 text-gray-400" />
            ) : (
              <Upload className="h-6 w-6 text-emerald-600" />
            )}
          </div>
          <p className="text-sm font-medium">
            {form.files.length >= 5 ? 'Maximum 5 files reached' : 'Click to upload photos or documents'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PNG, JPG, PDF up to 10MB each (max 5 files)
          </p>
          <input
            type="file"
            accept="image/*,.pdf"
            multiple
            onChange={handleFileAdd}
            className="hidden"
            disabled={form.files.length >= 5}
          />
        </label>

        {/* File Previews */}
        {form.files.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {form.files.map((file, i) => (
              <div key={i} className="relative group">
                <div className="aspect-square rounded-lg border bg-gray-50 overflow-hidden">
                  {file.type.startsWith('image/') && previewUrls[i] ? (
                    <img src={previewUrls[i]} alt={file.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2">
                      <FileText className="h-8 w-8 text-gray-400 mb-1" />
                      <p className="text-[10px] text-gray-500 text-center truncate w-full">{file.name}</p>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleFileRemove(i)}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
                <p className="text-[10px] text-muted-foreground mt-1 truncate">{file.name}</p>
                <p className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            ))}
          </div>
        )}

        {form.files.length === 0 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">No attachments yet</p>
            <p className="text-xs text-muted-foreground mt-1">Adding photos helps our team understand the issue faster</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ STEP 4: REVIEW & SUBMIT (ENHANCED) ============

function Step4Review({
  form,
  selectedPriority,
  isCustomer,
  user,
  selectedCustomer,
  selectedEquipment,
  gpsCoords,
}: {
  form: FormData;
  selectedPriority: { value: string; label: string; color: string } | undefined;
  isCustomer: boolean;
  user: any;
  selectedCustomer: CustomerDetails | null;
  selectedEquipment: any;
  gpsCoords: { lat: number; lng: number } | null;
}) {
  const categoryLabel = CATEGORIES.find((c) => c.value === form.category)?.label ?? '—';
  const requestTypeLabel = REQUEST_TYPES.find((r) => r.value === form.requestType)?.label ?? 'Complaint';
  const locationString = [form.location, form.building, form.floor, form.room].filter(Boolean).join(', ') || '—';

  const sections: { title: string; items: { label: string; value: string | React.ReactNode }[] }[] = [
    {
      title: 'Complaint Details',
      items: [
        { label: 'Title', value: form.title },
        { label: 'Description', value: form.description.length > 200 ? form.description.slice(0, 200) + '…' : form.description },
        { label: 'Priority', value: (
          <div className="flex items-center gap-2">
            {selectedPriority && <div className={`w-2.5 h-2.5 rounded-full ${selectedPriority.color}`} />}
            {selectedPriority?.label ?? 'Medium'}
          </div>
        )},
        { label: 'Category', value: categoryLabel },
        { label: 'Subcategory', value: form.subcategory || '—' },
        { label: 'Request Type', value: requestTypeLabel },
        { label: 'Contact Method', value: form.contactMethod ? form.contactMethod.charAt(0).toUpperCase() + form.contactMethod.slice(1) : '—' },
        { label: 'Response Time', value: form.responseTime ? form.responseTime.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—' },
      ],
    },
  ];

  // Customer section
  if (isCustomer) {
    sections.push({
      title: 'Customer Information',
      items: [
        {
          label: 'Submitting on behalf of',
          value: (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-600" />
              <span className="font-medium text-emerald-700">Yourself</span>
            </div>
          ),
        },
        { label: 'Name', value: selectedCustomer?.name || user?.name || '—' },
        { label: 'Email', value: selectedCustomer?.email || user?.email || '—' },
        { label: 'Phone', value: selectedCustomer?.phone || user?.phone || '—' },
        { label: 'Address', value: selectedCustomer?.address || '—' },
      ],
    });
  } else {
    const customerItems: { label: string; value: string | React.ReactNode }[] = [];
    if (selectedCustomer) {
      customerItems.push({ label: 'Customer Name', value: selectedCustomer.name });
      if (selectedCustomer.companyName && selectedCustomer.companyName !== selectedCustomer.name) {
        customerItems.push({ label: 'Company', value: selectedCustomer.companyName });
      }
      customerItems.push({ label: 'Email', value: selectedCustomer.email || '—' });
      customerItems.push({ label: 'Phone', value: selectedCustomer.phone || '—' });
      customerItems.push({ label: 'Address', value: selectedCustomer.address || '—' });
      if (selectedCustomer.customerNumber) {
        customerItems.push({ label: 'Customer No.', value: selectedCustomer.customerNumber });
      }
    } else {
      customerItems.push({ label: 'Customer', value: '—' });
    }
    sections.push({
      title: 'Customer Information',
      items: customerItems,
    });
  }

  // Equipment section
  if (selectedEquipment) {
    const equipItems: { label: string; value: string | React.ReactNode }[] = [
      { label: 'Equipment', value: selectedEquipment.name || '—' },
    ];
    if (selectedEquipment.category) {
      equipItems.push({ label: 'Category', value: selectedEquipment.category });
    }
    if (selectedEquipment.assetTag) {
      equipItems.push({ label: 'Asset Tag', value: selectedEquipment.assetTag });
    }
    if (selectedEquipment.serialNumber) {
      equipItems.push({ label: 'Serial Number', value: selectedEquipment.serialNumber });
    }
    sections.push({ title: 'Equipment', items: equipItems });
  }

  // Location section
  const locationItems: { label: string; value: string | React.ReactNode }[] = [];
  if (form.location) locationItems.push({ label: 'Location / Area', value: form.location });
  if (form.building) locationItems.push({ label: 'Building', value: form.building });
  if (form.floor) locationItems.push({ label: 'Floor', value: form.floor });
  if (form.room) locationItems.push({ label: 'Room / Unit', value: form.room });
  if (gpsCoords) {
    locationItems.push({
      label: 'GPS Coordinates',
      value: (
        <div className="flex items-center gap-1.5">
          <Navigation className="h-3.5 w-3.5 text-emerald-600" />
          <span className="font-mono text-xs">{gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}</span>
        </div>
      ),
    });
  } else if (form.gpsLocation) {
    locationItems.push({ label: 'GPS Coordinates', value: form.gpsLocation });
  }
  if (locationItems.length > 0) {
    sections.push({ title: 'Location', items: locationItems });
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <Card className="border-emerald-200 bg-emerald-50/30">
        <CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="font-medium text-sm">Ready to submit</p>
            <p className="text-xs text-muted-foreground">Please review the details below before submitting</p>
          </div>
        </CardContent>
      </Card>

      {/* Detail Sections */}
      {sections.map((section) => (
        <Card key={section.title}>
          <CardContent className="p-6">
            <h3 className="font-bold text-sm mb-4">{section.title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {section.items.map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                  <p className="text-sm font-medium capitalize">
                    {typeof item.value === 'string' ? (
                      item.value.length > 100 ? item.value.slice(0, 100) + '…' : item.value
                    ) : (
                      item.value
                    )}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Attachments Summary */}
      {form.files.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold text-sm mb-3">
              Attachments ({form.files.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {form.files.map((f, i) => (
                <Badge key={i} variant="secondary" className="gap-1.5 py-1.5">
                  <FileText className="h-3 w-3" />
                  {f.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}