'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Star,
  Camera,
  Upload,
  X,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { useAppStore } from '@/app-shell/store';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Textarea } from '@/shared/ui/textarea';
import { Skeleton } from '@/shared/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/core/utils/utils';
import { format } from 'date-fns';

// ============ HELPERS ============
function getToken(): string {
  return localStorage.getItem('cmms_token') || '';
}

function generateWoRef(createdAt: string): string {
  const d = new Date(createdAt);
  const year = d.getFullYear();
  const dayOfYear = Math.ceil(
    (d.getTime() - new Date(year, 0, 1).getTime()) / 86400000
  );
  return `WO-${year}-${String(dayOfYear).padStart(3, '0')}`;
}

// ============ SUCCESS CHECKMARK ANIMATION ============
function SuccessCheckmark() {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
      className="flex flex-col items-center gap-3"
    >
      {/* Outer ring */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 150, damping: 12, delay: 0.15 }}
        className="relative"
      >
        {/* Glow effect */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.3, opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.3, repeat: 2 }}
          className="absolute inset-0 rounded-full bg-emerald-400"
        />
        {/* Main circle */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          className="relative flex size-20 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-200"
        >
          {/* Checkmark SVG with draw animation */}
          <svg
            className="size-10 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' }}
            />
          </svg>
        </motion.div>
      </motion.div>
      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="text-center"
      >
        <p className="text-lg font-bold text-gray-900">Work Completed!</p>
        <p className="text-sm text-gray-500 mt-1">Your feedback helps us improve</p>
      </motion.div>
    </motion.div>
  );
}

// ============ STAR RATING ============
function StarRating({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (r: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || rating);
        return (
          <motion.button
            key={star}
            type="button"
            whileTap={{ scale: 0.85 }}
            onHoverStart={() => setHovered(star)}
            onHoverEnd={() => setHovered(0)}
            onClick={() => onChange(star)}
            className="p-0.5 focus:outline-none active:scale-90 transition-transform"
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          >
            <Star
              className={cn(
                'size-8 transition-colors duration-150',
                filled
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-gray-300'
              )}
            />
          </motion.button>
        );
      })}
      {rating > 0 && (
        <motion.span
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="ml-1 text-sm font-medium text-gray-600"
        >
          {rating}/5
        </motion.span>
      )}
    </div>
  );
}

