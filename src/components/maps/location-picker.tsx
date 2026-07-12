'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import {
  MapPin,
  Search,
  Navigation,
  Save,
  Star,
  X,
  Loader2,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import GoogleMapWrapper, { type MapMarker } from './google-map'
import { type LocationData, createEmptyLocationData } from '@/lib/maps/types'

interface SavedLocation {
  id: string
  label: string
  latitude: number
  longitude: number
  address: string
}

interface LocationPickerProps {
  value: LocationData | null
  onChange: (data: LocationData) => void
  className?: string
}

export default function LocationPicker({ value, onChange, className }: LocationPickerProps) {
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{
    place_id: string
    description: string
  }>>([])
  const [searching, setSearching] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([])
  const [loadingSaved, setLoadingSaved] = useState(false)
  const [saveLabel, setSaveLabel] = useState('')
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeMode, setActiveMode] = useState<'detect' | 'search' | 'map' | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const savedLocationsLoadedRef = useRef(false)

  const currentLat = value?.latitude ?? null
  const currentLng = value?.longitude ?? null
  const currentAccuracy = value?.accuracy ?? null

  // Lazy-load saved locations only when the search popover opens (NOT on mount).
  // This prevents a DB-hitting request on every page load, which exhausts
  // serverless database connections when multiple components mount simultaneously.
  async function loadSavedLocations() {
    if (savedLocationsLoadedRef.current) return;
    savedLocationsLoadedRef.current = true;
    setLoadingSaved(true)
    try {
      const token = useAuthStore.getState().token || localStorage.getItem('cmms_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/saved-locations', { headers })
      if (res.ok) {
        const data = await res.json()
        setSavedLocations(data.locations || data.data || [])
      }
    } catch {
      // Silently fail — saved locations are optional
    } finally {
      setLoadingSaved(false)
    }
  }

  // Debounced search
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query)
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      if (!query.trim()) {
        setSearchResults([])
        return
      }
      searchTimeoutRef.current = setTimeout(async () => {
        setSearching(true)
        try {
          const res = await fetch(
            `/api/maps/places-autocomplete?query=${encodeURIComponent(query)}`
          )
          if (res.ok) {
            const data = await res.json()
            setSearchResults(data.predictions || [])
          }
        } catch {
          // Silently fail
        } finally {
          setSearching(false)
        }
      }, 400)
    },
    []
  )

  // Detect current location
  async function handleDetectLocation() {
    if (!navigator.geolocation) {
      return
    }
    setActiveMode('detect')
    setDetectingLocation(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        })
      })
      const { latitude, longitude, accuracy } = position.coords
      await reverseGeocodeAndSet(latitude, longitude, accuracy)
    } catch {
      // User denied or unavailable
    } finally {
      setDetectingLocation(false)
      setActiveMode(null)
    }
  }

  // Reverse geocode and update parent
  async function reverseGeocodeAndSet(lat: number, lng: number, accuracy?: number) {
    try {
      const res = await fetch(
        `/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`
      )
      if (res.ok) {
        const data = await res.json()
        const newLocation: LocationData = {
          latitude: lat,
          longitude: lng,
          accuracy: accuracy ?? value?.accuracy ?? null,
          fullAddress: data.fullAddress || data.formatted_address || null,
          googlePlaceId: data.placeId || null,
          building: data.building || value?.building || '',
          floor: value?.floor || '',
          unit: value?.unit || '',
          address: data.address || data.formatted_address || '',
          district: data.district || data.sublocality || '',
          postalCode: data.postalCode || data.postal_code || '',
        }
        onChange(newLocation)
      } else {
        // Fallback: set coordinates without address
        const newLocation: LocationData = {
          ...createEmptyLocationData(),
          latitude: lat,
          longitude: lng,
          accuracy: accuracy ?? null,
        }
        onChange(newLocation)
      }
    } catch {
      const newLocation: LocationData = {
        ...createEmptyLocationData(),
        latitude: lat,
        longitude: lng,
        accuracy: accuracy ?? null,
      }
      onChange(newLocation)
    }
  }

  // Select a search result
  async function handleSelectPlace(placeId: string, description: string) {
    setSearchOpen(false)
    setActiveMode('search')
    try {
      const res = await fetch(
        `/api/maps/places-autocomplete?query=${encodeURIComponent(description)}&placeId=${encodeURIComponent(placeId)}`
      )
      if (res.ok) {
        const data = await res.json()
        const lat = data.lat ?? data.geometry?.location?.lat
        const lng = data.lng ?? data.geometry?.location?.lng
        if (lat && lng) {
          await reverseGeocodeAndSet(lat, lng)
        }
      }
    } catch {
      // Silently fail
    } finally {
      setActiveMode(null)
    }
  }

  // Handle marker drag
  function handleMarkerDragEnd(lat: number, lng: number) {
    reverseGeocodeAndSet(lat, lng)
  }

  // Handle map click (select on map mode)
  function handleMapClick(lat: number, lng: number) {
    if (activeMode === 'map') {
      reverseGeocodeAndSet(lat, lng)
      setActiveMode(null)
    }
  }

  // Update a text field
  function updateField(field: keyof LocationData, val: string) {
    const current = value || createEmptyLocationData()
    onChange({ ...current, [field]: val })
  }

  // Save location
  async function handleSaveLocation() {
    if (!saveLabel.trim() || !currentLat || !currentLng) return
    setSaving(true)
    try {
      const token = useAuthStore.getState().token || localStorage.getItem('cmms_token');
      const res = await fetch('/api/saved-locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          label: saveLabel.trim(),
          latitude: currentLat,
          longitude: currentLng,
          address: value?.fullAddress || value?.address || '',
        }),
      })
      if (res.ok) {
        setSaveLabel('')
        setSaveDialogOpen(false)
        loadSavedLocations()
      }
    } catch {
      // Silently fail
    } finally {
      setSaving(false)
    }
  }

  // Load a saved location
  async function handleLoadSavedLocation(loc: SavedLocation) {
    await reverseGeocodeAndSet(loc.latitude, loc.longitude)
  }

  // Build markers for the map
  const markers: MapMarker[] =
    currentLat !== null && currentLng !== null
      ? [
          {
            lat: currentLat,
            lng: currentLng,
            draggable: true,
            onDragEnd: handleMarkerDragEnd,
            title: value?.fullAddress || 'Selected location',
          },
        ]
      : []

  return (
    <div className={cn('space-y-4', className)}>
      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 justify-start gap-2"
          onClick={handleDetectLocation}
          disabled={detectingLocation}
        >
          {detectingLocation ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Navigation className="size-4" />
          )}
          <span>Share Current Location</span>
        </Button>

        <Popover open={searchOpen} onOpenChange={(open) => {
          setSearchOpen(open)
          if (open) loadSavedLocations()
        }}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 justify-start gap-2"
              onClick={() => {
                setSearchOpen(true)
                setTimeout(() => searchInputRef.current?.focus(), 100)
              }}
            >
              <Search className="size-4" />
              <span>Search Address</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 p-0" align="start">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search address or place..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
            </div>
            <ScrollArea className="max-h-64">
              {searching && (
                <div className="p-4 flex justify-center">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!searching && searchResults.length === 0 && searchQuery.trim() && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No results found
                </div>
              )}
              {searchResults.map((result) => (
                <button
                  key={result.place_id}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors border-b border-border last:border-b-0 flex items-start gap-2"
                  onClick={() => handleSelectPlace(result.place_id, result.description)}
                >
                  <MapPin className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="line-clamp-2">{result.description}</span>
                </button>
              ))}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <Button
          variant={activeMode === 'map' ? 'default' : 'outline'}
          size="sm"
          className="flex-1 justify-start gap-2"
          onClick={() => setActiveMode(activeMode === 'map' ? null : 'map')}
        >
          <MapPin className="size-4" />
          <span>Select on Map</span>
        </Button>
      </div>

      {/* Active mode indicator */}
      {activeMode === 'map' && (
        <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 rounded-md px-3 py-2">
          <MapPin className="size-4" />
          <span>Click on the map to select a location</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 px-2 text-xs"
            onClick={() => setActiveMode(null)}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Map */}
      <GoogleMapWrapper
        center={
          currentLat !== null && currentLng !== null
            ? { lat: currentLat, lng: currentLng }
            : null
        }
        markers={markers}
        onMapClick={handleMapClick}
        zoom={16}
        className="w-full h-[300px] sm:h-[350px] rounded-lg"
      />

      {/* Accuracy display */}
      {currentAccuracy !== null && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3" />
          <span>
            Accuracy: ±{Math.round(currentAccuracy)}m
          </span>
        </div>
      )}

      {/* Location details */}
      {(currentLat !== null || value?.fullAddress) && (
        <Card className="py-4 gap-3">
          <CardContent className="p-0 px-4 space-y-3">
            {value?.fullAddress && (
              <div className="text-sm">
                <span className="text-muted-foreground">Address: </span>
                <span>{value.fullAddress}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="building" className="text-xs">
                  Building
                </Label>
                <Input
                  id="building"
                  placeholder="Building name"
                  value={value?.building || ''}
                  onChange={(e) => updateField('building', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="floor" className="text-xs">
                  Floor
                </Label>
                <Input
                  id="floor"
                  placeholder="Floor number"
                  value={value?.floor || ''}
                  onChange={(e) => updateField('floor', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit" className="text-xs">
                  Unit
                </Label>
                <Input
                  id="unit"
                  placeholder="Unit number"
                  value={value?.unit || ''}
                  onChange={(e) => updateField('unit', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="postalCode" className="text-xs">
                  Postal Code
                </Label>
                <Input
                  id="postalCode"
                  placeholder="Postal code"
                  value={value?.postalCode || ''}
                  onChange={(e) => updateField('postalCode', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Save location button */}
            {currentLat !== null && currentLng !== null && (
              <>
                <Separator />
                <div className="flex flex-col sm:flex-row gap-2">
                  {saveDialogOpen ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        placeholder="Location label (e.g., Office, Home)"
                        value={saveLabel}
                        onChange={(e) => setSaveLabel(e.target.value)}
                        className="h-8 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveLocation()
                          if (e.key === 'Escape') setSaveDialogOpen(false)
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={handleSaveLocation}
                        disabled={saving || !saveLabel.trim()}
                      >
                        {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => { setSaveDialogOpen(false); setSaveLabel('') }}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => setSaveDialogOpen(true)}
                    >
                      <Star className="size-3" />
                      Save this location
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Saved Locations */}
      {savedLocations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Star className="size-3.5" />
            Saved Locations
          </h4>
          <ScrollArea className="max-h-32">
            <div className="flex flex-wrap gap-1.5">
              {loadingSaved
                ? Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-7 w-24 rounded-md" />
                  ))
                : savedLocations.map((loc) => (
                    <Badge
                      key={loc.id}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent transition-colors py-1 px-2.5 text-xs"
                      onClick={() => handleLoadSavedLocation(loc)}
                    >
                      <MapPin className="size-3 mr-1" />
                      {loc.label}
                    </Badge>
                  ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}