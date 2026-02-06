import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    LEAD: 'text-blue-400',
    ESTIMATE: 'text-purple-400',
    PROPOSAL: 'text-indigo-400',
    CONTRACT: 'text-cyan-400',
    IN_PROGRESS: 'text-emerald-400',
    ON_HOLD: 'text-amber-400',
    COMPLETED: 'text-green-400',
    CANCELLED: 'text-red-400',
    DRAFT: 'text-gray-400',
    SENT: 'text-blue-400',
    VIEWED: 'text-indigo-400',
    ACCEPTED: 'text-emerald-400',
    DECLINED: 'text-red-400',
    PAID: 'text-green-400',
    OVERDUE: 'text-red-400',
    PARTIAL: 'text-amber-400',
  };
  return colors[status] || 'text-gray-400';
}

export function getStatusBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    LEAD: 'badge-info',
    ESTIMATE: 'badge-info',
    PROPOSAL: 'badge-info',
    CONTRACT: 'badge-info',
    IN_PROGRESS: 'badge-success',
    ON_HOLD: 'badge-warning',
    COMPLETED: 'badge-success',
    CANCELLED: 'badge-danger',
    DRAFT: 'badge-info',
    SENT: 'badge-info',
    ACCEPTED: 'badge-success',
    DECLINED: 'badge-danger',
    PAID: 'badge-success',
    OVERDUE: 'badge-danger',
  };
  return classes[status] || 'badge-info';
}

export function timeAgo(date: string): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  const intervals = [
    { label: 'y', seconds: 31536000 },
    { label: 'mo', seconds: 2592000 },
    { label: 'w', seconds: 604800 },
    { label: 'd', seconds: 86400 },
    { label: 'h', seconds: 3600 },
    { label: 'm', seconds: 60 },
  ];
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) return `${count}${interval.label} ago`;
  }
  return 'just now';
}
