'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, LogOut, RotateCcw } from 'lucide-react';

interface LogoutModalProps {
  countdown: number;
  onStayLoggedIn: () => void;
  onLogoutNow: () => void;
}

/**
 * Warning modal shown 60 seconds before auto-logout.
 * Displays countdown and provides Stay/Logout options.
 */
export function LogoutModal({ countdown, onStayLoggedIn, onLogoutNow }: LogoutModalProps) {
  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const countdownText = minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-border/50 max-w-md w-full p-6 z-10"
        >
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"
              >
                <ShieldAlert className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </motion.div>
              {/* Countdown ring */}
              <svg className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] -rotate-90" viewBox="0 0 72 72">
                <circle
                  cx="36"
                  cy="36"
                  r="34"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-amber-200 dark:text-amber-800/40"
                />
                <circle
                  cx="36"
                  cy="36"
                  r="34"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="text-amber-500 dark:text-amber-400"
                  style={{
                    strokeDasharray: 2 * Math.PI * 34,
                    strokeDashoffset: 2 * Math.PI * 34 * (1 - countdown / 60),
                    transition: 'stroke-dashoffset 1s linear',
                  }}
                />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Session Expiring
            </h3>
            <p className="text-sm text-muted-foreground">
              Your session will expire in <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{countdownText}</span> due to inactivity.
            </p>
          </div>

          {/* Countdown display */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/40">
              <motion.span
                key={countdown}
                initial={{ scale: 1.2, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-2xl font-mono font-bold text-amber-700 dark:text-amber-300 tabular-nums"
              >
                {countdownText}
              </motion.span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onLogoutNow}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300
                hover:bg-gray-200 dark:hover:bg-gray-700
                transition-colors duration-150"
            >
              <LogOut className="h-4 w-4" />
              Logout Now
            </button>
            <button
              onClick={onStayLoggedIn}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                bg-emerald-600 text-white
                hover:bg-emerald-700
                transition-colors duration-150 shadow-lg shadow-emerald-600/20"
            >
              <RotateCcw className="h-4 w-4" />
              Stay Logged In
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}