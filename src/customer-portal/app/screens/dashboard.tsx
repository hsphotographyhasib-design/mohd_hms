'use client';

import { motion } from 'framer-motion';
import { useCustomerAppStore } from '@/customer-portal/store';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  Star,
  ChevronRight,
  Plus,
  MapPin,
  Receipt,
  Headphones,
} from 'lucide-react';

// ============================================================
// ANIMATION VARIANTS
// ============================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
};

// ============================================================
// DATA
// ============================================================

const stats = [
  { value: '08', label: 'Total Complaints', icon: AlertTriangle, bg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  { value: '03', label: 'In Progress', icon: Clock, bg: 'bg-amber-100', iconColor: 'text-amber-600' },
  { value: '02', label: 'Completed', icon: CheckCircle, bg: 'bg-blue-100', iconColor: 'text-blue-600' },
  { value: '01', label: 'Pending Feedback', icon: Star, bg: 'bg-purple-100', iconColor: 'text-purple-600' },
];

const complaints = [
  {
    id: '1',
    title: 'AC Not Cooling in Office',
    status: 'In Progress',
    statusColor: 'bg-amber-100 text-amber-700',
    location: 'Office Building A, 3rd Floor',
    time: '2 hours ago',
  },
  {
    id: '2',
    title: 'Lights Flickering in Meeting Room',
    status: 'Assigned',
    statusColor: 'bg-blue-100 text-blue-700',
    location: 'Conference Room B',
    time: '5 hours ago',
  },
  {
    id: '3',
    title: 'Water Leak in Restroom',
    status: 'Completed',
    statusColor: 'bg-emerald-100 text-emerald-700',
    location: 'Ground Floor Restroom',
    time: 'Yesterday',
  },
  {
    id: '4',
    title: 'Elevator Making Strange Noise',
    status: 'Open',
    statusColor: 'bg-orange-100 text-orange-700',
    location: 'Main Lobby',
    time: '2 days ago',
  },
];

const quickActions = [
  { icon: Plus, label: 'New Complaint', screen: 'new-complaint' as const },
  { icon: MapPin, label: 'Track Request', screen: 'complaints' as const },
  { icon: Receipt, label: 'My Invoices', screen: 'invoices' as const },
  { icon: Headphones, label: 'Support', screen: 'help-support' as const },
];

// ============================================================
// DASHBOARD SCREEN
// ============================================================

export function DashboardScreen() {
  const { setScreen } = useCustomerAppStore();

  return (
    <motion.div
      className="min-h-full bg-gray-50"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Green Welcome Banner ── */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-br from-emerald-600 to-emerald-700 px-5 pt-6 pb-8 rounded-b-3xl"
      >
        <h2 className="text-xl font-bold text-white">
          Hello, Ali Khan 👋
        </h2>
        <p className="text-sm text-emerald-100 mt-1">
          Here&apos;s an overview of your requests
        </p>
        <p className="text-xs text-emerald-200 mt-1.5">
          23 Jun 2026, Monday
        </p>
      </motion.div>

      {/* ── Stats Cards ── */}
      <motion.div variants={itemVariants} className="px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="grid grid-cols-4 gap-2">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="flex flex-col items-center gap-2"
                >
                  <div
                    className={`flex items-center justify-center w-11 h-11 rounded-full ${stat.bg}`}
                  >
                    <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {stat.value}
                  </span>
                  <span className="text-[10px] text-gray-500 text-center leading-tight">
                    {stat.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── Recent Complaints ── */}
      <motion.section variants={itemVariants} className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900">
            Recent Complaints
          </h3>
          <button
            onClick={() => setScreen('complaints')}
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            View All
          </button>
        </div>

        <div className="space-y-3">
          {complaints.map((complaint) => (
            <button
              key={complaint.id}
              onClick={() =>
                setScreen('complaint-detail', { id: complaint.id })
              }
              className="w-full bg-white rounded-2xl shadow-sm p-4 border-l-[3px] border-l-amber-400 flex items-center gap-3 text-left transition-shadow hover:shadow-md active:scale-[0.99]"
              style={{
                borderLeftColor:
                  complaint.status === 'In Progress'
                    ? '#f59e0b'
                    : complaint.status === 'Assigned'
                      ? '#3b82f6'
                      : complaint.status === 'Completed'
                        ? '#10b981'
                        : '#f97316',
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${complaint.statusColor}`}
                  >
                    {complaint.status}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {complaint.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {complaint.location}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {complaint.time}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      </motion.section>

      {/* ── Quick Actions ── */}
      <motion.section variants={itemVariants} className="px-4 mt-6 pb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.screen}
                onClick={() => setScreen(action.screen)}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-600 group-hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-600/25 active:scale-95">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </motion.section>
    </motion.div>
  );
}