'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCustomerAppStore } from '@/customer-portal/store';
import { useAuthStore } from '@/app-shell/store';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Phone,
  Mail,
  ChevronRight,
  Building2,
  CreditCard,
  Lock,
  Bell,
  Globe,
  Info,
  LogOut,
  Pencil,
  FileText,
  Download,
  HelpCircle,
  Ticket,
  MessageCircle,
  Shield,
  CircleDot,
} from 'lucide-react';

// ============================================================
// ANIMATION HELPERS
// ============================================================

const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.07 } },
};

// ============================================================
// 1. PROFILE SCREEN
// ============================================================

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onClick?: () => void;
  badge?: React.ReactNode;
}

function MenuItem({ icon, label, subtitle, onClick, badge }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors rounded-xl text-left"
    >
      <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {badge || (
        <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
      )}
    </button>
  );
}

export function ProfileScreen() {
  const { setScreen } = useCustomerAppStore();
  const { user, secureLogout } = useAuthStore();

  const name = user?.name || 'Ali Khan';
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const phone = user?.phone || '+673 812 3456';
  const email = user?.email || 'ali.khan@example.com';

  const menuItems: MenuItemProps[] = [
    {
      icon: <Building2 className="h-4.5 w-4.5" />,
      label: 'My Buildings',
      subtitle: '2 Locations',
    },
    {
      icon: <CreditCard className="h-4.5 w-4.5" />,
      label: 'Payment Methods',
      subtitle: '2 Saved',
    },
    {
      icon: <Lock className="h-4.5 w-4.5" />,
      label: 'Change Password',
    },
    {
      icon: <Bell className="h-4.5 w-4.5" />,
      label: 'Notification Settings',
    },
    {
      icon: <Globe className="h-4.5 w-4.5" />,
      label: 'Language',
      subtitle: 'English',
    },
    {
      icon: <Info className="h-4.5 w-4.5" />,
      label: 'About Us',
      onClick: () => setScreen('help-support'),
    },
  ];

  return (
    <motion.div className="p-4 space-y-4 pb-6" {...stagger} animate="animate" initial="initial">
      {/* User Info Card */}
      <motion.div {...fadeInUp} className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{name}</h2>
              <div className="flex items-center gap-1.5 mt-1.5 text-sm text-gray-500">
                <Phone className="h-3.5 w-3.5" />
                <span>{phone}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate max-w-[200px]">{email}</span>
              </div>
            </div>
          </div>
          <button
            className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0 mt-1"
            aria-label="Edit profile"
          >
            <Pencil className="h-3.5 w-3.5 text-gray-500" />
          </button>
        </div>
      </motion.div>

      {/* Menu Items */}
      <motion.div {...fadeInUp} className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {menuItems.map((item, i) => (
          <div key={item.label}>
            <MenuItem {...item} />
            {i < menuItems.length - 1 && <div className="mx-4 h-px bg-gray-100" />}
          </div>
        ))}
      </motion.div>

      {/* Logout */}
      <motion.div {...fadeInUp} className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => secureLogout('You have been logged out.')}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-red-500 hover:bg-red-50 transition-colors rounded-2xl"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// 2. DOCUMENTS SCREEN
// ============================================================

const documentTabs = ['All', 'Invoices', 'Work Orders', 'Others'] as const;

const documents = [
  { name: 'INV-2026-0231.pdf', date: '22 Jun 2026', size: '245 KB', type: 'invoice' as const },
  { name: 'WO-2026-0456.pdf', date: '22 Jun 2026', size: '312 KB', type: 'workorder' as const },
  { name: 'INV-2026-0230.pdf', date: '21 Jun 2026', size: '198 KB', type: 'invoice' as const },
  { name: 'Warranty Certificate.pdf', date: '15 May 2026', size: '1.2 MB', type: 'other' as const },
  { name: 'Service Agreement.pdf', date: '01 May 2026', size: '2.4 MB', type: 'other' as const },
  { name: 'WO-2026-0445.pdf', date: '10 Jun 2026', size: '287 KB', type: 'workorder' as const },
];

function getFilteredDocs(tab: string) {
  if (tab === 'All') return documents;
  if (tab === 'Invoices') return documents.filter((d) => d.type === 'invoice');
  if (tab === 'Work Orders') return documents.filter((d) => d.type === 'workorder');
  return documents.filter((d) => d.type === 'other');
}

function DocumentIcon({ type }: { type: string }) {
  if (type === 'invoice') {
    return (
      <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
        <FileText className="h-5 w-5 text-red-500" />
      </div>
    );
  }
  return (
    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
      <FileText className="h-5 w-5 text-blue-500" />
    </div>
  );
}

export function DocumentsScreen() {
  const [activeTab, setActiveTab] = useState<string>('All');
  const filteredDocs = getFilteredDocs(activeTab);

  return (
    <motion.div className="p-4 space-y-4 pb-6" {...stagger} animate="animate" initial="initial">
      {/* Filter Tabs */}
      <motion.div {...fadeInUp} className="flex items-center gap-2">
        {documentTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
              activeTab === tab
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </motion.div>

      {/* Document List */}
      <motion.div {...fadeInUp} className="space-y-2">
        {filteredDocs.map((doc, i) => (
          <motion.div
            key={doc.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-3.5 shadow-sm flex items-center gap-3"
          >
            <DocumentIcon type={doc.type} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400">{doc.date}</span>
                <span className="text-xs text-gray-300">•</span>
                <span className="text-xs text-gray-400">{doc.size}</span>
              </div>
            </div>
            <button
              className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center hover:bg-emerald-100 transition-colors shrink-0"
              aria-label={`Download ${doc.name}`}
            >
              <Download className="h-4 w-4 text-emerald-600" />
            </button>
          </motion.div>
        ))}

        {filteredDocs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <FileText className="h-10 w-10 mb-2" />
            <p className="text-sm">No documents found</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// 3. HELP & SUPPORT SCREEN
// ============================================================

interface SupportOption {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onClick?: () => void;
  badge?: React.ReactNode;
}

export function HelpSupportScreen() {
  const { setScreen } = useCustomerAppStore();

  const supportOptions: SupportOption[] = [
    {
      icon: <HelpCircle className="h-5 w-5" />,
      label: 'FAQs',
    },
    {
      icon: <Ticket className="h-5 w-5" />,
      label: 'Create Support Ticket',
    },
    {
      icon: <MessageCircle className="h-5 w-5" />,
      label: 'Live Chat',
      badge: (
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-semibold text-emerald-600">Online</span>
        </span>
      ),
    },
    {
      icon: <Phone className="h-5 w-5" />,
      label: 'Call Support',
      subtitle: '+673 812 3456',
    },
    {
      icon: <FileText className="h-5 w-5" />,
      label: 'Terms & Conditions',
    },
    {
      icon: <Shield className="h-5 w-5" />,
      label: 'Privacy Policy',
    },
  ];

  return (
    <motion.div className="p-4 space-y-4 pb-6" {...stagger} animate="animate" initial="initial">
      {/* Banner */}
      <motion.div
        {...fadeInUp}
        className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-5"
      >
        <h2 className="text-lg font-bold text-white">How can we help you?</h2>
        <p className="text-sm text-emerald-100 mt-1">We are here to support you.</p>
      </motion.div>

      {/* Options List */}
      <motion.div {...fadeInUp} className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {supportOptions.map((option, i) => (
          <div key={option.label}>
            <button
              onClick={option.onClick}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
                {option.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{option.label}</p>
                {option.subtitle && (
                  <p className="text-xs text-gray-400 mt-0.5">{option.subtitle}</p>
                )}
              </div>
              {option.badge || (
                <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
              )}
            </button>
            {i < supportOptions.length - 1 && <div className="mx-4 h-px bg-gray-100" />}
          </div>
        ))}
      </motion.div>

      {/* Footer */}
      <motion.div {...fadeInUp} className="text-center pt-2">
        <p className="text-xs text-gray-400">App Version 1.0.0</p>
      </motion.div>
    </motion.div>
  );
}