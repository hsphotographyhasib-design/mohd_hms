'use client';

import React from 'react';

/* ============================================================
   MOHD.HMS PUBLIC WEBSITE — Shared Theme Components
   Matches the original landing.html editorial/print design.
   ============================================================ */

// ---------- Reusable Section Header ----------
export function SectionHeader({
  label,
  title,
  lede,
  light = false,
}: {
  label: string;
  title: string;
  lede?: string;
  light?: boolean;
}) {
  return (
    <div className="mb-14 max-w-[880px]">
      <div className="flex items-center gap-4 mb-6">
        <span
          className="text-xs tracking-[0.16em] uppercase whitespace-nowrap font-medium"
          style={{
            fontFamily: 'var(--hm-mono)',
            color: light ? 'var(--hm-green-bright)' : 'var(--hm-green)',
          }}
        >
          {label}
        </span>
        <div
          className="flex-1 h-px"
          style={{
            background: light
              ? 'rgba(255,255,255,0.18)'
              : 'var(--hm-line)',
          }}
        />
      </div>
      <h2
        className="max-w-[16ch]"
        style={{
          fontFamily: 'var(--hm-disp)',
          fontWeight: 600,
          lineHeight: 1.04,
          letterSpacing: '-0.02em',
          fontSize: 'clamp(2rem, 4.4vw, 3.3rem)',
          color: light ? 'var(--hm-paper)' : 'var(--hm-forest)',
        }}
      >
        {title}
      </h2>
      {lede && (
        <p
          className="mt-4 max-w-[60ch]"
          style={{
            fontSize: '1.08rem',
            color: light
              ? 'rgba(247,248,243,0.72)'
              : 'var(--hm-muted)',
          }}
        >
          {lede}
        </p>
      )}
    </div>
  );
}

// ---------- Reusable Icon Box ----------
export function IconBox({
  children,
  size = 'md',
  className,
  style,
}: {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}) {
  const sizeMap = {
    sm: { w: 30, h: 30, r: 8 },
    md: { w: 42, h: 42, r: 11 },
    lg: { w: 46, h: 46, r: 12 },
  };
  const s = sizeMap[size];
  return (
    <div
      className={`grid place-items-center shrink-0 ${className || ''}`}
      style={{
        ...style,
        width: s.w,
        height: s.h,
        borderRadius: s.r,
        background: 'var(--hm-stone)',
      }}
    >
      {children}
    </div>
  );
}

// ---------- Reusable Theme Section Wrapper ----------
export function ThemeSection({
  children,
  variant = 'default',
  className = '',
  style,
}: {
  children: React.ReactNode;
  variant?: 'default' | 'stone' | 'forest';
  className?: string;
  style?: React.CSSProperties;
}) {
  const bgMap = {
    default: 'var(--hm-paper)',
    stone: 'var(--hm-stone)',
    forest: 'var(--hm-forest)',
  };
  const isForest = variant === 'forest';
  return (
    <section
      className={`relative ${className}`}
      style={{
        ...style,
        padding: 'clamp(56px, 8vw, 104px) 0',
        background: bgMap[variant],
        color: isForest ? 'var(--hm-paper)' : undefined,
      }}
    >
      <div
        className="mx-auto px-7"
        style={{ maxWidth: 'var(--hm-container)' }}
      >
        {children}
      </div>
    </section>
  );
}

// ---------- Reusable Theme Card ----------
export function ThemeCard({
  children,
  className = '',
  hover = true,
  large = false,
  style,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  large?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      className={className}
      style={{
        ...style,
        background: 'var(--hm-paper-2)',
        border: '1px solid var(--hm-line)',
        borderRadius: large ? 'var(--hm-r-lg)' : 'var(--hm-r)',
        padding: large ? '32px' : '24px 22px',
        transition: hover
          ? 'transform 0.28s var(--hm-ease), border-color 0.28s var(--hm-ease)'
          : undefined,
        cursor: hover || onClick ? 'pointer' : undefined,
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!hover) return;
        (e.currentTarget as HTMLElement).style.borderColor =
          'var(--hm-forest)';
        (e.currentTarget as HTMLElement).style.transform =
          'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        if (!hover) return;
        (e.currentTarget as HTMLElement).style.borderColor =
          'var(--hm-line)';
        (e.currentTarget as HTMLElement).style.transform = 'none';
      }}
    >
      {children}
    </div>
  );
}

