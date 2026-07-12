'use client'

import React, { useCallback, useState, useRef } from 'react'
import { GoogleMap, Marker } from '@react-google-maps/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Maximize2, Minimize2, Layers, Crosshair } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMapsContext } from '@/lib/maps/maps-context'

const DEFAULT_CENTER = { lat: 4.8876, lng: 114.9426 } // Brunei

export interface MapMarker {
  lat: number
  lng: number
  draggable?: boolean
  onDragEnd?: (lat: number, lng: number) => void
  label?: string
  title?: string
}

export interface GoogleMapWrapperProps {
  center?: { lat: number; lng: number } | null
  zoom?: number
  markers?: MapMarker[]
  onMapClick?: (lat: number, lng: number) => void
  className?: string
  showTraffic?: boolean
  mapType?: 'roadmap' | 'satellite' | 'hybrid'
  children?: React.ReactNode
}

const MAP_TYPES: Array<{ value: 'roadmap' | 'satellite' | 'hybrid'; label: string; icon: string }> = [
  { value: 'roadmap', label: 'Roadmap', icon: '🗺️' },
  { value: 'satellite', label: 'Satellite', icon: '🛰️' },
  { value: 'hybrid', label: 'Hybrid', icon: '🌐' },
]

export default function GoogleMapWrapper({
  center,
  zoom = 15,
  markers = [],
  onMapClick,
  className,
  showTraffic = false,
  mapType: controlledMapType,
  children,
}: GoogleMapWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentMapType, setCurrentMapType] = React.useState<'roadmap' | 'satellite' | 'hybrid'>(
    controlledMapType || 'roadmap'
  )
  const [showMapTypeMenu, setShowMapTypeMenu] = useState(false)

  // Use the centralized Maps context — no more duplicate useJsApiLoader calls
  const { isLoaded, loadError } = useMapsContext()

  const mapRef = React.useRef<google.maps.Map | null>(null)

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
  }, [])

  const onUnmount = useCallback(() => {
    mapRef.current = null
  }, [])

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (onMapClick && e.latLng) {
        onMapClick(e.latLng.lat(), e.latLng.lng())
      }
    },
    [onMapClick]
  )

  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        if (mapRef.current) {
          mapRef.current.panTo({ lat: latitude, lng: longitude })
          mapRef.current.setZoom(16)
        }
      },
      () => {
        // Silently fail - user denied or unavailable
      }
    )
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }, [isFullscreen])

  React.useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  // Sync controlled mapType
  React.useEffect(() => {
    if (controlledMapType) {
      setCurrentMapType(controlledMapType)
      if (mapRef.current) {
        mapRef.current.setMapTypeId(controlledMapType)
      }
    }
  }, [controlledMapType])

  const containerStyle: React.CSSProperties = isFullscreen
    ? { width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 9999 }
    : {}

  // Loading state
  if (!isLoaded) {
    return (
      <Skeleton
        className={cn(
          'animate-pulse rounded-lg',
          className || 'w-full h-[300px]'
        )}
      />
    )
  }

  // Error state
  if (loadError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted rounded-lg border border-dashed border-muted-foreground/30',
          className || 'w-full h-[300px]'
        )}
      >
        <div className="text-center p-4">
          <p className="text-muted-foreground text-sm">Map unavailable</p>
          <p className="text-muted-foreground/60 text-xs mt-1">{loadError}</p>
        </div>
      </div>
    )
  }

  const mapCenter = center || DEFAULT_CENTER

  return (
    <div ref={containerRef} className={cn('relative', className || 'w-full h-[300px]')} style={containerStyle}>
      <GoogleMap
        mapContainerClassName="w-full h-full rounded-lg"
        center={mapCenter}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        mapTypeId={currentMapType}
        options={{
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
          mapTypeId: currentMapType,
        }}
      >
        {showTraffic && (
          <TrafficLayer />
        )}
        {markers.map((marker, index) => (
          <Marker
            key={`marker-${index}-${marker.lat}-${marker.lng}`}
            position={{ lat: marker.lat, lng: marker.lng }}
            draggable={marker.draggable || false}
            onDragEnd={(e) => {
              if (marker.onDragEnd && e.latLng) {
                marker.onDragEnd(e.latLng.lat(), e.latLng.lng())
              }
            }}
            label={marker.label}
            title={marker.title}
          />
        ))}
        {children}
      </GoogleMap>

      {/* Control buttons overlay */}
      <div className="absolute right-2 bottom-2 flex flex-col gap-1.5">
        {/* My Location */}
        <Button
          variant="secondary"
          size="icon"
          className="h-9 w-9 rounded-lg shadow-md bg-background/95 backdrop-blur-sm hover:bg-background"
          onClick={handleMyLocation}
          title="My Location"
        >
          <Crosshair className="size-4" />
          <span className="sr-only">My Location</span>
        </Button>

        {/* Map Type */}
        <div className="relative">
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 rounded-lg shadow-md bg-background/95 backdrop-blur-sm hover:bg-background"
            onClick={() => setShowMapTypeMenu(!showMapTypeMenu)}
            title="Map Type"
          >
            <Layers className="size-4" />
            <span className="sr-only">Map Type</span>
          </Button>

          {showMapTypeMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMapTypeMenu(false)} />
              <div className="absolute bottom-full right-0 mb-1 bg-background rounded-lg border shadow-lg py-1 z-50 min-w-[120px]">
                {MAP_TYPES.map((type) => (
                  <button
                    key={type.value}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors flex items-center gap-2',
                      currentMapType === type.value && 'bg-accent font-medium'
                    )}
                    onClick={() => {
                      setCurrentMapType(type.value)
                      if (mapRef.current) {
                        mapRef.current.setMapTypeId(type.value)
                      }
                      setShowMapTypeMenu(false)
                    }}
                  >
                    <span className="text-xs">{type.icon}</span>
                    {type.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Fullscreen toggle */}
        <Button
          variant="secondary"
          size="icon"
          className="h-9 w-9 rounded-lg shadow-md bg-background/95 backdrop-blur-sm hover:bg-background"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="size-4" />
          ) : (
            <Maximize2 className="size-4" />
          )}
          <span className="sr-only">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </Button>
      </div>
    </div>
  )
}

// Traffic layer helper component
function TrafficLayer() {
  const trafficLayer = React.useRef<google.maps.TrafficLayer | null>(null)

  React.useEffect(() => {
    if (typeof google !== 'undefined' && google.maps) {
      trafficLayer.current = new google.maps.TrafficLayer()
    }
    return () => {
      if (trafficLayer.current) {
        trafficLayer.current.setMap(null)
      }
    }
  }, [])

  return null
}