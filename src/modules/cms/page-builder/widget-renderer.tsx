'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import {
  Star,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Mail,
  Phone,
  Linkedin,
  ExternalLink,
  FileText,
  Upload,
  Calendar,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/shared/ui/accordion';

import type {
  WidgetNode,
  HeadingWidget,
  TextWidget,
  ButtonWidget,
  ImageWidget,
  VideoWidget,
  SpacerWidget,
  DividerWidget,
  IconWidget,
  CardWidget,
  CounterWidget,
  FaqWidget,
  GalleryWidget,
  TestimonialWidget,
  TeamWidget,
  ServiceCardsWidget,
  ContactFormWidget,
  MapWidget,
  CarouselWidget,
  TimelineWidget,
  ChartsWidget,
  HtmlBlockWidget,
  QrCodeWidget,
} from '@/modules/cms/page-builder/types';

// ============ PRIMARY COLOR ============
const PRIMARY = '#00A76F';
const PRIMARY_DARK = '#008C5A';

// ============ MAIN RENDERER ============

export function WidgetRenderer({ widget }: { widget: WidgetNode }) {
  if (widget.hidden) return null;

  switch (widget.type) {
    case 'heading': return <HeadingRenderer widget={widget} />;
    case 'text': return <TextRenderer widget={widget} />;
    case 'button': return <ButtonRenderer widget={widget} />;
    case 'image': return <ImageRenderer widget={widget} />;
    case 'video': return <VideoRenderer widget={widget} />;
    case 'spacer': return <SpacerRenderer widget={widget} />;
    case 'divider': return <DividerRenderer widget={widget} />;
    case 'icon': return <IconRenderer widget={widget} />;
    case 'card': return <CardRenderer widget={widget} />;
    case 'counter': return <CounterRenderer widget={widget} />;
    case 'faq': return <FaqRenderer widget={widget} />;
    case 'gallery': return <GalleryRenderer widget={widget} />;
    case 'testimonial': return <TestimonialRenderer widget={widget} />;
    case 'team': return <TeamRenderer widget={widget} />;
    case 'service-cards': return <ServiceCardsRenderer widget={widget} />;
    case 'contact-form': return <ContactFormRenderer widget={widget} />;
    case 'map': return <MapRenderer widget={widget} />;
    case 'carousel': return <CarouselRenderer widget={widget} />;
    case 'timeline': return <TimelineRenderer widget={widget} />;
    case 'charts': return <ChartsRenderer widget={widget} />;
    case 'html-block': return <HtmlBlockRenderer widget={widget} />;
    case 'qr-code': return <QrCodeRenderer widget={widget} />;
    default: return <div className="p-4 text-sm text-red-500">Unknown widget: {(widget as WidgetNode).type}</div>;
  }
}

// ============ HELPERS ============

function getStyleOverrides(widget: WidgetNode): React.CSSProperties {
  const styles = widget.styles?.desktop;
  if (!styles) return {};

  const css: React.CSSProperties = {};

  if (styles.padding) {
    if (styles.padding.top) css.paddingTop = styles.padding.top;
    if (styles.padding.right) css.paddingRight = styles.padding.right;
    if (styles.padding.bottom) css.paddingBottom = styles.padding.bottom;
    if (styles.padding.left) css.paddingLeft = styles.padding.left;
  }

  if (styles.margin) {
    if (styles.margin.top) css.marginTop = styles.margin.top as number;
    if (styles.margin.right) css.marginRight = styles.margin.right as number;
    if (styles.margin.bottom) css.marginBottom = styles.margin.bottom as number;
    if (styles.margin.left) css.marginLeft = styles.margin.left as number;
  }

  if (styles.width) css.width = styles.width;
  if (styles.maxWidth) css.maxWidth = styles.maxWidth;
  if (styles.minHeight) css.minHeight = styles.minHeight;

  if (styles.background?.type === 'solid' && styles.background.color) {
    css.backgroundColor = styles.background.color;
  } else if (styles.background?.type === 'gradient' && styles.background.gradient) {
    css.background = styles.background.gradient;
  }

  if (styles.color) css.color = styles.color;
  if (styles.fontSize) css.fontSize = styles.fontSize;
  if (styles.fontWeight) css.fontWeight = styles.fontWeight;
  if (styles.textAlign) css.textAlign = styles.textAlign;
  if (styles.lineHeight) css.lineHeight = styles.lineHeight;
  if (styles.letterSpacing) css.letterSpacing = styles.letterSpacing;

  if (styles.border) {
    if (styles.border.radius) css.borderRadius = styles.border.radius;
    if (styles.border.width && styles.border.style && styles.border.color) {
      css.border = `${styles.border.width}px ${styles.border.style} ${styles.border.color}`;
    }
  }

  if (styles.shadow) {
    const { x = 0, y = 2, blur = 8, spread = 0, color = 'rgba(0,0,0,0.1)' } = styles.shadow;
    css.boxShadow = `${x}px ${y}px ${blur}px ${spread}px ${color}`;
  }

  return css;
}

function getYouTubeEmbedUrl(url: string): string {
  const regExp = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\\s]{11})/;
  const match = url.match(regExp);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  return url;
}

function getVimeoEmbedUrl(url: string): string {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (match) return `https://player.vimeo.com/video/${match[1]}`;
  return url;
}

// ============ 1. HEADING ============

