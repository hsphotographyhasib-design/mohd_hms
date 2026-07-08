'use client'

import { useMapsContext } from './maps-context'

interface MapsLoaderResult {
  isLoaded: boolean
  loadError: string | undefined
}

/**
 * Convenience hook that re-exports the shared MapsContext state.
 * The actual loading is handled by MapsProvider (maps-context.tsx).
 */
export function useMapsLoader(): MapsLoaderResult {
  const { isLoaded, loadError } = useMapsContext()
  return { isLoaded, loadError }
}