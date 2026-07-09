'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { InfoWindow, Marker } from '@react-google-maps/api'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { ScrollArea } from '@/shared/ui/scroll-area'
import {
  MapPin,
  Filter,
  LayoutList,
} from 'lucide-react'
import { cn } from '@/core/utils/utils'
import GoogleMapWrapper from './google-map'

export interface DashboardComplaint {
  id: string
  title: string
  priority: 'critical' | 'high' | 'medium' | 'low' | string
  status: string
  latitude: number | null
  longitude: number | null
  customerName: string
  assignedToName?: string | null
}

interface ComplaintsMapDashboardProps {
  complaints: DashboardComplaint[]
  className?: string
  onComplaintClick?: (complaint: DashboardComplaint) => void
}

type FilterType = 'all' | 'critical' | 'high' | 'medium' | 'low' | string

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444', // red
  high: '#f97316',     // orange
  medium: '#eab308',   // yellow
  low: '#22c55e',      // green
}

const PRIORITY_VARIANTS: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  critical: 'destructive',
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
}

const STATUS_COLORS: Record<string, string> = {
  NEW: '#6b7280',
  ASSIGNED: '#3b82f6',
  ACCEPTED: '#8b5cf6',
  IN_PROGRESS: '#f97316',
  COMPLETED: '#22c55e',
  CLIENT_CONFIRMED: '#14b8a6',
  CLOSED: '#6b7280',
  REJECTED: '#ef4444',
}

