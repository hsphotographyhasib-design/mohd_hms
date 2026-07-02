'use client'

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'
import type { CMSData } from './landing-data'

/**
 * Shared CMS data context — prevents 10+ duplicate fetches.
 * Each landing section used to call useLandingData() independently,
 * causing 10 parallel /api/cms/public/landing requests per page load.
 */

const CMSContext = createContext<{ cms: CMSData | null; ready: boolean }>({
  cms: null,
  ready: false,
})

export function useLandingData() {
  return useContext(CMSContext)
}

export function LandingDataProvider({ children }: { children: ReactNode }) {
  const [cms, setCms] = useState<CMSData | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/cms/public/landing')
        if (!res.ok || cancelled) return
        const json = await res.json()
        if (json.success && json.data && !cancelled) {
          setCms(json.data)
        }
      } catch { /* silent — use defaults */ }
      if (!cancelled) setReady(true)
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <CMSContext.Provider value={{ cms, ready }}>
      {children}
    </CMSContext.Provider>
  )
}