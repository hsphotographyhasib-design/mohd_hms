'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Headphones,
  MessageSquare,
  Phone,
  FileText,
  Shield,
  ChevronRight,
  ExternalLink,
  Send,
  Ticket,
} from 'lucide-react';
import { cn } from '@/core/utils/utils';
import { useAppStore } from '@/app-shell/store';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Separator } from '@/shared/ui/separator';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/shared/ui/accordion';

// ─── FAQ Data ───────────────────────────────────────────────

const FAQS = [
  {
    question: 'How do I submit a new complaint?',
    answer:
      'Go to the "Complaints" section from the main navigation, then tap the "+" or "New Complaint" button. Fill in the required details including a description, priority level, and optionally attach photos. Your complaint will be automatically routed to the appropriate team based on the category and priority.',
  },
  {
    question: 'How can I track my work order status?',
    answer:
      'Navigate to "Work Orders" from the More menu. Each work order shows its current status (Pending, In Progress, Completed). Tap on any work order to view the full timeline, assigned technician details, and estimated completion date.',
  },
  {
    question: 'When will my invoice be processed?',
    answer:
      'Invoices are typically generated after a work order is completed and approved. You can view all invoices in the "Invoices" tab. Pending invoices are usually processed within 3-5 business days. You will receive a notification when the invoice status changes.',
  },
  {
    question: 'How do I scan equipment QR codes?',
    answer:
      'Tap the center QR scanner button on the bottom navigation bar. Point your camera at the QR code on the equipment label. The app will automatically recognize the code and take you to the equipment details page where you can view maintenance history, submit complaints, or check work orders.',
  },
  {
    question: 'Can I change my notification preferences?',
    answer:
      'Yes! Go to "Profile" → "Notification Settings". You can configure which types of notifications you receive (complaints, work orders, invoices, system updates) and choose whether to receive push notifications, email alerts, or both.',
  },
  {
    question: 'How do I reset my password?',
    answer:
      'On the login screen, tap "Forgot Password". Enter your registered email address and you\'ll receive a 6-digit OTP code. Enter the code, then set your new password. The new password must be at least 12 characters with a mix of uppercase, lowercase, numbers, and special characters.',
  },
];

// ─── Support Options ────────────────────────────────────────

interface SupportOption {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  action?: string;
  badge?: string;
  badgeColor?: string;
}

const SUPPORT_OPTIONS: SupportOption[] = [
  {
    id: 'ticket',
    label: 'Create Support Ticket',
    description: 'Submit a detailed request to our team',
    icon: Ticket,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
  },
  {
    id: 'chat',
    label: 'Live Chat',
    description: 'Chat with our support team in real-time',
    icon: MessageSquare,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    badge: 'Online',
    badgeColor: 'bg-emerald-500',
  },
  {
    id: 'phone',
    label: 'Call Support',
    description: '+971 4 XXX XXXX',
    icon: Phone,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-100',
  },
  {
    id: 'terms',
    label: 'Terms & Conditions',
    description: 'Read our terms of service',
    icon: FileText,
    iconColor: 'text-gray-600',
    iconBg: 'bg-gray-100',
  },
  {
    id: 'privacy',
    label: 'Privacy Policy',
    description: 'Learn how we protect your data',
    icon: Shield,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
  },
];

// ─── Main Component ─────────────────────────────────────────

export function MobileHelp() {
  const { setView } = useAppStore();
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const handleOptionTap = (option: SupportOption) => {
    switch (option.id) {
      case 'ticket':
        // Could navigate to a ticket creation view
        setView('dashboard'); // Fallback
        break;
      case 'chat':
        // Could open a chat interface
        setView('dashboard');
        break;
      case 'phone':
        // Could trigger tel: link
        break;
      case 'terms':
      case 'privacy':
        // Could open a webview or modal
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" className="size-9 -ml-1" onClick={() => setView('dashboard')} aria-label="Back">
            <ArrowLeft className="size-5 text-gray-600" />
          </Button>
          <h1 className="text-lg font-bold text-gray-900">Help & Support</h1>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-6">
        {/* ─── Support Hero Card ─── */}
        <div className="mx-4 mt-4">
          <Card className="border-0 overflow-hidden shadow-sm">
            <div
              className="p-5"
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%)',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Headphones className="size-7 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-white">
                    How can we help you?
                  </h2>
                  <p className="mt-0.5 text-sm text-emerald-100/90">
                    We&apos;re here to assist you 24/7
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ─── FAQs Section ─── */}
        <div className="mx-4 mt-6">
          <h3 className="text-sm font-bold text-gray-800 mb-3 px-1">
            Frequently Asked Questions
          </h3>
          <Card className="border-0 shadow-sm overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((faq, idx) => (
                <AccordionItem
                  key={idx}
                  value={`faq-${idx}`}
                  className="border-b border-gray-100 last:border-b-0"
                >
                  <AccordionTrigger className="px-4 py-3.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 text-sm leading-relaxed text-gray-500">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </div>

        {/* ─── Support Options ─── */}
        <div className="mx-4 mt-6">
          <h3 className="text-sm font-bold text-gray-800 mb-3 px-1">
            Support Options
          </h3>
          <Card className="border-0 shadow-sm overflow-hidden">
            {SUPPORT_OPTIONS.map((option, idx) => {
              const Icon = option.icon;
              return (
                <React.Fragment key={option.id}>
                  {idx > 0 && <Separator className="ml-14" />}
                  <button
                    onClick={() => handleOptionTap(option)}
                    className="flex items-center w-full gap-3.5 px-4 py-3.5 text-left transition-colors active:bg-gray-50 hover:bg-gray-50"
                  >
                    <div className={cn('flex size-9 items-center justify-center rounded-xl shrink-0', option.iconBg)}>
                      <Icon className={cn('size-4.5', option.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">
                          {option.label}
                        </span>
                        {option.badge && (
                          <span className={cn(
                            'inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white',
                            option.badgeColor || 'bg-emerald-500',
                          )}>
                            <span className="size-1.5 rounded-full bg-white animate-pulse" />
                            {option.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400 truncate">
                        {option.description}
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-gray-300 shrink-0" />
                  </button>
                </React.Fragment>
              );
            })}
          </Card>
        </div>

        {/* ─── Contact Section ─── */}
        <div className="mx-4 mt-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 text-center">
              <div className="flex justify-center mb-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50">
                  <Send className="size-5 text-emerald-600" />
                </div>
              </div>
              <h4 className="text-sm font-semibold text-gray-800">Still need help?</h4>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                Our support team typically responds within 2 hours during business days.
              </p>
              <Button
                size="sm"
                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1.5"
                onClick={() => {
                  // Could open email client or ticket form
                }}
              >
                <ExternalLink className="size-3.5" />
                Email Support
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ─── Version ─── */}
        <p className="mt-6 text-center text-[11px] text-gray-400">
          Version 1.0.0
        </p>
      </div>
    </div>
  );
}