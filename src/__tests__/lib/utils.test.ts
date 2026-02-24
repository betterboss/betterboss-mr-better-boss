import { describe, it, expect } from 'vitest';
import {
  cn,
  formatCurrency,
  formatPercent,
  formatNumber,
  getInitials,
  getStatusColor,
  getStatusBadgeClass,
  timeAgo,
} from '@/lib/utils/cn';

describe('cn (class name merge)', () => {
  it('merges basic class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('deduplicates tailwind classes', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8');
  });

  it('handles empty inputs', () => {
    expect(cn()).toBe('');
  });
});

describe('formatCurrency', () => {
  it('formats positive amounts', () => {
    expect(formatCurrency(50000)).toBe('$50,000');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('formats negative amounts', () => {
    expect(formatCurrency(-1500)).toBe('-$1,500');
  });

  it('rounds to whole dollars', () => {
    expect(formatCurrency(1234.56)).toBe('$1,235');
  });
});

describe('formatPercent', () => {
  it('formats with one decimal', () => {
    expect(formatPercent(25.123)).toBe('25.1%');
  });

  it('formats zero', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('formats 100', () => {
    expect(formatPercent(100)).toBe('100.0%');
  });
});

describe('formatNumber', () => {
  it('formats with commas', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

describe('getInitials', () => {
  it('returns uppercase initials', () => {
    expect(getInitials('john', 'doe')).toBe('JD');
  });

  it('handles already uppercase', () => {
    expect(getInitials('Alice', 'Bob')).toBe('AB');
  });
});

describe('getStatusColor', () => {
  it('returns correct color for known statuses', () => {
    expect(getStatusColor('IN_PROGRESS')).toBe('text-emerald-400');
    expect(getStatusColor('OVERDUE')).toBe('text-red-400');
    expect(getStatusColor('PAID')).toBe('text-green-400');
    expect(getStatusColor('LEAD')).toBe('text-blue-400');
  });

  it('returns default for unknown status', () => {
    expect(getStatusColor('UNKNOWN')).toBe('text-gray-400');
  });
});

describe('getStatusBadgeClass', () => {
  it('returns correct badge class for known statuses', () => {
    expect(getStatusBadgeClass('IN_PROGRESS')).toBe('badge-success');
    expect(getStatusBadgeClass('CANCELLED')).toBe('badge-danger');
    expect(getStatusBadgeClass('ON_HOLD')).toBe('badge-warning');
  });

  it('returns default for unknown status', () => {
    expect(getStatusBadgeClass('UNKNOWN')).toBe('badge-info');
  });
});

describe('timeAgo', () => {
  it('returns "just now" for recent dates', () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe('just now');
  });

  it('returns minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(fiveMinAgo)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    expect(timeAgo(twoHoursAgo)).toBe('2h ago');
  });

  it('returns days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400 * 1000).toISOString();
    expect(timeAgo(threeDaysAgo)).toBe('3d ago');
  });
});