// ---------- Reusable Theme Button ----------
export function ThemeButton({
  children,
  variant = 'fill',
  className = '',
  onClick,
  style,
}: {
  children: React.ReactNode;
  variant?: 'fill' | 'green' | 'outline';
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  const variants: Record<string, React.CSSProperties> = {
    fill: {
      background: 'var(--hm-forest)',
      color: 'var(--hm-paper)',
    },
    green: {
      background: 'var(--hm-green)',
      color: '#fff',
    },
    outline: {
      background: 'transparent',
      borderColor: 'var(--hm-line)',
      color: 'var(--hm-ink)',
    },
  };
  return (
    <button
      className={`inline-flex items-center gap-2 cursor-pointer whitespace-nowrap ${className}`}
      style={{
        ...style,
        fontFamily: 'var(--hm-body)',
        fontWeight: 600,
        fontSize: '0.94rem',
        padding: '0.82rem 1.4rem',
        borderRadius: 'var(--hm-r-sm)',
        border: variant === 'outline' ? '1px solid' : '1px solid transparent',
        transition: 'transform 0.25s var(--hm-ease), background 0.25s var(--hm-ease)',
        ...variants[variant],
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'translateY(-1px)';
        if (variant === 'fill') el.style.background = 'var(--hm-green)';
        if (variant === 'green') el.style.background = 'var(--hm-green-bright)';
        if (variant === 'outline') {
          el.style.background = 'var(--hm-forest)';
          el.style.color = 'var(--hm-paper)';
          el.style.borderColor = 'var(--hm-forest)';
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'none';
        el.style.background = variants[variant].background as string;
        el.style.color = variants[variant].color as string;
        if (variant === 'outline') {
          el.style.borderColor = 'var(--hm-line)';
        }
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ---------- Reusable Mono Label ----------
export function MonoLabel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={className}
      style={{
        fontFamily: 'var(--hm-mono)',
        fontSize: '0.72rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        color: 'var(--hm-green)',
      }}
    >
      {children}
    </span>
  );
}

// ---------- Display Heading ----------
export function DisplayHeading({
  children,
  as: Tag = 'h3',
  className = '',
  size,
  style,
}: {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4';
  className?: string;
  size?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Tag
      className={className}
      style={{
        ...style,
        fontFamily: 'var(--hm-disp)',
        fontWeight: 600,
        lineHeight: 1.04,
        letterSpacing: '-0.02em',
        color: 'var(--hm-forest)',
        fontSize: size || undefined,
      }}
    >
      {children}
    </Tag>
  );
}

// ---------- Reveal Animation Component ----------
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(20px)',
        transition: `opacity 0.8s var(--hm-ease) ${delay}s, transform 0.8s var(--hm-ease) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

// ---------- Utility: body text style ----------
export const bodyStyle: React.CSSProperties = {
  fontFamily: 'var(--hm-body)',
  lineHeight: 1.62,
  WebkitFontSmoothing: 'antialiased',
  color: 'var(--hm-ink)',
};

// ---------- Utility: section divider border ----------
export function Divider() {
  return <div className="h-px" style={{ background: 'var(--hm-line)' }} />;
}

// ---------- Figure (image with optional fallback) ----------
export function PlaceholderFig({
  aspect = '4/3',
  label,
  className = '',
  src,
}: {
  aspect?: string;
  label?: string;
  className?: string;
  src?: string;
}) {
  const hasImage = Boolean(src);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        aspectRatio: aspect,
        borderRadius: 'var(--hm-r)',
        border: hasImage ? 'none' : '1px solid var(--hm-line)',
        background: 'var(--hm-stone-2)',
      }}
    >
      {hasImage ? (
        <img
          src={src}
          alt={label || ''}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 grid place-items-center"
          style={{ color: 'var(--hm-green)', opacity: 0.32 }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        </div>
      )}
      {label && !hasImage && (
        <span
          className="absolute left-3.5 bottom-3.5 px-2.5 py-1"
          style={{
            fontFamily: 'var(--hm-mono)',
            fontSize: '0.64rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#fff',
            background: 'rgba(11,40,29,0.66)',
            backdropFilter: 'blur(4px)',
            borderRadius: '6px',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

// ---------- Page Wrapper (scroll to top on page change) ----------
export function PageWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  return <>{children}</>;
}

// ---------- Link-style Button (for navigation) ----------
export function ThemeLink({
  children,
  variant = 'fill',
  className = '',
  onClick,
  style,
}: {
  children: React.ReactNode;
  variant?: 'fill' | 'green' | 'outline';
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  const variants: Record<string, React.CSSProperties> = {
    fill: {
      background: 'var(--hm-forest)',
      color: 'var(--hm-paper)',
    },
    green: {
      background: 'var(--hm-green)',
      color: '#fff',
    },
    outline: {
      background: 'transparent',
      borderColor: 'var(--hm-line)',
      color: 'var(--hm-ink)',
    },
  };
  return (
    <span
      className={`inline-flex items-center gap-2 cursor-pointer whitespace-nowrap ${className}`}
      style={{
        ...style,
        fontFamily: 'var(--hm-body)',
        fontWeight: 600,
        fontSize: '0.94rem',
        padding: '0.82rem 1.4rem',
        borderRadius: 'var(--hm-r-sm)',
        border: variant === 'outline' ? '1px solid' : '1px solid transparent',
        transition: 'transform 0.25s var(--hm-ease), background 0.25s var(--hm-ease)',
        ...variants[variant],
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'translateY(-1px)';
        if (variant === 'fill') el.style.background = 'var(--hm-green)';
        if (variant === 'green') el.style.background = 'var(--hm-green-bright)';
        if (variant === 'outline') {
          el.style.background = 'var(--hm-forest)';
          el.style.color = 'var(--hm-paper)';
          el.style.borderColor = 'var(--hm-forest)';
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'none';
        el.style.background = variants[variant].background as string;
        el.style.color = variants[variant].color as string;
        if (variant === 'outline') {
          el.style.borderColor = 'var(--hm-line)';
        }
      }}
      onClick={onClick}
    >
      {children}
    </span>
  );
}