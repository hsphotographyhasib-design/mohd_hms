// ============================================================================
// Page Builder Types — MOHD.HMS ENTERPRISE
// ============================================================================

// Widget Types
export type WidgetType =
  | 'heading' | 'text' | 'button' | 'image' | 'video' | 'spacer' | 'divider'
  | 'icon' | 'card' | 'counter' | 'faq' | 'gallery' | 'testimonial'
  | 'team-card' | 'service-card' | 'contact-form' | 'map' | 'carousel'
  | 'timeline' | 'html-block' | 'qr-code';

// Base widget props all widgets share
export interface BaseWidgetProps {
  padding?: string;
  margin?: string;
  background?: string;
  borderRadius?: string;
  boxShadow?: string;
  border?: string;
  opacity?: number;
  animation?: 'none' | 'fadeIn' | 'fadeInUp' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight' | 'scaleIn' | 'slideInLeft' | 'slideInRight';
  animationDuration?: number;
  animationDelay?: number;
  // Responsive overrides
  tabletProps?: Partial<BaseWidgetProps>;
  mobileProps?: Partial<BaseWidgetProps>;
}

// Per-widget specific props
export interface HeadingProps extends BaseWidgetProps {
  text: string;
  tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  letterSpacing?: number;
  marginBottom?: number;
}

export interface TextProps extends BaseWidgetProps {
  content: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  maxWidth?: number;
}

export interface ButtonProps extends BaseWidgetProps {
  text: string;
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
  size: 'sm' | 'md' | 'lg';
  url?: string;
  fullWidth?: boolean;
  borderRadius?: string;
  icon?: string;
  iconPosition?: 'left' | 'right';
  target?: '_self' | '_blank';
}

export interface ImageProps extends BaseWidgetProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  borderRadius?: string;
  shadow?: string;
  link?: string;
  caption?: string;
}

export interface VideoProps extends BaseWidgetProps {
  url: string;
  type: 'youtube' | 'vimeo' | 'mp4';
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  aspectRatio?: string;
  borderRadius?: string;
}

export interface SpacerProps extends BaseWidgetProps {
  height: number;
}

export interface DividerProps extends BaseWidgetProps {
  style: 'solid' | 'dashed' | 'dotted' | 'double';
  color?: string;
  weight?: number;
  width?: number;
}

export interface IconProps extends BaseWidgetProps {
  name: string; // lucide icon name
  size?: number;
  color?: string;
  bgColor?: string;
  rounded?: boolean;
}

export interface CardProps extends BaseWidgetProps {
  title: string;
  description?: string;
  image?: string;
  icon?: string;
  link?: string;
  linkText?: string;
  variant: 'default' | 'elevated' | 'outlined' | 'glass';
  textAlign?: 'left' | 'center';
  hoverEffect?: boolean;
}

export interface CounterProps extends BaseWidgetProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  fontSize?: number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqProps extends BaseWidgetProps {
  items: FaqItem[];
  allowMultiple?: boolean;
  style: 'default' | 'bordered' | 'minimal';
}

export interface GalleryProps extends BaseWidgetProps {
  images: { src: string; alt: string; caption?: string }[];
  columns?: number;
  gap?: number;
  borderRadius?: string;
  lightbox?: boolean;
}

export interface TestimonialProps extends BaseWidgetProps {
  quote: string;
  author: string;
  role?: string;
  avatar?: string;
  rating?: number;
  variant: 'default' | 'card' | 'minimal';
}

export interface TeamCardProps extends BaseWidgetProps {
  name: string;
  role: string;
  avatar?: string;
  bio?: string;
  email?: string;
  phone?: string;
  socials?: { platform: string; url: string }[];
}

export interface ServiceCardProps extends BaseWidgetProps {
  title: string;
  description: string;
  icon: string;
  image?: string;
  link?: string;
  linkText?: string;
  variant: 'default' | 'icon-top' | 'horizontal';
}

export interface ContactFormProps extends BaseWidgetProps {
  fields: { name: string; type: string; label: string; required?: boolean; placeholder?: string }[];
  submitText?: string;
  variant: 'default' | 'card' | 'floating';
}

export interface MapProps extends BaseWidgetProps {
  address: string;
  lat?: number;
  lng?: number;
  zoom?: number;
  height?: number;
  style?: 'standard' | 'satellite' | 'dark';
  marker?: boolean;
}

export interface CarouselProps extends BaseWidgetProps {
  items: { image?: string; title?: string; description?: string; link?: string }[];
  autoplay?: boolean;
  interval?: number;
  showDots?: boolean;
  showArrows?: boolean;
  height?: number;
}

export interface TimelineItem {
  date: string;
  title: string;
  description: string;
  icon?: string;
}

export interface TimelineProps extends BaseWidgetProps {
  items: TimelineItem[];
  orientation?: 'vertical' | 'horizontal';
  variant?: 'default' | 'alternating';
}

export interface HtmlBlockProps extends BaseWidgetProps {
  content: string;
}

export interface QrCodeProps extends BaseWidgetProps {
  value: string;
  size?: number;
  color?: string;
  bgColor?: string;
  label?: string;
}

// Union type for all widget props
export type WidgetPropsMap = {
  heading: HeadingProps;
  text: TextProps;
  button: ButtonProps;
  image: ImageProps;
  video: VideoProps;
  spacer: SpacerProps;
  divider: DividerProps;
  icon: IconProps;
  card: CardProps;
  counter: CounterProps;
  faq: FaqProps;
  gallery: GalleryProps;
  testimonial: TestimonialProps;
  'team-card': TeamCardProps;
  'service-card': ServiceCardProps;
  'contact-form': ContactFormProps;
  map: MapProps;
  carousel: CarouselProps;
  timeline: TimelineProps;
  'html-block': HtmlBlockProps;
  'qr-code': QrCodeProps;
};

export type AnyWidgetProps = WidgetPropsMap[WidgetType];

// Page Schema Types
export interface WidgetNode {
  id: string;
  type: WidgetType;
  name: string;
  props: AnyWidgetProps;
}

export interface ColumnNode {
  id: string;
  width: number; // percentage 0-100
  widgets: WidgetNode[];
}

export interface SectionNode {
  id: string;
  type: 'section';
  name: string;
  props: {
    background?: string;
    backgroundImage?: string;
    backgroundOverlay?: string;
    padding?: string;
    margin?: string;
    fullWidth?: boolean;
    maxWidth?: string;
    borderRadius?: string;
    boxShadow?: string;
    border?: string;
    hidden?: boolean;
  };
  columns: ColumnNode[];
}

export interface PageSchema {
  sections: SectionNode[];
}

// Widget definition for the sidebar widget picker
export interface WidgetDefinition {
  type: WidgetType;
  label: string;
  icon: string; // lucide icon name
  category: 'basic' | 'content' | 'media' | 'interactive' | 'advanced';
  defaultProps: AnyWidgetProps;
}

// Breakpoint type for responsive preview
export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

// Page Builder Store Types
export interface SelectionState {
  sectionId: string | null;
  columnId: string | null;
  widgetId: string | null;
}

export type BuilderPanel = 'widgets' | 'layers' | 'style' | 'settings';