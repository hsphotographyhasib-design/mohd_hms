'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { MapPin, Crosshair, Navigation, X } from 'lucide-react';

// ============ TYPES ============

interface Coordinates {
  lat: number;
  lng: number;
}

interface GoogleMapsPickerProps {
  value: Coordinates | null;
  onChange: (coords: Coordinates | null, address?: string) => void;
}

// ============ CONSTANTS ============

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
};

const BBOX_DELTA = 0.003;

// ============ HELPERS ============

function formatCoordinates(coords: Coordinates): string {
  return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
}

function buildOsmEmbedUrl(coords: Coordinates): string {
  const { lat, lng } = coords;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - BBOX_DELTA},${lat - BBOX_DELTA},${lng + BBOX_DELTA},${lat + BBOX_DELTA}&layer=mapnik&marker=${lat},${lng}`;
}

function parseCoordinateInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = parseFloat(trimmed);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

// ============ COMPONENT ============

export function GoogleMapsPicker({ value, onChange }: GoogleMapsPickerProps) {
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // --- Handlers ---

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser');
      return;
    }

    setGeoError(null);
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: Coordinates = {
          lat: parseFloat(position.coords.latitude.toFixed(6)),
          lng: parseFloat(position.coords.longitude.toFixed(6)),
        };
        setManualLat(String(coords.lat));
        setManualLng(String(coords.lng));
        onChange(coords, 'Current GPS location');
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError('Location access denied. Please enable location permissions.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError('Location unavailable. Please try again or enter coordinates manually.');
            break;
          case error.TIMEOUT:
            setGeoError('Location request timed out. Please try again.');
            break;
          default:
            setGeoError('An unknown error occurred while retrieving location.');
        }
      },
      GEOLOCATION_OPTIONS,
    );
  }, [onChange]);

  const handleApplyManualCoords = useCallback(() => {
    const lat = parseCoordinateInput(manualLat);
    const lng = parseCoordinateInput(manualLng);

    if (lat === null || lng === null) {
      setGeoError('Please enter valid numeric coordinates.');
      return;
    }

    if (lat < -90 || lat > 90) {
      setGeoError('Latitude must be between -90 and 90.');
      return;
    }

    if (lng < -180 || lng > 180) {
      setGeoError('Longitude must be between -180 and 180.');
      return;
    }

    setGeoError(null);
    onChange({ lat, lng }, 'Manual coordinates');
  }, [manualLat, manualLng, onChange]);

  const handleClear = useCallback(() => {
    setManualLat('');
    setManualLng('');
    setGeoError(null);
    onChange(null);
  }, [onChange]);

  // --- Render ---

  return (
    <Card className="border-emerald-200/60">
      <CardContent className="space-y-4">
        {/* Header with coordinates display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-emerald-600" />
            <Label className="text-sm font-medium text-gray-700">
              Location
            </Label>
          </div>

          {value && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-mono font-medium text-emerald-700 border border-emerald-200/60">
              <Navigation className="size-3" />
              {formatCoordinates(value)}
            </span>
          )}
        </div>

        {/* Locate Me button */}
        <Button
          type="button"
          variant="outline"
          className="w-full border-emerald-300/60 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-400 gap-2"
          onClick={handleLocateMe}
          disabled={isLocating}
        >
          {isLocating ? (
            <>
              <Crosshair className="size-4 animate-spin" />
              Detecting location…
            </>
          ) : (
            <>
              <MapPin className="size-4" />
              Share Current Location
            </>
          )}
        </Button>

        {/* Manual coordinate input */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Enter Coordinates
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="manual-lat" className="text-xs text-gray-500">
                Latitude
              </Label>
              <Input
                id="manual-lat"
                type="text"
                inputMode="decimal"
                placeholder="e.g. 4.8903"
                value={manualLat}
                onChange={(e) => {
                  setManualLat(e.target.value);
                  setGeoError(null);
                }}
                className="text-sm font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="manual-lng" className="text-xs text-gray-500">
                Longitude
              </Label>
              <Input
                id="manual-lng"
                type="text"
                inputMode="decimal"
                placeholder="e.g. 114.9426"
                value={manualLng}
                onChange={(e) => {
                  setManualLng(e.target.value);
                  setGeoError(null);
                }}
                className="text-sm font-mono"
              />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            onClick={handleApplyManualCoords}
          >
            <Crosshair className="size-3.5" />
            Apply Coordinates
          </Button>
        </div>

        {/* Error message */}
        {geoError && (
          <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200/60 px-3 py-2.5 text-sm text-red-700">
            <X className="mt-0.5 size-4 shrink-0 text-red-500" />
            <span>{geoError}</span>
          </div>
        )}

        {/* OpenStreetMap embed preview */}
        {value && (
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Map Preview
            </Label>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
              <iframe
                key={`${value.lat}-${value.lng}`}
                title="Location preview"
                src={buildOsmEmbedUrl(value)}
                width="100%"
                height="200"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="block"
              />
            </div>
          </div>
        )}

        {/* Clear button */}
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 gap-2"
            onClick={handleClear}
          >
            <X className="size-3.5" />
            Clear Location
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default GoogleMapsPicker;