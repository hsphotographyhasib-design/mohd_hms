'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Camera,
  ImageIcon,
  Plus,
  Loader2,
  MapPin,
  Building2,
  AlertTriangle,
  User,
  Mail,
  Phone,
  Briefcase,
  Hash,
  ChevronRight,
  CheckCircle2,
  X,
  MonitorSmartphone,
  Layers,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { useAppStore, useAuthStore } from '@/store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ============ TYPES ============

interface CustomerProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  companyName: string | null;
  customerNumber: string;
  pic: string | null;
  country: string | null;
  district: string | null;
  gpsLocation: string | null;
  wasAutoCreated: boolean;
}

interface BuildingOption {
  label: string;
  equipmentCount: number;
}

interface EquipmentOption {
  id: string;
  name: string;
  category: string;
  assetNumber: string;
  brand: string | null;
  model: string | null;
  building: string | null;
  room: string | null;
  location: string | null;
  status: string;
  condition: string;
}

interface CustomerOption {
  id: string;
  name: string;
}

// ============ CONSTANTS ============

const CATEGORIES = [
  { value: 'HVAC', label: 'HVAC', icon: '❄️' },
  { value: 'Electrical', label: 'Electrical', icon: '⚡' },
  { value: 'Plumbing', label: 'Plumbing', icon: '🔧' },
  { value: 'Generator', label: 'Generator', icon: '🔋' },
  { value: 'Mechanical', label: 'Mechanical', icon: '⚙️' },
  { value: 'Fire Protection', label: 'Fire Protection', icon: '🧯' },
  { value: 'Civil', label: 'Civil', icon: '🏗️' },
  { value: 'General', label: 'General', icon: '📋' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', dotClass: 'bg-emerald-500', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', desc: 'Will be handled during regular schedule' },
  { value: 'medium', label: 'Medium', dotClass: 'bg-amber-500', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200', desc: 'Standard response time applies' },
  { value: 'high', label: 'High', dotClass: 'bg-orange-500', badgeClass: 'bg-orange-50 text-orange-700 border-orange-200', desc: 'Will be addressed as soon as possible' },
] as const;

type Step = 'form' | 'review';

// ============ MAIN COMPONENT ============

export function MobileNewComplaint() {
  const { setView } = useAppStore();
  const { token, user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCustomer = user?.role === 'customer';

  // ─── Profile Data (customer role) ───
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [allEquipment, setAllEquipment] = useState<EquipmentOption[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // ─── Admin: Customer picker ───
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);

  // ─── Form State ───
  const [customerId, setCustomerId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [photos, setPhotos] = useState<string[]>([]);

  // ─── "Use different location" toggle ───
  const [useAltLocation, setUseAltLocation] = useState(false);
  const [altFloor, setAltFloor] = useState('');
  const [altUnit, setAltUnit] = useState('');
  const [altRoom, setAltRoom] = useState('');
  const [altAddress, setAltAddress] = useState('');

  // ─── UI State ───
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [successData, setSuccessData] = useState<{ complaintNumber: string; complaintId: string } | null>(null);

  // ─── Derived: Equipment filtered by selected building ───
  const filteredEquipment = useMemo(() => {
    if (!selectedBuilding) return allEquipment;
    return allEquipment.filter((eq) => (eq.building || 'Unassigned') === selectedBuilding);
  }, [allEquipment, selectedBuilding]);

  // ─── Derived: Selected equipment details ───
  const selectedEquip = useMemo(() => {
    return allEquipment.find((eq) => eq.id === equipmentId) || null;
  }, [allEquipment, equipmentId]);

  // ─── Derived: Customer name for display ───
  const customerDisplayName = useMemo(() => {
    if (isCustomer && profile) return profile.name;
    return customers.find((c) => c.id === customerId)?.name || '';
  }, [isCustomer, profile, customers, customerId]);

  // ============ LOAD PROFILE (Customer Role) ============

  useEffect(() => {
    if (!isCustomer || !token) return;
    setProfileLoading(true);
    setProfileError(null);

    fetch('/api/complaints/my-profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load profile');
        return res.json();
      })
      .then((data) => {
        if (data.customer) {
          setProfile(data.customer);
          setCustomerId(data.customer.id);
          setBuildings(data.buildings || []);
          setAllEquipment(data.equipment || []);
        }
      })
      .catch((err) => {
        setProfileError(err.message);
      })
      .finally(() => setProfileLoading(false));
  }, [isCustomer, token]);

  // ============ LOAD CUSTOMERS (Non-Customer Role) ============

  useEffect(() => {
    if (isCustomer || !token) return;
    setCustomersLoading(true);
    fetch('/api/customers?pageSize=200', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (json?.data) {
          setCustomers(
            json.data.map((c: { id: string; name?: string; companyName?: string }) => ({
              id: c.id,
              name: c.name || c.companyName || 'Unnamed',
            })),
          );
        }
      })
      .catch(() => {})
      .finally(() => setCustomersLoading(false));
  }, [isCustomer, token]);

  // ============ LOAD EQUIPMENT FOR SELECTED CUSTOMER (Non-Customer) ============

  useEffect(() => {
    if (isCustomer || !customerId || !token) return;
    fetch(`/api/equipment?customerId=${customerId}&pageSize=500`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (json?.data) {
          const eqs: EquipmentOption[] = json.data.map((e: Record<string, unknown>) => ({
            id: e.id as string,
            name: e.name as string,
            category: e.category as string,
            assetNumber: e.assetNumber as string,
            brand: e.brand as string | null,
            model: e.model as string | null,
            building: e.building as string | null,
            room: e.room as string | null,
            location: e.location as string | null,
            status: e.status as string,
            condition: e.condition as string,
          }));
          setAllEquipment(eqs);

          // Derive buildings
          const bMap = new Map<string, { label: string; equipmentCount: number }>();
          for (const eq of eqs) {
            const b = eq.building || 'Unassigned';
            if (!bMap.has(b)) bMap.set(b, { label: b, equipmentCount: 0 });
            bMap.get(b)!.equipmentCount++;
          }
          setBuildings(Array.from(bMap.values()));
        }
      })
      .catch(() => {});
  }, [isCustomer, customerId, token]);

  // ============ PHOTO HANDLING ============

  const handlePhotoTap = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large', { description: 'Maximum 10MB per file' });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setPhotos((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }, []);

  const removePhoto = useCallback((index: number) => setPhotos((prev) => prev.filter((_, i) => i !== index)), []);

  // ============ VALIDATION ============

  const isFormValid =
    customerId !== '' &&
    title.trim().length >= 3 &&
    description.trim().length >= 10 &&
    categoryId !== '';

  // ============ REVIEW SUMMARY ============

  const reviewData = useMemo(() => {
    const cat = CATEGORIES.find((c) => c.value === categoryId);
    const pri = PRIORITIES.find((p) => p.value === priority);
    const bldg = selectedBuilding || null;
    const eqName = selectedEquip ? `${selectedEquip.name}${selectedEquip.brand ? ` (${selectedEquip.brand})` : ''}` : null;
    const loc = useAltLocation
      ? [altFloor, altUnit, altRoom, altAddress].filter(Boolean).join(', ') || 'Custom location'
      : bldg || 'Not specified';

    return {
      customer: customerDisplayName,
      location: loc,
      building: bldg,
      equipment: eqName,
      category: cat?.label || '',
      priority: pri?.label || '',
      title: title.trim(),
      description: description.trim(),
      photoCount: photos.length,
    };
  }, [customerDisplayName, selectedBuilding, selectedEquip, useAltLocation, altFloor, altUnit, altRoom, altAddress, categoryId, priority, title, description, photos.length]);

  // ============ SUBMIT ============

  const handleSubmit = useCallback(async () => {
    if (!isFormValid || submitting || !token) return;

    // If on review step, go back to form
    if (step === 'review') {
      setStep('form');
      return;
    }

    // Move to review step
    setStep('review');
    return;
  }, [isFormValid, submitting, token, step]);

  const confirmSubmit = useCallback(async () => {
    if (!isFormValid || submitting || !token) return;
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        customerId,
        title: title.trim(),
        description: description.trim(),
        priority,
        category: categoryId,
        source: 'mobile_app',
      };

      if (equipmentId) payload.equipmentId = equipmentId;

      // Location info
      const locInfo: Record<string, string | undefined> = {};
      if (selectedBuilding) locInfo.building = selectedBuilding;
      if (useAltLocation) {
        if (altFloor) locInfo.floor = altFloor;
        if (altUnit) locInfo.unit = altUnit;
        if (altRoom) locInfo.room = altRoom;
        if (altAddress) locInfo.address = altAddress;
      }
      if (Object.keys(locInfo).length > 0) payload.locationInfo = locInfo;

      // Customer snapshot
      if (isCustomer && profile) {
        payload.customerSnapshot = {
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          companyName: profile.companyName,
          customerNumber: profile.customerNumber,
          pic: profile.pic,
          address: profile.address,
          country: profile.country,
          district: profile.district,
        };
      }

      // GPS location
      const gpsObj: Record<string, string> = {};
      if (selectedBuilding) gpsObj.building = selectedBuilding;
      if (useAltLocation && altAddress) gpsObj.address = altAddress;
      if (selectedEquip?.location) gpsObj.location = selectedEquip.location;
      if (Object.keys(gpsObj).length > 0) payload.gpsLocation = gpsObj;

      // Photos
      if (photos.length > 0) payload.photos = photos;

      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || err.details || 'Failed to create complaint');
      }

      const result = await res.json();
      setSuccessData({ complaintNumber: result.complaintNumber, complaintId: result.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error('Submission Failed', { description: message, duration: 5000 });
      setStep('form');
    } finally {
      setSubmitting(false);
    }
  }, [isFormValid, submitting, token, customerId, title, description, priority, categoryId, equipmentId, selectedBuilding, useAltLocation, altFloor, altUnit, altRoom, altAddress, isCustomer, profile, selectedEquip, photos]);

  const selectedPriority = PRIORITIES.find((p) => p.value === priority);
  const selectedCategory = CATEGORIES.find((c) => c.value === categoryId);

  // ============ SUCCESS POPUP ============

  if (successData) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 bg-gray-50">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full max-w-sm text-center"
        >
          <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="size-10 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Complaint Submitted Successfully</h2>
          <p className="text-sm text-gray-500 mb-5">Your complaint has been received. Our maintenance team will review your request shortly.</p>

          <Card className="border-emerald-200 bg-emerald-50/50 mb-6">
            <CardContent className="p-4">
              <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider mb-1">Complaint Number</p>
              <p className="text-lg font-bold text-emerald-700 font-mono">{successData.complaintNumber}</p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button
              onClick={() => setView('complaint-detail', { id: successData.complaintId })}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              View Complaint
            </Button>
            <Button
              variant="outline"
              onClick={() => setView('complaints')}
              className="w-full h-11 rounded-xl border-gray-200 text-gray-700 font-medium"
            >
              Back to Complaints
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ============ REVIEW STEP ============

  if (step === 'review') {
    return (
      <div className="flex h-full flex-col bg-gray-50">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3 px-4 h-14">
            <button
              onClick={() => setStep('form')}
              className="flex size-9 items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
              aria-label="Back to form"
            >
              <ArrowLeft className="size-5 text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">Review & Submit</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-52">
          <p className="text-sm text-gray-500">Please review your complaint before submitting.</p>

          {/* Customer */}
          <Card className="border-gray-200">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                <User className="size-3.5" /> Customer
              </div>
              <p className="text-sm font-semibold text-gray-900">{reviewData.customer}</p>
            </CardContent>
          </Card>

          {/* Location */}
          <Card className="border-gray-200">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                <MapPin className="size-3.5" /> Location
              </div>
              <p className="text-sm text-gray-900">{reviewData.location}</p>
              {reviewData.building && (
                <p className="text-xs text-gray-500">Building: {reviewData.building}</p>
              )}
            </CardContent>
          </Card>

          {/* Equipment */}
          {reviewData.equipment && (
            <Card className="border-gray-200">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <MonitorSmartphone className="size-3.5" /> Equipment
                </div>
                <p className="text-sm text-gray-900">{reviewData.equipment}</p>
              </CardContent>
            </Card>
          )}

          {/* Category + Priority */}
          <Card className="border-gray-200">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Category</p>
                  <p className="text-sm font-medium text-gray-900">{reviewData.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Priority</p>
                  <Badge variant="outline" className={cn('text-xs font-medium', selectedPriority?.badgeClass)}>
                    {reviewData.priority}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Title */}
          <Card className="border-gray-200">
            <CardContent className="p-4 space-y-1">
              <p className="text-xs text-gray-400">Title</p>
              <p className="text-sm font-semibold text-gray-900">{reviewData.title}</p>
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="border-gray-200">
            <CardContent className="p-4 space-y-1">
              <p className="text-xs text-gray-400">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{reviewData.description}</p>
            </CardContent>
          </Card>

          {/* Photos count */}
          {reviewData.photoCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <ImageIcon className="size-4" />
              <span>{reviewData.photoCount} photo{reviewData.photoCount > 1 ? 's' : ''} attached</span>
            </div>
          )}

          {/* Estimated Response */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <Clock className="size-4 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-700">
              {priority === 'high' ? 'Estimated response: Within 1–2 hours' :
               priority === 'medium' ? 'Estimated response: Within 4–8 hours' :
               'Estimated response: Within 24 hours'}
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="fixed left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 px-4 py-3 z-30" style={{ bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="max-w-lg mx-auto flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStep('form')}
              className="flex-1 h-12 rounded-xl border-gray-200 text-gray-700 font-semibold"
            >
              Edit
            </Button>
            <Button
              onClick={confirmSubmit}
              disabled={submitting}
              className="flex-[2] h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <><ShieldCheck className="size-4 mr-2" /> Confirm & Submit</>}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============ FORM STEP ============

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => setView('complaints')}
            className="flex size-9 items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="size-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">New Complaint</h1>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-5 pb-52">

          {/* ─── Customer Info (Auto-filled for customer role) ─── */}
          {isCustomer ? (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  <ShieldCheck className="size-3.5" /> Verified Customer
                </div>

                {profileLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 w-3/4 bg-emerald-100 rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-emerald-100 rounded animate-pulse" />
                  </div>
                ) : profileError ? (
                  <p className="text-xs text-red-600">{profileError}</p>
                ) : profile ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
                        {profile.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{profile.name}</p>
                        {profile.companyName && (
                          <p className="text-xs text-gray-500">{profile.companyName}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {profile.email && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Mail className="size-3.5 text-gray-400 shrink-0" />
                          <span>{profile.email}</span>
                        </div>
                      )}
                      {profile.phone && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Phone className="size-3.5 text-gray-400 shrink-0" />
                          <span>{profile.phone}</span>
                        </div>
                      )}
                      {profile.address && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <MapPin className="size-3.5 text-gray-400 shrink-0" />
                          <span>{profile.address}</span>
                        </div>
                      )}
                    </div>

                    {profile.customerNumber && (
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 pt-0.5">
                        <Hash className="size-3" />
                        <span>{profile.customerNumber}</span>
                      </div>
                    )}
                  </>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            /* ─── Admin: Customer Dropdown ─── */
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">
                Customer <span className="text-red-500">*</span>
              </Label>
              {customersLoading ? (
                <div className="h-11 rounded-xl bg-gray-100 animate-pulse" />
              ) : customers.length === 0 ? (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="flex items-center gap-2 p-3">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-700">No customers found. Add a customer first.</p>
                  </CardContent>
                </Card>
              ) : (
                <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setEquipmentId(''); setSelectedBuilding(''); }}>
                  <SelectTrigger className="h-11 rounded-xl bg-white border-gray-200 text-sm focus:ring-emerald-500 focus:border-emerald-500">
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-sm">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* ─── Category ─── */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">
              Category <span className="text-red-500">*</span>
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-11 rounded-xl bg-white border-gray-200 text-sm focus:ring-emerald-500 focus:border-emerald-500">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value} className="text-sm">
                    <span className="mr-2">{cat.icon}</span> {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ─── Building / Location ─── */}
          {buildings.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <Building2 className="size-3.5 text-gray-500" />
                Building / Site
              </Label>
              <Select value={selectedBuilding} onValueChange={(v) => { setSelectedBuilding(v); setEquipmentId(''); }}>
                <SelectTrigger className="h-11 rounded-xl bg-white border-gray-200 text-sm focus:ring-emerald-500 focus:border-emerald-500">
                  <SelectValue placeholder="Select building" />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => (
                    <SelectItem key={b.label} value={b.label} className="text-sm">
                      <span>{b.label}</span>
                      <span className="ml-2 text-xs text-gray-400">({b.equipmentCount} equipment)</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ─── Equipment (only when customer is selected and has equipment) ─── */}
          {(isCustomer ? allEquipment.length > 0 : (customerId && allEquipment.length > 0)) && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <MonitorSmartphone className="size-3.5 text-gray-500" />
                Equipment
                <span className="text-xs font-normal text-gray-400">(optional)</span>
              </Label>
              {filteredEquipment.length > 0 ? (
                <Select value={equipmentId} onValueChange={setEquipmentId}>
                  <SelectTrigger className="h-11 rounded-xl bg-white border-gray-200 text-sm focus:ring-emerald-500 focus:border-emerald-500">
                    <SelectValue placeholder="Select equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEquipment.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id} className="text-sm py-2.5">
                        <div className="flex items-center gap-2">
                          <Layers className="size-3.5 text-gray-400 shrink-0" />
                          <div>
                            <p className="font-medium">{eq.name}</p>
                            <p className="text-[11px] text-gray-400">
                              {eq.category}{eq.brand ? ` · ${eq.brand}` : ''}{eq.room ? ` · ${eq.room}` : ''}
                            </p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-gray-400 py-2">
                  {selectedBuilding ? `No equipment in ${selectedBuilding}` : 'Select a building to see equipment'}
                </p>
              )}
            </div>
          )}

          {/* ─── "Use Different Location" Toggle ─── */}
          <div className="space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useAltLocation}
                onChange={(e) => setUseAltLocation(e.target.checked)}
                className="size-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm font-medium text-gray-700">Use a different service location for this complaint</span>
            </label>

            <AnimatePresence>
              {useAltLocation && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 p-3 rounded-xl border border-gray-200 bg-white">
                    <Input
                      value={altFloor}
                      onChange={(e) => setAltFloor(e.target.value)}
                      placeholder="Floor"
                      className="h-10 rounded-lg border-gray-200 text-sm"
                    />
                    <Input
                      value={altUnit}
                      onChange={(e) => setAltUnit(e.target.value)}
                      placeholder="Unit / Suite"
                      className="h-10 rounded-lg border-gray-200 text-sm"
                    />
                    <Input
                      value={altRoom}
                      onChange={(e) => setAltRoom(e.target.value)}
                      placeholder="Room Number"
                      className="h-10 rounded-lg border-gray-200 text-sm"
                    />
                    <Input
                      value={altAddress}
                      onChange={(e) => setAltAddress(e.target.value)}
                      placeholder="Full Address"
                      className="h-10 rounded-lg border-gray-200 text-sm"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ─── Title ─── */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              className="h-11 rounded-xl bg-white border-gray-200 text-sm focus:ring-emerald-500 focus:border-emerald-500"
              maxLength={200}
            />
            <p className="text-[11px] text-gray-400 text-right">{title.length}/200</p>
          </div>

          {/* ─── Description ─── */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the problem in detail — what happened, where, and when..."
              className="min-h-[120px] rounded-xl bg-white border-gray-200 text-sm resize-none focus:ring-emerald-500 focus:border-emerald-500"
              maxLength={2000}
            />
            <p className="text-[11px] text-gray-400 text-right">{description.length}/2000</p>
          </div>

          {/* ─── Priority ─── */}
          <div className="space-y-2.5">
            <Label className="text-sm font-semibold text-gray-700">Priority</Label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => {
                const isActive = priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-semibold transition-all',
                      isActive
                        ? cn(p.badgeClass, 'border-current shadow-sm')
                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 active:bg-gray-100',
                    )}
                  >
                    <span className={cn('size-2.5 rounded-full shrink-0', isActive ? p.dotClass : 'bg-gray-300')} />
                    {p.label}
                  </button>
                );
              })}
            </div>
            {selectedPriority && (
              <p className="text-[11px] text-gray-400">{selectedPriority.desc}</p>
            )}
          </div>

          {/* ─── Photo Upload ─── */}
          <div className="space-y-2.5">
            <Label className="text-sm font-semibold text-gray-700">Photos</Label>
            <p className="text-xs text-gray-400 -mt-0.5">Add photos to help describe the issue</p>

            {photos.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {photos.map((photo, idx) => (
                  <div key={idx} className="relative group size-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                    <img src={photo} alt={`Photo ${idx + 1}`} className="size-full object-cover" />
                    <button
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove photo"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePhotoTap}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white py-4 text-sm font-medium text-gray-500 hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-600 active:bg-emerald-50 transition-colors"
              >
                <ImageIcon className="size-4" />
                Gallery
              </button>
              <button
                type="button"
                onClick={handlePhotoTap}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white py-4 text-sm font-medium text-gray-500 hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-600 active:bg-emerald-50 transition-colors"
              >
                <Camera className="size-4" />
                Camera
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {/* ─── Sticky Submit Button ─── */}
      <div className="fixed left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 px-4 py-3 z-30" style={{ bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="max-w-lg mx-auto">
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || submitting}
            className={cn(
              'w-full h-12 rounded-xl text-sm font-bold transition-all shadow-lg',
              isFormValid && !submitting
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 shadow-none cursor-not-allowed',
            )}
          >
            {submitting ? (
              <><Loader2 className="size-4 mr-2 animate-spin" /> Submitting...</>
            ) : (
              <><ChevronRight className="size-4 mr-2" /> Review & Submit</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}