function HeadingRenderer({ widget }: { widget: HeadingWidget }) {
  const { text, level, linkUrl } = widget.content;
  const styles = getStyleOverrides(widget);
  const Tag = level as keyof React.JSX.IntrinsicElements;
  const sizeClasses: Record<string, string> = {
    h1: 'text-4xl md:text-5xl font-bold',
    h2: 'text-3xl md:text-4xl font-bold',
    h3: 'text-2xl md:text-3xl font-semibold',
    h4: 'text-xl md:text-2xl font-semibold',
    h5: 'text-lg md:text-xl font-medium',
    h6: 'text-base md:text-lg font-medium',
  };

  const heading = (
    <Tag className={sizeClasses[level] || 'text-2xl font-bold'} style={styles}>
      {text}
    </Tag>
  );

  if (linkUrl) {
    return (
      <a href={linkUrl} className="hover:underline" style={{ display: 'inline-block', ...styles }}>
        {heading}
      </a>
    );
  }

  return heading;
}

// ============ 2. TEXT ============

function TextRenderer({ widget }: { widget: TextWidget }) {
  const { text } = widget.content;
  const styles = getStyleOverrides(widget);

  return (
    <div
      className="text-base leading-relaxed text-gray-700"
      style={styles}
    >
      {text.split('\n').map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          {line}
        </span>
      ))}
    </div>
  );
}

// ============ 3. BUTTON ============

function ButtonRenderer({ widget }: { widget: ButtonWidget }) {
  const { text, url, variant, size, fullWidth, icon, iconPosition, newTab } = widget.content;
  const styles = getStyleOverrides(widget);

  const sizeClasses: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3 text-base',
  };

  const variantClasses: Record<string, string> = {
    primary: 'bg-[#00A76F] hover:bg-[#008C5A] text-white',
    secondary: 'bg-gray-900 hover:bg-gray-800 text-white',
    outline: 'border-2 border-gray-300 hover:border-[#00A76F] hover:text-[#00A76F] text-gray-700',
    ghost: 'hover:bg-gray-100 text-gray-700',
    link: 'text-[#00A76F] hover:underline p-0',
  };

  const IconComponent = icon
    ? (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[icon]
    : null;

  const buttonContent = (
    <>
      {icon && IconComponent && iconPosition === 'left' && (
        <IconComponent size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} className="mr-2" />
      )}
      {text}
      {icon && IconComponent && iconPosition === 'right' && (
        <IconComponent size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} className="ml-2" />
      )}
    </>
  );

  const className = [
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-200 cursor-pointer',
    sizeClasses[size] || sizeClasses.md,
    variantClasses[variant] || variantClasses.primary,
    fullWidth ? 'w-full' : '',
  ].join(' ');

  if (url) {
    return (
      <a href={url} target={newTab ? '_blank' : undefined} rel={newTab ? 'noopener noreferrer' : undefined} className={className} style={styles}>
        {buttonContent}
      </a>
    );
  }

  return (
    <button type="button" className={className} style={styles}>
      {buttonContent}
    </button>
  );
}

// ============ 4. IMAGE ============

function ImageRenderer({ widget }: { widget: ImageWidget }) {
  const { src, alt, linkUrl, objectFit, borderRadius, aspectRatio, lazyLoad } = widget.content;
  const styles = getStyleOverrides(widget);

  const imgStyle: React.CSSProperties = {
    objectFit: objectFit || 'cover',
    borderRadius: borderRadius || 0,
    width: '100%',
    height: '100%',
    ...styles,
  };

  const img = (
    <img
      src={src || 'https://placehold.co/600x400/e5e7eb/9ca3af?text=Image'}
      alt={alt || ''}
      loading={lazyLoad ? 'lazy' : 'eager'}
      style={imgStyle}
      className="block"
    />
  );

  const wrapper = (
    <div style={{ aspectRatio: aspectRatio || undefined, overflow: 'hidden' }}>
      {img}
    </div>
  );

  if (linkUrl) {
    return <a href={linkUrl} target="_blank" rel="noopener noreferrer">{wrapper}</a>;
  }

  return wrapper;
}

// ============ 5. VIDEO ============

function VideoRenderer({ widget }: { widget: VideoWidget }) {
  const { url, type, autoplay, muted, controls, aspectRatio } = widget.content;
  const styles = getStyleOverrides(widget);

  if (!url) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 rounded-lg"
        style={{ aspectRatio: aspectRatio || '16/9', ...styles }}
      >
        <p className="text-gray-400 text-sm">No video URL provided</p>
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    aspectRatio: aspectRatio || '16/9',
    ...styles,
  };

  if (type === 'youtube') {
    return (
      <div className="w-full overflow-hidden rounded-lg" style={containerStyle}>
        <iframe
          src={`${getYouTubeEmbedUrl(url)}?autoplay=${autoplay ? 1 : 0}&mute=${muted ? 1 : 0}&controls=${controls ? 1 : 0}`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube Video"
        />
      </div>
    );
  }

  if (type === 'vimeo') {
    return (
      <div className="w-full overflow-hidden rounded-lg" style={containerStyle}>
        <iframe
          src={`${getVimeoEmbedUrl(url)}?autoplay=${autoplay ? 1 : 0}&muted=${muted ? 1 : 0}`}
          className="w-full h-full"
          allow="autoplay; fullscreen"
          allowFullScreen
          title="Vimeo Video"
        />
      </div>
    );
  }

  if (type === 'mp4') {
    return (
      <div className="w-full overflow-hidden rounded-lg" style={containerStyle}>
        <video
          src={url}
          className="w-full h-full"
          autoPlay={autoplay}
          muted={muted}
          controls={controls}
          playsInline
        />
      </div>
    );
  }

  // embed type
  return (
    <div className="w-full overflow-hidden rounded-lg" style={containerStyle}>
      <iframe
        src={url}
        className="w-full h-full"
        allowFullScreen
        title="Embedded Video"
      />
    </div>
  );
}

