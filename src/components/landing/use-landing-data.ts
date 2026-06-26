'use client'

import { useState, useEffect } from 'react'
import type { CMSData } from './landing-data'

export function useLandingData() {
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

  return { cms, ready }
}