const FILTER_OPTIONS: Array<{ value: FilterType; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export default function ComplaintsMapDashboard({
  complaints,
  className,
  onComplaintClick,
}: ComplaintsMapDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null)

  // Get unique statuses from complaints
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>()
    complaints.forEach((c) => {
      if (c.status) statuses.add(c.status)
    })
    return Array.from(statuses).sort()
  }, [complaints])

  // Filter complaints that have locations
  const complaintsWithLocation = useMemo(
    () =>
      complaints.filter(
        (c) => c.latitude !== null && c.longitude !== null
      ),
    [complaints]
  )

  // Apply filters
  const filteredComplaints = useMemo(() => {
    return complaintsWithLocation.filter((c) => {
      if (activeFilter !== 'all' && c.priority !== activeFilter) return false
      if (statusFilter && c.status !== statusFilter) return false
      return true
    })
  }, [complaintsWithLocation, activeFilter, statusFilter])

  // Compute map center from filtered complaints
  const mapCenter = useMemo(() => {
    if (filteredComplaints.length === 0) return null
    const avgLat =
      filteredComplaints.reduce((sum, c) => sum + c.latitude!, 0) /
      filteredComplaints.length
    const avgLng =
      filteredComplaints.reduce((sum, c) => sum + c.longitude!, 0) /
      filteredComplaints.length
    return { lat: avgLat, lng: avgLng }
  }, [filteredComplaints])

  // Compute zoom based on spread
  const mapZoom = useMemo(() => {
    if (filteredComplaints.length <= 1) return 15
    if (filteredComplaints.length <= 5) return 13
    if (filteredComplaints.length <= 15) return 12
    return 11
  }, [filteredComplaints.length])

  const selectedComplaint = useMemo(
    () => complaints.find((c) => c.id === selectedComplaintId) || null,
    [complaints, selectedComplaintId]
  )

  const handleMarkerClick = useCallback((complaint: DashboardComplaint) => {
    setSelectedComplaintId((prev) => (prev === complaint.id ? null : complaint.id))
    onComplaintClick?.(complaint)
  }, [onComplaintClick])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filter bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Filter className="size-3.5" />
            Filter
          </div>
          <div className="text-xs text-muted-foreground">
            {filteredComplaints.length} of {complaintsWithLocation.length} complaints visible
          </div>
        </div>

        {/* Priority filters */}
        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={activeFilter === opt.value ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'h-7 text-xs gap-1.5',
                activeFilter === opt.value && opt.value !== 'all' && 'text-white',
                activeFilter === 'critical' && 'bg-red-600 hover:bg-red-700 border-red-600',
                activeFilter === 'high' && 'bg-orange-600 hover:bg-orange-700 border-orange-600',
                activeFilter === 'medium' && 'bg-yellow-600 hover:bg-yellow-700 border-yellow-600 text-white',
                activeFilter === 'low' && 'bg-green-600 hover:bg-green-700 border-green-600'
              )}
              onClick={() => setActiveFilter(opt.value === activeFilter ? 'all' : opt.value)}
            >
              {opt.value !== 'all' && (
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: PRIORITY_COLORS[opt.value] }}
                />
              )}
              {opt.label}
            </Button>
          ))}
        </div>

        {/* Status filters */}
        {uniqueStatuses.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {uniqueStatuses.map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() =>
                  setStatusFilter(statusFilter === status ? null : status)
                }
              >
                <span
                  className="size-2 rounded-full mr-1"
                  style={{
                    backgroundColor: STATUS_COLORS[status] || '#6b7280',
                  }}
                />
                {status.replace(/_/g, ' ')}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Map or empty state */}
      {complaintsWithLocation.length === 0 ? (
        <div className="w-full h-[400px] rounded-lg border border-dashed border-muted-foreground/30 bg-muted flex flex-col items-center justify-center text-center p-6">
          <MapPin className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            No complaints with locations
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1 max-w-sm">
            Complaints will appear on this map once they have GPS coordinates or
            addresses assigned to them.
          </p>
        </div>
      ) : (
        <div className="relative">
          <GoogleMapWrapper
            center={mapCenter}
            zoom={mapZoom}
            className="w-full h-[400px] sm:h-[500px] rounded-lg"
          >
            {/* Render markers manually for colored icons and InfoWindow */}
            <MapMarkers
              complaints={filteredComplaints}
              selectedId={selectedComplaintId}
              onMarkerClick={handleMarkerClick}
            />
          </GoogleMapWrapper>

          {/* Complaint list sidebar on desktop */}
          <div className="hidden lg:block absolute top-2 left-2 bottom-2 w-72">
            <Card className="h-full py-0 overflow-hidden shadow-lg">
              <CardHeader className="px-4 py-3 border-b">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <LayoutList className="size-4" />
                  Complaints ({filteredComplaints.length})
                </CardTitle>
              </CardHeader>
              <ScrollArea className="h-[calc(100%-3rem)]">
                <div className="p-2 space-y-1">
                  {filteredComplaints.map((c) => (
                    <button
                      key={c.id}
                      className={cn(
                        'w-full text-left p-2.5 rounded-lg transition-colors text-sm',
                        selectedComplaintId === c.id
                          ? 'bg-accent'
                          : 'hover:bg-accent/50'
                      )}
                      onClick={() => handleMarkerClick(c)}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="size-2.5 rounded-full mt-1.5 shrink-0"
                          style={{
                            backgroundColor:
                              PRIORITY_COLORS[c.priority] || '#6b7280',
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{c.title}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {c.customerName}
                            {c.assignedToName && (
                              <span className="ml-1">
                                → {c.assignedToName}
                              </span>
                            )}
                          </p>
                          <div className="flex gap-1 mt-1">
                            <Badge
                              variant={
                                PRIORITY_VARIANTS[c.priority] || 'outline'
                              }
                              className="text-[10px] px-1.5 py-0 h-4"
                            >
                              {c.priority}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-4"
                            >
                              {c.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>
        </div>
      )}

      {/* Mobile complaint list */}
      {filteredComplaints.length > 0 && (
        <div className="lg:hidden">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            {filteredComplaints.length} complaints
          </h4>
          <ScrollArea className="max-h-64">
            <div className="space-y-1.5">
              {filteredComplaints.map((c) => (
                <Card
                  key={c.id}
                  className={cn(
                    'py-3 cursor-pointer transition-colors',
                    selectedComplaintId === c.id && 'ring-2 ring-primary'
                  )}
                  onClick={() => handleMarkerClick(c)}
                >
                  <CardContent className="p-0 px-4">
                    <div className="flex items-start gap-2">
                      <span
                        className="size-2.5 rounded-full mt-1.5 shrink-0"
                        style={{
                          backgroundColor:
                            PRIORITY_COLORS[c.priority] || '#6b7280',
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {c.customerName}
                          {c.assignedToName && (
                            <span className="ml-1">→ {c.assignedToName}</span>
                          )}
                        </p>
                        <div className="flex gap-1 mt-1.5">
                          <Badge
                            variant={PRIORITY_VARIANTS[c.priority] || 'outline'}
                            className="text-[10px] px-1.5 py-0 h-4"
                          >
                            {c.priority}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4"
                          >
                            {c.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}

// Sub-component that renders colored markers and InfoWindows using google maps API directly
function MapMarkers({
  complaints,
  selectedId,
  onMarkerClick,
}: {
  complaints: DashboardComplaint[]
  selectedId: string | null
  onMarkerClick: (c: DashboardComplaint) => void
}) {
  const selectedComplaint = complaints.find((c) => c.id === selectedId) || null

  return (
    <>
      {complaints.map((c) => (
        <ColoredMarker
          key={c.id}
          complaint={c}
          isSelected={selectedId === c.id}
          onClick={() => onMarkerClick(c)}
        />
      ))}

      {/* InfoWindow for selected marker */}
      {selectedComplaint && selectedComplaint.latitude !== null && selectedComplaint.longitude !== null && (
        <InfoWindow
          position={{
            lat: selectedComplaint.latitude,
            lng: selectedComplaint.longitude,
          }}
          onCloseClick={() => onMarkerClick(selectedComplaint)}
        >
          <div className="min-w-[200px] max-w-[280px] p-1">
            <h3 className="font-semibold text-sm text-gray-900 mb-1">
              {selectedComplaint.title}
            </h3>
            <div className="flex flex-wrap gap-1 mb-2">
              <span
                className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
                style={{
                  backgroundColor:
                    PRIORITY_COLORS[selectedComplaint.priority] || '#6b7280',
                }}
              >
                {selectedComplaint.priority.toUpperCase()}
              </span>
              <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                {selectedComplaint.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              Customer: {selectedComplaint.customerName}
            </p>
            {selectedComplaint.assignedToName && (
              <p className="text-xs text-gray-500 mt-0.5">
                Assigned: {selectedComplaint.assignedToName}
              </p>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  )
}

// A single marker with custom color
function ColoredMarker({
  complaint,
  isSelected,
  onClick,
}: {
  complaint: DashboardComplaint
  isSelected: boolean
  onClick: () => void
}) {
  if (complaint.latitude === null || complaint.longitude === null) return null

  const color = PRIORITY_COLORS[complaint.priority] || '#6b7280'

  return (
    <Marker
      position={{ lat: complaint.latitude, lng: complaint.longitude }}
      title={complaint.title}
      onClick={onClick}
      icon={{
        path: isSelected
          ? 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'
          : 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
        fillColor: color,
        fillOpacity: isSelected ? 1 : 0.85,
        stroke: isSelected ? '#ffffff' : '#000000',
        strokeWeight: isSelected ? 3 : 1,
        scale: isSelected ? 1.3 : 1,
        anchor: new google.maps.Point(12, 12),
        labelOrigin: new google.maps.Point(12, 14),
      }}
      label={
        isSelected
          ? {
              text: complaint.priority.charAt(0).toUpperCase(),
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 'bold',
            }
          : undefined
      }
      zIndex={isSelected ? 1000 : getPriorityZIndex(complaint.priority)}
    />
  )
}

function getPriorityZIndex(priority: string): number {
  switch (priority) {
    case 'critical':
      return 400
    case 'high':
      return 300
    case 'medium':
      return 200
    case 'low':
      return 100
    default:
      return 50
  }
}