// ============ 6. SPACER ============

function SpacerRenderer({ widget }: { widget: SpacerWidget }) {
  const { height, unit, hideOnMobile } = widget.content;

  return (
    <div
      className={hideOnMobile ? 'hidden md:block' : ''}
      style={{ height: `${height}${unit}` }}
    />
  );
}

// ============ 7. DIVIDER ============

function DividerRenderer({ widget }: { widget: DividerWidget }) {
  const { style, color, weight, width, align } = widget.content;
  const styles = getStyleOverrides(widget);

  return (
    <div
      className="flex"
      style={{
        justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
        ...styles,
      }}
    >
      <hr
        style={{
          border: 'none',
          borderTop: `${weight}px ${style} ${color}`,
          width,
        }}
      />
    </div>
  );
}

// ============ 8. ICON ============

function IconRenderer({ widget }: { widget: IconWidget }) {
  const { name, size, color, bgColor, bgShape, linkUrl, rotation } = widget.content;
  const styles = getStyleOverrides(widget);

  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>>)[name] || LucideIcons.HelpCircle;

  const iconEl = <IconComponent size={size || 24} className={''} style={{ color: color || PRIMARY, transform: rotation ? `rotate(${rotation}deg)` : undefined }} />;

  const shapeClasses: Record<string, string> = {
    none: '',
    circle: 'rounded-full flex items-center justify-center',
    square: 'rounded-none flex items-center justify-center',
    rounded: 'rounded-lg flex items-center justify-center',
  };

  const bgPadding = Math.round((size || 24) * 0.6);

  const wrapped = bgColor && bgShape !== 'none' ? (
    <div
      className={shapeClasses[bgShape || 'none'] || ''}
      style={{ backgroundColor: bgColor, padding: `${bgPadding}px`, display: 'inline-flex', ...styles }}
    >
      {iconEl}
    </div>
  ) : (
    <span style={{ display: 'inline-flex', ...styles }}>{iconEl}</span>
  );

  if (linkUrl) {
    return <a href={linkUrl} className="inline-flex">{wrapped}</a>;
  }

  return wrapped;
}

// ============ 9. CARD ============

