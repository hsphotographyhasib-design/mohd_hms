import { create } from 'zustand';
import { BRAND } from '@/core/constants/company';
import type { BrandAssetType, BrandAsset, BrandConfig, BrandingData } from './branding-types';

// ─── Static fallback map — asset type → static file path ────────────────

const STATIC_FALLBACKS: Record<BrandAssetType, string> = {
  primary_logo: BRAND.logo.png,
  compact_logo: BRAND.logo.png512,
  icon_512: BRAND.logo.png512,
  icon_192: '/logo-192x192.png',
  apple_touch_icon: '/apple-touch-icon-180x180.png',
  favicon: BRAND.logo.ico,
  notification_icon: BRAND.logo.png512,
  login_logo: BRAND.logo.png512,
  splash_logo: BRAND.logo.png1024,
  pdf_header_logo: BRAND.logo.png512,
  email_header_logo: BRAND.logo.png512,
  dark_logo: BRAND.logo.png,
  light_logo: BRAND.logo.png,
};

// ─── Store interface ────────────────────────────────────────────────────

interface BrandingState {
  /** Brand configuration from the API (null until loaded) */
  config: BrandConfig | null;
  /** All active brand assets from the API */
  assets: BrandAsset[];
  /** Whether branding data has been successfully loaded at least once */
  isLoaded: boolean;
  /** Whether a branding fetch is currently in progress */
  isLoading: boolean;

  /** Quick-lookup map: asset type → asset URL (for served assets) */
  assetMap: Record<string, string>;

  /** Populate the store with branding data from the API */
  setBranding: (data: BrandingData) => void;
  /** Toggle the loading flag */
  setLoading: (loading: boolean) => void;

  /**
   * Get the URL for a given asset type.
   *
   * 1. If a dynamic asset exists in `assetMap`, return `/api/branding/serve/{url}`
   * 2. Otherwise fall back to the static file path from BRAND config.
   */
  getAssetUrl: (type: BrandAssetType) => string;

  /** Clear all cached branding data — forces a re-fetch on next access */
  invalidate: () => void;
}

// ─── Helper: build the assetMap from an assets array ────────────────────

function buildAssetMap(assets: BrandAsset[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const asset of assets) {
    if (asset.isActive) {
      map[asset.type] = asset.url;
    }
  }
  return map;
}

// ─── Store ──────────────────────────────────────────────────────────────

export const useBrandingStore = create<BrandingState>((set, get) => ({
  config: null,
  assets: [],
  isLoaded: false,
  isLoading: false,
  assetMap: {},

  setBranding: (data: BrandingData) => {
    const activeAssets = data.assets.filter((a) => a.isActive);
    set({
      config: data.config,
      assets: activeAssets,
      isLoaded: true,
      isLoading: false,
      assetMap: buildAssetMap(activeAssets),
    });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  getAssetUrl: (type: BrandAssetType): string => {
    const { assetMap } = get();
    const dynamicUrl = assetMap[type];
    if (dynamicUrl) {
      // Dynamic assets are served through the branding API
      return `/api/branding/serve/${dynamicUrl}`;
    }
    // Static fallback from centralized BRAND config
    return STATIC_FALLBACKS[type];
  },

  invalidate: () => {
    set({
      config: null,
      assets: [],
      isLoaded: false,
      isLoading: false,
      assetMap: {},
    });
  },
}));