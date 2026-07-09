'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCustomerAppStore } from '@/customer-portal/store';
import { cn } from '@/core/utils/utils';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import {
  Search,
  MapPin,
  Clock,
  User,
  ChevronRight,
  Wind,
  Lightbulb,
  Droplets,
  ArrowUpDown,
  Wrench,
  CheckCircle2,
  Phone,
  Camera,
  Image as ImageIcon,
  Plus,
} from 'lucide-react';

// ============================================================
// MOCK DATA
// ============================================================

const CATEGORIES = [
  { value: 'hvac', label: 'HVAC' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'elevator', label: 'Elevator' },
  { value: 'general', label: 'General Maintenance' },
];

const COMPLAINTS = [
  {
    id: 'CMP-2026-0125',
    title: 'AC Not Cooling in Office',
    status: 'IN_PROGRESS',
    location: 'Office Building A, 3rd Floor',
    date: '22 Jun 2026, 10:30 AM',
    technician: 'Hasan Ali',
    category: 'hvac',
    icon: Wind,
  },
  {
    id: 'CMP-2026-0124',
    title: 'Lights Flickering in Meeting Room',
    status: 'ASSIGNED',
    location: 'Conference Room B, 2nd Floor',
    date: '22 Jun 2026, 09:15 AM',
    technician: 'Omar Farooq',
    category: 'electrical',
    icon: Lightbulb,
  },
  {
    id: 'CMP-2026-0123',
    title: 'Water Leak in Restroom',
    status: 'COMPLETED',
    location: 'Ground Floor Restroom',
    date: '21 Jun 2026, 02:45 PM',
    technician: 'Ahmed Khan',
    category: 'plumbing',
    icon: Droplets,
  },
  {
    id: 'CMP-2026-0122',
    title: 'Elevator Making Strange Noise',
    status: 'OPEN',
    location: 'Main Lobby, Ground Floor',
    date: '20 Jun 2026, 11:30 AM',
    technician: null,
    category: 'elevator',
    icon: ArrowUpDown,
  },
  {
    id: 'CMP-2026-0121',
    title: 'AC Thermostat Malfunction',
    status: 'IN_PROGRESS',
    location: 'Server Room, 1st Floor',
    date: '20 Jun 2026, 08:00 AM',
    technician: 'Bilal Ahmed',
    category: 'hvac',
    icon: Wind,
  },
  {
    id: 'CMP-2026-0120',
    title: 'Power Outage in Section C',
    status: 'COMPLETED',
    location: 'Section C, 4th Floor',
    date: '19 Jun 2026, 03:30 PM',
    technician: 'Omar Farooq',
    category: 'electrical',
    icon: Lightbulb,
  },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; border: string }> = {
  OPEN: { label: 'Open', color: 'bg-orange-100 text-orange-700', border: 'border-l-orange-400' },
  ASSIGNED: { label: 'Assigned', color: 'bg-blue-100 text-blue-700', border: 'border-l-blue-400' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-100 text-amber-700', border: 'border-l-amber-400' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', border: 'border-l-emerald-400' },
};

const FILTER_TABS = [
  { label: 'All', filter: 'all', count: 6 },
  { label: 'Open', filter: 'OPEN', count: 1 },
  { label: 'In Progress', filter: 'IN_PROGRESS', count: 2 },
  { label: 'Completed', filter: 'COMPLETED', count: 2 },
];

