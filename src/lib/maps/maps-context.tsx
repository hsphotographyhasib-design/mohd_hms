'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'

const MAPS_LIBRARIES: ('places' | 'geometry' | 'drawing')[] = ['places', 'geometry', 'drawing']

interface MapsContextValue {
  isLoaded: boolean
  loadError: string | undefined
  apiKey: string | null
  refetchKey: () => void
}

const MapsContext = createContext<MapsContextValue>({
  isLoaded: false,
  loadError: undefined,
  apiKey: null,
  refetchKey: () => {},
})

export function useMapsContext() {
  return useContext(MapsContext)
}

/**
 * Centralized Google Maps API loader.
 *
 * useJsApiLoader is a global singleton — calling it with different options
 * between renders throws: "Loader must not be called again with different options".
 *
 * To prevent this, we split the logic into two layers:
 *   1. MapsProvider: fetches the API key, then renders MapsLoaderInner
 *   2. MapsLoaderInner: calls useJsApiLoader — mounted only ONCE, after the
 *      key is available, so the hook never sees changing options.
 */
export function MapsProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [keyError, setKeyError] = useState<string | undefined>(undefined)
  const [fetchAttempt, setFetchAttempt] = useState(0)

  const fetchKey = useCallback(() => {
    let cancelled = false

    async function doFetch() {
      try {
        const res = await fetch('/api/maps/config')
        if (!res.ok) {
          if (!cancelled) setKeyError('Failed to fetch Maps configuration')
          return
        }
        const data = await res.json()
        if (!data.apiKey) {
          if (!cancelled) setKeyError('Google Maps API key not configured')
          return
        }
        if (!cancelled) {
          setApiKey(data.apiKey)
          setKeyError(undefined)
        }
      } catch {
        if (!cancelled) setKeyError('Failed to fetch Maps configuration')
      }
    }

    doFetch()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const cleanup = fetchKey()
    return cleanup
  }, [fetchKey, fetchAttempt])

  const refetchKey = useCallback(() => {
    setFetchAttempt((prev) => prev + 1)
  }, [])

  // If we don't have the API key yet, show a skeleton state
  // and wait — do NOT call useJsApiLoader until we know the key.
  if (!apiKey) {
    return (
      <MapsContext.Provider
        value={{
          isLoaded: false,
          loadError: keyError,
          apiKey: null,
          refetchKey,
        }}
      >
        {children}
      </MapsContext.Provider>
    )
  }

  // Key is available — mount the inner component that calls useJsApiLoader.
  // This component is guaranteed to mount only once per API key, so the hook
  // options never change.
  return (
    <MapsLoaderInner apiKey={apiKey} refetchKey={refetchKey}>
      {children}
    </MapsLoaderInner>
  )
}

/**
 * Inner component that actually calls useJsApiLoader.
 * It only mounts when `apiKey` is non-null, so the hook is called once
 * with stable, unchanging options.
 */
function MapsLoaderInner({
  apiKey,
  refetchKey,
  children,
}: {
  apiKey: string
  refetchKey: () => void
  children: React.ReactNode
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: MAPS_LIBRARIES,
    id: 'google-map-script',
  })

  const effectiveError = loadError?.message || undefined

  return (
    <MapsContext.Provider
      value={{
        isLoaded: isLoaded && !!apiKey,
        loadError: effectiveError,
        apiKey,
        refetchKey,
      }}
    >
      {children}
    </MapsContext.Provider>
  )
}