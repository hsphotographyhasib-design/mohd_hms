'use client';

import { ShieldX } from 'lucide-react';

/**
 * 403 Access Denied page component.
 * Displayed when a user tries to access a feature they don't have permission for.
 */
export function AccessDenied({ feature }: { feature?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-6">
        <ShieldX className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        403 — Access Denied
      </h2>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-4">
        You do not have permission to access this page.
      </p>
      {feature && (
        <p className="text-sm text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5 font-mono">
          Required feature: <span className="font-semibold">{feature}</span>
        </p>
      )}
    </div>
  );
}