const TIMELINE_STEPS = [
  { label: 'Complaint Created', time: '22 Jun 2026, 10:30 AM', done: true },
  { label: 'Assigned to Technician', time: '22 Jun 2026, 10:45 AM', done: true },
  { label: 'Technician Accepted', time: '22 Jun 2026, 11:00 AM', done: true },
  { label: 'Work in Progress', time: '22 Jun 2026, 01:30 PM', done: false, current: true },
  { label: 'Completed', time: '', done: false },
  { label: 'Feedback Pending', time: '', done: false },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ============================================================
// COMPLAINTS SCREEN (Screen 2)
// ============================================================

export function ComplaintsScreen() {
  const { setScreen } = useCustomerAppStore();
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = COMPLAINTS.filter((c) => {
    if (activeFilter !== 'all' && c.status !== activeFilter) return false;
    if (searchQuery && !c.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search complaints..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
        {FILTER_TABS.map((tab) => (
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

      {/* Complaint List */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
        {filtered.map((complaint) => {
          const config = STATUS_CONFIG[complaint.status];
          const Icon = complaint.icon;
          return (
            <motion.div
              key={complaint.id}
              variants={fadeUp}
              onClick={() => setScreen('complaint-detail')}
              className={cn(
                'bg-white rounded-2xl shadow-sm border-l-4 p-4 cursor-pointer',
                'hover:shadow-md transition-shadow active:scale-[0.99]',
                config.border
              )}
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm text-gray-900 leading-tight">
                      {complaint.title}
                    </h3>
                    <Badge variant="secondary" className={cn('text-[10px] px-2 py-0.5 flex-shrink-0 border-0', config.color)}>
                      {config.label}
                    </Badge>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{complaint.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span>{complaint.date}</span>
                    </div>
                    {complaint.technician && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <User className="h-3 w-3 flex-shrink-0" />
                        <span>{complaint.technician}</span>
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0 mt-1" />
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Wrench className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No complaints found</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ============================================================
// COMPLAINT DETAIL SCREEN (Screen 3)
// ============================================================

export function ComplaintDetailScreen() {
  const { setScreen } = useCustomerAppStore();

  return (
    <div className="p-4 space-y-4">
      {/* Complaint Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-gray-400">CMP-2026-0125</span>
          <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">In Progress</Badge>
        </div>
        <h2 className="text-lg font-bold text-gray-900">AC Not Cooling in Office</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span>Office Building A, 3rd Floor</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4 text-gray-400" />
            <span>22 Jun 2026, 10:30 AM</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
            Priority: Medium
          </Badge>
        </div>
      </motion.div>

      {/* Status Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-sm p-4"
      >
        <h3 className="font-semibold text-sm text-gray-900 mb-4">Status Timeline</h3>
        <div className="space-y-0">
          {TIMELINE_STEPS.map((step, idx) => (
            <div key={idx} className="flex gap-3">
              {/* Dot + Line */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 border-2',
                    step.done
                      ? 'bg-emerald-500 border-emerald-500'
                      : step.current
                      ? 'bg-blue-500 border-blue-500'
                      : 'bg-white border-gray-300'
                  )}
                >
                  {step.done && <CheckCircle2 className="h-3 w-3 text-white" />}
                  {step.current && (
                    <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  )}
                </div>
                {idx < TIMELINE_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'w-0.5 h-8',
                      step.done ? 'bg-emerald-400' : step.current ? 'bg-blue-300' : 'bg-gray-200'
                    )}
                  />
                )}
              </div>
              {/* Content */}
              <div className="pb-4">
                <p
                  className={cn(
                    'text-sm font-medium',
                    step.done || step.current ? 'text-gray-900' : 'text-gray-400'
                  )}
                >
                  {step.label}
                </p>
                {step.time && (
                  <p className="text-xs text-gray-400 mt-0.5">{step.time}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Assigned Technician */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl shadow-sm p-4"
      >
        <h3 className="font-semibold text-sm text-gray-900 mb-3">Assigned Technician</h3>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-sm font-bold text-emerald-700">HA</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-gray-900">Hasan Ali</p>
            <p className="text-xs text-gray-500">HVAC Technician</p>
          </div>
          <button className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center hover:bg-emerald-200 transition-colors">
            <Phone className="h-4 w-4 text-emerald-700" />
          </button>
        </div>
      </motion.div>

      {/* Attachments */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl shadow-sm p-4"
      >
        <h3 className="font-semibold text-sm text-gray-900 mb-3">Attachments</h3>
        <div className="grid grid-cols-2 gap-3">
          {['AC Unit Photo', 'Room Photo'].map((label) => (
            <div
              key={label}
              className="aspect-[4/3] rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                <Camera className="h-4 w-4 text-gray-500" />
              </div>
              <span className="text-[10px] text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="space-y-2 pb-4">
        <Button
          onClick={() => setScreen('track-technician')}
          className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold"
        >
          Track Technician
        </Button>
        <Button
          onClick={() => setScreen('work-order-detail')}
          variant="outline"
          className="w-full h-11 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-semibold"
        >
          View Work Order
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// NEW COMPLAINT SCREEN (Screen 8)
// ============================================================

export function NewComplaintScreen() {
  const { setScreen, newComplaintData, setNewComplaintData, resetNewComplaint } =
    useCustomerAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      resetNewComplaint();
      setScreen('complaints');
      window.dispatchEvent(
        new CustomEvent('cmms:toast', {
          detail: { type: 'success', message: 'Complaint submitted successfully!' },
        })
      );
    }, 1000);
  };

  const priorities = [
    { value: 'low' as const, label: 'Low', activeColor: 'bg-gray-500', ringColor: 'ring-gray-500' },
    { value: 'medium' as const, label: 'Medium', activeColor: 'bg-amber-500', ringColor: 'ring-amber-500' },
    { value: 'high' as const, label: 'High', activeColor: 'bg-red-500', ringColor: 'ring-red-500' },
  ];

  return (
    <div className="p-4 space-y-4">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Category</label>
          <select
            value={newComplaintData.category}
            onChange={(e) => setNewComplaintData({ category: e.target.value })}
            className="w-full h-11 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all appearance-none"
          >
            <option value="">Select Category</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Enter location"
              value={newComplaintData.location}
              onChange={(e) => setNewComplaintData({ location: e.target.value })}
              className="w-full h-11 pl-10 pr-4 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            placeholder="Brief description of the issue"
            value={newComplaintData.title}
            onChange={(e) => setNewComplaintData({ title: e.target.value })}
            className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea
            placeholder="Describe the issue in detail..."
            rows={4}
            value={newComplaintData.description}
            onChange={(e) => setNewComplaintData({ description: e.target.value })}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all resize-none"
          />
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Priority</label>
          <div className="flex gap-3">
            {priorities.map((p) => (
              <button
                key={p.value}
                onClick={() => setNewComplaintData({ priority: p.value })}
                className={cn(
                  'flex-1 h-10 rounded-xl text-sm font-semibold transition-all border-2',
                  newComplaintData.priority === p.value
                    ? cn('border-transparent text-white', p.activeColor)
                    : 'bg-white border-gray-200 text-gray-500'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Attachments */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Add Photos (Optional)</label>
          <div className="flex gap-3">
            <button className="flex-1 h-12 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors">
              <Camera className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">Camera</span>
            </button>
            <button className="flex-1 h-12 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors">
              <ImageIcon className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">Gallery</span>
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-base"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
        </Button>
      </motion.div>
    </div>
  );
}