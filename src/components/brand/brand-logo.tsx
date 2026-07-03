'use client';

import { cn } from '@/lib/utils';

// ============================================================
// CONSTANTS
// ============================================================

const LOGO_SRC = '/logo.png';
/** Natural aspect ratio of the logo (width:height) */
const LOGO_ASPECT = 512 / 341;

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
}: BrandLogoProps) {
  const s = sizeMap[size];

  // ─── Icon-only variant (bare logo image) ──────────────────
  if (variant === 'icon') {
    return (
      <img
        src={LOGO_SRC}
        alt=""
        width={Math.round(s.h * LOGO_ASPECT)}
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
          src={LOGO_SRC}
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
          src={LOGO_SRC}
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

/** Full logo for login / error pages — matches the original w-14 h-14 visual weight */
export function LoginBrandLogo({ className }: { className?: string }) {
  return (
    <div className={cn('w-14 h-14 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 overflow-hidden', className)}>
      <img
        src={LOGO_SRC}
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