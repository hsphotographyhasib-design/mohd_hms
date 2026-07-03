'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2, Plus, Trash2, Star, Upload, Link as LinkIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const token = () => localStorage.getItem('cmms_token') || '';

const ITEM_TYPES = [
  { value: 'inventory', label: 'Inventory' },
  { value: 'spare_part', label: 'Spare Part' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'service', label: 'Service' },
  { value: 'manpower', label: 'Manpower' },
  { value: 'equipment_package', label: 'Equipment Package' },
  { value: 'supply_only', label: 'Supply Only' },
  { value: 'supply_install', label: 'Supply & Install' },
  { value: 'rental', label: 'Rental' },
];

const UNITS = ['pcs', 'kg', 'meter', 'liter', 'set', 'box', 'roll', 'pair', 'lot', 'pack', 'bundle', 'tube', 'bag', 'dozen', 'unit', 'sqm', 'sqft', 'length', 'ream', 'gallon', 'pail', 'drum', 'each'];

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
];

interface Category { id: string; name: string; color?: string; _count?: { items: number; subcategories: number }; }
interface Subcategory { id: string; name: string; categoryId: string; }
interface SupplierEntry {
  tempId: string;
  name: string;
  code: string;
  contact: string;
  phone: string;
  email: string;
  leadTime: string;
  purchasePrice: string;
  moq: string;
  paymentTerms: string;
  rating: number;
  isPrimary: boolean;
}

interface ItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId?: string | null;
  onSaved?: () => void;
}

const emptySupplier = (): SupplierEntry => ({
  tempId: crypto.randomUUID(),
  name: '', code: '', contact: '', phone: '', email: '',
  leadTime: '', purchasePrice: '', moq: '', paymentTerms: '', rating: 0, isPrimary: false,
});

const defaultForm = {
  itemCode: '', sku: '', name: '', shortName: '', description: '', shortDescription: '',
  itemType: 'inventory', categoryId: '', subcategoryId: '', brand: '', manufacturer: '',
  model: '', partNumber: '', serialNumber: '',
  purchaseCost: '', averageCost: '', standardCost: '', lastPurchaseCost: '',
  sellingPrice: '', dealerPrice: '', contractorPrice: '', customerPrice: '', vipPrice: '',
  internalCost: '', labourCost: '', installationCost: '', serviceCost: '',
  transportationCost: '', mobilizationCost: '', equipmentRental: '',
  emergencyCallOut: '', afterHoursCharge: '', weekendCharge: '', publicHolidayCharge: '',
  currency: 'BND',
  unit: 'pcs', quantity: '', minStock: '', maxStock: '', reorderLevel: '', safetyStock: '',
  hourlyRate: '', dailyRate: '', overtimeRate: '', weekendRate: '', publicHolidayRate: '',
  rentalDailyRate: '', rentalMonthlyRate: '',
  estimatedHours: '', requiredSkills: '', sop: '',
  photos: [] as string[], attachments: [] as string[], technicalDatasheetUrl: '', msdsUrl: '',
  warranty: '', countryOfOrigin: '', hsCode: '', tags: '', remarks: '',
  status: 'draft', approvalStatus: 'pending',
};

