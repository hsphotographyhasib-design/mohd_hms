'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  Info,
  Monitor,
  Hash,
  Tag,
  Cpu,
  MapPin,
  Shield,
  Activity,
  Wrench,
} from 'lucide-react';
import { cn } from '@/core/utils/utils';

// ============ TYPES ============

interface EquipmentData {
  id: string;
  name: string;
  assetTag?: string;
  serialNumber?: string;
  category?: string;
  model?: string;
  status?: string;
  location?: string;
  warrantyStatus?: string;
  lastMaintenanceDate?: string;
}

interface EquipmentAutofillProps {
  customerId: string;
  value: string;
  onChange: (equipmentId: string, equipmentData: EquipmentData | null) => void;
  disabled?: boolean;
}

// ============ HELPERS ============

function getStatusBadge(status?: string) {
  const normalized = status?.toLowerCase().trim();

  if (!normalized) return null;

  if (normalized === 'active' || normalized === 'operational') {
    return (
      <Badge
        className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
      >
        <Activity className="mr-1 h-3 w-3" />
        {status}
      </Badge>
    );
  }

  if (
    normalized === 'maintenance' ||
    normalized === 'under_maintenance' ||
    normalized === 'in-service'
  ) {
    return (
      <Badge
        className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100"
      >
        <Wrench className="mr-1 h-3 w-3" />
        {status}
      </Badge>
    );
  }

  return (
    <Badge
      className="bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100"
    >
      <Activity className="mr-1 h-3 w-3" />
      {status}
    </Badge>
  );
}

function getSubtitle(equipment: EquipmentData): string {
  const parts: string[] = [];
  if (equipment.assetTag) parts.push(`Tag: ${equipment.assetTag}`);
  else if (equipment.serialNumber) parts.push(`S/N: ${equipment.serialNumber}`);
  return parts.join(' · ');
}

// ============ COMPONENT ============

export function EquipmentAutofill({
  customerId,
  value,
  onChange,
  disabled = false,
}: EquipmentAutofillProps) {
  const [equipmentList, setEquipmentList] = useState<EquipmentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prevCustomerIdRef = useRef<string>(customerId);

  // Fetch equipment when customerId changes
  const fetchEquipment = useCallback(async (id: string) => {
    if (!id) {
      setEquipmentList([]);
      setFetched(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('cmms_token')
          : null;

      const res = await fetch(
        `/api/equipment?customerId=${encodeURIComponent(id)}&pageSize=50`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Content-Type': 'application/json',
          },
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to fetch equipment (${res.status})`);
      }

      const data = await res.json();

      // Handle common API response shapes
      const items: EquipmentData[] = Array.isArray(data)
        ? data
        : data.data ?? data.items ?? data.equipment ?? [];

      setEquipmentList(items);
      setFetched(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load equipment';
      setError(message);
      setEquipmentList([]);
      setFetched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset selection when customerId changes
  useEffect(() => {
    if (prevCustomerIdRef.current !== customerId) {
      prevCustomerIdRef.current = customerId;
      setSelectedEquipment(null);
      onChange('', null);
      setFetched(false);
      setError(null);
    }
  }, [customerId, onChange]);

  // Fetch data when customerId changes
  useEffect(() => {
    if (customerId) {
      fetchEquipment(customerId);
    } else {
      setEquipmentList([]);
      setFetched(false);
      setLoading(false);
      setError(null);
    }
  }, [customerId, fetchEquipment]);

  // Sync selectedEquipment from value prop on mount / when value changes externally
  useEffect(() => {
    if (value && equipmentList.length > 0) {
      const match = equipmentList.find((e) => e.id === value);
      if (match && match.id !== selectedEquipment?.id) {
        setSelectedEquipment(match);
      }
    } else if (!value) {
      setSelectedEquipment(null);
    }
    }, [value, equipmentList]);

  const handleSelect = useCallback(
    (equipmentId: string) => {
      if (!equipmentId) {
        setSelectedEquipment(null);
        onChange('', null);
        return;
      }

      const equipment = equipmentList.find((e) => e.id === equipmentId) ?? null;
      setSelectedEquipment(equipment);
      onChange(equipmentId, equipment);
    },
    [equipmentList, onChange]
  );

  // ============ RENDER ============

  if (!customerId) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-emerald-800">
          Equipment
        </label>
        <div className="flex items-center gap-2 rounded-md border border-dashed border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-600">
          <Info className="h-4 w-4 shrink-0" />
          Select a customer first to load their equipment
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Select dropdown */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-emerald-800">
          Equipment
        </label>

        {loading && (
          <div className="space-y-1">
            <Skeleton className="h-10 w-full rounded-md" />
            <div className="space-y-1.5 pt-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        )}

        {!loading && fetched && error && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <Info className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {!loading && fetched && !error && (
          <Select
            value={value || ''}
            onValueChange={handleSelect}
            disabled={disabled}
          >
            <SelectTrigger className="border-emerald-200 focus:ring-emerald-500">
              <SelectValue placeholder="Select equipment..." />
            </SelectTrigger>
            <SelectContent>
              {equipmentList.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-6 text-center text-sm text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0" />
                  No equipment registered for this customer
                </div>
              ) : (
                equipmentList.map((equipment) => (
                  <SelectItem key={equipment.id} value={equipment.id}>
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 shrink-0 text-emerald-600" />
                      <div className="flex flex-col">
                        <span className="font-medium">{equipment.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {getSubtitle(equipment)}
                        </span>
                      </div>
                      {equipment.category && (
                        <Badge
                          variant="outline"
                          className="ml-auto shrink-0 border-emerald-200 text-emerald-700 text-xs"
                        >
                          {equipment.category}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Detail card */}
      {selectedEquipment && (
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white">
          <CardContent className="p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Asset ID / Tag */}
              {(selectedEquipment.assetTag || selectedEquipment.id) && (
                <div className="flex items-start gap-2">
                  <Tag className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Asset ID / Tag
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedEquipment.assetTag || selectedEquipment.id}
                    </p>
                  </div>
                </div>
              )}

              {/* Model */}
              {selectedEquipment.model && (
                <div className="flex items-start gap-2">
                  <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Model
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedEquipment.model}
                    </p>
                  </div>
                </div>
              )}

              {/* Serial Number */}
              {selectedEquipment.serialNumber && (
                <div className="flex items-start gap-2">
                  <Hash className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Serial Number
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedEquipment.serialNumber}
                    </p>
                  </div>
                </div>
              )}

              {/* Category */}
              {selectedEquipment.category && (
                <div className="flex items-start gap-2">
                  <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Category
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedEquipment.category}
                    </p>
                  </div>
                </div>
              )}

              {/* Status */}
              {selectedEquipment.status && (
                <div className="flex items-start gap-2">
                  <Activity className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">
                      Status
                    </p>
                    {getStatusBadge(selectedEquipment.status)}
                  </div>
                </div>
              )}

              {/* Location */}
              {selectedEquipment.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Location
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedEquipment.location}
                    </p>
                  </div>
                </div>
              )}

              {/* Warranty */}
              {selectedEquipment.warrantyStatus && (
                <div className="flex items-start gap-2">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Warranty
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedEquipment.warrantyStatus}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No equipment found message (shown after fetch with empty results) */}
      {!loading && fetched && !error && equipmentList.length === 0 && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-600">
          <Info className="h-4 w-4 shrink-0" />
          No equipment registered for this customer
        </div>
      )}
    </div>
  );
}

export type { EquipmentData, EquipmentAutofillProps };