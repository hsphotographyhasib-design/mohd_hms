'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Camera,
  ImageIcon,
  Plus,
  Loader2,
  MapPin,
  Building2,
  AlertTriangle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ============ CONSTANTS ============

const CATEGORIES = [
  { value: 'HVAC', label: 'HVAC' },
  { value: 'Electrical', label: 'Electrical' },
  { value: 'Plumbing', label: 'Plumbing' },
  { value: 'Generator', label: 'Generator' },
  { value: 'Mechanical', label: 'Mechanical' },
  { value: 'Fire Protection', label: 'Fire Protection' },
  { value: 'Civil', label: 'Civil' },
  { value: 'General', label: 'General' },
];

const BUILDINGS = [
  { value: 'building-a', label: 'Building A' },
  { value: 'building-b', label: 'Building B' },
  { value: 'building-c', label: 'Building C' },
  { value: 'tower-1', label: 'Tower 1' },
  { value: 'tower-2', label: 'Tower 2' },
  { value: 'annex', label: 'Annex' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'parking', label: 'Parking Garage' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', dotClass: 'bg-emerald-500', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'medium', label: 'Medium', dotClass: 'bg-amber-500', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'high', label: 'High', dotClass: 'bg-orange-500', badgeClass: 'bg-orange-50 text-orange-700 border-orange-200' },
] as const;

// ============ COMPONENT ============

interface CustomerOption {
  id: string;
  name: string;
}

export function MobileNewComplaint() {
  const { setView } = useAppStore();
  const { token } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [categoryId, setCategoryId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [photos, setPhotos] = useState<string[]>([]);
  const [customerId, setCustomerId] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);

  // Fetch customers on mount
  useEffect(() => {
    async function loadCustomers() {
      if (!token) return;
      setCustomersLoading(true);
      try {
        const res = await fetch('/api/customers?pageSize=200', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setCustomers(
            (json.data ?? []).map((c: { id: string; name?: string; companyName?: string }) => ({
              id: c.id,
              name: c.name || c.companyName || 'Unnamed',
            })),
          );
        }
      } catch {
        // silent
      } finally {
        setCustomersLoading(false);
      }
    }
    loadCustomers();
  }, [token]);

  // Photo handling (UI only)
  const handlePhotoTap = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large', { description: 'Maximum 10MB per file' });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    // Reset so the same file can be selected again
    e.target.value = '';
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Validation
  const isFormValid =
    customerId.trim() !== '' &&
    title.trim().length >= 3 &&
    description.trim().length >= 10 &&
    categoryId !== '';

  // Submit
  const handleSubmit = useCallback(async () => {
    if (!isFormValid || submitting || !token) return;

    setSubmitting(true);
    try {
      const payload: Record<string, string> = {
        customerId,
        title: title.trim(),
        description: description.trim(),
        priority,
        category: categoryId,
      };

      // Map building to location field
      const buildingLabel = BUILDINGS.find((b) => b.value === buildingId)?.label;
      if (buildingLabel) {
        payload.gpsLocation = JSON.stringify({ building: buildingLabel });
      }

      if (photos.length > 0) {
        payload.photos = JSON.stringify(photos);
      }

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
      toast.success('Complaint Submitted!', {
        description: result.complaintNumber
          ? `Reference: ${result.complaintNumber}`
          : 'Your complaint has been created successfully.',
        duration: 4000,
      });

      // Navigate back to complaints list
      setView('complaints');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error('Submission Failed', {
        description: message,
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  }, [isFormValid, submitting, token, customerId, title, description, priority, categoryId, buildingId, photos, setView]);

  const selectedPriority = PRIORITIES.find((p) => p.value === priority);

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
        <div className="p-4 space-y-4 pb-32">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">
              Customer <span className="text-red-500">*</span>
            </Label>
            {customersLoading ? (
              <div className="h-10 rounded-xl bg-gray-100 animate-pulse" />
            ) : customers.length === 0 ? (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="flex items-center gap-2 p-3">
                  <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700">
                    No customers found. Add a customer first.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="h-11 rounded-xl bg-white border-gray-200 text-sm focus:ring-emerald-500 focus:border-emerald-500">
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-sm">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Category */}
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
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location/Building */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Building2 className="size-3.5 text-gray-500" />
              Location / Building
            </Label>
            <Select value={buildingId} onValueChange={setBuildingId}>
              <SelectTrigger className="h-11 rounded-xl bg-white border-gray-200 text-sm focus:ring-emerald-500 focus:border-emerald-500">
                <SelectValue placeholder="Select building" />
              </SelectTrigger>
              <SelectContent>
                {BUILDINGS.map((b) => (
                  <SelectItem key={b.value} value={b.value} className="text-sm">
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
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

          {/* Description */}
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

          {/* Priority */}
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
                    <span
                      className={cn(
                        'size-2.5 rounded-full shrink-0',
                        isActive ? p.dotClass : 'bg-gray-300',
                      )}
                    />
                    {p.label}
                  </button>
                );
              })}
            </div>
            {selectedPriority && (
              <p className="text-[11px] text-gray-400">
                {priority === 'low' && 'Low priority — will be handled during regular schedule.'}
                {priority === 'medium' && 'Medium priority — standard response time applies.'}
                {priority === 'high' && 'High priority — will be addressed as soon as possible.'}
              </p>
            )}
          </div>

          {/* Photo Upload */}
          <div className="space-y-2.5">
            <Label className="text-sm font-semibold text-gray-700">Photos</Label>
            <p className="text-xs text-gray-400 -mt-0.5">Add photos to help describe the issue</p>

            {/* Photo thumbnails */}
            {photos.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {photos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="relative group size-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-100"
                  >
                    <img
                      src={photo}
                      alt={`Photo ${idx + 1}`}
                      className="size-full object-cover"
                    />
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

            {/* Upload buttons */}
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

            {/* Hidden file input */}
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

      {/* Sticky Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 px-4 py-3" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
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
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Plus className="size-4 mr-2" />
                Submit Complaint
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}