'use client';

import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';

export function LoadingState({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-dark-400">
      <Loader2 className="w-6 h-6 animate-spin text-boss-400 mb-2" />
      <p className="text-xs">{label || 'Loading from JobTread...'}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="glass-card p-4 border-red-500/20 bg-red-500/5">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-red-400">Connection Error</p>
          <p className="text-[10px] text-dark-300 mt-0.5 break-words">{message}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn-secondary text-[10px] px-2 py-1 flex items-center gap-1 flex-shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="w-8 h-8 text-dark-600 mb-3" />
      <p className="text-sm font-medium text-dark-300">{title}</p>
      <p className="text-xs text-dark-500 mt-1">{description}</p>
    </div>
  );
}
