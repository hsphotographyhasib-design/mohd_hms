'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCustomerAppStore } from '@/store/customer-app';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Check,
  Clock,
  Phone,
  Navigation,
  Truck,
  MapPin,
  ImageIcon,
  Camera,
  Download,
  FileText,
  CircleDot,
  CircleCheck,
  Circle,
  Star,
  MessageSquare,
  CheckCircle2,
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
// 1. WORK ORDER DETAIL SCREEN
// ============================================================

export function WorkOrderDetailScreen() {
  const { setScreen, goBack } = useCustomerAppStore();

  const progressSteps = [
    { label: 'Accepted', status: 'done' as const },
    { label: 'Started', status: 'done' as const },
    { label: 'In Progress', status: 'current' as const },
    { label: 'Completed', status: 'pending' as const },
  ];

  const notes = [
    {
      text: 'Checked AC filter and cleaned. Gas level normal. Compressor working fine.',
      author: 'Hasan Ali',
      time: '22 Jun 2026, 01:30 PM',
    },
    {
      text: 'Replaced filter and recharged gas. Testing now.',
      author: 'Hasan Ali',
      time: '22 Jun 2026, 02:15 PM',
    },
  ];

  const attachments = ['Filter Before', 'Gauge Reading', 'Filter After'];

  return (
    <motion.div className="p-4 space-y-4 pb-6" {...stagger} animate="animate" initial="initial">
      {/* Work Order ID */}
      <motion.div {...fadeInUp}>
        <p className="text-xs text-gray-400 font-medium">Work Order ID</p>
        <p className="font-mono text-sm text-gray-600 mt-0.5">WO-2026-0456</p>
      </motion.div>

      {/* Title */}
      <motion.div {...fadeInUp}>
        <h2 className="text-lg font-bold text-gray-900">AC Not Cooling in Office</h2>
      </motion.div>

      {/* Related Complaint */}
      <motion.div {...fadeInUp}>
        <p className="text-xs text-gray-400">Related Complaint</p>
        <button
          onClick={() => setScreen('complaint-detail', { id: 'CMP-2026-0125' })}
          className="text-sm text-emerald-600 font-medium hover:underline mt-0.5 inline-flex items-center gap-1"
        >
          CMP-2026-0125
        </button>
      </motion.div>

      {/* Badges Row */}
      <motion.div {...fadeInUp} className="flex items-center gap-2 flex-wrap">
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs px-2.5 py-0.5 rounded-full">
          Medium
        </Badge>
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs px-2.5 py-0.5 rounded-full">
          In Progress
        </Badge>
      </motion.div>

      {/* Assigned Technician */}
      <motion.div {...fadeInUp} className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-xs text-gray-400 font-medium mb-3">Assigned Technician</p>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
            HA
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Hasan Ali</p>
            <p className="text-xs text-gray-500">HVAC Technician</p>
          </div>
        </div>
      </motion.div>

      {/* Timeline Info */}
      <motion.div {...fadeInUp} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <p className="text-xs text-gray-400 font-medium">Timeline</p>
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
          <span className="text-gray-500">Created:</span>
          <span className="text-gray-900 font-medium ml-auto">22 Jun 2026, 11:15 AM</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="text-gray-500">Due Date:</span>
          <span className="text-gray-900 font-medium ml-auto">23 Jun 2026, 08:00 PM</span>
        </div>
      </motion.div>

      {/* Progress Steps */}
      <motion.div {...fadeInUp} className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-xs text-gray-400 font-medium mb-4">Progress</p>
        <div className="flex items-center justify-between">
          {progressSteps.map((step, i) => (
            <div key={step.label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                {step.status === 'done' ? (
                  <div className="h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>
                ) : step.status === 'current' ? (
                  <div className="h-7 w-7 rounded-full bg-blue-500 flex items-center justify-center">
                    <CircleDot className="h-3.5 w-3.5 text-white" />
                  </div>
                ) : (
                  <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center">
                    <Circle className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                )}
                <span
                  className={`text-[10px] font-medium text-center leading-tight ${
                    step.status === 'done'
                      ? 'text-emerald-600'
                      : step.status === 'current'
                        ? 'text-blue-600'
                        : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < progressSteps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mt-[-16px] ${
                    step.status === 'done' ? 'bg-emerald-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Notes Section */}
      <motion.div {...fadeInUp} className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-xs text-gray-400 font-medium mb-3">Notes</p>
        <div className="space-y-3">
          {notes.map((note, i) => (
            <div
              key={i}
              className="bg-gray-50 rounded-xl p-3 border border-gray-100"
            >
              <p className="text-sm text-gray-700 leading-relaxed">{note.text}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs font-medium text-gray-900">{note.author}</span>
                <span className="text-xs text-gray-400">{note.time}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Attachments */}
      <motion.div {...fadeInUp} className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-xs text-gray-400 font-medium mb-3">Attachments</p>
        <div className="grid grid-cols-3 gap-2">
          {attachments.map((name) => (
            <div
              key={name}
              className="aspect-[4/3] bg-gray-100 rounded-xl flex flex-col items-center justify-center gap-1.5 border border-gray-200"
            >
              <ImageIcon className="h-5 w-5 text-gray-400" />
              <span className="text-[10px] text-gray-500 font-medium text-center px-1 leading-tight">
                {name}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div {...fadeInUp} className="space-y-2.5 pt-2">
        <Button
          variant="outline"
          className="w-full h-11 rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
          onClick={() => setScreen('track-technician')}
        >
          <Phone className="h-4 w-4" />
          Contact Technician
        </Button>
        <Button
          className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => setScreen('track-technician')}
        >
          <Navigation className="h-4 w-4" />
          View Timeline
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// 2. TRACK TECHNICIAN SCREEN
// ============================================================

export function TrackTechnicianScreen() {
  const { setScreen } = useCustomerAppStore();

  const liveUpdates = [
    { text: 'Technician has been assigned', time: '11:00 AM', status: 'done' as const },
    { text: 'Technician started from office', time: '11:15 AM', status: 'done' as const },
    { text: 'Technician is on the way', time: '11:20 AM', status: 'current' as const },
  ];

  return (
    <motion.div className="pb-6" initial="initial" animate="animate" {...stagger}>
      {/* Map Area */}
      <motion.div {...fadeInUp} className="relative mx-4 mt-4 h-64 rounded-2xl bg-emerald-50 overflow-hidden border border-emerald-100">
        {/* Grid pattern for map-like visual */}
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(16,185,129,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.4) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Road-like lines */}
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-emerald-300/40" />
        <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-emerald-300/40" />
        <div className="absolute top-1/4 left-0 right-0 h-[1px] bg-emerald-200/30 rotate-12 origin-left" />

        {/* Dotted route line */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 256" fill="none">
          <path
            d="M 80 200 Q 120 180 160 160 T 280 80"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        {/* Red pin */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="relative">
            <MapPin className="h-8 w-8 text-red-500 drop-shadow-md" fill="currentColor" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-2 w-2 bg-red-500 rounded-full animate-ping opacity-40" />
          </div>
        </div>

        {/* Technician dot */}
        <div className="absolute top-[30%] left-[25%]">
          <div className="h-4 w-4 bg-emerald-500 rounded-full border-2 border-white shadow-md" />
        </div>

        {/* Map label */}
        <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm rounded-lg px-2.5 py-1 text-[10px] text-gray-600 font-medium">
          Live Tracking
        </div>
      </motion.div>

      {/* Technician Info Card (overlapping map bottom) */}
      <motion.div
        {...fadeInUp}
        className="mx-4 -mt-6 relative z-10 bg-white rounded-2xl p-4 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              HA
            </div>
            <div>
              <p className="text-base font-bold text-gray-900">Hasan Ali</p>
              <p className="text-xs text-gray-500">HVAC Technician</p>
            </div>
          </div>
          <button
            className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center hover:bg-emerald-200 transition-colors"
            aria-label="Call technician"
          >
            <Phone className="h-4 w-4 text-emerald-600" />
          </button>
        </div>
        <div className="mt-3">
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs px-2.5 py-0.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            On the Way
          </Badge>
        </div>
      </motion.div>

      {/* Detail Cards */}
      <motion.div {...fadeInUp} className="mx-4 mt-4 grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
          <Navigation className="h-4 w-4 text-emerald-600 mx-auto mb-1.5" />
          <p className="text-sm font-bold text-gray-900">1.2 km</p>
          <p className="text-[10px] text-gray-400 mt-0.5">away</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
          <Clock className="h-4 w-4 text-emerald-600 mx-auto mb-1.5" />
          <p className="text-sm font-bold text-gray-900">10 - 12 min</p>
          <p className="text-[10px] text-gray-400 mt-0.5">ETA</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
          <Truck className="h-4 w-4 text-emerald-600 mx-auto mb-1.5" />
          <p className="text-sm font-bold text-gray-900">LEA-1234</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Bike</p>
        </div>
      </motion.div>

      {/* Live Updates */}
      <motion.div {...fadeInUp} className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-xs text-gray-400 font-medium mb-4">Live Updates</p>
        <div className="space-y-4">
          {liveUpdates.map((update, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center pt-0.5">
                {update.status === 'done' ? (
                  <CircleCheck className="h-5 w-5 text-emerald-500" />
                ) : (
                  <div className="relative">
                    <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                    <div className="absolute inset-0 h-5 w-5 rounded-full bg-blue-500 animate-ping opacity-30" />
                  </div>
                )}
                {i < liveUpdates.length - 1 && (
                  <div className="w-0.5 h-6 bg-gray-200 mt-1" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    update.status === 'current' ? 'text-blue-600' : 'text-gray-700'
                  }`}
                >
                  {update.text}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{update.time}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// 3. RATE & FEEDBACK SCREEN
// ============================================================

const ratingLabels: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

export function RateFeedbackScreen() {
  const { goBack } = useCustomerAppStore();
  const { toast } = useToast();
  const [rating, setRating] = useState(4);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    toast({
      title: 'Thank you for your feedback!',
      description: 'Your rating and feedback have been submitted.',
    });
    goBack();
  };

  const handleSkip = () => {
    goBack();
  };

  return (
    <motion.div className="p-4 space-y-5 pb-6" {...stagger} animate="animate" initial="initial">
      {/* Completion Status */}
      <motion.div {...fadeInUp} className="flex flex-col items-center pt-4 pb-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
          className="h-16 w-16 rounded-full bg-emerald-500 flex items-center justify-center mb-3"
        >
          <CheckCircle2 className="h-8 w-8 text-white" />
        </motion.div>
        <h2 className="text-xl font-bold text-emerald-600">Work Completed!</h2>
        <p className="text-sm text-gray-400 mt-1 font-mono">WO-2026-0456</p>
        <p className="text-xs text-gray-400 mt-0.5">22 Jun 2026, 02:45 PM</p>
      </motion.div>

      {/* Divider */}
      <motion.div {...fadeInUp}>
        <div className="h-px bg-gray-200" />
      </motion.div>

      {/* Star Rating */}
      <motion.div {...fadeInUp} className="flex flex-col items-center">
        <p className="text-sm font-semibold text-gray-900 mb-3">Rate your experience</p>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className="focus:outline-none active:scale-90 transition-transform"
              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
            >
              <Star
                className={`h-9 w-9 transition-colors ${
                  star <= rating
                    ? 'text-emerald-500 fill-emerald-500'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
        <p className="text-sm font-medium text-gray-600 mt-2">{ratingLabels[rating]}</p>
      </motion.div>

      {/* Feedback */}
      <motion.div {...fadeInUp} className="space-y-2">
        <label className="text-sm font-semibold text-gray-900">Your Feedback (Optional)</label>
        <Textarea
          placeholder="Write your feedback here..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="rounded-xl min-h-[100px] resize-none text-sm"
        />
      </motion.div>

      {/* Add Photos */}
      <motion.div {...fadeInUp} className="space-y-2">
        <label className="text-sm font-semibold text-gray-900">Add Photos (Optional)</label>
        <div className="flex items-center gap-2">
          <button className="h-11 w-11 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <Camera className="h-5 w-5 text-gray-500" />
          </button>
          <button className="h-11 w-11 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <ImageIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div {...fadeInUp} className="space-y-2.5 pt-2">
        <Button
          className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
          onClick={handleSubmit}
        >
          Submit Feedback
        </Button>
        <Button
          variant="outline"
          className="w-full h-12 rounded-xl border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-600 text-sm"
          onClick={handleSkip}
        >
          Skip
        </Button>
      </motion.div>
    </motion.div>
  );
}