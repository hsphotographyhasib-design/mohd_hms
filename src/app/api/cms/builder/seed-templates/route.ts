import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { headers } from 'next/headers';
import type { JwtPayload } from 'jsonwebtoken';

async function getAuthUser() {
  const headersList = await headers();
  const auth = headersList.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return verifyToken(auth.slice(7));
  } catch {
    return null;
  }
}

function isAdmin(user: JwtPayload | null): user is JwtPayload {
  if (!user) return false;
  return user.role === 'super_admin' || user.role === 'admin';
}

// ─── Template Schemas ──────────────────────────────────────────────────────────

const CORPORATE_TEMPLATE = [
  {
    id: 'corp-hero',
    type: 'section',
    name: 'Hero Section',
    props: {
      background: '#00A76F',
      padding: '100px 0 80px',
      fullWidth: true,
      overlay: true,
    },
    columns: [
      {
        id: 'corp-hero-col',
        width: 100,
        widgets: [
          {
            id: 'corp-hero-chip',
            type: 'text',
            props: {
              text: 'BUILDING EXCELLENCE SINCE 2010',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              letterSpacing: '2px',
              textAlign: 'center',
              marginBottom: '16px',
            },
          },
          {
            id: 'corp-hero-heading',
            type: 'heading',
            props: {
              text: 'Your Trusted Partner in\nEngineering Solutions',
              level: 'h1',
              color: '#ffffff',
              fontSize: '48px',
              fontWeight: '800',
              textAlign: 'center',
              lineHeight: '1.15',
              marginBottom: '24px',
            },
          },
          {
            id: 'corp-hero-sub',
            type: 'text',
            props: {
              text: 'MOHD.HMS ENTERPRISE delivers world-class HVAC, electrical, and mechanical engineering services across Brunei Darussalam.',
              color: '#ffffffcc',
              fontSize: '18px',
              fontWeight: '400',
              textAlign: 'center',
              maxWidth: '720px',
              margin: '0 auto 40px',
              lineHeight: '1.7',
            },
          },
          {
            id: 'corp-hero-buttons',
            type: 'button',
            props: {
              text: 'Get a Free Quote',
              variant: 'white',
              size: 'lg',
              align: 'center',
              url: '#contact',
              marginRight: '16px',
            },
          },
          {
            id: 'corp-hero-btn2',
            type: 'button',
            props: {
              text: 'Our Services',
              variant: 'outline-white',
              size: 'lg',
              align: 'center',
              url: '#services',
            },
          },
          {
            id: 'corp-hero-spacer',
            type: 'spacer',
            props: { height: '60px' },
          },
          {
            id: 'corp-hero-stats',
            type: 'counter',
            props: {
              items: [
                { value: '150', suffix: '+', label: 'Projects Completed' },
                { value: '50', suffix: '+', label: 'Happy Clients' },
                { value: '15', suffix: '+', label: 'Years Experience' },
                { value: '24', suffix: '/7', label: 'Emergency Support' },
              ],
              color: '#ffffff',
              accentColor: '#00A76F',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'corp-about',
    type: 'section',
    name: 'About Section',
    props: {
      background: '#ffffff',
      padding: '100px 0',
      fullWidth: false,
    },
    columns: [
      {
        id: 'corp-about-col',
        width: 100,
        widgets: [
          {
            id: 'corp-about-chip',
            type: 'text',
            props: {
              text: 'ABOUT US',
              color: '#00A76F',
              fontSize: '13px',
              fontWeight: '700',
              letterSpacing: '3px',
              textAlign: 'center',
              marginBottom: '12px',
            },
          },
          {
            id: 'corp-about-heading',
            type: 'heading',
            props: {
              text: 'Who We Are',
              level: 'h2',
              color: '#111827',
              fontSize: '40px',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '20px',
            },
          },
          {
            id: 'corp-about-text',
            type: 'text',
            props: {
              text: 'MOHD.HMS ENTERPRISE is a premier engineering services company based in Brunei Darussalam. We specialize in HVAC systems, electrical installations, plumbing solutions, fire protection systems, and comprehensive building maintenance.',
              color: '#6B7280',
              fontSize: '17px',
              lineHeight: '1.8',
              textAlign: 'center',
              maxWidth: '800px',
              margin: '0 auto',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'corp-services',
    type: 'section',
    name: 'Services Section',
    props: {
      background: '#F9FAFB',
      padding: '100px 0',
      fullWidth: false,
    },
    columns: [
      {
        id: 'corp-services-col',
        width: 100,
        widgets: [
          {
            id: 'corp-svc-chip',
            type: 'text',
            props: {
              text: 'WHAT WE DO',
              color: '#00A76F',
              fontSize: '13px',
              fontWeight: '700',
              letterSpacing: '3px',
              textAlign: 'center',
              marginBottom: '12px',
            },
          },
          {
            id: 'corp-svc-heading',
            type: 'heading',
            props: {
              text: 'Our Services',
              level: 'h2',
              color: '#111827',
              fontSize: '40px',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '60px',
            },
          },
          {
            id: 'corp-svc-cards',
            type: 'service-card',
            props: {
              layout: 'grid-3',
              cards: [
                {
                  icon: '❄️',
                  title: 'HVAC Systems',
                  description: 'Complete design, installation, and maintenance of heating, ventilation, and air conditioning systems for commercial and industrial facilities.',
                },
                {
                  icon: '⚡',
                  title: 'Electrical Engineering',
                  description: 'Professional electrical wiring, panel installation, power distribution, and energy-efficient lighting solutions.',
                },
                {
                  icon: '🔧',
                  title: 'Plumbing Solutions',
                  description: 'Comprehensive plumbing services including installation, repair, and maintenance of water supply and drainage systems.',
                },
                {
                  icon: '🛡️',
                  title: 'Fire Protection',
                  description: 'Design and installation of fire alarm systems, sprinkler systems, fire extinguishers, and emergency evacuation systems.',
                },
                {
                  icon: '🏗️',
                  title: 'Building Maintenance',
                  description: 'Preventive and corrective maintenance programs to keep your facilities running at peak performance.',
                },
                {
                  icon: '📋',
                  title: 'Project Management',
                  description: 'End-to-end project management from planning and design through construction, commissioning, and handover.',
                },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    id: 'corp-testimonials',
    type: 'section',
    name: 'Testimonials',
    props: {
      background: '#ffffff',
      padding: '100px 0',
      fullWidth: false,
    },
    columns: [
      {
        id: 'corp-test-col',
        width: 100,
        widgets: [
          {
            id: 'corp-test-chip',
            type: 'text',
            props: {
              text: 'TESTIMONIALS',
              color: '#00A76F',
              fontSize: '13px',
              fontWeight: '700',
              letterSpacing: '3px',
              textAlign: 'center',
              marginBottom: '12px',
            },
          },
          {
            id: 'corp-test-heading',
            type: 'heading',
            props: {
              text: 'What Our Clients Say',
              level: 'h2',
              color: '#111827',
              fontSize: '40px',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '60px',
            },
          },
          {
            id: 'corp-test-items',
            type: 'testimonial',
            props: {
              layout: 'grid-3',
              items: [
                {
                  name: 'Ahmad Razali',
                  company: 'Brunei Shell Petroleum',
                  rating: 5,
                  comment: 'Exceptional work on our HVAC upgrade project. The team was professional, on schedule, and the quality exceeded our expectations.',
                },
                {
                  name: 'Hj Mohd Yusof',
                  company: 'The Empire Hotel',
                  rating: 5,
                  comment: 'MOHD.HMS ENTERPRISE has been our trusted maintenance partner for over 5 years. Their 24/7 emergency response is outstanding.',
                },
                {
                  name: 'Datin Seri Laila',
                  company: 'Ministry of Development',
                  rating: 5,
                  comment: 'Their fire protection installation for our government building was completed ahead of schedule with impeccable quality.',
                },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    id: 'corp-contact',
    type: 'section',
    name: 'Contact Section',
    props: {
      background: '#111827',
      padding: '100px 0',
      fullWidth: true,
    },
    columns: [
      {
        id: 'corp-contact-col',
        width: 100,
        widgets: [
          {
            id: 'corp-contact-chip',
            type: 'text',
            props: {
              text: 'GET IN TOUCH',
              color: '#00A76F',
              fontSize: '13px',
              fontWeight: '700',
              letterSpacing: '3px',
              textAlign: 'center',
              marginBottom: '12px',
            },
          },
          {
            id: 'corp-contact-heading',
            type: 'heading',
            props: {
              text: 'Ready to Start Your Project?',
              level: 'h2',
              color: '#ffffff',
              fontSize: '40px',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '20px',
            },
          },
          {
            id: 'corp-contact-sub',
            type: 'text',
            props: {
              text: 'Contact us today for a free consultation and project quotation.',
              color: '#9CA3AF',
              fontSize: '18px',
              textAlign: 'center',
              marginBottom: '60px',
            },
          },
          {
            id: 'corp-contact-form',
            type: 'contact-form',
            props: {
              submitText: 'Send Message',
              submitColor: '#00A76F',
              fields: ['name', 'email', 'phone', 'company', 'message'],
            },
          },
        ],
      },
    ],
  },
  {
    id: 'corp-footer',
    type: 'section',
    name: 'Footer',
    props: {
      background: '#0A0A0A',
      padding: '60px 0 30px',
      fullWidth: true,
    },
    columns: [
      {
        id: 'corp-footer-col',
        width: 100,
        widgets: [
          {
            id: 'corp-footer-brand',
            type: 'text',
            props: {
              text: 'MOHD.HMS ENTERPRISE',
              color: '#ffffff',
              fontSize: '20px',
              fontWeight: '700',
              marginBottom: '12px',
            },
          },
          {
            id: 'corp-footer-copy',
            type: 'text',
            props: {
              text: '© 2024 MOHD.HMS ENTERPRISE. All rights reserved. | Engineering Excellence in Brunei Darussalam.',
              color: '#6B7280',
              fontSize: '14px',
              textAlign: 'center',
            },
          },
        ],
      },
    ],
  },
];

const MODERN_TEMPLATE = [
  {
    id: 'mod-hero',
    type: 'section',
    name: 'Glassmorphism Hero',
    props: {
      background: 'linear-gradient(135deg, #0A0A0A 0%, #1a1a2e 50%, #0A0A0A 100%)',
      padding: '120px 0 100px',
      fullWidth: true,
      overlay: false,
    },
    columns: [
      {
        id: 'mod-hero-col',
        width: 100,
        widgets: [
          {
            id: 'mod-hero-badge',
            type: 'text',
            props: {
              text: '✦ INNOVATIVE ENGINEERING SOLUTIONS',
              color: '#00A76F',
              fontSize: '12px',
              fontWeight: '700',
              letterSpacing: '4px',
              textAlign: 'center',
              marginBottom: '20px',
            },
          },
          {
            id: 'mod-hero-heading',
            type: 'heading',
            props: {
              text: 'Engineering the Future\nof Building Systems',
              level: 'h1',
              color: '#ffffff',
              fontSize: '56px',
              fontWeight: '800',
              textAlign: 'center',
              lineHeight: '1.1',
              marginBottom: '24px',
            },
          },
          {
            id: 'mod-hero-sub',
            type: 'text',
            props: {
              text: 'Where cutting-edge technology meets decades of field expertise. MOHD.HMS ENTERPRISE redefines what\'s possible in building services engineering.',
              color: '#94a3b8',
              fontSize: '18px',
              fontWeight: '300',
              textAlign: 'center',
              maxWidth: '680px',
              margin: '0 auto 48px',
              lineHeight: '1.8',
            },
          },
          {
            id: 'mod-hero-cta',
            type: 'button',
            props: {
              text: 'Explore Our Work',
              variant: 'glass',
              size: 'lg',
              align: 'center',
              url: '#projects',
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderColor: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
            },
          },
          {
            id: 'mod-hero-spacer',
            type: 'spacer',
            props: { height: '80px' },
          },
          {
            id: 'mod-hero-glass-cards',
            type: 'card',
            props: {
              layout: 'grid-3',
              glassStyle: true,
              cards: [
                {
                  title: 'Design & Engineering',
                  description: 'Advanced CAD/BIM modeling and precision engineering design for complex building systems.',
                  icon: '📐',
                },
                {
                  title: 'Smart Integration',
                  description: 'IoT-enabled building management systems with real-time monitoring and analytics.',
                  icon: '🖥️',
                },
                {
                  title: 'Sustainable Solutions',
                  description: 'Energy-efficient systems and green building certifications to reduce your carbon footprint.',
                  icon: '🌿',
                },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    id: 'mod-features',
    type: 'section',
    name: 'Features Grid',
    props: {
      background: '#ffffff',
      padding: '100px 0',
      fullWidth: false,
    },
    columns: [
      {
        id: 'mod-features-col',
        width: 100,
        widgets: [
          {
            id: 'mod-feat-chip',
            type: 'text',
            props: {
              text: 'CAPABILITIES',
              color: '#00A76F',
              fontSize: '13px',
              fontWeight: '700',
              letterSpacing: '3px',
              textAlign: 'center',
              marginBottom: '12px',
            },
          },
          {
            id: 'mod-feat-heading',
            type: 'heading',
            props: {
              text: 'Full-Spectrum Engineering Services',
              level: 'h2',
              color: '#111827',
              fontSize: '42px',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '16px',
            },
          },
          {
            id: 'mod-feat-sub',
            type: 'text',
            props: {
              text: 'From concept to completion, we deliver integrated solutions across every discipline.',
              color: '#6B7280',
              fontSize: '18px',
              textAlign: 'center',
              marginBottom: '64px',
              lineHeight: '1.6',
            },
          },
          {
            id: 'mod-feat-grid',
            type: 'service-card',
            props: {
              layout: 'grid-4',
              cards: [
                { icon: '❄️', title: 'HVAC', description: 'Climate control systems' },
                { icon: '⚡', title: 'Electrical', description: 'Power & lighting' },
                { icon: '🔧', title: 'Plumbing', description: 'Water & gas systems' },
                { icon: '🛡️', title: 'Fire Safety', description: 'Protection systems' },
                { icon: '🏗️', title: 'MEP', description: 'Mechanical & electrical' },
                { icon: '📊', title: 'BIM', description: '3D modeling & design' },
                { icon: '📡', title: 'IoT', description: 'Smart buildings' },
                { icon: '♻️', title: 'Green', description: 'Sustainability' },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    id: 'mod-timeline',
    type: 'section',
    name: 'Process Timeline',
    props: {
      background: '#F9FAFB',
      padding: '100px 0',
      fullWidth: false,
    },
    columns: [
      {
        id: 'mod-timeline-col',
        width: 100,
        widgets: [
          {
            id: 'mod-tl-chip',
            type: 'text',
            props: {
              text: 'OUR PROCESS',
              color: '#00A76F',
              fontSize: '13px',
              fontWeight: '700',
              letterSpacing: '3px',
              textAlign: 'center',
              marginBottom: '12px',
            },
          },
          {
            id: 'mod-tl-heading',
            type: 'heading',
            props: {
              text: 'How We Work',
              level: 'h2',
              color: '#111827',
              fontSize: '42px',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '64px',
            },
          },
          {
            id: 'mod-tl-items',
            type: 'timeline',
            props: {
              items: [
                {
                  title: 'Consultation & Assessment',
                  description: 'We begin with a thorough site assessment and detailed consultation to understand your specific requirements and challenges.',
                  icon: '🔍',
                },
                {
                  title: 'Design & Planning',
                  description: 'Our engineers develop comprehensive designs using the latest CAD/BIM technology, ensuring optimal system performance.',
                  icon: '📐',
                },
                {
                  title: 'Installation & Commissioning',
                  description: 'Professional installation by certified technicians, followed by rigorous testing and commissioning procedures.',
                  icon: '🔧',
                },
                {
                  title: 'Maintenance & Support',
                  description: 'Ongoing preventive maintenance programs and 24/7 emergency support to keep your systems running flawlessly.',
                  icon: '🛡️',
                },
              ],
              accentColor: '#00A76F',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'mod-cta',
    type: 'section',
    name: 'CTA Section',
    props: {
      background: '#00A76F',
      padding: '80px 0',
      fullWidth: true,
    },
    columns: [
      {
        id: 'mod-cta-col',
        width: 100,
        widgets: [
          {
            id: 'mod-cta-heading',
            type: 'heading',
            props: {
              text: 'Let\'s Build Something Extraordinary',
              level: 'h2',
              color: '#ffffff',
              fontSize: '40px',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '20px',
            },
          },
          {
            id: 'mod-cta-sub',
            type: 'text',
            props: {
              text: 'Join the growing list of satisfied clients who trust MOHD.HMS ENTERPRISE for their engineering needs.',
              color: '#ffffffcc',
              fontSize: '18px',
              textAlign: 'center',
              marginBottom: '40px',
            },
          },
          {
            id: 'mod-cta-btn',
            type: 'button',
            props: {
              text: 'Start Your Project',
              variant: 'white',
              size: 'lg',
              align: 'center',
              url: '#contact',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'mod-footer',
    type: 'section',
    name: 'Footer',
    props: {
      background: '#0A0A0A',
      padding: '60px 0 30px',
      fullWidth: true,
    },
    columns: [
      {
        id: 'mod-footer-col',
        width: 100,
        widgets: [
          {
            id: 'mod-footer-brand',
            type: 'text',
            props: {
              text: 'MOHD.HMS ENTERPRISE',
              color: '#ffffff',
              fontSize: '20px',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '12px',
            },
          },
          {
            id: 'mod-footer-copy',
            type: 'text',
            props: {
              text: '© 2024 MOHD.HMS ENTERPRISE. All rights reserved.',
              color: '#6B7280',
              fontSize: '14px',
              textAlign: 'center',
            },
          },
        ],
      },
    ],
  },
];

const MAINTENANCE_TEMPLATE = [
  {
    id: 'maint-hero',
    type: 'section',
    name: 'Hero Section',
    props: {
      background: '#0f172a',
      padding: '100px 0 80px',
      fullWidth: true,
      overlay: false,
    },
    columns: [
      {
        id: 'maint-hero-col',
        width: 100,
        widgets: [
          {
            id: 'maint-hero-badge',
            type: 'text',
            props: {
              text: '🛠️ HVAC & FACILITY MAINTENANCE EXPERTS',
              color: '#00A76F',
              fontSize: '13px',
              fontWeight: '700',
              letterSpacing: '2px',
              textAlign: 'center',
              marginBottom: '16px',
            },
          },
          {
            id: 'maint-hero-heading',
            type: 'heading',
            props: {
              text: 'Keep Your Systems Running\nat Peak Performance',
              level: 'h1',
              color: '#ffffff',
              fontSize: '48px',
              fontWeight: '800',
              textAlign: 'center',
              lineHeight: '1.15',
              marginBottom: '24px',
            },
          },
          {
            id: 'maint-hero-sub',
            type: 'text',
            props: {
              text: 'MOHD.HMS ENTERPRISE provides comprehensive HVAC and facility maintenance services. Preventive maintenance programs, emergency repairs, and system optimization for commercial and industrial buildings.',
              color: '#94a3b8',
              fontSize: '18px',
              fontWeight: '400',
              textAlign: 'center',
              maxWidth: '720px',
              margin: '0 auto 40px',
              lineHeight: '1.7',
            },
          },
          {
            id: 'maint-hero-btn',
            type: 'button',
            props: {
              text: 'Schedule Maintenance',
              variant: 'solid',
              size: 'lg',
              align: 'center',
              url: '#contact',
              backgroundColor: '#00A76F',
              color: '#ffffff',
              marginRight: '16px',
            },
          },
          {
            id: 'maint-hero-btn2',
            type: 'button',
            props: {
              text: 'Emergency: 24/7',
              variant: 'outline',
              size: 'lg',
              align: 'center',
              url: 'tel:+6730000000',
              borderColor: '#00A76F',
              color: '#00A76F',
            },
          },
          {
            id: 'maint-hero-spacer',
            type: 'spacer',
            props: { height: '60px' },
          },
          {
            id: 'maint-hero-stats',
            type: 'counter',
            props: {
              items: [
                { value: '500', suffix: '+', label: 'Systems Maintained' },
                { value: '99.5', suffix: '%', label: 'Uptime Guarantee' },
                { value: '2', suffix: 'hr', label: 'Avg Response Time' },
                { value: '365', suffix: ' days', label: 'Service Coverage' },
              ],
              color: '#ffffff',
              accentColor: '#00A76F',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'maint-services',
    type: 'section',
    name: 'Maintenance Services',
    props: {
      background: '#ffffff',
      padding: '100px 0',
      fullWidth: false,
    },
    columns: [
      {
        id: 'maint-svc-col',
        width: 100,
        widgets: [
          {
            id: 'maint-svc-chip',
            type: 'text',
            props: {
              text: 'OUR MAINTENANCE SERVICES',
              color: '#00A76F',
              fontSize: '13px',
              fontWeight: '700',
              letterSpacing: '3px',
              textAlign: 'center',
              marginBottom: '12px',
            },
          },
          {
            id: 'maint-svc-heading',
            type: 'heading',
            props: {
              text: 'Comprehensive Maintenance Solutions',
              level: 'h2',
              color: '#111827',
              fontSize: '40px',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '20px',
            },
          },
          {
            id: 'maint-svc-sub',
            type: 'text',
            props: {
              text: 'From routine inspections to emergency breakdowns, we keep your building systems in top condition.',
              color: '#6B7280',
              fontSize: '18px',
              textAlign: 'center',
              marginBottom: '64px',
              lineHeight: '1.6',
            },
          },
          {
            id: 'maint-svc-cards',
            type: 'service-card',
            props: {
              layout: 'grid-3',
              cards: [
                {
                  icon: '❄️',
                  title: 'HVAC Maintenance',
                  description: 'Regular filter replacement, coil cleaning, refrigerant checks, compressor inspections, and performance optimization for all HVAC equipment types.',
                },
                {
                  icon: '🔧',
                  title: 'Preventive Maintenance',
                  description: 'Scheduled inspection programs with detailed checklists, performance benchmarks, and predictive analytics to prevent failures before they occur.',
                },
                {
                  icon: '🚨',
                  title: 'Emergency Repairs',
                  description: '24/7 emergency response with 2-hour average response time. Our technicians are on standby to handle critical system failures anytime.',
                },
                {
                  icon: '⚡',
                  title: 'Electrical Systems',
                  description: 'Panel maintenance, wiring inspections, load balancing, generator testing, UPS systems, and electrical safety compliance checks.',
                },
                {
                  icon: '💧',
                  title: 'Plumbing & Piping',
                  description: 'Pipe inspections, leak detection, water treatment, pump maintenance, backflow prevention, and drainage system servicing.',
                },
                {
                  icon: '🛡️',
                  title: 'Fire Safety Systems',
                  description: 'Fire alarm testing, sprinkler system inspections, extinguisher maintenance, suppression system servicing, and compliance reporting.',
                },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    id: 'maint-maintenance-plans',
    type: 'section',
    name: 'Maintenance Plans',
    props: {
      background: '#F9FAFB',
      padding: '100px 0',
      fullWidth: false,
    },
    columns: [
      {
        id: 'maint-plan-col',
        width: 100,
        widgets: [
          {
            id: 'maint-plan-chip',
            type: 'text',
            props: {
              text: 'MAINTENANCE PLANS',
              color: '#00A76F',
              fontSize: '13px',
              fontWeight: '700',
              letterSpacing: '3px',
              textAlign: 'center',
              marginBottom: '12px',
            },
          },
          {
            id: 'maint-plan-heading',
            type: 'heading',
            props: {
              text: 'Choose Your Service Plan',
              level: 'h2',
              color: '#111827',
              fontSize: '40px',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '60px',
            },
          },
          {
            id: 'maint-plan-cards',
            type: 'card',
            props: {
              layout: 'grid-3',
              cards: [
                {
                  title: 'Basic',
                  description: 'Essential maintenance coverage for small facilities',
                  icon: '📦',
                  highlighted: false,
                  features: [
                    'Quarterly HVAC inspections',
                    'Annual electrical safety check',
                    '8-hour emergency response',
                    'Monthly performance reports',
                  ],
                },
                {
                  title: 'Professional',
                  description: 'Comprehensive coverage for medium-sized buildings',
                  icon: '⭐',
                  highlighted: true,
                  features: [
                    'Monthly HVAC maintenance',
                    'Bi-monthly electrical inspection',
                    'Plumbing & fire system checks',
                    '4-hour emergency response',
                    'Dedicated account manager',
                    'Online monitoring dashboard',
                  ],
                },
                {
                  title: 'Enterprise',
                  description: 'Full-service coverage for large facilities',
                  icon: '🏢',
                  highlighted: false,
                  features: [
                    'Weekly preventive maintenance',
                    '24/7 on-site technician',
                    'All systems coverage',
                    '1-hour emergency response',
                    'Priority parts replacement',
                    'Annual system optimization',
                    'Quarterly business review',
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    id: 'maint-faq',
    type: 'section',
    name: 'FAQ Section',
    props: {
      background: '#ffffff',
      padding: '100px 0',
      fullWidth: false,
    },
    columns: [
      {
        id: 'maint-faq-col',
        width: 100,
        widgets: [
          {
            id: 'maint-faq-chip',
            type: 'text',
            props: {
              text: 'FAQ',
              color: '#00A76F',
              fontSize: '13px',
              fontWeight: '700',
              letterSpacing: '3px',
              textAlign: 'center',
              marginBottom: '12px',
            },
          },
          {
            id: 'maint-faq-heading',
            type: 'heading',
            props: {
              text: 'Frequently Asked Questions',
              level: 'h2',
              color: '#111827',
              fontSize: '40px',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '60px',
            },
          },
          {
            id: 'maint-faq-items',
            type: 'faq',
            props: {
              items: [
                {
                  question: 'How often should HVAC systems be serviced?',
                  answer: 'We recommend quarterly maintenance for commercial HVAC systems. High-usage facilities may benefit from monthly inspections. Our maintenance plans are designed to match your specific equipment and usage patterns.',
                },
                {
                  question: 'What is your emergency response time?',
                  answer: 'Our standard emergency response time is 2 hours for Basic plan clients, 4 hours for Professional, and 1 hour for Enterprise plan clients. We maintain a 24/7 dispatch center for all emergencies.',
                },
                {
                  question: 'Do you provide maintenance for all building systems?',
                  answer: 'Yes, we cover HVAC, electrical, plumbing, fire protection, and building automation systems. Our certified technicians are trained across all major brands and system types.',
                },
                {
                  question: 'Can I customize a maintenance plan?',
                  answer: 'Absolutely. We understand that every facility has unique needs. Our team will work with you to create a customized maintenance program that addresses your specific equipment, schedule, and budget requirements.',
                },
                {
                  question: 'What areas do you serve?',
                  answer: 'We provide maintenance services across all districts in Brunei Darussalam. Our fleet of service vehicles and strategically located technicians ensure prompt response times throughout the country.',
                },
              ],
              accentColor: '#00A76F',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'maint-contact',
    type: 'section',
    name: 'Contact Section',
    props: {
      background: '#0f172a',
      padding: '100px 0',
      fullWidth: true,
    },
    columns: [
      {
        id: 'maint-contact-col',
        width: 100,
        widgets: [
          {
            id: 'maint-contact-chip',
            type: 'text',
            props: {
              text: 'SCHEDULE SERVICE',
              color: '#00A76F',
              fontSize: '13px',
              fontWeight: '700',
              letterSpacing: '3px',
              textAlign: 'center',
              marginBottom: '12px',
            },
          },
          {
            id: 'maint-contact-heading',
            type: 'heading',
            props: {
              text: 'Need Maintenance?\nLet\'s Talk.',
              level: 'h2',
              color: '#ffffff',
              fontSize: '40px',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '20px',
            },
          },
          {
            id: 'maint-contact-sub',
            type: 'text',
            props: {
              text: 'Get a free facility assessment and customized maintenance proposal.',
              color: '#94a3b8',
              fontSize: '18px',
              textAlign: 'center',
              marginBottom: '60px',
            },
          },
          {
            id: 'maint-contact-form',
            type: 'contact-form',
            props: {
              submitText: 'Request Service',
              submitColor: '#00A76F',
              fields: ['name', 'email', 'phone', 'company', 'service_type', 'message'],
            },
          },
        ],
      },
    ],
  },
  {
    id: 'maint-footer',
    type: 'section',
    name: 'Footer',
    props: {
      background: '#0A0A0A',
      padding: '60px 0 30px',
      fullWidth: true,
    },
    columns: [
      {
        id: 'maint-footer-col',
        width: 100,
        widgets: [
          {
            id: 'maint-footer-brand',
            type: 'text',
            props: {
              text: 'MOHD.HMS ENTERPRISE',
              color: '#ffffff',
              fontSize: '20px',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '12px',
            },
          },
          {
            id: 'maint-footer-tag',
            type: 'text',
            props: {
              text: 'Your HVAC & Facility Maintenance Partner in Brunei',
              color: '#00A76F',
              fontSize: '14px',
              fontWeight: '500',
              textAlign: 'center',
              marginBottom: '16px',
            },
          },
          {
            id: 'maint-footer-copy',
            type: 'text',
            props: {
              text: '© 2024 MOHD.HMS ENTERPRISE. All rights reserved. | 24/7 Emergency Hotline Available',
              color: '#6B7280',
              fontSize: '14px',
              textAlign: 'center',
            },
          },
        ],
      },
    ],
  },
];

// ─── Seed Logic ────────────────────────────────────────────────────────────────

const SYSTEM_TEMPLATES = [
  {
    name: 'Corporate',
    category: 'corporate',
    schema: CORPORATE_TEMPLATE,
  },
  {
    name: 'Modern',
    category: 'glassmorphism',
    schema: MODERN_TEMPLATE,
  },
  {
    name: 'Maintenance',
    category: 'maintenance',
    schema: MAINTENANCE_TEMPLATE,
  },
];

// POST /api/cms/builder/seed-templates — Seed system templates
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tenantId = user.tenantId as string;
    const created: string[] = [];
    const skipped: string[] = [];

    for (const tpl of SYSTEM_TEMPLATES) {
      // Check if template already exists for this tenant
      const existing = await db.cmsTemplate.findFirst({
        where: {
          tenantId,
          name: tpl.name,
          category: tpl.category,
        },
      });

      if (existing) {
        skipped.push(tpl.name);
        continue;
      }

      await db.cmsTemplate.create({
        data: {
          tenantId,
          name: tpl.name,
          category: tpl.category,
          schema: JSON.stringify(tpl.schema),
          isSystem: true,
        },
      });

      created.push(tpl.name);
    }

    return NextResponse.json({
      message: 'System templates seeded successfully',
      created,
      skipped,
      total: SYSTEM_TEMPLATES.length,
    });
  } catch (error) {
    console.error('CMS Builder Seed Templates POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}