// ============ PHOTO UPLOAD AREA ============
function PhotoUploadArea({
  photos,
  onAdd,
  onRemove,
}: {
  photos: File[];
  onAdd: (files: FileList) => void;
  onRemove: (idx: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {photos.map((photo, idx) => (
          <motion.div
            key={idx}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative size-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-100"
          >
            {photo.type.startsWith('image/') ? (
              <img
                src={URL.createObjectURL(photo)}
                alt={`Photo ${idx + 1}`}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center size-full text-gray-400">
                <Camera className="size-6" />
              </div>
            )}
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label={`Remove photo ${idx + 1}`}
            >
              <X className="size-3" />
            </button>
          </motion.div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 active:bg-gray-100 transition-colors"
        >
          <Upload className="size-5" />
          <span className="text-[10px] font-medium">Add Photo</span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onAdd(e.target.files);
          }
        }}
      />
    </div>
  );
}

// ============ MAIN COMPONENT ============
export function MobileRateFeedback() {
  const { viewParams, setView } = useAppStore();
  const workOrderId = viewParams?.id as string;

  const [workOrder, setWorkOrder] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fetchWorkOrder = useCallback(async () => {
    if (!workOrderId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/work-orders/${workOrderId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Work order not found');
      const data = await res.json();
      setWorkOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load work order');
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    fetchWorkOrder();
  }, [fetchWorkOrder]);

  const handleAddPhotos = useCallback((files: FileList) => {
    setPhotos((prev) => [...prev, ...Array.from(files)]);
  }, []);

  const handleRemovePhoto = useCallback((idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    setSubmitting(true);
    try {
      // Try posting feedback to the work order feedback endpoint
      const res = await fetch(`/api/work-orders/${workOrderId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          rating,
          feedback: feedback.trim() || null,
        }),
      });

      if (!res.ok) {
        // Fallback: try updating the linked complaint's feedback
        const complaintId = workOrder?.complaintId as string | undefined;
        if (complaintId) {
          const fallbackRes = await fetch(`/api/complaints/${complaintId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${getToken()}`,
            },
            body: JSON.stringify({
              customerRating: rating,
              customerFeedback: feedback.trim() || null,
            }),
          });
          if (!fallbackRes.ok) throw new Error('Failed to submit feedback');
        } else {
          throw new Error('Failed to submit feedback');
        }
      }

      setSubmitted(true);
      toast.success('Thank you for your feedback!');
    } catch {
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [rating, feedback, workOrderId, workOrder]);

  const handleSkip = useCallback(() => {
    setView('work-orders');
  }, [setView]);

  // ============ SUBMITTED STATE ============
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 pb-4">
        <SuccessCheckmark />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-8 w-full max-w-xs"
        >
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setView('work-orders')}
          >
            Back to Work Orders
          </Button>
        </motion.div>
      </div>
    );
  }

  // ============ LOADING STATE ============
  if (loading) {
    return (
      <div className="space-y-4 pb-4">
        <div className="flex items-center gap-3 pb-2">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="flex flex-col items-center gap-3 py-10">
          <Skeleton className="size-20 rounded-full" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-52" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  // ============ ERROR STATE ============
  if (error || !workOrder) {
    return (
      <div className="space-y-4 pb-4">
        <button
          onClick={() => setView('work-orders')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="size-5" />
          <span>Back to Work Orders</span>
        </button>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center text-sm text-red-600">
            {error || 'Work order not found'}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ DATA ============
  const createdAt = (workOrder.createdAt as string) || '';
  const refNumber = generateWoRef(createdAt);
  const woTitle = (workOrder.title as string) || 'Work Order';

  return (
    <div className="space-y-6 pb-4">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-3 pb-1">
        <button
          onClick={() => setView('work-orders')}
          className="flex size-9 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="size-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Rate & Feedback</h1>
      </div>

      {/* ─── Success Checkmark ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <SuccessCheckmark />
      </motion.div>

      {/* ─── Work Order Info ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Work Order</p>
                <p className="text-sm font-semibold text-gray-900">{refNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Date</p>
                <p className="text-sm text-gray-600">
                  {createdAt ? format(new Date(createdAt), 'MMM d, yyyy') : '—'}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2 truncate">{woTitle}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Star Rating ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-900 mb-1">How was your experience?</p>
            <p className="text-xs text-gray-500 mb-4">Tap a star to rate</p>
            <div className="flex justify-center">
              <StarRating rating={rating} onChange={setRating} />
            </div>
            {rating > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-xs text-gray-500 mt-3"
              >
                {rating === 1 && 'Very Poor'}
                {rating === 2 && 'Poor'}
                {rating === 3 && 'Average'}
                {rating === 4 && 'Good'}
                {rating === 5 && 'Excellent!'}
              </motion.p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Feedback Textarea ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.05 }}
      >
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <label htmlFor="feedback-text" className="text-sm font-medium text-gray-900 mb-2 block">
              Additional Feedback
              <span className="text-xs text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <Textarea
              id="feedback-text"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us more about your experience..."
              className="min-h-[100px] resize-none text-sm"
              maxLength={500}
            />
            <p className="text-right text-xs text-gray-400 mt-1">
              {feedback.length}/500
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Photo Upload ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
      >
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-900 mb-1">
              Add Photos
              <span className="text-xs text-gray-400 font-normal ml-1">(optional)</span>
            </p>
            <p className="text-xs text-gray-500 mb-3">Attach photos of the completed work</p>
            <PhotoUploadArea
              photos={photos}
              onAdd={handleAddPhotos}
              onRemove={handleRemovePhoto}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Submit Button ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.15 }}
        className="space-y-3"
      >
        <Button
          className={cn(
            'w-full text-white font-semibold h-12',
            rating > 0
              ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
              : 'bg-gray-300 cursor-not-allowed'
          )}
          disabled={submitting || rating === 0}
          onClick={handleSubmit}
        >
          {submitting ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="size-5 border-2 border-white/30 border-t-white rounded-full"
            />
          ) : (
            'Submit Feedback'
          )}
        </Button>
        <button
          type="button"
          onClick={handleSkip}
          className="w-full text-center text-sm text-gray-500 py-2 active:text-gray-700 transition-colors"
        >
          Skip for now
        </button>
      </motion.div>
    </div>
  );
}