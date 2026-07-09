'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Button } from '@/shared/ui/button';
import { Loader2, UserPlus } from 'lucide-react';

// ============ TYPES ============

export interface CreatedCustomer {
  id: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  building?: string;
  city?: string;
  postalCode?: string;
  customerNumber?: string;
}

interface QuickCustomerCreateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated: (customer: CreatedCustomer) => void;
  tenantId: string;
}

// ============ HELPERS ============

function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

interface FormState {
  companyName: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  building: string;
  city: string;
  postalCode: string;
}

const EMPTY_FORM: FormState = {
  companyName: '',
  name: '',
  email: '',
  phone: '',
  address: '',
  building: '',
  city: '',
  postalCode: '',
};

// ============ COMPONENT ============

export function QuickCustomerCreate({
  open,
  onOpenChange,
  onCustomerCreated,
  tenantId,
}: QuickCustomerCreateProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // Reset form every time the dialog opens
  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setError(null);
      setFieldErrors({});
      setSubmitting(false);
    }
  }, [open]);

  const updateField = useCallback((field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    if (error) setError(null);
  }, [error]);

  const validate = useCallback((): boolean => {
    const errors: Partial<Record<keyof FormState, string>> = {};

    if (!form.companyName.trim()) {
      errors.companyName = 'Company name is required';
    }
    if (!form.name.trim()) {
      errors.name = 'Contact person is required';
    }
    if (!form.phone.trim()) {
      errors.phone = 'Phone number is required';
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Invalid email format';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!validate()) return;

      setSubmitting(true);

      try {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            name: form.name.trim(),
            companyName: form.companyName.trim(),
            email: form.email.trim() || undefined,
            phone: form.phone.trim(),
            address: form.address.trim() || undefined,
            building: form.building.trim() || undefined,
            city: form.city.trim() || undefined,
            postalCode: form.postalCode.trim() || undefined,
          }),
        });

        if (!res.ok) {
          let message = 'Failed to create customer';
          try {
            const body = await res.json();
            message = body.message || body.error || message;
          } catch {
            // use default message
          }
          throw new Error(message);
        }

        const result = await res.json();

        // Normalize: API may return data wrapped in { data: ... } or directly
        const customer: CreatedCustomer = result.data ?? result;

        onCustomerCreated(customer);
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setSubmitting(false);
      }
    },
    [form, validate, onCustomerCreated, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-900">
            <UserPlus className="size-5 text-emerald-600" />
            Quick Add Customer
          </DialogTitle>
          <DialogDescription>
            Create a new customer without leaving this form. Fields marked with{' '}
            <span className="text-red-500">*</span> are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Error banner */}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Form grid — 2 columns on md+ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company Name */}
            <div className="space-y-1.5">
              <Label htmlFor="qcc-companyName">
                Company Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="qcc-companyName"
                placeholder="e.g. Acme Brunei Sdn Bhd"
                value={form.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
                aria-invalid={!!fieldErrors.companyName}
                className={fieldErrors.companyName ? 'border-red-400 focus-visible:ring-red-400' : ''}
              />
              {fieldErrors.companyName && (
                <p className="text-xs text-red-500">{fieldErrors.companyName}</p>
              )}
            </div>

            {/* Customer Name / Contact Person */}
            <div className="space-y-1.5">
              <Label htmlFor="qcc-name">
                Contact Person <span className="text-red-500">*</span>
              </Label>
              <Input
                id="qcc-name"
                placeholder="e.g. John Doe"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                aria-invalid={!!fieldErrors.name}
                className={fieldErrors.name ? 'border-red-400 focus-visible:ring-red-400' : ''}
              />
              {fieldErrors.name && (
                <p className="text-xs text-red-500">{fieldErrors.name}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="qcc-email">Email</Label>
              <Input
                id="qcc-email"
                type="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                aria-invalid={!!fieldErrors.email}
                className={fieldErrors.email ? 'border-red-400 focus-visible:ring-red-400' : ''}
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-500">{fieldErrors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="qcc-phone">
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="qcc-phone"
                type="tel"
                placeholder="+673 XXXXXXXX"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                aria-invalid={!!fieldErrors.phone}
                className={fieldErrors.phone ? 'border-red-400 focus-visible:ring-red-400' : ''}
              />
              {fieldErrors.phone && (
                <p className="text-xs text-red-500">{fieldErrors.phone}</p>
              )}
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="qcc-address">Address</Label>
              <Input
                id="qcc-address"
                placeholder="123 Street Name"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
              />
            </div>

            {/* Building */}
            <div className="space-y-1.5">
              <Label htmlFor="qcc-building">Building</Label>
              <Input
                id="qcc-building"
                placeholder="e.g. Building A"
                value={form.building}
                onChange={(e) => updateField('building', e.target.value)}
              />
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <Label htmlFor="qcc-city">City</Label>
              <Input
                id="qcc-city"
                placeholder="Bandar Seri Begawan"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
              />
            </div>

            {/* Postal Code */}
            <div className="space-y-1.5">
              <Label htmlFor="qcc-postalCode">Postal Code</Label>
              <Input
                id="qcc-postalCode"
                placeholder="BA1234"
                value={form.postalCode}
                onChange={(e) => updateField('postalCode', e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <UserPlus className="size-4" />
                  Create Customer
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}