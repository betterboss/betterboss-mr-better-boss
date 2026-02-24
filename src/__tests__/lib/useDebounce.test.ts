import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/lib/hooks/useDebounce';

describe('useDebounce', () => {
  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('debounces value updates', async () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBe('initial');

    // Update the value
    rerender({ value: 'updated' });

    // Before the delay, should still have old value
    expect(result.current).toBe('initial');

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('updated');

    vi.useRealTimers();
  });

  it('cancels previous timeout on rapid updates', async () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'first' } }
    );

    rerender({ value: 'second' });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: 'third' });
    act(() => { vi.advanceTimersByTime(100); });

    // Still shows first because neither 300ms elapsed
    expect(result.current).toBe('first');

    // Advance past the 300ms from last update
    act(() => { vi.advanceTimersByTime(200); });

    // Should show the last value, not second
    expect(result.current).toBe('third');

    vi.useRealTimers();
  });

  it('works with numbers', () => {
    const { result } = renderHook(() => useDebounce(42, 100));
    expect(result.current).toBe(42);
  });
});
