'use client';

import { ReactNode } from 'react';

export function BrandLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 12 15 8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <path
        d="M12 3.5v1.6M12 18.9v1.6M3.5 12h1.6M18.9 12h1.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  titleId?: string;
}

/**
 * Shared card layout used by the login, forgot-password, and reset-password
 * screens. Matches the existing login card 1:1 — same dimensions, brand
 * monogram, typography, and footer — so recovery screens feel native.
 */
export function AuthShell({ title, subtitle, children, titleId = 'auth-title' }: AuthShellProps) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-100 dark:bg-gray-950 p-6">
      <main
        className="w-full max-w-[420px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[20px] shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_rgba(16,24,40,0.08)] p-8 pb-6"
        role="main"
        aria-labelledby={titleId}
      >
        {/* Brand */}
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <span
            className="w-14 h-14 rounded-xl bg-emerald-600 text-white grid place-items-center"
            aria-hidden="true"
          >
            <BrandLogo className="w-[30px] h-[30px]" />
          </span>
          <h1
            id={titleId}
            className="text-[26px] leading-tight font-semibold text-gray-900 dark:text-gray-100 tracking-[-0.01em] m-0"
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-base text-gray-500 dark:text-gray-400 m-0 max-w-[30ch]">
              {subtitle}
            </p>
          )}
        </div>

        {children}

        <footer className="mt-6 text-center text-sm text-gray-400 dark:text-gray-500 leading-relaxed">
          <p className="mt-2 text-gray-400 dark:text-gray-500">
            &copy; {new Date().getFullYear()} MOHD.HMS ENTERPRISE
          </p>
        </footer>
      </main>
    </div>
  );
}
