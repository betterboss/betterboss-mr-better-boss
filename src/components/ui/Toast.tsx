'use client';

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = 'info', duration = 4000) => {
    const id = crypto.randomUUID();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

const icons: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles: Record<ToastType, string> = {
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  error: 'border-red-500/20 bg-red-500/10 text-red-400',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  info: 'border-boss-500/20 bg-boss-500/10 text-boss-400',
};

function ToastItem({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const Icon = icons[toast.type];

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-2 px-4 py-3 rounded-lg border backdrop-blur-sm shadow-lg',
        'animate-fade-in text-sm max-w-sm',
        styles[toast.type]
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-xs">{toast.message}</span>
      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        className="text-dark-500 hover:text-dark-300 flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

/** Convenience hook for triggering toasts */
export function useToast() {
  const addToast = useToastStore((s) => s.addToast);
  return {
    success: useCallback((msg: string) => addToast(msg, 'success'), [addToast]),
    error: useCallback((msg: string) => addToast(msg, 'error'), [addToast]),
    warning: useCallback((msg: string) => addToast(msg, 'warning'), [addToast]),
    info: useCallback((msg: string) => addToast(msg, 'info'), [addToast]),
  };
}
