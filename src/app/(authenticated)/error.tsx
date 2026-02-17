'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6 text-red-400" />
      </div>
      <h2 className="text-sm font-bold text-white mb-1">Something went wrong</h2>
      <p className="text-xs text-dark-400 mb-4 max-w-xs">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-boss-500 text-white text-xs font-medium hover:bg-boss-600 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Try Again
      </button>
    </div>
  );
}
