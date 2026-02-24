import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastContainer, useToastStore } from '@/components/ui/Toast';

describe('ToastContainer', () => {
  beforeEach(() => {
    // Reset the Zustand store before each test
    useToastStore.setState({ toasts: [] });
  });

  it('renders nothing when no toasts', () => {
    const { container } = render(<ToastContainer />);
    expect(container.innerHTML).toBe('');
  });

  it('renders a toast when added to store', () => {
    useToastStore.getState().addToast('Test message', 'success', 0);
    render(<ToastContainer />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders multiple toasts', () => {
    useToastStore.getState().addToast('First toast', 'info', 0);
    useToastStore.getState().addToast('Second toast', 'error', 0);
    render(<ToastContainer />);
    expect(screen.getByText('First toast')).toBeInTheDocument();
    expect(screen.getByText('Second toast')).toBeInTheDocument();
  });

  it('removes toast on dismiss click', () => {
    useToastStore.getState().addToast('Dismissible', 'warning', 0);
    render(<ToastContainer />);
    expect(screen.getByText('Dismissible')).toBeInTheDocument();

    const dismissBtn = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissBtn);

    expect(screen.queryByText('Dismissible')).not.toBeInTheDocument();
  });

  it('toasts have correct role for accessibility', () => {
    useToastStore.getState().addToast('Accessible', 'info', 0);
    render(<ToastContainer />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('container has aria-live for screen readers', () => {
    useToastStore.getState().addToast('Live', 'success', 0);
    render(<ToastContainer />);
    const container = screen.getByLabelText('Notifications');
    expect(container).toHaveAttribute('aria-live', 'polite');
  });
});

describe('useToastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('starts with empty toasts', () => {
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it('addToast adds a toast with correct properties', () => {
    useToastStore.getState().addToast('Hello', 'success', 0);
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('Hello');
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].id).toBeTruthy();
  });

  it('addToast defaults type to info', () => {
    useToastStore.getState().addToast('Default');
    const toasts = useToastStore.getState().toasts;
    expect(toasts[0].type).toBe('info');
  });

  it('removeToast removes the correct toast', () => {
    useToastStore.getState().addToast('Keep', 'info', 0);
    useToastStore.getState().addToast('Remove', 'error', 0);
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(2);

    useToastStore.getState().removeToast(toasts[1].id);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].message).toBe('Keep');
  });
});
