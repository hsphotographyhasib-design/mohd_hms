'use client'

import React, { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { MapPin, Navigation, Phone, Share2, ExternalLink, Check } from 'lucide-react'
import { cn } from '@/core/utils/utils'
import GoogleMapWrapper, { type MapMarker } from './google-map'

export interface ComplaintMapData {
  latitude: number | null
  longitude: number | null
  fullAddress: string | null
  building: string | null
  floor: string | null
  unit: string | null
  title: string
  priority: string
  status: string
  customerName?: string | null
  customerPhone?: string | null
}

interface ComplaintMapViewProps {
  complaint: ComplaintMapData
  className?: string
}

const priorityVariantMap: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  critical: 'destructive',
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
}

const priorityLabelMap: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export default function ComplaintMapView({ complaint, className }: ComplaintMapViewProps) {
  const [copied, setCopied] = useState(false)
  const hasLocation = complaint.latitude !== null && complaint.longitude !== null

  const markers: MapMarker[] = hasLocation
    ? [
        {
          lat: complaint.latitude!,
          lng: complaint.longitude!,
          title: complaint.title || 'Complaint location',
        },
      ]
    : []

  async function handleShare() {
    if (!hasLocation) return

    const shareData = {
      title: complaint.title,
      text: `${complaint.title}\n${complaint.fullAddress || ''}`,
      url: `https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`,
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled or not supported
        copyToClipboard()
      }
    } else {
      copyToClipboard()
    }
  }

  function copyToClipboard() {
    const text = `${complaint.latitude}, ${complaint.longitude}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const addressParts = [
    complaint.building,
    complaint.floor ? `Floor ${complaint.floor}` : null,
    complaint.unit ? `Unit ${complaint.unit}` : null,
  ].filter(Boolean)

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm truncate">{complaint.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant={priorityVariantMap[complaint.priority] || 'outline'}
              className="text-xs"
            >
              {priorityLabelMap[complaint.priority] || complaint.priority}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {complaint.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Map or No Location message */}
      {hasLocation ? (
        <GoogleMapWrapper
          center={{ lat: complaint.latitude!, lng: complaint.longitude! }}
          markers={markers}
          zoom={16}
          className="w-full h-[250px] sm:h-[300px] rounded-lg"
        />
      ) : (
        <div className="w-full h-[200px] rounded-lg border border-dashed border-muted-foreground/30 bg-muted flex flex-col items-center justify-center text-center p-4">
          <MapPin className="size-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground font-medium">No location provided</p>
          {complaint.fullAddress && (
            <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2 max-w-sm">
              {complaint.fullAddress}
            </p>
          )}
        </div>
      )}

      {/* Address Card */}
      {(complaint.fullAddress || addressParts.length > 0) && (
        <Card className="py-4 gap-3">
          <CardHeader className="p-0 px-4 pb-0 pt-0">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              Location Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 px-4 space-y-2">
            {complaint.fullAddress && (
              <p className="text-sm">{complaint.fullAddress}</p>
            )}
            {addressParts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {addressParts.map((part) => (
                  <Badge key={part} variant="outline" className="text-xs">
                    {part}
                  </Badge>
                ))}
              </div>
            )}
            {hasLocation && (
              <p className="text-xs text-muted-foreground">
                {complaint.latitude!.toFixed(6)}, {complaint.longitude!.toFixed(6)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      {hasLocation && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            asChild
          >
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${complaint.latitude},${complaint.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Navigation className="size-4" />
              Navigate with Google Maps
              <ExternalLink className="size-3 ml-1" />
            </a>
          </Button>

          {complaint.customerPhone && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              asChild
            >
              <a href={`tel:${complaint.customerPhone}`}>
                <Phone className="size-4" />
                Call Customer
              </a>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={handleShare}
          >
            {copied ? (
              <Check className="size-4 text-emerald-600" />
            ) : (
              <Share2 className="size-4" />
            )}
            {copied ? 'Copied!' : 'Share Location'}
          </Button>
        </div>
      )}

      {/* Customer info */}
      {complaint.customerName && (
        <div className="text-xs text-muted-foreground">
          Customer: {complaint.customerName}
          {complaint.customerPhone && (
            <span className="ml-2">• {complaint.customerPhone}</span>
          )}
        </div>
      )}
    </div>
  )
}