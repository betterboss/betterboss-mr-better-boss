'use client';

import { useStore } from '@/lib/hooks/useStore';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  Calculator,
  Users,
  DollarSign,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const navItems = [
  {
    id: 'dashboard' as const,
    label: 'Command Center',
    icon: LayoutDashboard,
    path: '/dashboard',
    description: 'AI-powered overview of your business',
  },
  {
    id: 'jobs' as const,
    label: 'Job Pulse',
    icon: Briefcase,
    path: '/jobs',
    description: 'Real-time job tracking & budgets',
  },
  {
    id: 'estimates' as const,
    label: 'Smart Estimator',
    icon: Calculator,
    path: '/estimates',
    description: 'AI-powered 4-minute estimates',
  },
  {
    id: 'leads' as const,
    label: 'Lead Autopilot',
    icon: Users,
    path: '/leads',
    description: 'AI lead scoring & automation',
  },
  {
    id: 'finances' as const,
    label: 'Cash Flow Radar',
    icon: DollarSign,
    path: '/finances',
    description: 'Financial intelligence & forecasting',
  },
  {
    id: 'assistant' as const,
    label: 'AI Assistant',
    icon: Bot,
    path: '/assistant',
    description: 'Your AI-powered construction expert',
  },
  {
    id: 'settings' as const,
    label: 'Settings',
    icon: Settings,
    path: '/settings',
    description: 'Configure your sidebar',
  },
];

export function SidebarNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { isCollapsed, toggleCollapsed } = useStore();

  return (
    <nav
      className={cn(
        'h-screen flex flex-col bg-dark-900/80 border-r border-dark-700/50 transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 p-3 border-b border-dark-700/50">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-boss-500 to-boss-600 flex items-center justify-center shadow-lg shadow-boss-500/20">
          <Zap className="w-5 h-5 text-white" />
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white truncate">
              Better<span className="text-boss-400">Boss</span>
            </h2>
            <p className="text-[10px] text-dark-500 truncate">JobTread Sidebar</p>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <div className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all duration-200 group relative',
                isActive
                  ? 'bg-boss-500/10 text-boss-400'
                  : 'text-dark-400 hover:text-dark-100 hover:bg-dark-700/50'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-boss-500 rounded-r" />
              )}
              <Icon className={cn('w-4.5 h-4.5 flex-shrink-0', isActive && 'text-boss-400')} />
              {!isCollapsed && (
                <div className="min-w-0 text-left">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                </div>
              )}
              {isActive && item.id === 'assistant' && (
                <div className="live-indicator ml-auto" />
              )}
            </button>
          );
        })}
      </div>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-dark-700/50">
        <button
          onClick={toggleCollapsed}
          className="w-full flex items-center justify-center p-2 rounded-lg text-dark-500 hover:text-dark-300 hover:bg-dark-700/50 transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </nav>
  );
}
