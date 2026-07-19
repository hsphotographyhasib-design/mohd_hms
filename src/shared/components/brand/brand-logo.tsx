'use client';

import { cn } from '@/core/utils/utils';
import { useBrandingStore } from '@/core/branding';

// ============================================================
// TYPES
// ============================================================

export type BrandLogoVariant =
  | 'icon'        // Just the logo image
  | 'icon-square' // Logo constrained to a square bounding box
  | 'full';       // Logo + wordmark side by side

export type BrandLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  size?: BrandLogoSize;
  className?: string;
  /** Override the icon wrapper styling */
  iconClassName?: string;
  /** Override the text color for wordmark */
  textClassName?: string;
  /** Show compact wordmark ('MH ENTERPRISE') instead of full name */
  compact?: boolean;
  /** Force a specific logo type (e.g. 'dark_logo', 'compact_logo') */
  logoType?: string;
}

// ============================================================
// SIZE MAP
// ============================================================

const sizeMap: Record<BrandLogoSize, { h: number; gap: number; text: string; square: string }> = {
  xs:  { h: 14, gap: 1.5, text: 'text-[10px]',  square: 'w-4 h-4' },
  sm:  { h: 18, gap: 2,   text: 'text-xs',      square: 'w-5 h-5' },
  md:  { h: 28, gap: 2.5, text: 'text-sm',      square: 'w-8 h-8' },
  lg:  { h: 36, gap: 3,   text: 'text-base',    square: 'w-10 h-10' },
  xl:  { h: 52, gap: 3.5, text: 'text-lg',     square: 'w-14 h-14' },
};

// ============================================================
// BRAND LOGO COMPONENT
// ============================================================

export function BrandLogo({
  variant = 'icon-square',
  size = 'md',
  className,
  iconClassName,
  textClassName,
  compact = false,
  logoType,
}: BrandLogoProps) {
  const s = sizeMap[size];
  // Dynamic logo from branding service — falls back to static /logo.png
  const logoSrc = useBrandingStore((st) =>
    logoType ? st.getAssetUrl(logoType as any) : st.getAssetUrl('primary_logo')
  );

  // ─── Icon-only variant (bare logo image) ──────────────────
  if (variant === 'icon') {
    return (
      <img
        src={logoSrc}
        alt=""
        width={s.h}
        height={s.h}
        className={cn('shrink-0 object-contain', iconClassName, className)}
        aria-hidden="true"
      />
    );
  }

  // ─── Icon-in-square variant (logo inside a square bounding box) ─
  if (variant === 'icon-square') {
    return (
      <div
        className={cn(
          'shrink-0 flex items-center justify-center overflow-hidden',
          s.square,
          iconClassName,
          className
        )}
      >
        <img
          src={logoSrc}
          alt=""
          style={{ width: '85%', height: '85%', objectFit: 'contain' }}
          aria-hidden="true"
        />
      </div>
    );
  }

  // ─── Full (icon + wordmark) variant ──────────────────────
  return (
    <div
      className={cn('flex items-center shrink-0', className)}
      style={{ gap: s.gap * 4 }}
    >
      <div
        className={cn(
          'shrink-0 flex items-center justify-center overflow-hidden',
          s.square
        )}
      >
        <img
          src={logoSrc}
          alt=""
          style={{ width: '85%', height: '85%', objectFit: 'contain' }}
          aria-hidden="true"
        />
      </div>
      <span
        className={cn(
          'font-semibold tracking-tight leading-tight text-foreground',
          s.text,
          textClassName
        )}
      >
        {compact ? 'MH ENTERPRISE' : 'MOHD.HMS ENTERPRISE'}
      </span>
    </div>
  );
}

// ============================================================
// CONVENIENCE EXPORTS
// ============================================================

/** Logo for sidebar / header — compact icon in square */
export function HeaderBrandLogo({ className }: { className?: string }) {
  return <BrandLogo variant="icon-square" size="md" className={className} />;
}

/** Full logo for login / error pages — uses login_logo if available */
export function LoginBrandLogo({ className }: { className?: string }) {
  const logoSrc = useBrandingStore((st) => st.getAssetUrl('login_logo'));
  return (
    <div className={cn('w-14 h-14 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 overflow-hidden', className)}>
      <img
        src={logoSrc}
        alt=""
        width={52}
        height={52}
        className="object-contain"
        aria-hidden="true"
      />
    </div>
  );
}

/** Small inline logo for footers / watermarks */
export function FooterBrandLogo({ className }: { className?: string }) {
  return <BrandLogo variant="icon" size="xs" className={className} />;
}