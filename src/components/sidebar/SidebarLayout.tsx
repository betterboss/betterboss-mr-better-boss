'use client';

import { useStore } from '@/lib/hooks/useStore';
import { SidebarNav } from './SidebarNav';
import { SidebarHeader } from './SidebarHeader';
import { CommandPalette } from './CommandPalette';

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { isCollapsed, isCommandPaletteOpen } = useStore();

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      {/* Sidebar Navigation Rail */}
      <SidebarNav />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isCollapsed ? 'ml-0' : 'ml-0'
        }`}
      >
        {/* Header */}
        <SidebarHeader />

        {/* Module Content */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {children}
        </main>
      </div>

      {/* Command Palette Overlay */}
      {isCommandPaletteOpen && <CommandPalette />}
    </div>
  );
}
