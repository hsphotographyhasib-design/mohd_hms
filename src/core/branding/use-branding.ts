'use client';

import { useEffect, useRef } from 'react';
import { useBrandingStore } from './branding-store';
import { brandingService } from './branding-service';
import type { BrandAssetType, BrandConfig } from './branding-types';

// ─── useBranding ────────────────────────────────────────────────────────

/**
 * Loads branding data once from the API and populates the store.
 *
 * - If already loaded, does nothing (unless invalidated).
 * - If loading is already in progress, does nothing (dedupes concurrent calls).
 * - Silently falls back to static assets for unauthenticated users (login page).
 */
export function useBranding() {
  const isLoaded = useBrandingStore((s) => s.isLoaded);
  const isLoading = useBrandingStore((s) => s.isLoading);
  const setBranding = useBrandingStore((s) => s.setBranding);
  const setLoading = useBrandingStore((s) => s.setLoading);
  const config = useBrandingStore((s) => s.config);
  const assets = useBrandingStore((s) => s.assets);

  const fetchingRef = useRef(false);

  useEffect(() => {
    // Skip if already loaded, currently loading, or a fetch is already in flight
    if (isLoaded || isLoading || fetchingRef.current) return;

    fetchingRef.current = true;
    setLoading(true);

    brandingService
      .fetchBranding()
      .then((data) => {
        setBranding(data);
      })
      .catch(() => {
        // Silently fall back to static assets — don't set isLoaded so
        // it can be retried next mount (e.g. after login)
        setLoading(false);
      })
      .finally(() => {
        fetchingRef.current = false;
      });
  }, [isLoaded, isLoading, setBranding, setLoading]);

  return { config, assets, isLoaded, isLoading };
}

// ─── useLogo ────────────────────────────────────────────────────────────

/**
 * Returns the logo/asset URL for the given type.
 * Falls back to static brand assets when dynamic assets are not available.
 *
 * @param type - The asset type (defaults to 'primary_logo')
 */
export function useLogo(type: BrandAssetType = 'primary_logo'): string {
  const getAssetUrl = useBrandingStore((s) => s.getAssetUrl);
  return getAssetUrl(type);
}

// ─── useBrandConfig ─────────────────────────────────────────────────────

/**
 * Returns the current brand configuration.
 * Falls back to the static BRAND constants when the API hasn't loaded yet.
 */
export function useBrandConfig(): BrandConfig | null {
  const config = useBrandingStore((s) => s.config);
  return config;
}

// ─── useIsBrandingLoaded ────────────────────────────────────────────────

/**
 * Returns whether branding data has been loaded from the API.
 */
export function useIsBrandingLoaded(): boolean {
  return useBrandingStore((s) => s.isLoaded);
}