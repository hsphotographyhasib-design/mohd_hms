// ────────────────────────────────────────────────────────────────────────
// Branding Types — Single source of truth for brand asset & config types
// ────────────────────────────────────────────────────────────────────────

/** All supported brand asset types */
export type BrandAssetType =
  | 'primary_logo'
  | 'compact_logo'
  | 'dark_logo'
  | 'light_logo'
  | 'favicon'
  | 'icon_192'
  | 'icon_512'
  | 'apple_touch_icon'
  | 'notification_icon'
  | 'login_logo'
  | 'splash_logo'
  | 'pdf_header_logo'
  | 'email_header_logo';

/** A single uploaded brand asset */
export interface BrandAsset {
  id: string;
  type: BrandAssetType;
  fileName: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  url: string;
  version: number;
  isActive: boolean;
  createdAt: string;
}

/** Editable brand configuration fields */
export interface BrandConfig {
  brand_name: string;
  brand_short_name: string;
  brand_tagline: string;
  brand_address: string;
  brand_phone: string;
  brand_email: string;
  brand_website: string;
  brand_tax_number: string;
  brand_reg_number: string;
  brand_primary_color: string;
  brand_accent_color: string;
  brand_theme_color: string;
  brand_bg_color: string;
}

/** Combined branding response from the API */
export interface BrandingData {
  config: BrandConfig;
  assets: BrandAsset[];
}