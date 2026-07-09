'use client';

import React, { useEffect, useRef, useState, useCallback, createContext, useContext } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import useEmblaCarousel from 'embla-carousel-react';
import type { Breakpoint } from './types';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/shared/ui/accordion';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import {
  Home, Settings, Phone, Mail, MapPin, Clock, Star, Heart, Shield, Zap,
  Wrench, Building2, Users, Award, Check, ArrowRight, ArrowLeft, ArrowUp,
  ArrowDown, ChevronRight, ChevronLeft, ChevronUp, ChevronDown,
  Menu, X, Search, Plus, Minus, Edit, Trash, Copy, Eye, EyeOff,
  Download, Upload, FileText, ImageIcon, Video, Link, ExternalLink,
  Globe, Lock, Unlock, Bell, Calendar, Camera, Mic, Music,
  Palette, Code, Database, Server, Cloud, Wifi, Monitor,
  Smartphone, Tablet, Laptop, Cpu, HardDrive, Printer, Speaker,
  Volume2, Play, Pause, SkipForward, SkipBack, RotateCcw,
  Send, MessageCircle, Share2, Facebook, Twitter, Instagram,
  Linkedin, Youtube, Target, TrendingUp, BarChart3, PieChart,
  Activity, Layers, Grid, List, Layout, Box, Package,
  Truck, Briefcase, GraduationCap, BookOpen, Newspaper,
  Flag, Bookmark, Hash, AtSign, Percent, DollarSign,
  Circle, Square, Triangle, Hexagon, Diamond, Octagon,
  Lightbulb, Rocket, Flame, Leaf, TreePine, Mountain,
  Sun, Moon, CloudRain, Snowflake, Wind, Umbrella,
  User, UserCheck, UserPlus, UsersRound, UserCog, IdCard,
  Megaphone, Handshake, ThumbsUp, Sparkles, Medal, Trophy,
  Gift, ShoppingBag, ShoppingCart, CreditCard, Receipt, Wallet,
  Pin, Map, Navigation, Compass, Route,
} from 'lucide-react';
import type {
  WidgetNode,
  WidgetType,
  HeadingProps,
  TextProps,
  ButtonProps,
  ImageProps,
  VideoProps,
  SpacerProps,
  DividerProps,
  IconProps,
  CardProps,
  CounterProps,
  FaqProps,
  GalleryProps,
  TestimonialProps,
  TeamCardProps,
  ServiceCardProps,
  ContactFormProps,
  MapProps,
  CarouselProps,
  TimelineProps,
  HtmlBlockProps,
  QrCodeProps,
  BaseWidgetProps,
} from './types';

// ============================================================================
// Theme Constants
// ============================================================================
const THEME_COLOR = '#00A76F';

// ============================================================================
// Responsive Breakpoint Context
// ============================================================================
export const BuilderBreakpointContext = createContext<Breakpoint>('desktop');
export function useBuilderBreakpoint() { return useContext(BuilderBreakpointContext); }

/** Scale factor for responsive rendering */
function getResponsiveScale(bp: Breakpoint): number {
  if (bp === 'mobile') return 0.85;
  if (bp === 'tablet') return 0.92;
  return 1;
}

/** Clamp font size for mobile */
function responsiveFontSize(bp: Breakpoint, size?: number, mobileMin?: number): string | undefined {
  if (!size) return undefined;
  if (bp === 'mobile') {
    const scaled = Math.round(size * 0.78);
    const clamped = mobileMin ? Math.max(scaled, mobileMin) : scaled;
    return `${clamped}px`;
  }
  if (bp === 'tablet') {
    return `${Math.round(size * 0.9)}px`;
  }
  return `${size}px`;
}

// ============================================================================
// Icon Resolver — Maps string names to Lucide icon components
// ============================================================================
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  Home, Settings, Phone, Mail, MapPin, Clock, Star, Heart, Shield, Zap,
  Wrench, Building2, Users, Award, Check, ArrowRight, ArrowLeft, ArrowUp,
  ArrowDown, ChevronRight, ChevronLeft, ChevronUp, ChevronDown,
  Menu, X, Search, Plus, Minus, Edit, Trash, Copy, Eye, EyeOff,
  Download, Upload, FileText, ImageIcon, Video, Link, ExternalLink,
  Globe, Lock, Unlock, Bell, Calendar, Camera, Mic, Music,
  Palette, Code, Database, Server, Cloud, Wifi, Monitor,
  Smartphone, Tablet, Laptop, Cpu, HardDrive, Printer, Speaker,
  Volume2, Play, Pause, SkipForward, SkipBack, RotateCcw,
  Send, MessageCircle, Share2, Facebook, Twitter, Instagram,
  Linkedin, Youtube, Target, TrendingUp, BarChart3, PieChart,
  Activity, Layers, Grid, List, Layout, Box, Package,
  Truck, Briefcase, GraduationCap, BookOpen, Newspaper,
  Flag, Bookmark, Hash, AtSign, Percent, DollarSign,
  Circle, Square, Triangle, Hexagon, Diamond, Octagon,
  Lightbulb, Rocket, Flame, Leaf, TreePine, Mountain,
  Sun, Moon, CloudRain, Snowflake, Wind, Umbrella,
  User, UserCheck, UserPlus, UsersRound, UserCog, IdCard,
  Megaphone, Handshake, ThumbsUp, Sparkles, Medal, Trophy,
  Gift, ShoppingBag, ShoppingCart, CreditCard, Receipt, Wallet,
  Pin, Map, Navigation, Compass, Route,
};

