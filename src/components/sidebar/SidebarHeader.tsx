'use client';

import { useSession, signOut } from 'next-auth/react';
import { useStore } from '@/lib/hooks/useStore';
import {
  Search,
  Bell,
  Command,
  LogOut,
  User,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

export function SidebarHeader() {
  const { data: session } = useSession();
  const { globalSearch, setGlobalSearch, toggleCommandPalette, notifications } = useStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="flex items-center gap-2 px-4 py-2.5 border-b border-dark-700/50 bg-dark-900/40 backdrop-blur-sm">
      {/* Search */}
      <div className="flex-1 relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
        <input
          type="text"
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          placeholder="Search jobs, contacts, estimates..."
          className="w-full bg-dark-800/60 border border-dark-700/50 rounded-lg pl-8 pr-8 py-1.5 text-xs text-dark-200
                     placeholder:text-dark-500 focus:outline-none focus:ring-1 focus:ring-boss-500/40 focus:border-boss-500/40"
        />
        <button
          onClick={toggleCommandPalette}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1 py-0.5 rounded bg-dark-700 text-dark-500 text-[10px]"
          title="Command palette (Ctrl+K)"
        >
          <Command className="w-2.5 h-2.5" />K
        </button>
      </div>

      {/* Notifications */}
      <button className="relative p-1.5 rounded-lg hover:bg-dark-700/50 text-dark-400 hover:text-dark-200 transition-colors">
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-accent-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* User Menu */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 p-1 rounded-lg hover:bg-dark-700/50 transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-boss-500 to-boss-600 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
        </button>

        {showUserMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
            <div className="absolute right-0 top-full mt-1 z-50 w-56 glass-card p-1.5 shadow-xl shadow-dark-950/50">
              <div className="px-3 py-2 border-b border-dark-700/50 mb-1">
                <p className="text-sm font-medium text-dark-100">{session?.user?.name || 'User'}</p>
                <p className="text-xs text-dark-500">{session?.user?.email || ''}</p>
                {session?.user?.organization && (
                  <p className="text-xs text-boss-400 mt-0.5">{session.user.organization}</p>
                )}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm',
                  'text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors'
                )}
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