export function InventoryItemForm({ open, onOpenChange, editId, onSaved }: ItemFormProps) {
  const [form, setForm] = useState(defaultForm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierEntry[]>([emptySupplier()]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingCats, setLoadingCats] = useState(false);

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const fetchCategories = useCallback(async () => {
    setLoadingCats(true);
    try {
      const res = await fetch('/api/inventory/categories', {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        const json = await res.json();
        setCategories(Array.isArray(json) ? json : json.data || []);
      }
    } catch { /* silent */ }
    finally { setLoadingCats(false); }
  }, []);

  const fetchSubcategories = useCallback(async (categoryId: string) => {
    if (!categoryId) { setSubcategories([]); return; }
    try {
      const res = await fetch(`/api/inventory/subcategories?categoryId=${categoryId}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        const json = await res.json();
        setSubcategories(Array.isArray(json) ? json : json.data || []);
      }
    } catch { /* silent */ }
  }, []);

  const fetchItemDetail = useCallback(async () => {
    if (!editId) return;
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/inventory/${editId}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        const item = await res.json();
        setForm({
          itemCode: item.itemCode || item.code || '',
          sku: item.sku || '',
          name: item.name || '',
          shortName: item.shortName || '',
          description: item.description || '',
          shortDescription: item.shortDescription || '',
          itemType: item.itemType || 'inventory',
          categoryId: item.categoryId || item.category || '',
          subcategoryId: item.subcategoryId || item.subcategory || '',
          brand: item.brand || '',
          manufacturer: item.manufacturer || '',
          model: item.model || '',
          partNumber: item.partNumber || '',
          serialNumber: item.serialNumber || '',
          purchaseCost: String(item.purchaseCost ?? ''),
          averageCost: String(item.averageCost ?? item.unitCost ?? ''),
          standardCost: String(item.standardCost ?? ''),
          lastPurchaseCost: String(item.lastPurchaseCost ?? ''),
          sellingPrice: String(item.sellingPrice ?? ''),
          dealerPrice: String(item.dealerPrice ?? ''),
          contractorPrice: String(item.contractorPrice ?? ''),
          customerPrice: String(item.customerPrice ?? ''),
          vipPrice: String(item.vipPrice ?? ''),
          internalCost: String(item.internalCost ?? ''),
          labourCost: String(item.labourCost ?? ''),
          installationCost: String(item.installationCost ?? ''),
          serviceCost: String(item.serviceCost ?? ''),
          transportationCost: String(item.transportationCost ?? ''),
          mobilizationCost: String(item.mobilizationCost ?? ''),
          equipmentRental: String(item.equipmentRental ?? ''),
          emergencyCallOut: String(item.emergencyCallOut ?? ''),
          afterHoursCharge: String(item.afterHoursCharge ?? ''),
          weekendCharge: String(item.weekendCharge ?? ''),
          publicHolidayCharge: String(item.publicHolidayCharge ?? ''),
          currency: item.currency || 'BND',
          unit: item.unit || 'pcs',
          quantity: String(item.quantity ?? ''),
          minStock: String(item.minStock ?? ''),
          maxStock: String(item.maxStock ?? ''),
          reorderLevel: String(item.reorderLevel ?? ''),
          safetyStock: String(item.safetyStock ?? ''),
          hourlyRate: String(item.hourlyRate ?? ''),
          dailyRate: String(item.dailyRate ?? ''),
          overtimeRate: String(item.overtimeRate ?? ''),
          weekendRate: String(item.weekendRate ?? ''),
          publicHolidayRate: String(item.publicHolidayRate ?? ''),
          rentalDailyRate: String(item.rentalDailyRate ?? item.dailyRate ?? ''),
          rentalMonthlyRate: String(item.rentalMonthlyRate ?? item.monthlyRate ?? ''),
          estimatedHours: String(item.estimatedHours ?? ''),
          requiredSkills: item.requiredSkills || '',
          sop: item.sop || '',
          photos: item.photos || [],
          attachments: item.attachments || [],
          technicalDatasheetUrl: item.technicalDatasheetUrl || '',
          msdsUrl: item.msdsUrl || '',
          warranty: item.warranty || '',
          countryOfOrigin: item.countryOfOrigin || '',
          hsCode: item.hsCode || '',
          tags: Array.isArray(item.tags) ? item.tags.join(', ') : item.tags || '',
          remarks: item.remarks || '',
          status: item.status || 'draft',
          approvalStatus: item.approvalStatus || item.approval || 'pending',
        });
        if (item.categoryId) fetchSubcategories(item.categoryId);
        if (item.suppliers && item.suppliers.length > 0) {
          setSuppliers(item.suppliers.map((s: Record<string, unknown>) => ({
            tempId: crypto.randomUUID(),
            name: String(s.name || ''),
            code: String(s.code || ''),
            contact: String(s.contact || ''),
            phone: String(s.phone || ''),
            email: String(s.email || ''),
            leadTime: String(s.leadTime || ''),
            purchasePrice: String(s.purchasePrice || ''),
            moq: String(s.moq || ''),
            paymentTerms: String(s.paymentTerms || ''),
            rating: Number(s.rating || 0),
            isPrimary: Boolean(s.isPrimary),
          })));
        }
      }
    } catch { /* silent */ }
    finally { setLoadingDetail(false); }
  }, [editId, fetchSubcategories]);

  useEffect(() => {
    if (open) {
      fetchCategories();
      if (editId) {
        fetchItemDetail();
      } else {
        setForm(defaultForm);
        setSuppliers([emptySupplier()]);
        setSubcategories([]);
      }
    }
  }, [open, editId, fetchCategories, fetchItemDetail]);

  useEffect(() => {
    if (form.categoryId) fetchSubcategories(form.categoryId);
    else setSubcategories([]);
  }, [form.categoryId, fetchSubcategories]);

  const updateSupplier = (tempId: string, field: string, value: string | number | boolean) => {
    setSuppliers((prev) => prev.map((s) => s.tempId === tempId ? { ...s, [field]: value } : s));
  };

  const addSupplier = () => setSuppliers((prev) => [...prev, emptySupplier()]);

  const removeSupplier = (tempId: string) => {
    if (suppliers.length <= 1) return;
    setSuppliers((prev) => prev.filter((s) => s.tempId !== tempId));
  };

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Item name is required'); return; }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        quantity: parseFloat(form.quantity) || 0,
        minStock: parseFloat(form.minStock) || 0,
        maxStock: parseFloat(form.maxStock) || 0,
        reorderLevel: parseFloat(form.reorderLevel) || 0,
        safetyStock: parseFloat(form.safetyStock) || 0,
        purchaseCost: parseFloat(form.purchaseCost) || 0,
        averageCost: parseFloat(form.averageCost) || 0,
        standardCost: parseFloat(form.standardCost) || 0,
        lastPurchaseCost: parseFloat(form.lastPurchaseCost) || 0,
        sellingPrice: parseFloat(form.sellingPrice) || 0,
        dealerPrice: parseFloat(form.dealerPrice) || 0,
        contractorPrice: parseFloat(form.contractorPrice) || 0,
        customerPrice: parseFloat(form.customerPrice) || 0,
        vipPrice: parseFloat(form.vipPrice) || 0,
        internalCost: parseFloat(form.internalCost) || 0,
        labourCost: parseFloat(form.labourCost) || 0,
        installationCost: parseFloat(form.installationCost) || 0,
        serviceCost: parseFloat(form.serviceCost) || 0,
        transportationCost: parseFloat(form.transportationCost) || 0,
        mobilizationCost: parseFloat(form.mobilizationCost) || 0,
        equipmentRental: parseFloat(form.equipmentRental) || 0,
        emergencyCallOut: parseFloat(form.emergencyCallOut) || 0,
        afterHoursCharge: parseFloat(form.afterHoursCharge) || 0,
        weekendCharge: parseFloat(form.weekendCharge) || 0,
        publicHolidayCharge: parseFloat(form.publicHolidayCharge) || 0,
        hourlyRate: parseFloat(form.hourlyRate) || 0,
        dailyRate: parseFloat(form.dailyRate) || 0,
        overtimeRate: parseFloat(form.overtimeRate) || 0,
        weekendRate: parseFloat(form.weekendRate) || 0,
        publicHolidayRate: parseFloat(form.publicHolidayRate) || 0,
        rentalDailyRate: parseFloat(form.rentalDailyRate) || 0,
        rentalMonthlyRate: parseFloat(form.rentalMonthlyRate) || 0,
        estimatedHours: parseFloat(form.estimatedHours) || 0,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        suppliers: suppliers.filter((s) => s.name.trim()),
      };

      const url = editId ? `/api/inventory/${editId}` : '/api/inventory';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success(editId ? 'Item updated successfully' : 'Item created successfully');
      onOpenChange(false);
      onSaved?.();
    } catch {
      toast.error(editId ? 'Failed to update item' : 'Failed to create item');
    } finally {
      setSubmitting(false);
    }
  };

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-2 pt-2">
      <h3 className="text-sm font-semibold text-emerald-700">{children}</h3>
      <div className="flex-1 h-px bg-emerald-200/50" />
    </div>
  );

  const Field = ({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) => (
    <div className={cn('space-y-1', className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );

  if (loadingDetail) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="sm:max-w-2xl w-full p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Loading item...</SheetTitle>
          </SheetHeader>
          <div className="p-4 space-y-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-2xl w-full p-0">
        <SheetHeader className="p-4 border-b bg-emerald-50">
          <SheetTitle className="text-emerald-900">
            {editId ? 'Edit Item' : 'New Item'}
          </SheetTitle>
          <SheetDescription>
            {editId ? 'Update item details and pricing' : 'Add a new item to your inventory'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-4 space-y-5">
            {/* 1. Basic Information */}
            <SectionTitle>Basic Information</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Item Code">
                <Input value={form.itemCode} readOnly className="bg-muted text-xs font-mono" placeholder="Auto-generated" />
              </Field>
              <Field label="SKU">
                <Input value={form.sku} onChange={(e) => updateField('sku', e.target.value)} placeholder="SKU" />
              </Field>
              <Field label="Name *" className="sm:col-span-2">
                <Input value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Item name" required />
              </Field>
              <Field label="Short Name">
                <Input value={form.shortName} onChange={(e) => updateField('shortName', e.target.value)} placeholder="Short display name" />
              </Field>
              <Field label="Description">
                <Textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="Full description" rows={3} className="sm:col-span-2" />
              </Field>
              <Field label="Short Description" className="sm:col-span-2">
                <Input value={form.shortDescription} onChange={(e) => updateField('shortDescription', e.target.value)} placeholder="Brief description" />
              </Field>
            </div>

            <Separator />

            {/* 2. Classification */}
            <SectionTitle>Classification</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label="Item Type">
                <Select value={form.itemType} onValueChange={(v) => updateField('itemType', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Category">
                <Select value={form.categoryId} onValueChange={(v) => updateField('categoryId', v)}>
                  <SelectTrigger><SelectValue placeholder={loadingCats ? 'Loading...' : 'Select category'} /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Subcategory">
                <Select value={form.subcategoryId} onValueChange={(v) => updateField('subcategoryId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger>
                  <SelectContent>
                    {subcategories.map((sc) => (
                      <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Brand">
                <Input value={form.brand} onChange={(e) => updateField('brand', e.target.value)} placeholder="Brand" />
              </Field>
              <Field label="Manufacturer">
                <Input value={form.manufacturer} onChange={(e) => updateField('manufacturer', e.target.value)} placeholder="Manufacturer" />
              </Field>
              <Field label="Model">
                <Input value={form.model} onChange={(e) => updateField('model', e.target.value)} placeholder="Model" />
              </Field>
              <Field label="Part Number">
                <Input value={form.partNumber} onChange={(e) => updateField('partNumber', e.target.value)} placeholder="Part number" />
              </Field>
              <Field label="Serial Number">
                <Input value={form.serialNumber} onChange={(e) => updateField('serialNumber', e.target.value)} placeholder="Serial number" />
              </Field>
            </div>

            <Separator />

            {/* 3. Pricing */}
            <SectionTitle>Pricing</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Purchase Cost">
                <Input type="number" step="0.01" value={form.purchaseCost} onChange={(e) => updateField('purchaseCost', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Average Cost">
                <Input type="number" step="0.01" value={form.averageCost} onChange={(e) => updateField('averageCost', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Standard Cost">
                <Input type="number" step="0.01" value={form.standardCost} onChange={(e) => updateField('standardCost', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Last Purchase Cost">
                <Input type="number" step="0.01" value={form.lastPurchaseCost} onChange={(e) => updateField('lastPurchaseCost', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Selling Price">
                <Input type="number" step="0.01" value={form.sellingPrice} onChange={(e) => updateField('sellingPrice', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Dealer Price">
                <Input type="number" step="0.01" value={form.dealerPrice} onChange={(e) => updateField('dealerPrice', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Contractor Price">
                <Input type="number" step="0.01" value={form.contractorPrice} onChange={(e) => updateField('contractorPrice', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Customer Price">
                <Input type="number" step="0.01" value={form.customerPrice} onChange={(e) => updateField('customerPrice', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="VIP Price">
                <Input type="number" step="0.01" value={form.vipPrice} onChange={(e) => updateField('vipPrice', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Internal Cost">
                <Input type="number" step="0.01" value={form.internalCost} onChange={(e) => updateField('internalCost', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Labour Cost">
                <Input type="number" step="0.01" value={form.labourCost} onChange={(e) => updateField('labourCost', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Installation Cost">
                <Input type="number" step="0.01" value={form.installationCost} onChange={(e) => updateField('installationCost', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Service Cost">
                <Input type="number" step="0.01" value={form.serviceCost} onChange={(e) => updateField('serviceCost', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Transportation">
                <Input type="number" step="0.01" value={form.transportationCost} onChange={(e) => updateField('transportationCost', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Mobilization">
                <Input type="number" step="0.01" value={form.mobilizationCost} onChange={(e) => updateField('mobilizationCost', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Equipment Rental">
                <Input type="number" step="0.01" value={form.equipmentRental} onChange={(e) => updateField('equipmentRental', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Emergency Call Out">
                <Input type="number" step="0.01" value={form.emergencyCallOut} onChange={(e) => updateField('emergencyCallOut', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="After Hours">
                <Input type="number" step="0.01" value={form.afterHoursCharge} onChange={(e) => updateField('afterHoursCharge', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Weekend Charge">
                <Input type="number" step="0.01" value={form.weekendCharge} onChange={(e) => updateField('weekendCharge', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Public Holiday">
                <Input type="number" step="0.01" value={form.publicHolidayCharge} onChange={(e) => updateField('publicHolidayCharge', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Currency">
                <Select value={form.currency} onValueChange={(v) => updateField('currency', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BND">BND</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="SGD">SGD</SelectItem>
                    <SelectItem value="MYR">MYR</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Separator />

            {/* 4. Stock Control */}
            <SectionTitle>Stock Control</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Unit">
                <Select value={form.unit} onValueChange={(v) => updateField('unit', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Quantity">
                <Input type="number" value={form.quantity} onChange={(e) => updateField('quantity', e.target.value)} placeholder="0" />
              </Field>
              <Field label="Min Stock">
                <Input type="number" value={form.minStock} onChange={(e) => updateField('minStock', e.target.value)} placeholder="0" />
              </Field>
              <Field label="Max Stock">
                <Input type="number" value={form.maxStock} onChange={(e) => updateField('maxStock', e.target.value)} placeholder="0" />
              </Field>
              <Field label="Reorder Level">
                <Input type="number" value={form.reorderLevel} onChange={(e) => updateField('reorderLevel', e.target.value)} placeholder="0" />
              </Field>
              <Field label="Safety Stock">
                <Input type="number" value={form.safetyStock} onChange={(e) => updateField('safetyStock', e.target.value)} placeholder="0" />
              </Field>
            </div>

            {/* 5. Manpower Rates (conditional) */}
            {form.itemType === 'manpower' && (
              <>
                <Separator />
                <SectionTitle>Manpower Rates</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Field label="Hourly Rate">
                    <Input type="number" step="0.01" value={form.hourlyRate} onChange={(e) => updateField('hourlyRate', e.target.value)} placeholder="0.00" />
                  </Field>
                  <Field label="Daily Rate">
                    <Input type="number" step="0.01" value={form.dailyRate} onChange={(e) => updateField('dailyRate', e.target.value)} placeholder="0.00" />
                  </Field>
                  <Field label="Overtime Rate">
                    <Input type="number" step="0.01" value={form.overtimeRate} onChange={(e) => updateField('overtimeRate', e.target.value)} placeholder="0.00" />
                  </Field>
                  <Field label="Weekend Rate">
                    <Input type="number" step="0.01" value={form.weekendRate} onChange={(e) => updateField('weekendRate', e.target.value)} placeholder="0.00" />
                  </Field>
                  <Field label="Public Holiday Rate">
                    <Input type="number" step="0.01" value={form.publicHolidayRate} onChange={(e) => updateField('publicHolidayRate', e.target.value)} placeholder="0.00" />
                  </Field>
                </div>
              </>
            )}

            {/* 6. Rental Rates (conditional) */}
            {form.itemType === 'rental' && (
              <>
                <Separator />
                <SectionTitle>Rental Rates</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Field label="Daily Rate">
                    <Input type="number" step="0.01" value={form.rentalDailyRate} onChange={(e) => updateField('rentalDailyRate', e.target.value)} placeholder="0.00" />
                  </Field>
                  <Field label="Monthly Rate">
                    <Input type="number" step="0.01" value={form.rentalMonthlyRate} onChange={(e) => updateField('rentalMonthlyRate', e.target.value)} placeholder="0.00" />
                  </Field>
                </div>
              </>
            )}

            {/* 7. Service Package (conditional) */}
            {form.itemType === 'equipment_package' && (
              <>
                <Separator />
                <SectionTitle>Service Package</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Estimated Hours">
                    <Input type="number" step="0.5" value={form.estimatedHours} onChange={(e) => updateField('estimatedHours', e.target.value)} placeholder="0" />
                  </Field>
                  <Field label="Required Skills">
                    <Input value={form.requiredSkills} onChange={(e) => updateField('requiredSkills', e.target.value)} placeholder="e.g. Electrical, HVAC" />
                  </Field>
                  <Field label="SOP" className="sm:col-span-2">
                    <Textarea value={form.sop} onChange={(e) => updateField('sop', e.target.value)} placeholder="Standard Operating Procedure" rows={3} />
                  </Field>
                </div>
              </>
            )}

            <Separator />

            {/* 8. Supplier Management */}
            <SectionTitle>Suppliers</SectionTitle>
            <div className="space-y-3">
              {suppliers.map((supplier, idx) => (
                <Card key={supplier.tempId} className="border-dashed p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">Supplier {idx + 1}</Badge>
                    <div className="flex items-center gap-2">
                      {suppliers.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-rose-500 hover:text-rose-700" onClick={() => removeSupplier(supplier.tempId)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Field label="Name">
                      <Input value={supplier.name} onChange={(e) => updateSupplier(supplier.tempId, 'name', e.target.value)} placeholder="Supplier name" />
                    </Field>
                    <Field label="Code">
                      <Input value={supplier.code} onChange={(e) => updateSupplier(supplier.tempId, 'code', e.target.value)} placeholder="Code" />
                    </Field>
                    <Field label="Contact Person">
                      <Input value={supplier.contact} onChange={(e) => updateSupplier(supplier.tempId, 'contact', e.target.value)} placeholder="Contact" />
                    </Field>
                    <Field label="Phone">
                      <Input value={supplier.phone} onChange={(e) => updateSupplier(supplier.tempId, 'phone', e.target.value)} placeholder="Phone" />
                    </Field>
                    <Field label="Email" className="sm:col-span-2">
                      <Input type="email" value={supplier.email} onChange={(e) => updateSupplier(supplier.tempId, 'email', e.target.value)} placeholder="Email" />
                    </Field>
                    <Field label="Lead Time">
                      <Input value={supplier.leadTime} onChange={(e) => updateSupplier(supplier.tempId, 'leadTime', e.target.value)} placeholder="e.g. 3 days" />
                    </Field>
                    <Field label="Purchase Price">
                      <Input type="number" step="0.01" value={supplier.purchasePrice} onChange={(e) => updateSupplier(supplier.tempId, 'purchasePrice', e.target.value)} placeholder="0.00" />
                    </Field>
                    <Field label="MOQ">
                      <Input value={supplier.moq} onChange={(e) => updateSupplier(supplier.tempId, 'moq', e.target.value)} placeholder="Min order qty" />
                    </Field>
                    <Field label="Payment Terms">
                      <Input value={supplier.paymentTerms} onChange={(e) => updateSupplier(supplier.tempId, 'paymentTerms', e.target.value)} placeholder="e.g. Net 30" />
                    </Field>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Rating</Label>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => updateSupplier(supplier.tempId, 'rating', star)}
                            className="focus:outline-none"
                          >
                            <Star className={cn('h-4 w-4', star <= supplier.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300')} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <Switch
                        checked={supplier.isPrimary}
                        onCheckedChange={(checked) => updateSupplier(supplier.tempId, 'isPrimary', checked)}
                      />
                      <Label className="text-xs">Primary Supplier</Label>
                    </div>
                  </div>
                </Card>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addSupplier} className="w-full border-dashed">
                <Plus className="h-3 w-3 mr-1" /> Add Supplier
              </Button>
            </div>

            <Separator />

            {/* 9. Documents & Media */}
            <SectionTitle>Documents & Media</SectionTitle>
            <div className="space-y-3">
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-emerald-300 transition-colors cursor-pointer">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload photos or drag & drop</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB each</p>
              </div>
              <Field label="Technical Datasheet URL">
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input className="pl-8" value={form.technicalDatasheetUrl} onChange={(e) => updateField('technicalDatasheetUrl', e.target.value)} placeholder="https://..." />
                </div>
              </Field>
              <Field label="MSDS URL">
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input className="pl-8" value={form.msdsUrl} onChange={(e) => updateField('msdsUrl', e.target.value)} placeholder="https://..." />
                </div>
              </Field>
            </div>

            <Separator />

            {/* 10. Additional */}
            <SectionTitle>Additional Information</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Warranty">
                <Input value={form.warranty} onChange={(e) => updateField('warranty', e.target.value)} placeholder="e.g. 12 months" />
              </Field>
              <Field label="Country of Origin">
                <Input value={form.countryOfOrigin} onChange={(e) => updateField('countryOfOrigin', e.target.value)} placeholder="Country" />
              </Field>
              <Field label="HS Code">
                <Input value={form.hsCode} onChange={(e) => updateField('hsCode', e.target.value)} placeholder="HS Code" />
              </Field>
              <Field label="Tags">
                <Input value={form.tags} onChange={(e) => updateField('tags', e.target.value)} placeholder="Comma-separated tags" />
              </Field>
              <Field label="Remarks" className="sm:col-span-2">
                <Textarea value={form.remarks} onChange={(e) => updateField('remarks', e.target.value)} placeholder="Additional notes" rows={3} />
              </Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={(v) => updateField('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Approval Status">
                <Select value={form.approvalStatus} onValueChange={(v) => updateField('approvalStatus', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 pb-6 sticky bottom-0 bg-white border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editId ? 'Update Item' : 'Create Item'}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}