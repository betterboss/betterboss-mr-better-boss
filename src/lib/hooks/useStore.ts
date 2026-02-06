// =============================================================================
// Global State Management with Zustand
// Manages sidebar state, active module, cached data, and UI preferences
// =============================================================================

import { create } from 'zustand';
import type { JobTreadJob, JobTreadContact, DashboardMetrics, AIChatMessage } from '@/types/jobtread';

type SidebarModule =
  | 'dashboard'
  | 'jobs'
  | 'estimates'
  | 'leads'
  | 'finances'
  | 'assistant'
  | 'settings';

interface SidebarState {
  // Navigation
  activeModule: SidebarModule;
  setActiveModule: (module: SidebarModule) => void;
  isCollapsed: boolean;
  toggleCollapsed: () => void;

  // Data cache
  jobs: JobTreadJob[];
  setJobs: (jobs: JobTreadJob[]) => void;
  contacts: JobTreadContact[];
  setContacts: (contacts: JobTreadContact[]) => void;
  metrics: DashboardMetrics | null;
  setMetrics: (metrics: DashboardMetrics) => void;

  // Active selections
  selectedJobId: string | null;
  setSelectedJobId: (id: string | null) => void;

  // AI Assistant
  chatMessages: AIChatMessage[];
  addChatMessage: (message: AIChatMessage) => void;
  clearChat: () => void;

  // UI state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  notifications: AppNotification[];
  addNotification: (notification: AppNotification) => void;
  dismissNotification: (id: string) => void;

  // Quick command palette
  isCommandPaletteOpen: boolean;
  toggleCommandPalette: () => void;

  // Search
  globalSearch: string;
  setGlobalSearch: (search: string) => void;
}

export interface AppNotification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export const useStore = create<SidebarState>((set) => ({
  // Navigation
  activeModule: 'dashboard',
  setActiveModule: (module) => set({ activeModule: module }),
  isCollapsed: false,
  toggleCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),

  // Data cache
  jobs: [],
  setJobs: (jobs) => set({ jobs }),
  contacts: [],
  setContacts: (contacts) => set({ contacts }),
  metrics: null,
  setMetrics: (metrics) => set({ metrics }),

  // Active selections
  selectedJobId: null,
  setSelectedJobId: (id) => set({ selectedJobId: id }),

  // AI Assistant
  chatMessages: [],
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  clearChat: () => set({ chatMessages: [] }),

  // UI state
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  notifications: [],
  addNotification: (notification) =>
    set((state) => ({ notifications: [notification, ...state.notifications] })),
  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  // Command palette
  isCommandPaletteOpen: false,
  toggleCommandPalette: () =>
    set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),

  // Search
  globalSearch: '',
  setGlobalSearch: (search) => set({ globalSearch: search }),
}));
