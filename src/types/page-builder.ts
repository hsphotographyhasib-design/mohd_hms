// ============ PAGE BUILDER TYPES ============

export type WidgetType =
  | 'heading'
  | 'text'
  | 'button'
  | 'image'
  | 'video'
  | 'spacer'
  | 'divider'
  | 'icon'
  | 'card'
  | 'counter'
  | 'faq'
  | 'gallery'
  | 'testimonial'
  | 'team'
  | 'service-cards'
  | 'contact-form'
  | 'map'
  | 'carousel'
  | 'timeline'
  | 'charts'
  | 'html-block'
  | 'qr-code';

export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export type PageStatus = 'draft' | 'published' | 'archived';

export type SectionType =
  | 'hero'
  | 'about'
  | 'services'
  | 'projects'
  | 'portfolio'
  | 'achievements'
  | 'clients'
  | 'testimonials'
  | 'equipment-brands'
  | 'statistics'
  | 'contact'
  | 'footer'
  | 'custom';

// ============ STYLE TYPES ============

export interface SpacingValue {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface BorderStyle {
  width?: number;
  style?: 'solid' | 'dashed' | 'dotted' | 'none';
  color?: string;
  radius?: number;
}

export interface ShadowStyle {
  x?: number;
  y?: number;
  blur?: number;
  spread?: number;
  color?: string;
}

export interface BackgroundStyle {
  type?: 'solid' | 'gradient' | 'image';
  color?: string;
  gradient?: string;
  imageUrl?: string;
  overlay?: string;
  position?: string;
  size?: 'cover' | 'contain' | 'auto';
}

export interface AnimationStyle {
  type?: 'fade-in' | 'slide-up' | 'slide-left' | 'slide-right' | 'zoom-in' | 'bounce' | 'none';
  duration?: number;
  delay?: number;
  easing?: string;
}

export interface ResponsiveStyles {
  desktop: WidgetStyles;
  tablet?: Partial<WidgetStyles>;
  mobile?: Partial<WidgetStyles>;
}

export interface WidgetStyles {
  padding?: SpacingValue;
  margin?: SpacingValue;
  border?: BorderStyle;
  shadow?: ShadowStyle;
  background?: BackgroundStyle;
  animation?: AnimationStyle;
  // Typography
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  letterSpacing?: number;
  // Layout
  width?: string;
  maxWidth?: string;
  minHeight?: string;
  display?: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  gap?: number;
  // Custom CSS
  customCss?: string;
}

// ============ WIDGET DATA TYPES ============

export interface BaseWidget {
  id: string;
  type: WidgetType;
  label?: string;
  styles?: ResponsiveStyles;
  hidden?: boolean;
  locked?: boolean;
}

export interface HeadingWidget extends BaseWidget {
  type: 'heading';
  content: {
    text: string;
    level: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    htmlTag?: string;
    linkUrl?: string;
  };
}

export interface TextWidget extends BaseWidget {
  type: 'text';
  content: {
    text: string;
    htmlContent?: string;
  };
}

export interface ButtonWidget extends BaseWidget {
  type: 'button';
  content: {
    text: string;
    url?: string;
    variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
    size: 'sm' | 'md' | 'lg';
    fullWidth: boolean;
    icon?: string;
    iconPosition: 'left' | 'right';
    newTab: boolean;
  };
}

export interface ImageWidget extends BaseWidget {
  type: 'image';
  content: {
    src: string;
    alt: string;
    linkUrl?: string;
    objectFit: 'cover' | 'contain' | 'fill' | 'none';
    borderRadius?: number;
    aspectRatio?: string;
    lazyLoad: boolean;
  };
}

export interface VideoWidget extends BaseWidget {
  type: 'video';
  content: {
    url: string;
    type: 'youtube' | 'vimeo' | 'mp4' | 'embed';
    autoplay: boolean;
    muted: boolean;
    controls: boolean;
    aspectRatio: string;
    coverImage?: string;
  };
}

export interface SpacerWidget extends BaseWidget {
  type: 'spacer';
  content: {
    height: number;
    unit: 'px' | 'rem' | '%';
    hideOnMobile: boolean;
  };
}

export interface DividerWidget extends BaseWidget {
  type: 'divider';
  content: {
    style: 'solid' | 'dashed' | 'dotted' | 'double';
    color: string;
    weight: number;
    width: string;
    align: 'left' | 'center' | 'right';
  };
}

export interface IconWidget extends BaseWidget {
  type: 'icon';
  content: {
    name: string;
    size: number;
    color: string;
    bgColor?: string;
    bgShape?: 'none' | 'circle' | 'square' | 'rounded';
    linkUrl?: string;
    rotation?: number;
  };
}

export interface CardWidget extends BaseWidget {
  type: 'card';
  content: {
    image?: string;
    imagePosition: 'top' | 'left' | 'right' | 'bottom' | 'background';
    title: string;
    description: string;
    buttonText?: string;
    buttonUrl?: string;
    variant: 'default' | 'glass' | 'bordered' | 'shadow' | 'outline';
    hoverEffect: 'none' | 'lift' | 'scale' | 'glow';
    textAlign: 'left' | 'center' | 'right';
  };
}

export interface CounterWidget extends BaseWidget {
  type: 'counter';
  content: {
    items: Array<{
      label: string;
      value: number;
      suffix?: string;
      prefix?: string;
      icon?: string;
    }>;
    layout: 'horizontal' | 'grid' | 'stacked';
    columns: number;
    animated: boolean;
  };
}

export interface FaqWidget extends BaseWidget {
  type: 'faq';
  content: {
    items: Array<{
      question: string;
      answer: string;
    }>;
    allowMultiple: boolean;
    style: 'default' | 'bordered' | 'separated';
  };
}

export interface GalleryWidget extends BaseWidget {
  type: 'gallery';
  content: {
    images: Array<{
      src: string;
      alt: string;
      caption?: string;
    }>;
    columns: number;
    gap: number;
    borderRadius: number;
    lightbox: boolean;
    hoverEffect: 'none' | 'zoom' | 'overlay' | 'blur';
  };
}

export interface TestimonialWidget extends BaseWidget {
  type: 'testimonial';
  content: {
    items: Array<{
      name: string;
      role: string;
      company?: string;
      avatar?: string;
      text: string;
      rating: number;
    }>;
    layout: 'carousel' | 'grid' | 'list';
    showRating: boolean;
    showAvatar: boolean;
  };
}

export interface TeamWidget extends BaseWidget {
  type: 'team';
  content: {
    members: Array<{
      name: string;
      role: string;
      avatar?: string;
      bio?: string;
      email?: string;
      phone?: string;
      linkedin?: string;
    }>;
    columns: number;
    variant: 'card' | 'minimal' | 'overlay';
    hoverEffect: 'none' | 'lift' | 'flip';
  };
}

export interface ServiceCardsWidget extends BaseWidget {
  type: 'service-cards';
  content: {
    services: Array<{
      title: string;
      description: string;
      icon?: string;
      image?: string;
      linkText?: string;
      linkUrl?: string;
    }>;
    columns: number;
    variant: 'default' | 'icon' | 'image' | 'glass';
  };
}

export interface ContactFormWidget extends BaseWidget {
  type: 'contact-form';
  content: {
    formType: 'contact' | 'quote' | 'complaint' | 'service-request' | 'newsletter' | 'job-application' | 'custom';
    fields: Array<{
      name: string;
      label: string;
      type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'file' | 'number' | 'date';
      required: boolean;
      placeholder?: string;
      options?: string[];
    }>;
    submitText: string;
    successMessage: string;
    showLabels: boolean;
  };
}

export interface MapWidget extends BaseWidget {
  type: 'map';
  content: {
    latitude: number;
    longitude: number;
    zoom: number;
    markerTitle?: string;
    height: number;
    style: 'standard' | 'satellite' | 'dark' | 'light';
    address?: string;
  };
}

export interface CarouselWidget extends BaseWidget {
  type: 'carousel';
  content: {
    slides: Array<{
      image: string;
      title?: string;
      subtitle?: string;
      buttonText?: string;
      buttonUrl?: string;
      linkText?: string;
      linkUrlSecondary?: string;
    }>;
    autoplay: boolean;
    interval: number;
    showDots: boolean;
    showArrows: boolean;
    transition: 'slide' | 'fade' | 'zoom';
  };
}

export interface TimelineWidget extends BaseWidget {
  type: 'timeline';
  content: {
    items: Array<{
      title: string;
      description: string;
      date: string;
      icon?: string;
      image?: string;
    }>;
    layout: 'vertical' | 'horizontal' | 'alternating';
    align: 'left' | 'center' | 'right';
  };
}

export interface ChartsWidget extends BaseWidget {
  type: 'charts';
  content: {
    chartType: 'bar' | 'line' | 'pie' | 'doughnut' | 'area' | 'radar';
    title: string;
    data: Array<{ label: string; value: number; color?: string }>;
    showLegend: boolean;
    showGrid: boolean;
    height: number;
    dataSource?: 'static' | 'dynamic';
    dynamicQuery?: string;
  };
}

export interface HtmlBlockWidget extends BaseWidget {
  type: 'html-block';
  content: {
    html: string;
    enableJs: boolean;
  };
}

export interface QrCodeWidget extends BaseWidget {
  type: 'qr-code';
  content: {
    data: string;
    size: number;
    bgColor: string;
    fgColor: string;
    label?: string;
    errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  };
}

export type WidgetNode =
  | HeadingWidget
  | TextWidget
  | ButtonWidget
  | ImageWidget
  | VideoWidget
  | SpacerWidget
  | DividerWidget
  | IconWidget
  | CardWidget
  | CounterWidget
  | FaqWidget
  | GalleryWidget
  | TestimonialWidget
  | TeamWidget
  | ServiceCardsWidget
  | ContactFormWidget
  | MapWidget
  | CarouselWidget
  | TimelineWidget
  | ChartsWidget
  | HtmlBlockWidget
  | QrCodeWidget;

// ============ SECTION & PAGE ============

export interface PageSection {
  id: string;
  type: SectionType;
  label?: string;
  styles?: ResponsiveStyles;
  background?: BackgroundStyle;
  columns: number;
  widgets: WidgetNode[];
  hidden?: boolean;
  locked?: boolean;
}

export interface PageData {
  sections: PageSection[];
  globalStyles?: {
    fontFamily?: string;
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    borderRadius?: number;
  };
}

export interface SeoData {
  title?: string;
  description?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  schema?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
}

export interface PageListItem {
  id: string;
  title: string;
  slug: string;
  status: PageStatus;
  version: number;
  publishedAt?: string;
  updatedAt: string;
  createdAt: string;
}

export interface TemplateItem {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  category: string;
  isSystem: boolean;
  pageData: PageData;
}

export interface RevisionItem {
  id: string;
  version: number;
  label?: string;
  createdBy?: string;
  createdAt: string;
  pageData: PageData;
}

// ============ WIDGET DEFINITIONS ============

export interface WidgetDefinition {
  type: WidgetType;
  label: string;
  icon: string;
  category: 'basic' | 'content' | 'media' | 'interactive' | 'advanced';
  description: string;
  defaultContent: Record<string, unknown>;
}

export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  {
    type: 'heading', label: 'Heading', icon: 'Type', category: 'basic',
    description: 'Add a heading with customizable levels',
    defaultContent: { text: 'Heading Text', level: 'h2', htmlTag: 'h2', linkUrl: '' }
  },
  {
    type: 'text', label: 'Text', icon: 'AlignLeft', category: 'basic',
    description: 'Add a paragraph of text',
    defaultContent: { text: 'Enter your text here. You can write anything you want.', htmlContent: '' }
  },
  {
    type: 'button', label: 'Button', icon: 'MousePointerClick', category: 'basic',
    description: 'Add a clickable button',
    defaultContent: { text: 'Click Me', url: '#', variant: 'primary', size: 'md', fullWidth: false, icon: '', iconPosition: 'left', newTab: false }
  },
  {
    type: 'image', label: 'Image', icon: 'Image', category: 'media',
    description: 'Add an image with optional link',
    defaultContent: { src: '/images/hero.jpg', alt: 'Image', linkUrl: '', objectFit: 'cover', borderRadius: 8, aspectRatio: '16/9', lazyLoad: true }
  },
  {
    type: 'video', label: 'Video', icon: 'Video', category: 'media',
    description: 'Embed a YouTube, Vimeo, or MP4 video',
    defaultContent: { url: '', type: 'youtube', autoplay: false, muted: false, controls: true, aspectRatio: '16/9', coverImage: '' }
  },
  {
    type: 'spacer', label: 'Spacer', icon: 'Minus', category: 'basic',
    description: 'Add vertical space between elements',
    defaultContent: { height: 40, unit: 'px', hideOnMobile: false }
  },
  {
    type: 'divider', label: 'Divider', icon: 'Minus', category: 'basic',
    description: 'Add a horizontal line separator',
    defaultContent: { style: 'solid', color: '#e5e7eb', weight: 1, width: '100%', align: 'center' }
  },
  {
    type: 'icon', label: 'Icon', icon: 'Star', category: 'basic',
    description: 'Add a Lucide icon',
    defaultContent: { name: 'Star', size: 24, color: '#00A76F', bgColor: '', bgShape: 'none', linkUrl: '', rotation: 0 }
  },
  {
    type: 'card', label: 'Card', icon: 'Square', category: 'content',
    description: 'Add a card with image, title, and description',
    defaultContent: { image: '/images/ahu.jpg', imagePosition: 'top', title: 'Card Title', description: 'Card description goes here.', buttonText: 'Learn More', buttonUrl: '#', variant: 'default', hoverEffect: 'lift', textAlign: 'left' }
  },
  {
    type: 'counter', label: 'Counter', icon: 'Hash', category: 'interactive',
    description: 'Add animated counter/stat blocks',
    defaultContent: { items: [{ label: 'Projects', value: 150, suffix: '+', prefix: '', icon: 'Briefcase' }], layout: 'grid', columns: 4, animated: true }
  },
  {
    type: 'faq', label: 'FAQ', icon: 'HelpCircle', category: 'interactive',
    description: 'Add an FAQ accordion',
    defaultContent: { items: [{ question: 'Question?', answer: 'Answer here.' }], allowMultiple: false, style: 'default' }
  },
  {
    type: 'gallery', label: 'Gallery', icon: 'Grid3X3', category: 'media',
    description: 'Add an image gallery grid',
    defaultContent: { images: [], columns: 3, gap: 16, borderRadius: 8, lightbox: true, hoverEffect: 'zoom' }
  },
  {
    type: 'testimonial', label: 'Testimonial', icon: 'Quote', category: 'content',
    description: 'Add customer testimonials',
    defaultContent: { items: [{ name: 'Customer', role: 'Director', company: '', avatar: '', text: 'Great service!', rating: 5 }], layout: 'carousel', showRating: true, showAvatar: true }
  },
  {
    type: 'team', label: 'Team', icon: 'Users', category: 'content',
    description: 'Add team member profiles',
    defaultContent: { members: [{ name: 'Team Member', role: 'Position', avatar: '', bio: '', email: '', phone: '', linkedin: '' }], columns: 3, variant: 'card', hoverEffect: 'none' }
  },
  {
    type: 'service-cards', label: 'Service Cards', icon: 'Wrench', category: 'content',
    description: 'Add service offering cards',
    defaultContent: { services: [{ title: 'Service', description: 'Description here.', icon: 'Settings', image: '', linkText: 'Learn More', linkUrl: '#' }], columns: 3, variant: 'default' }
  },
  {
    type: 'contact-form', label: 'Contact Form', icon: 'Mail', category: 'interactive',
    description: 'Add a contact or inquiry form',
    defaultContent: { formType: 'contact', fields: [{ name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Your name' }, { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'your@email.com' }, { name: 'message', label: 'Message', type: 'textarea', required: true, placeholder: 'Your message...' }], submitText: 'Send Message', successMessage: 'Thank you! We will get back to you soon.', showLabels: true }
  },
  {
    type: 'map', label: 'Map', icon: 'MapPin', category: 'interactive',
    description: 'Embed a Google Maps location',
    defaultContent: { latitude: 4.8903, longitude: 114.9421, zoom: 15, markerTitle: 'MOHD.HMS ENTERPRISE', height: 400, style: 'standard', address: 'Bandar Seri Begawan, Brunei' }
  },
  {
    type: 'carousel', label: 'Carousel', icon: 'GalleryHorizontal', category: 'media',
    description: 'Add an image/content slider',
    defaultContent: { slides: [{ image: '/images/hero.jpg', title: 'Slide Title', subtitle: 'Subtitle', buttonText: 'Learn More', buttonUrl: '#', linkText: '', linkUrlSecondary: '' }], autoplay: true, interval: 5000, showDots: true, showArrows: true, transition: 'slide' }
  },
  {
    type: 'timeline', label: 'Timeline', icon: 'Clock', category: 'content',
    description: 'Add a timeline of events',
    defaultContent: { items: [{ title: 'Event', description: 'Description here.', date: '2024-01-01', icon: 'CheckCircle', image: '' }], layout: 'vertical', align: 'left' }
  },
  {
    type: 'charts', label: 'Charts', icon: 'BarChart3', category: 'advanced',
    description: 'Add data visualization charts',
    defaultContent: { chartType: 'bar', title: 'Chart Title', data: [{ label: 'Jan', value: 100, color: '#00A76F' }, { label: 'Feb', value: 200, color: '#16a34a' }], showLegend: true, showGrid: true, height: 300, dataSource: 'static' }
  },
  {
    type: 'html-block', label: 'HTML Block', icon: 'Code', category: 'advanced',
    description: 'Add custom HTML/JS code',
    defaultContent: { html: '<div>Custom HTML</div>', enableJs: false }
  },
  {
    type: 'qr-code', label: 'QR Code', icon: 'QrCode', category: 'advanced',
    description: 'Generate a QR code',
    defaultContent: { data: 'https://example.com', size: 200, bgColor: '#ffffff', fgColor: '#000000', label: '', errorCorrectionLevel: 'M' }
  },
];