function CardRenderer({ widget }: { widget: CardWidget }) {
  const { image, imagePosition, title, description, buttonText, buttonUrl, variant, hoverEffect, textAlign } = widget.content;
  const styles = getStyleOverrides(widget);

  const variantClasses: Record<string, string> = {
    default: 'bg-white shadow-md',
    glass: 'bg-white/10 backdrop-blur-md border border-white/20',
    bordered: 'bg-white border-2 border-gray-200',
    shadow: 'bg-white shadow-lg',
    outline: 'bg-white border border-gray-300',
  };

  const hoverClasses: Record<string, string> = {
    none: '',
    lift: 'transition-shadow duration-300 hover:shadow-xl',
    scale: 'transition-transform duration-300 hover:scale-[1.02]',
    glow: 'transition-shadow duration-300 hover:shadow-[0_0_20px_rgba(0,167,111,0.3)]',
  };

  const alignClass = textAlign === 'center' ? 'text-center' : textAlign === 'right' ? 'text-right' : 'text-left';

  const isHorizontal = imagePosition === 'left' || imagePosition === 'right';
  const isBackground = imagePosition === 'background';

  return (
    <div
      className={`rounded-xl overflow-hidden ${variantClasses[variant]} ${hoverClasses[hoverEffect]}`}
      style={styles}
    >
      {isBackground && image && (
        <div className="absolute inset-0 -z-10">
          <img src={image} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      <div className={`${isHorizontal ? 'flex flex-col sm:flex-row' : ''} ${isBackground ? 'relative z-10 p-6 text-white' : ''}`}>
        {/* Image - top or background */}
        {image && (imagePosition === 'top' || imagePosition === 'bottom') && (
          <div className="w-full overflow-hidden">
            <img src={image} alt={title} className="w-full h-48 object-cover" />
          </div>
        )}

        {/* Image - left */}
        {image && imagePosition === 'left' && (
          <div className="sm:w-1/3 shrink-0 overflow-hidden">
            <img src={image} alt={title} className="w-full h-full object-cover sm:min-h-full" />
          </div>
        )}

        {/* Content */}
        <div className={`p-5 flex-1 ${alignClass}`}>
          {title && (
            <h3 className={`text-lg font-semibold text-gray-900 ${isBackground ? '!text-white' : ''} mb-2`}>
              {title}
            </h3>
          )}
          {description && (
            <p className={`text-sm text-gray-600 ${isBackground ? '!text-white/80' : ''} mb-4`}>
              {description}
            </p>
          )}
          {buttonText && (
            <a
              href={buttonUrl || '#'}
              className={`inline-flex items-center text-sm font-medium text-[${PRIMARY}] hover:underline ${isBackground ? '!text-white' : ''}`}
            >
              {buttonText} <ExternalLink size={14} className="ml-1" />
            </a>
          )}
        </div>

        {/* Image - right */}
        {image && imagePosition === 'right' && (
          <div className="sm:w-1/3 shrink-0 overflow-hidden">
            <img src={image} alt={title} className="w-full h-full object-cover sm:min-h-full" />
          </div>
        )}
      </div>
    </div>
  );
}

// ============ 10. COUNTER ============

function AnimatedNumber({ target, animated, prefix = '', suffix = '' }: { target: number; animated: boolean; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(animated ? 0 : target);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!animated || hasAnimated.current) return;
    hasAnimated.current = true;

    let start = 0;
    const duration = 1500;
    const stepTime = 16;
    const steps = duration / stepTime;
    const increment = target / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [target, animated]);

  return (
    <span className="text-3xl md:text-4xl font-bold text-gray-900">
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

function CounterRenderer({ widget }: { widget: CounterWidget }) {
  const { items, layout, columns, animated } = widget.content;
  const styles = getStyleOverrides(widget);

  const gridCols: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  };

  if (layout === 'horizontal') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16" style={styles}>
        {items.map((item, i) => (
          <div key={i} className="text-center">
            {item.icon && (
              <div className="mb-2">
                <DynamicIcon name={item.icon} size={28} color={PRIMARY} />
              </div>
            )}
            <AnimatedNumber target={item.value} animated={animated} prefix={item.prefix} suffix={item.suffix} />
            <p className="text-sm text-gray-500 mt-1">{item.label}</p>
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'stacked') {
    return (
      <div className="space-y-6" style={styles}>
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            {item.icon && <DynamicIcon name={item.icon} size={24} color={PRIMARY} />}
            <div>
              <AnimatedNumber target={item.value} animated={animated} prefix={item.prefix} suffix={item.suffix} />
              <p className="text-sm text-gray-500">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // grid layout
  return (
    <div className={`grid ${gridCols[columns] || gridCols[4]} gap-6`} style={styles}>
      {items.map((item, i) => (
        <div key={i} className="text-center p-4 bg-gray-50 rounded-xl">
          {item.icon && (
            <div className="flex justify-center mb-3">
              <div className="w-10 h-10 rounded-full bg-[#00A76F]/10 flex items-center justify-center">
                <DynamicIcon name={item.icon} size={20} color={PRIMARY} />
              </div>
            </div>
          )}
          <AnimatedNumber target={item.value} animated={animated} prefix={item.prefix} suffix={item.suffix} />
          <p className="text-sm text-gray-500 mt-1">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

// ============ 11. FAQ ============

function FaqRenderer({ widget }: { widget: FaqWidget }) {
  const { items, allowMultiple, style: faqStyle } = widget.content;
  const styles = getStyleOverrides(widget);

  if (faqStyle === 'bordered') {
    return (
      <div className="space-y-3" style={styles}>
        <Accordion type={allowMultiple ? 'multiple' : 'single'} collapsible>
          {items.map((item, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="border border-gray-200 rounded-lg px-4"
            >
              <AccordionTrigger className="text-sm font-medium text-gray-900 hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-gray-600">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    );
  }

  if (faqStyle === 'separated') {
    return (
      <div className="space-y-4" style={styles}>
        <Accordion type={allowMultiple ? 'multiple' : 'single'} collapsible>
          {items.map((item, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="bg-gray-50 rounded-lg px-4 border-none"
            >
              <AccordionTrigger className="text-sm font-medium text-gray-900 hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-gray-600">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    );
  }

  // default style
  return (
    <div style={styles}>
      <Accordion type={allowMultiple ? 'multiple' : 'single'} collapsible>
        {items.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-sm font-medium text-gray-900 hover:no-underline">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-gray-600">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

// ============ 12. GALLERY ============

function GalleryRenderer({ widget }: { widget: GalleryWidget }) {
  const { images, columns, gap, borderRadius, hoverEffect } = widget.content;
  const styles = getStyleOverrides(widget);

  const colClasses: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  };

  const hoverClasses: Record<string, string> = {
    none: '',
    zoom: 'group-hover:scale-110',
    overlay: '',
    blur: 'group-hover:blur-sm',
  };

  if (!images.length) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm" style={styles}>
        No images in gallery
      </div>
    );
  }

  return (
    <div
      className={`grid ${colClasses[columns] || colClasses[3]}`}
      style={{ gap: `${gap}px`, ...styles }}
    >
      {images.map((img, i) => (
        <div key={i} className="group relative overflow-hidden cursor-pointer" style={{ borderRadius: `${borderRadius}px` }}>
          <img
            src={img.src}
            alt={img.alt || ''}
            className={`w-full aspect-square object-cover transition-transform duration-300 ${hoverClasses[hoverEffect] || ''}`}
          />
          {hoverEffect === 'overlay' && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
              {img.caption && <span className="text-white text-sm">{img.caption}</span>}
            </div>
          )}
          {img.caption && hoverEffect !== 'overlay' && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="text-white text-xs">{img.caption}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============ 13. TESTIMONIAL ============

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
        />
      ))}
    </div>
  );
}

function TestimonialCarousel({ items, showRating, showAvatar, styles }: { items: TestimonialWidget['content']['items']; showRating: boolean; showAvatar: boolean; styles: React.CSSProperties }) {
  const [current, setCurrent] = useState(0);
  return (
    <div>
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {items.map((item, i) => (
            <div key={i} className="w-full shrink-0 px-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 text-center max-w-2xl mx-auto">
                {showAvatar && item.avatar && (
                  <img src={item.avatar} alt={item.name} className="w-14 h-14 rounded-full mx-auto mb-4 object-cover" />
                )}
                {showAvatar && !item.avatar && (
                  <div className="w-14 h-14 rounded-full bg-[#00A76F]/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-[#00A76F] font-semibold text-lg">{item.name.charAt(0)}</span>
                  </div>
                )}
                <p className="text-gray-700 italic mb-4">&ldquo;{item.text}&rdquo;</p>
                {showRating && <div className="flex justify-center mb-3"><StarRating rating={item.rating} /></div>}
                <p className="font-semibold text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-500">{item.role}{item.company ? ` · ${item.company}` : ''}</p>
              </div>
            </div>
          ))}
        </div>
        {items.length > 1 && (
          <>
            <div className="flex justify-center gap-2 mt-6">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${i === current ? 'bg-[#00A76F]' : 'bg-gray-300'}`}
                />
              ))}
            </div>
            <button
              onClick={() => setCurrent((prev) => (prev - 1 + items.length) % items.length)}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full shadow flex items-center justify-center hover:bg-white"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrent((prev) => (prev + 1) % items.length)}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full shadow flex items-center justify-center hover:bg-white"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TestimonialRenderer({ widget }: { widget: TestimonialWidget }) {
  const { items, layout, showRating, showAvatar } = widget.content;
  const styles = getStyleOverrides(widget);

  if (layout === 'carousel') {
    return (
      <div style={styles}>
        <TestimonialCarousel items={items} showRating={showRating} showAvatar={showAvatar} styles={styles} />
      </div>
    );
  }

  if (layout === 'list') {
    return (
      <div className="space-y-4" style={styles}>
        {items.map((item, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start gap-4">
              {showAvatar && item.avatar && (
                <img src={item.avatar} alt={item.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-gray-700 italic mb-2">&ldquo;{item.text}&rdquo;</p>
                {showRating && <div className="mb-2"><StarRating rating={item.rating} /></div>}
                <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                <p className="text-xs text-gray-500">{item.role}{item.company ? ` · ${item.company}` : ''}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // grid layout
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={styles}>
      {items.map((item, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {showAvatar && item.avatar && (
            <img src={item.avatar} alt={item.name} className="w-12 h-12 rounded-full mb-3 object-cover" />
          )}
          {showAvatar && !item.avatar && (
            <div className="w-12 h-12 rounded-full bg-[#00A76F]/10 flex items-center justify-center mb-3">
              <span className="text-[#00A76F] font-semibold">{item.name.charAt(0)}</span>
            </div>
          )}
          <p className="text-gray-700 text-sm italic mb-3">&ldquo;{item.text}&rdquo;</p>
          {showRating && <div className="mb-2"><StarRating rating={item.rating} /></div>}
          <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
          <p className="text-xs text-gray-500">{item.role}{item.company ? ` · ${item.company}` : ''}</p>
        </div>
      ))}
    </div>
  );
}

// ============ 14. TEAM ============

function TeamRenderer({ widget }: { widget: TeamWidget }) {
  const { members, columns, variant, hoverEffect } = widget.content;
  const styles = getStyleOverrides(widget);

  const colClasses: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  };

  const hoverClasses: Record<string, string> = {
    none: '',
    lift: 'transition-shadow duration-300 hover:shadow-xl',
    flip: '',
  };

  if (variant === 'minimal') {
    return (
      <div className={`grid ${colClasses[columns] || colClasses[3]} gap-8`} style={styles}>
        {members.map((member, i) => (
          <div key={i} className="flex items-center gap-4">
            {member.avatar ? (
              <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#00A76F]/10 flex items-center justify-center shrink-0">
                <span className="text-[#00A76F] font-semibold">{member.name.charAt(0)}</span>
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900 text-sm">{member.name}</p>
              <p className="text-xs text-gray-500">{member.role}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <div className={`grid ${colClasses[columns] || colClasses[3]} gap-4`} style={styles}>
        {members.map((member, i) => (
          <div key={i} className="group relative rounded-xl overflow-hidden aspect-[3/4]">
            <img
              src={member.avatar || 'https://placehold.co/400x533/e5e7eb/9ca3af?text=Photo'}
              alt={member.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <p className="font-semibold">{member.name}</p>
              <p className="text-sm text-white/70">{member.role}</p>
              {member.bio && <p className="text-xs text-white/60 mt-1 line-clamp-2">{member.bio}</p>}
              <div className="flex gap-3 mt-2">
                {member.email && <Mail size={14} className="text-white/60" />}
                {member.linkedin && <Linkedin size={14} className="text-white/60" />}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // card variant
  return (
    <div className={`grid ${colClasses[columns] || colClasses[3]} gap-6`} style={styles}>
      {members.map((member, i) => (
        <div key={i} className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${hoverClasses[hoverEffect] || ''}`}>
          {member.avatar ? (
            <img src={member.avatar} alt={member.name} className="w-full h-48 object-cover" />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-[#00A76F]/10 to-[#00A76F]/5 flex items-center justify-center">
              <span className="text-4xl font-bold text-[#00A76F]/30">{member.name.charAt(0)}</span>
            </div>
          )}
          <div className="p-4">
            <p className="font-semibold text-gray-900">{member.name}</p>
            <p className="text-sm text-[#00A76F]">{member.role}</p>
            {member.bio && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{member.bio}</p>}
            <div className="flex gap-3 mt-3">
              {member.email && (
                <a href={`mailto:${member.email}`} className="text-gray-400 hover:text-[#00A76F] transition-colors">
                  <Mail size={16} />
                </a>
              )}
              {member.phone && (
                <a href={`tel:${member.phone}`} className="text-gray-400 hover:text-[#00A76F] transition-colors">
                  <Phone size={16} />
                </a>
              )}
              {member.linkedin && (
                <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#00A76F] transition-colors">
                  <Linkedin size={16} />
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ 15. SERVICE CARDS ============

function ServiceCardsRenderer({ widget }: { widget: ServiceCardsWidget }) {
  const { services, columns, variant } = widget.content;
  const styles = getStyleOverrides(widget);

  const colClasses: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  };

  if (variant === 'icon') {
    return (
      <div className={`grid ${colClasses[columns] || colClasses[3]} gap-6`} style={styles}>
        {services.map((service, i) => (
          <div key={i} className="text-center p-6 rounded-xl border border-gray-100 hover:border-[#00A76F]/30 transition-colors group">
            {service.icon && (
              <div className="w-14 h-14 rounded-xl bg-[#00A76F]/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-[#00A76F]/20 transition-colors">
                <DynamicIcon name={service.icon} size={28} color={PRIMARY} />
              </div>
            )}
            <h3 className="font-semibold text-gray-900 mb-2">{service.title}</h3>
            <p className="text-sm text-gray-500 mb-3">{service.description}</p>
            {service.linkText && (
              <a href={service.linkUrl || '#'} className="text-sm text-[#00A76F] font-medium hover:underline">
                {service.linkText} →
              </a>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'image') {
    return (
      <div className={`grid ${colClasses[columns] || colClasses[3]} gap-6`} style={styles}>
        {services.map((service, i) => (
          <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 group">
            <div className="h-40 overflow-hidden">
              <img
                src={service.image || 'https://placehold.co/600x320/e5e7eb/9ca3af?text=Service'}
                alt={service.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-1">{service.title}</h3>
              <p className="text-sm text-gray-500 mb-3">{service.description}</p>
              {service.linkText && (
                <a href={service.linkUrl || '#'} className="text-sm text-[#00A76F] font-medium hover:underline">
                  {service.linkText} →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'glass') {
    return (
      <div className={`grid ${colClasses[columns] || colClasses[3]} gap-6`} style={styles}>
        {services.map((service, i) => (
          <div key={i} className="p-6 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-center">
            {service.icon && (
              <div className="w-12 h-12 rounded-full bg-[#00A76F]/20 flex items-center justify-center mx-auto mb-4">
                <DynamicIcon name={service.icon} size={24} color="#00A76F" />
              </div>
            )}
            <h3 className="font-semibold text-gray-900 mb-2">{service.title}</h3>
            <p className="text-sm text-gray-600 mb-3">{service.description}</p>
            {service.linkText && (
              <a href={service.linkUrl || '#'} className="text-sm text-[#00A76F] font-medium hover:underline">
                {service.linkText}
              </a>
            )}
          </div>
        ))}
      </div>
    );
  }

  // default variant
  return (
    <div className={`grid ${colClasses[columns] || colClasses[3]} gap-6`} style={styles}>
      {services.map((service, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            {service.icon && (
              <div className="w-10 h-10 rounded-lg bg-[#00A76F]/10 flex items-center justify-center shrink-0">
                <DynamicIcon name={service.icon} size={20} color={PRIMARY} />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">{service.title}</h3>
              <p className="text-sm text-gray-500 mb-3">{service.description}</p>
              {service.linkText && (
                <a href={service.linkUrl || '#'} className="text-sm text-[#00A76F] font-medium hover:underline">
                  {service.linkText} →
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ 16. CONTACT FORM ============

function ContactFormRenderer({ widget }: { widget: ContactFormWidget }) {
  const { formType, fields, submitText, successMessage, showLabels } = widget.content;
  const styles = getStyleOverrides(widget);

  const formLabels: Record<string, string> = {
    contact: 'Contact Form',
    quote: 'Request a Quote',
    complaint: 'File a Complaint',
    'service-request': 'Service Request',
    newsletter: 'Newsletter Signup',
    'job-application': 'Job Application',
    custom: 'Form',
  };

  return (
    <div className="max-w-lg mx-auto" style={styles}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{formLabels[formType] || 'Form'}</h3>
        <p className="text-sm text-gray-500 mb-5">Fill in the form below and we&apos;ll get back to you.</p>

        <div className="space-y-4">
          {fields.map((field, i) => {
            const isFullWidth = field.type === 'textarea';
            return (
              <div key={i} className={isFullWidth ? '' : fields.length > 4 ? 'grid grid-cols-2 gap-4' : ''}>
                <div className={isFullWidth ? '' : (i % 2 === 0 && fields.length > 4 ? '' : 'col-span-2')}>
                  {showLabels && field.label && (
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                  )}

                  {field.type === 'textarea' && (
                    <div className="w-full min-h-[100px] border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50 flex items-start">
                      <span>{field.placeholder || 'Enter text...'}</span>
                    </div>
                  )}

                  {field.type === 'select' && (
                    <div className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-400 bg-gray-50 flex items-center justify-between">
                      <span>{field.placeholder || 'Select an option'}</span>
                      <ChevronLeft size={14} className="rotate-[-90deg] text-gray-400" />
                    </div>
                  )}

                  {field.type === 'checkbox' && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-gray-300" />
                      {showLabels && <span className="text-sm text-gray-600">{field.label}</span>}
                    </div>
                  )}

                  {field.type === 'file' && (
                    <div className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
                      <Upload size={20} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Click or drag to upload</p>
                    </div>
                  )}

                  {field.type === 'date' && (
                    <div className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-400 bg-gray-50 flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      <span>{field.placeholder || 'Select date'}</span>
                    </div>
                  )}

                  {!['textarea', 'select', 'checkbox', 'file', 'date'].includes(field.type) && (
                    <div className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-400 bg-gray-50">
                      {field.placeholder || `Enter ${field.label?.toLowerCase() || 'value'}...`}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="mt-6 w-full bg-[#00A76F] hover:bg-[#008C5A] text-white font-medium py-2.5 px-5 rounded-lg transition-colors text-sm"
        >
          {submitText || 'Submit'}
        </button>

        {successMessage && (
          <p className="mt-3 text-xs text-center text-gray-400">{successMessage}</p>
        )}
      </div>
    </div>
  );
}

// ============ 17. MAP ============

function MapRenderer({ widget }: { widget: MapWidget }) {
  const { markerTitle, height, style: mapStyle, address } = widget.content;
  const styles = getStyleOverrides(widget);

  const bgColors: Record<string, string> = {
    standard: '#f0f4f0',
    satellite: '#2d3748',
    dark: '#1a202c',
    light: '#f7fafc',
  };

  return (
    <div
      className="rounded-xl overflow-hidden border border-gray-200"
      style={{ height: `${height}px`, ...styles }}
    >
      <div
        className="w-full h-full flex flex-col items-center justify-center gap-3"
        style={{ backgroundColor: bgColors[mapStyle] || bgColors.standard }}
      >
        <div className="w-16 h-16 rounded-full bg-[#00A76F]/20 flex items-center justify-center">
          <MapPin size={32} className="text-[#00A76F]" />
        </div>
        {markerTitle && (
          <p className="font-semibold text-gray-800 text-sm">{markerTitle}</p>
        )}
        {address && (
          <p className="text-gray-500 text-xs max-w-xs text-center">{address}</p>
        )}
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Map preview — coordinates: 4.8903, 114.9421
        </div>
      </div>
    </div>
  );
}

// ============ 18. CAROUSEL ============

function CarouselRenderer({ widget }: { widget: CarouselWidget }) {
  const { slides, showDots, showArrows, transition } = widget.content;
  const styles = getStyleOverrides(widget);
  const [current, setCurrent] = useState(0);

  const goTo = useCallback((index: number) => {
    setCurrent((index + slides.length) % slides.length);
  }, [slides.length]);

  const goNext = useCallback(() => goTo(current + 1), [current, goTo]);
  const goPrev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Auto-play
  useEffect(() => {
    if (!widget.content.autoplay || slides.length <= 1) return;
    const timer = setInterval(goNext, widget.content.interval || 5000);
    return () => clearInterval(timer);
  }, [widget.content.autoplay, widget.content.interval, goNext, slides.length]);

  if (!slides.length) {
    return <div className="p-8 text-center text-gray-400 text-sm" style={styles}>No slides in carousel</div>;
  }

  const transitionClass = transition === 'fade'
    ? 'opacity-100 transition-opacity duration-500'
    : transition === 'zoom'
      ? 'scale-100 transition-transform duration-500'
      : 'transition-transform duration-500';

  return (
    <div className="relative overflow-hidden rounded-xl" style={styles}>
      <div className="relative">
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`absolute inset-0 ${i === current ? 'z-10' : 'z-0 opacity-0'}`}
          >
            <div className="relative w-full aspect-[16/9]">
              <img
                src={slide.image || 'https://placehold.co/1200x675/e5e7eb/9ca3af?text=Slide'}
                alt={slide.title || `Slide ${i + 1}`}
                className="w-full h-full object-cover"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-white">
                {slide.title && (
                  <h3 className="text-2xl md:text-3xl font-bold mb-2">{slide.title}</h3>
                )}
                {slide.subtitle && (
                  <p className="text-white/80 text-sm md:text-base mb-4 max-w-xl">{slide.subtitle}</p>
                )}
                <div className="flex gap-3">
                  {slide.buttonText && (
                    <a
                      href={slide.buttonUrl || '#'}
                      className="bg-[#00A76F] hover:bg-[#008C5A] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      {slide.buttonText}
                    </a>
                  )}
                  {slide.linkText && (
                    <a
                      href={slide.linkUrlSecondary || '#'}
                      className="border border-white/40 hover:border-white text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      {slide.linkText}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {/* Spacer to maintain aspect ratio */}
        <div className="aspect-[16/9]" />
      </div>

      {/* Arrows */}
      {showArrows && slides.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-700" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow flex items-center justify-center transition-colors"
          >
            <ChevronRight size={20} className="text-gray-700" />
          </button>
        </>
      )}

      {/* Dots */}
      {showDots && slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === current ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/70'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ 19. TIMELINE ============

function TimelineRenderer({ widget }: { widget: TimelineWidget }) {
  const { items, layout, align } = widget.content;
  const styles = getStyleOverrides(widget);

  if (layout === 'horizontal') {
    return (
      <div className="relative" style={styles}>
        {/* Horizontal line */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200" />
        <div className="flex gap-0 overflow-x-auto pb-4">
          {items.map((item, i) => (
            <div key={i} className="flex-1 min-w-[200px] relative flex flex-col items-center">
              {/* Dot */}
              <div className="relative z-10 w-12 h-12 rounded-full bg-white border-2 border-[#00A76F] flex items-center justify-center mb-3">
                {item.icon ? (
                  <DynamicIcon name={item.icon} size={20} color={PRIMARY} />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-[#00A76F]" />
                )}
              </div>
              <div className="text-center px-2">
                <p className="text-xs text-[#00A76F] font-medium mb-1">{item.date}</p>
                <p className="font-semibold text-gray-900 text-sm mb-1">{item.title}</p>
                <p className="text-xs text-gray-500">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === 'alternating') {
    return (
      <div className="relative" style={styles}>
        {/* Center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 -translate-x-1/2" />
        <div className="space-y-8">
          {items.map((item, i) => (
            <div key={i} className={`relative flex items-center ${i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
              {/* Content */}
              <div className={`w-1/2 ${i % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                <p className="text-xs text-[#00A76F] font-medium mb-1">{item.date}</p>
                <p className="font-semibold text-gray-900 mb-1">{item.title}</p>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
              {/* Dot */}
              <div className="absolute left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white border-2 border-[#00A76F] flex items-center justify-center z-10">
                {item.icon ? (
                  <DynamicIcon name={item.icon} size={18} color={PRIMARY} />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#00A76F]" />
                )}
              </div>
              {/* Spacer */}
              <div className="w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // vertical layout (default)
  const alignClass = align === 'center' ? 'items-center' : align === 'right' ? 'items-end' : 'items-start';

  return (
    <div className="relative" style={styles}>
      {/* Vertical line */}
      <div className={`absolute top-0 bottom-0 w-0.5 bg-gray-200 ${align === 'right' ? 'right-6' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-6'}`} />
      <div className={`space-y-8 ${alignClass}`}>
        {items.map((item, i) => (
          <div key={i} className={`flex items-start gap-4 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
            {/* Dot */}
            <div className="relative z-10 w-12 h-12 rounded-full bg-white border-2 border-[#00A76F] flex items-center justify-center shrink-0">
              {item.icon ? (
                <DynamicIcon name={item.icon} size={20} color={PRIMARY} />
              ) : (
                <div className="w-3 h-3 rounded-full bg-[#00A76F]" />
              )}
            </div>
            {/* Content */}
            <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 max-w-sm ${align === 'right' ? 'text-right' : ''}`}>
              <p className="text-xs text-[#00A76F] font-medium mb-1">{item.date}</p>
              <p className="font-semibold text-gray-900 mb-1">{item.title}</p>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ 20. CHARTS ============

const CHART_COLORS = ['#00A76F', '#16a34a', '#22c55e', '#4ade80', '#86efac', '#059669', '#047857', '#065f46'];

function ChartsRenderer({ widget }: { widget: ChartsWidget }) {
  const { chartType, title, data, showLegend, showGrid, height } = widget.content;
  const styles = getStyleOverrides(widget);

  const chartData = data.map((d) => ({ name: d.label, value: d.value }));

  if (!data.length) {
    return <div className="p-8 text-center text-gray-400 text-sm" style={styles}>No chart data</div>;
  }

  const chartHeight = height || 300;

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <BarChart data={chartData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            {showLegend && <Legend />}
            <Bar dataKey="value" fill={PRIMARY} radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={chartData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            {showLegend && <Legend />}
            <Line type="monotone" dataKey="value" stroke={PRIMARY} strokeWidth={2} dot={{ fill: PRIMARY, r: 4 }} />
          </LineChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={0}
              outerRadius="80%"
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={data[i]?.color || CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            {showLegend && <Legend />}
          </PieChart>
        );

      case 'doughnut':
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="80%"
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={data[i]?.color || CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            {showLegend && <Legend />}
          </PieChart>
        );

      case 'area':
        return (
          <AreaChart data={chartData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            {showLegend && <Legend />}
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.3} />
                <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke={PRIMARY} strokeWidth={2} fill="url(#colorValue)" />
          </AreaChart>
        );

      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis tick={{ fontSize: 10 }} />
            <Radar name="Value" dataKey="value" stroke={PRIMARY} fill={PRIMARY} fillOpacity={0.3} />
            <Tooltip />
            {showLegend && <Legend />}
          </RadarChart>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles}>
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={chartHeight}>
        {renderChart() as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

// ============ 21. HTML BLOCK ============

function HtmlBlockRenderer({ widget }: { widget: HtmlBlockWidget }) {
  const { html } = widget.content;
  const styles = getStyleOverrides(widget);

  return (
    <div style={styles} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

// ============ 22. QR CODE ============

function QrCodeRenderer({ widget }: { widget: QrCodeWidget }) {
  const { data, size, bgColor, fgColor, label, errorCorrectionLevel } = widget.content;
  const styles = getStyleOverrides(widget);

  return (
    <div className="inline-flex flex-col items-center gap-2" style={styles}>
      <div
        className="p-3 bg-white rounded-xl shadow-sm border border-gray-100"
      >
        <QRCodeSVG
          value={data || 'https://example.com'}
          size={size || 200}
          bgColor={bgColor || '#ffffff'}
          fgColor={fgColor || '#000000'}
          level={errorCorrectionLevel || 'M'}
        />
      </div>
      {label && (
        <p className="text-sm text-gray-600 text-center">{label}</p>
      )}
    </div>
  );
}

// ============ SHARED HELPER ============

function DynamicIcon({ name, size, color }: { name: string; size: number; color: string }) {
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>>)[name] || LucideIcons.HelpCircle;
  return <IconComponent size={size} style={{ color }} />;
}