function IconResolver({
  name,
  size = 24,
  color,
  className,
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = ICON_MAP[name];
  if (!Icon) {
    return <span style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: color || 'currentColor', ...style }} className={className}>?</span>;
  }
  return <Icon size={size} color={color} className={className} style={style} />;
}

// ============================================================================
// Animation & Style Helpers
// ============================================================================
const ANIMATION_KEYFRAMES: Record<string, string> = {
  fadeIn: 'widgetFadeIn 0.6s ease-out both',
  fadeInUp: 'widgetFadeInUp 0.6s ease-out both',
  fadeInDown: 'widgetFadeInDown 0.6s ease-out both',
  fadeInLeft: 'widgetFadeInLeft 0.6s ease-out both',
  fadeInRight: 'widgetFadeInRight 0.6s ease-out both',
  scaleIn: 'widgetScaleIn 0.5s ease-out both',
};

function getAnimationStyle(props: BaseWidgetProps): React.CSSProperties & { animationName?: string } {
  const anim = props.animation;
  if (!anim || anim === 'none') return {} as React.CSSProperties;

  const duration = (props.animationDuration ?? 0.6);
  const delay = (props.animationDelay ?? 0);
  return {
    animation: `${ANIMATION_KEYFRAMES[anim] || ANIMATION_KEYFRAMES.fadeIn}`,
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`,
    animationFillMode: 'both',
  } as React.CSSProperties;
}

function getBaseStyles(props: BaseWidgetProps): React.CSSProperties {
  const styles: React.CSSProperties = {};
  if (props.padding) styles.padding = props.padding;
  if (props.margin) styles.margin = props.margin;
  if (props.background) styles.backgroundColor = props.background;
  if (props.borderRadius) styles.borderRadius = props.borderRadius;
  if (props.boxShadow) styles.boxShadow = props.boxShadow;
  if (props.border) styles.border = props.border;
  if (props.opacity !== undefined && props.opacity !== 1) styles.opacity = props.opacity;
  return styles;
}

/** Inline <style> tag for keyframe definitions (rendered once) */
function AnimationStyles() {
  return (
    <style>{`
      @keyframes widgetFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes widgetFadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes widgetFadeInDown {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes widgetFadeInLeft {
        from { opacity: 0; transform: translateX(-20px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes widgetFadeInRight {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes widgetScaleIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
    `}</style>
  );
}

// ============================================================================
// Widget Wrapper — Applies base styles + animation
// ============================================================================
function WidgetWrapper({
  children,
  className = '',
  style,
  baseProps,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  baseProps: BaseWidgetProps;
}) {
  const mergedStyle: React.CSSProperties = {
    ...getBaseStyles(baseProps),
    ...getAnimationStyle(baseProps),
    ...style,
  };
  return (
    <div className={className} style={mergedStyle}>
      {children}
    </div>
  );
}

// ============================================================================
// 1. Heading Widget
// ============================================================================
function HeadingWidget({ props: p }: { props: HeadingProps }) {
  const bp = useBuilderBreakpoint();
  const Tag = p.tag || 'h2';
  const style: React.CSSProperties = {
    fontSize: responsiveFontSize(bp, p.fontSize, 16),
    fontWeight: p.fontWeight || undefined,
    color: p.color || undefined,
    textAlign: p.textAlign || undefined,
    lineHeight: p.lineHeight ? String(p.lineHeight) : undefined,
    letterSpacing: p.letterSpacing ? `${p.letterSpacing}px` : undefined,
    marginBottom: p.marginBottom ? `${p.marginBottom}px` : undefined,
    wordBreak: bp === 'mobile' ? 'break-word' : undefined,
  };

  return (
    <WidgetWrapper baseProps={p}>
      <Tag style={style}>{p.text}</Tag>
    </WidgetWrapper>
  );
}

// ============================================================================
// 2. Text Widget
// ============================================================================
function TextWidget({ props: p }: { props: TextProps }) {
  const bp = useBuilderBreakpoint();
  const style: React.CSSProperties = {
    fontSize: responsiveFontSize(bp, p.fontSize, 13),
    fontWeight: p.fontWeight || undefined,
    color: p.color || undefined,
    textAlign: p.textAlign || undefined,
    lineHeight: p.lineHeight ? String(p.lineHeight) : undefined,
    maxWidth: bp === 'mobile' ? '100%' : (p.maxWidth ? `${p.maxWidth}px` : undefined),
    wordBreak: bp === 'mobile' ? 'break-word' : undefined,
  };

  return (
    <WidgetWrapper baseProps={p}>
      <p style={style} className="whitespace-pre-wrap">{p.content}</p>
    </WidgetWrapper>
  );
}

// ============================================================================
// 3. Button Widget
// ============================================================================
function ButtonWidget({ props: p }: { props: ButtonProps }) {
  const variantMap: Record<string, 'default' | 'secondary' | 'outline' | 'ghost' | 'link'> = {
    primary: 'default',
    secondary: 'secondary',
    outline: 'outline',
    ghost: 'ghost',
    link: 'link',
  };
  const sizeMap: Record<string, 'sm' | 'default' | 'lg'> = {
    sm: 'sm',
    md: 'default',
    lg: 'lg',
  };

  const variant = variantMap[p.variant] || 'default';
  const size = sizeMap[p.size] || 'default';
  const iconEl = p.icon ? <IconResolver name={p.icon} size={18} /> : null;

  const btn = (
    <Button
      variant={variant}
      size={size}
      className={p.fullWidth ? 'w-full' : ''}
      style={{
        borderRadius: p.borderRadius || undefined,
      }}
      asChild={!!p.url}
    >
      {p.url ? (
        <a href={p.url} target={p.target || '_self'} rel={p.target === '_blank' ? 'noopener noreferrer' : undefined}>
          {p.iconPosition === 'right' ? null : iconEl}
          {p.text}
          {p.iconPosition === 'right' ? iconEl : null}
        </a>
      ) : (
        <>
          {p.iconPosition === 'right' ? null : iconEl}
          {p.text}
          {p.iconPosition === 'right' ? iconEl : null}
        </>
      )}
    </Button>
  );

  return <WidgetWrapper baseProps={p}>{btn}</WidgetWrapper>;
}

// ============================================================================
// 4. Image Widget
// ============================================================================
function ImageWidget({ props: p }: { props: ImageProps }) {
  const bp = useBuilderBreakpoint();
  const imgEl = (
    <img
      src={p.src}
      alt={p.alt || ''}
      style={{
        width: bp === 'mobile' ? '100%' : (p.width ? `${p.width}px` : '100%'),
        height: bp === 'mobile' ? 'auto' : (p.height ? `${p.height}px` : 'auto'),
        objectFit: p.objectFit || 'cover',
        borderRadius: p.borderRadius || undefined,
        boxShadow: p.shadow || undefined,
        display: 'block',
      }}
      className="max-w-full"
    />
  );

  return (
    <WidgetWrapper baseProps={p}>
      <figure className="m-0">
        {p.link ? (
          <a href={p.link} target="_blank" rel="noopener noreferrer">
            {imgEl}
          </a>
        ) : (
          imgEl
        )}
        {p.caption && (
          <figcaption className="mt-2 text-sm text-gray-500 text-center">
            {p.caption}
          </figcaption>
        )}
      </figure>
    </WidgetWrapper>
  );
}

// ============================================================================
// 5. Video Widget
// ============================================================================
function VideoWidget({ props: p }: { props: VideoProps }) {
  let embedUrl = '';
  if (p.type === 'youtube') {
    const match = p.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/);
    const videoId = match ? match[1] : '';
    embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=${p.autoplay ? 1 : 0}&mute=${p.muted ? 1 : 0}&controls=${p.controls !== false ? 1 : 0}`;
  } else if (p.type === 'vimeo') {
    const match = p.url.match(/vimeo\.com\/(\d+)/);
    const videoId = match ? match[1] : '';
    embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=${p.autoplay ? 1 : 0}&muted=${p.muted ? 1 : 0}`;
  }

  const wrapperStyle: React.CSSProperties = {
    aspectRatio: p.aspectRatio || '16/9',
    borderRadius: p.borderRadius || undefined,
    overflow: 'hidden',
  };

  return (
    <WidgetWrapper baseProps={p}>
      <div style={wrapperStyle} className="w-full">
        {p.type === 'mp4' ? (
          <video
            src={p.url}
            autoPlay={p.autoplay}
            muted={p.muted}
            controls={p.controls !== false}
            className="w-full h-full object-cover"
            playsInline
          />
        ) : (
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="autoplay; fullscreen"
            allowFullScreen
            title="Video"
            style={{ border: 0 }}
          />
        )}
      </div>
    </WidgetWrapper>
  );
}

// ============================================================================
// 6. Spacer Widget
// ============================================================================
function SpacerWidget({ props: p }: { props: SpacerProps }) {
  const bp = useBuilderBreakpoint();
  const scaledHeight = bp === 'mobile' ? Math.round(p.height * 0.6) : (bp === 'tablet' ? Math.round(p.height * 0.8) : p.height);
  return (
    <WidgetWrapper baseProps={p}>
      <div style={{ height: `${scaledHeight}px` }} />
    </WidgetWrapper>
  );
}

// ============================================================================
// 7. Divider Widget
// ============================================================================
function DividerWidget({ props: p }: { props: DividerProps }) {
  return (
    <WidgetWrapper baseProps={p}>
      <hr
        style={{
          borderStyle: p.style || 'solid',
          borderColor: p.color || '#e5e7eb',
          borderWidth: p.weight ? `${p.weight}px 0 0 0` : '1px 0 0 0',
          width: p.width ? `${p.width}%` : '100%',
          margin: '0 auto',
        }}
      />
    </WidgetWrapper>
  );
}

// ============================================================================
// 8. Icon Widget
// ============================================================================
function IconWidget({ props: p }: { props: IconProps }) {
  const iconSize = p.size || 24;

  if (p.rounded) {
    const bgSize = iconSize * 2.2;
    return (
      <WidgetWrapper baseProps={p}>
        <div
          style={{
            width: `${bgSize}px`,
            height: `${bgSize}px`,
            borderRadius: '50%',
            backgroundColor: p.bgColor || `${THEME_COLOR}15`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconResolver name={p.name} size={iconSize} color={p.color || THEME_COLOR} />
        </div>
      </WidgetWrapper>
    );
  }

  return (
    <WidgetWrapper baseProps={p}>
      <IconResolver name={p.name} size={iconSize} color={p.color} />
    </WidgetWrapper>
  );
}

// ============================================================================
// 9. Card Widget
// ============================================================================
function CardWidget({ props: p }: { props: CardProps }) {
  const variantClasses: Record<string, string> = {
    default: 'bg-white border border-gray-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
    elevated: 'bg-white shadow-lg',
    outlined: 'bg-white border-2 border-gray-300',
    glass: 'bg-white/60 backdrop-blur-md border border-white/20 shadow-lg',
  };

  const cardClass = `rounded-2xl overflow-hidden ${variantClasses[p.variant] || variantClasses.default} ${p.hoverEffect ? 'transition-all duration-300 hover:shadow-xl hover:-translate-y-1' : ''}`;

  return (
    <WidgetWrapper baseProps={p}>
      <div className={cardClass}>
        {p.image && (
          <div className="w-full overflow-hidden">
            <img src={p.image} alt={p.title} className="w-full h-48 object-cover" />
          </div>
        )}
        <div className={`p-5 ${p.textAlign === 'center' ? 'text-center' : ''}`}>
          {p.icon && (
            <div className="mb-3">
              <IconResolver name={p.icon} size={32} color={THEME_COLOR} />
            </div>
          )}
          {p.link ? (
            <a href={p.link} className="hover:opacity-80 transition-opacity">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{p.title}</h3>
            </a>
          ) : (
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{p.title}</h3>
          )}
          {p.description && (
            <p className="text-sm text-gray-600 leading-relaxed mb-4">{p.description}</p>
          )}
          {p.link && p.linkText && (
            <a
              href={p.link}
              className="inline-flex items-center gap-1 text-sm font-medium text-[#00A76F] hover:underline"
            >
              {p.linkText}
              <ArrowRight size={14} />
            </a>
          )}
        </div>
      </div>
    </WidgetWrapper>
  );
}

// ============================================================================
// 10. Counter Widget (Animated with IntersectionObserver)
// ============================================================================
function CounterWidget({ props: p }: { props: CounterProps }) {
  const bp = useBuilderBreakpoint();
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const duration = (p.duration || 2000);
    const startTime = performance.now();
    const startVal = 0;
    const endVal = p.value;

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (endVal - startVal) * eased);
      setCount(current);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }
    requestAnimationFrame(animate);
  }, [isVisible, p.value, p.duration]);

  return (
    <WidgetWrapper baseProps={p}>
      <div ref={ref} style={{ textAlign: p.textAlign || 'center' }} className="w-full">
        <div
          style={{
            fontSize: responsiveFontSize(bp, p.fontSize || 48, 28),
            fontWeight: 700,
            color: p.color || THEME_COLOR,
            lineHeight: 1.1,
          }}
          className="tabular-nums"
        >
          {p.prefix || ''}{count.toLocaleString()}{p.suffix || ''}
        </div>
        {p.label && (
          <div className="mt-2 text-sm text-gray-500 font-medium">{p.label}</div>
        )}
      </div>
    </WidgetWrapper>
  );
}

// ============================================================================
// 11. FAQ Widget (Radix Accordion)
// ============================================================================
function FaqWidget({ props: p }: { props: FaqProps }) {
  const styleClasses: Record<string, string> = {
    default: '',
    bordered: 'border border-gray-200 rounded-xl overflow-hidden',
    minimal: 'border-0',
  };

  const containerClass = styleClasses[p.style] || '';

  return (
    <WidgetWrapper baseProps={p}>
      <Accordion
        type={p.allowMultiple ? 'multiple' : 'single'}
        collapsible
        className={containerClass}
      >
        {p.items.map((item, index) => (
          <AccordionItem key={index} value={`faq-${index}`}>
            <AccordionTrigger className="text-left text-sm font-medium text-gray-900 hover:no-underline px-4">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="px-4 text-sm text-gray-600 leading-relaxed">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </WidgetWrapper>
  );
}

// ============================================================================
// 12. Gallery Widget (with lightbox)
// ============================================================================
function GalleryWidget({ props: p }: { props: GalleryProps }) {
  const bp = useBuilderBreakpoint();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // Reduce columns on mobile
  const columns = bp === 'mobile' ? Math.min(p.columns || 3, 2) : (bp === 'tablet' ? Math.min(p.columns || 3, 2) : (p.columns || 3));
  const gap = bp === 'mobile' ? 8 : (p.gap || 12);

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: `${gap}px`,
  };

  const handleLightboxOpen = (index: number) => {
    if (p.lightbox) setLightboxIndex(index);
  };

  const handleLightboxClose = () => setLightboxIndex(null);

  return (
    <WidgetWrapper baseProps={p}>
      <div style={gridStyle}>
        {p.images.map((img, index) => (
          <div
            key={index}
            className="relative group cursor-pointer overflow-hidden"
            style={{ borderRadius: p.borderRadius || '8px' }}
            onClick={() => handleLightboxOpen(index)}
          >
            <img
              src={img.src}
              alt={img.alt || ''}
              className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${bp === 'mobile' ? 'h-32' : 'h-48'}`}
            />
            {img.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 text-center truncate">
                {img.caption}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Overlay */}
      {lightboxIndex !== null && p.images[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={handleLightboxClose}
        >
          <button
            onClick={handleLightboxClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            aria-label="Close lightbox"
          >
            <X size={32} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((lightboxIndex - 1 + p.images.length) % p.images.length);
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors p-2"
            aria-label="Previous image"
          >
            <ChevronLeft size={36} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((lightboxIndex + 1) % p.images.length);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors p-2"
            aria-label="Next image"
          >
            <ChevronRight size={36} />
          </button>

          <img
            src={p.images[lightboxIndex].src}
            alt={p.images[lightboxIndex].alt || ''}
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </WidgetWrapper>
  );
}

// ============================================================================
// 13. Testimonial Widget
// ============================================================================
function TestimonialWidget({ props: p }: { props: TestimonialProps }) {
  const stars = p.rating ? Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      size={16}
      className={i < (p.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
    />
  )) : null;

  if (p.variant === 'minimal') {
    return (
      <WidgetWrapper baseProps={p}>
        <div className="text-center max-w-lg mx-auto">
          {stars && <div className="flex justify-center gap-0.5 mb-4">{stars}</div>}
          <p className="text-gray-700 italic leading-relaxed text-lg mb-4">"{p.quote}"</p>
          <div className="font-semibold text-gray-900">{p.author}</div>
          {p.role && <div className="text-sm text-gray-500">{p.role}</div>}
        </div>
      </WidgetWrapper>
    );
  }

  if (p.variant === 'card') {
    return (
      <WidgetWrapper baseProps={p}>
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200/80">
          <QuoteIcon className="mb-3 text-gray-300" />
          {stars && <div className="flex gap-0.5 mb-3">{stars}</div>}
          <p className="text-gray-700 leading-relaxed mb-4">{p.quote}</p>
          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            {p.avatar && (
              <img src={p.avatar} alt={p.author} className="w-10 h-10 rounded-full object-cover" />
            )}
            <div>
              <div className="font-semibold text-gray-900 text-sm">{p.author}</div>
              {p.role && <div className="text-xs text-gray-500">{p.role}</div>}
            </div>
          </div>
        </div>
      </WidgetWrapper>
    );
  }

  // Default variant
  return (
    <WidgetWrapper baseProps={p}>
      <div className="flex gap-4 max-w-xl">
        {p.avatar && (
          <img src={p.avatar} alt={p.author} className="w-12 h-12 rounded-full object-cover shrink-0 mt-1" />
        )}
        <div>
          {stars && <div className="flex gap-0.5 mb-2">{stars}</div>}
          <p className="text-gray-700 leading-relaxed italic mb-2">"{p.quote}"</p>
          <div className="font-semibold text-gray-900 text-sm">{p.author}</div>
          {p.role && <div className="text-xs text-gray-500">{p.role}</div>}
        </div>
      </div>
    </WidgetWrapper>
  );
}

function QuoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
    </svg>
  );
}

// ============================================================================
// 14. Team Card Widget
// ============================================================================
function TeamCardWidget({ props: p }: { props: TeamCardProps }) {
  return (
    <WidgetWrapper baseProps={p}>
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center max-w-xs">
        {p.avatar && (
          <div className="w-full h-48 overflow-hidden">
            <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
          </div>
        )}
        {!p.avatar && (
          <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
            <User size={48} className="text-gray-400" />
          </div>
        )}
        <div className="p-5">
          <h3 className="text-lg font-semibold text-gray-900">{p.name}</h3>
          <p className="text-sm text-[#00A76F] font-medium mt-1">{p.role}</p>
          {p.bio && <p className="text-sm text-gray-500 mt-2 leading-relaxed">{p.bio}</p>}

          <div className="mt-4 space-y-1">
            {p.email && (
              <a href={`mailto:${p.email}`} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700">
                <Mail size={14} /> {p.email}
              </a>
            )}
            {p.phone && (
              <a href={`tel:${p.phone}`} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700">
                <Phone size={14} /> {p.phone}
              </a>
            )}
          </div>

          {p.socials && p.socials.length > 0 && (
            <div className="flex justify-center gap-3 mt-4 pt-4 border-t border-gray-100">
              {p.socials.map((social, index) => (
                <a
                  key={index}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-[#00A76F] transition-colors"
                  aria-label={social.platform}
                >
                  <IconResolver name={social.platform === 'facebook' ? 'Facebook' : social.platform === 'twitter' ? 'Twitter' : social.platform === 'linkedin' ? 'Linkedin' : social.platform === 'instagram' ? 'Instagram' : 'Globe'} size={18} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </WidgetWrapper>
  );
}

// ============================================================================
// 15. Service Card Widget
// ============================================================================
function ServiceCardWidget({ props: p }: { props: ServiceCardProps }) {
  if (p.variant === 'icon-top') {
    return (
      <WidgetWrapper baseProps={p}>
        <div className="bg-white rounded-2xl p-6 text-center border border-gray-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${THEME_COLOR}12` }}
          >
            <IconResolver name={p.icon} size={28} color={THEME_COLOR} />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-2">{p.title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed mb-4">{p.description}</p>
          {p.link && p.linkText && (
            <a href={p.link} className="inline-flex items-center gap-1 text-sm font-medium text-[#00A76F] hover:underline">
              {p.linkText} <ArrowRight size={14} />
            </a>
          )}
        </div>
      </WidgetWrapper>
    );
  }

  if (p.variant === 'horizontal') {
    return (
      <WidgetWrapper baseProps={p}>
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all duration-300">
          <div className="flex flex-col sm:flex-row">
            {p.image && (
              <div className="sm:w-48 h-40 sm:h-auto shrink-0">
                <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-5 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${THEME_COLOR}12` }}
                >
                  <IconResolver name={p.icon} size={20} color={THEME_COLOR} />
                </div>
                <h3 className="text-base font-semibold text-gray-900">{p.title}</h3>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed mb-3">{p.description}</p>
              {p.link && p.linkText && (
                <a href={p.link} className="inline-flex items-center gap-1 text-sm font-medium text-[#00A76F] hover:underline">
                  {p.linkText} <ArrowRight size={14} />
                </a>
              )}
            </div>
          </div>
        </div>
      </WidgetWrapper>
    );
  }

  // Default variant
  return (
    <WidgetWrapper baseProps={p}>
      <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
        <div className="flex items-start gap-4 mb-3">
          {p.image ? (
            <img src={p.image} alt={p.title} className="w-12 h-12 rounded-xl object-cover shrink-0" />
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${THEME_COLOR}12` }}
            >
              <IconResolver name={p.icon} size={24} color={THEME_COLOR} />
            </div>
          )}
          <h3 className="text-base font-semibold text-gray-900">{p.title}</h3>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed mb-4">{p.description}</p>
        {p.link && p.linkText && (
          <a href={p.link} className="inline-flex items-center gap-1 text-sm font-medium text-[#00A76F] hover:underline">
            {p.linkText} <ArrowRight size={14} />
          </a>
        )}
      </div>
    </WidgetWrapper>
  );
}

// ============================================================================
// 16. Contact Form Widget
// ============================================================================
function ContactFormWidget({ props: p }: { props: ContactFormProps }) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const renderField = (field: typeof p.fields[0]) => {
    if (field.type === 'textarea') {
      return (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>
            {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Textarea
            id={field.name}
            placeholder={field.placeholder}
            value={formData[field.name] || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            required={field.required}
            rows={4}
          />
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>
            {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <select
            id={field.name}
            value={formData[field.name] || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            required={field.required}
            className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
          >
            <option value="">{field.placeholder || 'Select...'}</option>
          </select>
        </div>
      );
    }

    return (
      <div key={field.name} className="space-y-2">
        <Label htmlFor={field.name}>
          {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Input
          id={field.name}
          type={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : field.type === 'number' ? 'number' : 'text'}
          placeholder={field.placeholder}
          value={formData[field.name] || ''}
          onChange={(e) => handleChange(field.name, e.target.value)}
          required={field.required}
        />
      </div>
    );
  };

  const formContainerClass = p.variant === 'card'
    ? 'bg-white rounded-2xl p-6 border border-gray-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
    : p.variant === 'floating'
    ? 'bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg'
    : '';

  return (
    <WidgetWrapper baseProps={p}>
      <form onSubmit={handleSubmit} className={formContainerClass}>
        <div className="space-y-4">
          {p.fields.map(renderField)}
        </div>
        <div className="mt-6">
          {submitted ? (
            <div className="flex items-center gap-2 text-[#00A76F] font-medium text-sm">
              <Check size={18} /> Message sent successfully!
            </div>
          ) : (
            <Button type="submit" className="w-full">
              <Send size={16} />
              {p.submitText || 'Send Message'}
            </Button>
          )}
        </div>
      </form>
    </WidgetWrapper>
  );
}

// ============================================================================
// 17. Map Widget (OpenStreetMap)
// ============================================================================
function MapWidget({ props: p }: { props: MapProps }) {
  const bp = useBuilderBreakpoint();
  const lat = p.lat || 4.2105;
  const lng = p.lng || 101.9758;
  const zoom = p.zoom || 15;
  const height = bp === 'mobile' ? 280 : (p.height || 400);

  const bbox = `${lng - 0.01},${lat - 0.008},${lng + 0.01},${lat + 0.008}`;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

  const layerMap: Record<string, string> = {
    standard: 'mapnik',
    satellite: 'mapnik', // OSM doesn't have satellite easily, fallback
    dark: 'cyclemap',
  };

  const finalUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=${layerMap[p.style || 'standard'] || 'mapnik'}&marker=${lat},${lng}`;

  return (
    <WidgetWrapper baseProps={p}>
      <div className="w-full rounded-xl overflow-hidden border border-gray-200">
        <iframe
          src={finalUrl}
          width="100%"
          height={`${height}px`}
          style={{ border: 0 }}
          title={p.address || 'Map'}
          loading="lazy"
        />
      </div>
      {p.address && (
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
          <MapPin size={14} />
          <span>{p.address}</span>
        </div>
      )}
    </WidgetWrapper>
  );
}

// ============================================================================
// 18. Carousel Widget (Embla)
// ============================================================================
function CarouselWidget({ props: p }: { props: CarouselProps }) {
  const bp = useBuilderBreakpoint();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const handler = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };
    // Schedule initial state read outside synchronous effect body
    const id = requestAnimationFrame(handler);
    emblaApi.on('select', handler);
    emblaApi.on('reInit', handler);
    return () => {
      cancelAnimationFrame(id);
      emblaApi.off('select', handler);
      emblaApi.off('reInit', handler);
    };
  }, [emblaApi]);

  // Autoplay
  useEffect(() => {
    if (!p.autoplay || !emblaApi) return;

    const startAutoplay = () => {
      intervalRef.current = setInterval(() => {
        emblaApi.scrollNext();
      }, p.interval || 5000);
    };

    startAutoplay();

    const handleStop = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

    emblaApi.on('pointerDown', handleStop);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      emblaApi.off('pointerDown', handleStop);
    };
  }, [p.autoplay, p.interval, emblaApi]);

  const carouselHeight = bp === 'mobile' ? Math.round((p.height || 400) * 0.7) : (bp === 'tablet' ? Math.round((p.height || 400) * 0.85) : (p.height || 400));

  if (!p.items || p.items.length === 0) return null;

  return (
    <WidgetWrapper baseProps={p}>
      <div className="relative">
        <div ref={emblaRef} className="overflow-hidden rounded-xl">
          <div className="flex">
            {p.items.map((item, index) => (
              <div key={index} className="flex-none w-full">
                <div className="relative" style={{ height: `${carouselHeight}px` }}>
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title || ''}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {!item.image && (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center" role="img" aria-label="No image">
                      <ImageIcon size={48} className="text-gray-300" />
                    </div>
                  )}
                  {(item.title || item.description) && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                      {item.title && (
                        <h3 className="text-white text-xl font-semibold mb-1">{item.title}</h3>
                      )}
                      {item.description && (
                        <p className="text-white/80 text-sm">{item.description}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {p.showArrows !== false && (
          <>
            <button
              onClick={scrollPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors disabled:opacity-50"
              disabled={!canScrollPrev}
              aria-label="Previous slide"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={scrollNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors disabled:opacity-50"
              disabled={!canScrollNext}
              aria-label="Next slide"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {p.showDots !== false && p.items.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {p.items.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  index === selectedIndex
                    ? 'bg-[#00A76F] w-6'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
}

// ============================================================================
// 19. Timeline Widget
// ============================================================================
function TimelineWidget({ props: p }: { props: TimelineProps }) {
  const isHorizontal = p.orientation === 'horizontal';
  const isAlternating = p.variant === 'alternating';

  if (isHorizontal) {
    return (
      <WidgetWrapper baseProps={p}>
        <div className="overflow-x-auto pb-4">
          <div className="flex items-start gap-0 min-w-max px-4">
            {p.items.map((item, index) => (
              <div key={index} className="flex flex-col items-center flex-1 min-w-[200px]">
                {/* Content */}
                <div className={`p-4 rounded-xl border border-gray-200 bg-white shadow-sm w-full max-w-[240px] ${index === 0 ? '' : 'mt-0'}`}>
                  {item.icon && (
                    <div className="mb-2">
                      <IconResolver name={item.icon} size={20} color={THEME_COLOR} />
                    </div>
                  )}
                  <div className="text-xs text-[#00A76F] font-medium mb-1">{item.date}</div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
                </div>
                {/* Dot + Line */}
                <div className="flex flex-col items-center my-2">
                  <div className="w-4 h-4 rounded-full bg-[#00A76F] border-4 border-white shadow-sm" />
                  {index < p.items.length - 1 && (
                    <div className="w-0.5 h-6 bg-gray-200" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </WidgetWrapper>
    );
  }

  // Vertical timeline
  return (
    <WidgetWrapper baseProps={p}>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] md:left-1/2 md:-translate-x-px top-0 bottom-0 w-0.5 bg-gray-200" />

        {p.items.map((item, index) => {
          const isLeft = isAlternating ? index % 2 === 0 : true;
          return (
            <div
              key={index}
              className={`relative flex items-start mb-8 last:mb-0 ${
                isLeft
                  ? 'md:flex-row'
                  : 'md:flex-row-reverse'
              }`}
            >
              {/* Dot */}
              <div className="absolute left-[12px] md:left-1/2 md:-translate-x-1/2 w-[16px] h-[16px] rounded-full bg-[#00A76F] border-4 border-white shadow-sm z-10" />

              {/* Content card */}
              <div
                className={`ml-10 md:ml-0 md:w-[calc(50%-2rem)] ${
                  isLeft ? 'md:pr-8 md:text-right' : 'md:pl-8'
                }`}
              >
                <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
                  {item.icon && (
                    <div className={`mb-2 ${isLeft ? 'md:flex md:justify-end' : ''}`}>
                      <IconResolver name={item.icon} size={18} color={THEME_COLOR} />
                    </div>
                  )}
                  <div className="text-xs text-[#00A76F] font-medium mb-1">{item.date}</div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </WidgetWrapper>
  );
}

// ============================================================================
// 20. HTML Block Widget
// ============================================================================
function HtmlBlockWidget({ props: p }: { props: HtmlBlockProps }) {
  return (
    <WidgetWrapper baseProps={p}>
      <div dangerouslySetInnerHTML={{ __html: p.content }} />
    </WidgetWrapper>
  );
}

// ============================================================================
// 21. QR Code Widget
// ============================================================================
function QrCodeWidget({ props: p }: { props: QrCodeProps }) {
  const bp = useBuilderBreakpoint();
  const qrSize = bp === 'mobile' ? Math.round((p.size || 128) * 0.7) : (p.size || 128);
  return (
    <WidgetWrapper baseProps={p}>
      <div className="inline-flex flex-col items-center gap-3">
        <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
          <QRCodeSVG
            value={p.value || ''}
            size={qrSize}
            fgColor={p.color || '#000000'}
            bgColor={p.bgColor || '#FFFFFF'}
            level="M"
          />
        </div>
        {p.label && (
          <span className="text-xs text-gray-500 font-medium">{p.label}</span>
        )}
      </div>
    </WidgetWrapper>
  );
}

// ============================================================================
// Main renderWidget Function
// ============================================================================
export function renderWidget(widget: WidgetNode, breakpoint: Breakpoint = 'desktop'): React.ReactNode {
  return (
    <BuilderBreakpointContext.Provider value={breakpoint}>
      <WidgetRenderer widget={widget} />
    </BuilderBreakpointContext.Provider>
  );
}

function WidgetRenderer({ widget }: { widget: WidgetNode }): React.ReactNode {
  const { type, props: widgetProps } = widget;

  switch (type) {
    case 'heading':
      return <HeadingWidget key={widget.id} props={widgetProps as HeadingProps} />;
    case 'text':
      return <TextWidget key={widget.id} props={widgetProps as TextProps} />;
    case 'button':
      return <ButtonWidget key={widget.id} props={widgetProps as ButtonProps} />;
    case 'image':
      return <ImageWidget key={widget.id} props={widgetProps as ImageProps} />;
    case 'video':
      return <VideoWidget key={widget.id} props={widgetProps as VideoProps} />;
    case 'spacer':
      return <SpacerWidget key={widget.id} props={widgetProps as SpacerProps} />;
    case 'divider':
      return <DividerWidget key={widget.id} props={widgetProps as DividerProps} />;
    case 'icon':
      return <IconWidget key={widget.id} props={widgetProps as IconProps} />;
    case 'card':
      return <CardWidget key={widget.id} props={widgetProps as CardProps} />;
    case 'counter':
      return <CounterWidget key={widget.id} props={widgetProps as CounterProps} />;
    case 'faq':
      return <FaqWidget key={widget.id} props={widgetProps as FaqProps} />;
    case 'gallery':
      return <GalleryWidget key={widget.id} props={widgetProps as GalleryProps} />;
    case 'testimonial':
      return <TestimonialWidget key={widget.id} props={widgetProps as TestimonialProps} />;
    case 'team-card':
      return <TeamCardWidget key={widget.id} props={widgetProps as TeamCardProps} />;
    case 'service-card':
      return <ServiceCardWidget key={widget.id} props={widgetProps as ServiceCardProps} />;
    case 'contact-form':
      return <ContactFormWidget key={widget.id} props={widgetProps as ContactFormProps} />;
    case 'map':
      return <MapWidget key={widget.id} props={widgetProps as MapProps} />;
    case 'carousel':
      return <CarouselWidget key={widget.id} props={widgetProps as CarouselProps} />;
    case 'timeline':
      return <TimelineWidget key={widget.id} props={widgetProps as TimelineProps} />;
    case 'html-block':
      return <HtmlBlockWidget key={widget.id} props={widgetProps as HtmlBlockProps} />;
    case 'qr-code':
      return <QrCodeWidget key={widget.id} props={widgetProps as QrCodeProps} />;
    default:
      return (
        <div key={widget.id} className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          Unknown widget type: {type as string}
        </div>
      );
  }
}

// Export AnimationStyles to be included once in the page
export { AnimationStyles, IconResolver };