'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCustomerAppStore } from '@/store/customer-app';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Calendar,
  Download,
  ChevronRight,
  Bell,
  User,
  Clock,
  ClipboardList,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
} from 'lucide-react';

// ============================================================
// MOCK DATA
// ============================================================

const INVOICES = [
  { id: 'INV-2026-0231', title: 'AC Repair Service', date: '22 Jun 2026', amount: 850.0, status: 'UNPAID', type: 'invoice' },
  { id: 'INV-2026-0230', title: 'Electrical Maintenance', date: '21 Jun 2026', amount: 1200.0, status: 'PAID', type: 'invoice' },
  { id: 'INV-2026-0229', title: 'Plumbing Services', date: '20 Jun 2026', amount: 450.0, status: 'PAID', type: 'invoice' },
  { id: 'INV-2026-0228', title: 'Elevator Inspection', date: '18 Jun 2026', amount: 2100.0, status: 'UNPAID', type: 'invoice' },
  { id: 'INV-2026-0227', title: 'HVAC Filter Replacement', date: '15 Jun 2026', amount: 320.0, status: 'OVERDUE', type: 'invoice' },
  { id: 'INV-2026-0226', title: 'General Maintenance', date: '12 Jun 2026', amount: 750.0, status: 'PAID', type: 'invoice' },
  { id: 'INV-2026-0225', title: 'Fire Alarm Testing', date: '10 Jun 2026', amount: 500.0, status: 'PAID', type: 'invoice' },
  { id: 'INV-2026-0224', title: 'Generator Service', date: '08 Jun 2026', amount: 1800.0, status: 'PAID', type: 'invoice' },
];

const INVOICE_STATUS: Record<string, { label: string; color: string; iconBg: string }> = {
  PAID: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700', iconBg: 'bg-emerald-100' },
  UNPAID: { label: 'Unpaid', color: 'bg-amber-100 text-amber-700', iconBg: 'bg-amber-100' },
  OVERDUE: { label: 'Overdue', color: 'bg-red-100 text-red-700', iconBg: 'bg-red-100' },
};

const INVOICE_TABS = [
  { label: 'All', filter: 'all', count: 8 },
  { label: 'Paid', filter: 'PAID', count: 5 },
  { label: 'Unpaid', filter: 'UNPAID', count: 2 },
  { label: 'Overdue', filter: 'OVERDUE', count: 1 },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function formatBND(amount: number): string {
  return `BND ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ============================================================
// INVOICES SCREEN (Screen 7)
// ============================================================

export function InvoicesScreen() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = INVOICES.filter((inv) => {
    if (activeFilter !== 'all' && inv.status !== activeFilter) return false;
    if (searchQuery && !inv.title.toLowerCase().includes(searchQuery.toLowerCase()) && !inv.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Search invoices..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
        {INVOICE_TABS.map((tab) => (
          <button
            key={tab.filter}
            onClick={() => setActiveFilter(tab.filter)}
            className={cn(
              'flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors',
              activeFilter === tab.filter
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600'
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Invoice List */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
        {filtered.map((invoice) => {
          const config = INVOICE_STATUS[invoice.status];
          return (
            <motion.div
              key={invoice.id}
              variants={fadeUp}
              className="bg-white rounded-2xl shadow-sm p-4"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0', config.iconBg)}>
                  <FileText className={cn('h-5 w-5', invoice.status === 'OVERDUE' || invoice.status === 'UNPAID' ? 'text-red-600' : 'text-emerald-600')} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-mono text-gray-400">{invoice.id}</p>
                      <h3 className="font-semibold text-sm text-gray-900 mt-0.5">{invoice.title}</h3>
                    </div>
                    <Badge variant="secondary" className={cn('text-[10px] px-2 py-0.5 flex-shrink-0 border-0', config.color)}>
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Calendar className="h-3 w-3" />
                      <span>{invoice.date}</span>
                    </div>
                    <p className="font-bold text-sm text-gray-900">{formatBND(invoice.amount)}</p>
                  </div>
                  {invoice.status === 'UNPAID' && (
                    <button className="mt-2 w-full h-8 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors">
                      Pay Now
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No invoices found</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ============================================================
// NOTIFICATIONS SCREEN (Screen 9)
// ============================================================

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: 'technician' | 'work' | 'invoice' | 'schedule';
}

const NOTIFICATIONS: NotificationItem[] = [
  { id: '1', title: 'Technician Assigned', description: 'Hasan Ali has been assigned to your complaint CMP-2026-0125', time: '30 min ago', read: false, type: 'technician' },
  { id: '2', title: 'Technician On The Way', description: 'Hasan Ali is on the way to your location', time: '15 min ago', read: false, type: 'technician' },
  { id: '3', title: 'Work Completed', description: 'Work on CMP-2026-0123 has been completed successfully', time: '2 hours ago', read: false, type: 'work' },
  { id: '4', title: 'Invoice Generated', description: 'Invoice INV-2026-0231 has been generated for AC Repair', time: '3 hours ago', read: true, type: 'invoice' },
  { id: '5', title: 'Work Order Created', description: 'Work Order WO-2026-0456 created for your complaint', time: '5 hours ago', read: true, type: 'work' },
  { id: '6', title: 'Technician Accepted', description: 'Omar Farooq accepted complaint CMP-2026-0124', time: 'Yesterday', read: true, type: 'technician' },
  { id: '7', title: 'Feedback Requested', description: 'Please rate the service for complaint CMP-2026-0123', time: 'Yesterday', read: true, type: 'work' },
  { id: '8', title: 'Scheduled Maintenance', description: 'PM-2026-0089 scheduled for 25 Jun 2026', time: '2 days ago', read: true, type: 'schedule' },
];

const NOTIF_ICONS: Record<string, { bg: string; color: string; icon: React.ElementType }> = {
  technician: { bg: 'bg-emerald-100', color: 'text-emerald-600', icon: User },
  work: { bg: 'bg-blue-100', color: 'text-blue-600', icon: ClipboardList },
  invoice: { bg: 'bg-amber-100', color: 'text-amber-600', icon: CreditCard },
  schedule: { bg: 'bg-amber-100', color: 'text-amber-600', icon: Clock },
};

export function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(NOTIFICATIONS);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="p-4 space-y-3">
      {/* Mark all read button */}
      <div className="flex justify-end">
        <button
          onClick={markAllRead}
          className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
        >
          Mark all as read
        </button>
      </div>

      {/* Notification List */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2">
        {notifications.map((notif) => {
          const iconConfig = NOTIF_ICONS[notif.type];
          const Icon = iconConfig.icon;
          return (
            <motion.div
              key={notif.id}
              variants={fadeUp}
              className={cn(
                'bg-white rounded-2xl shadow-sm p-4 transition-all',
                !notif.read && 'border-l-4 border-emerald-500 bg-emerald-50/30'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0', iconConfig.bg)}>
                  <Icon className={cn('h-4 w-4', iconConfig.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={cn('text-sm font-semibold', notif.read ? 'text-gray-700' : 'text-gray-900')}>
                      {notif.title}
                    </h3>
                    {!notif.read && (
                      <div className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.description}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{notif.time}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}