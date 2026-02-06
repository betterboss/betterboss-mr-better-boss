'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/hooks/useStore';
import {
  Search,
  LayoutDashboard,
  Briefcase,
  Calculator,
  Users,
  DollarSign,
  Bot,
  Plus,
  FileText,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  category: string;
}

export function CommandPalette() {
  const router = useRouter();
  const { toggleCommandPalette } = useStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    // Navigation
    { id: 'nav-dashboard', label: 'Command Center', description: 'Go to AI dashboard', icon: LayoutDashboard, action: () => router.push('/dashboard'), category: 'Navigate' },
    { id: 'nav-jobs', label: 'Job Pulse', description: 'View active jobs', icon: Briefcase, action: () => router.push('/jobs'), category: 'Navigate' },
    { id: 'nav-estimates', label: 'Smart Estimator', description: 'Create AI estimates', icon: Calculator, action: () => router.push('/estimates'), category: 'Navigate' },
    { id: 'nav-leads', label: 'Lead Autopilot', description: 'Manage leads & scoring', icon: Users, action: () => router.push('/leads'), category: 'Navigate' },
    { id: 'nav-finances', label: 'Cash Flow Radar', description: 'Financial analytics', icon: DollarSign, action: () => router.push('/finances'), category: 'Navigate' },
    { id: 'nav-assistant', label: 'AI Assistant', description: 'Chat with AI', icon: Bot, action: () => router.push('/assistant'), category: 'Navigate' },
    // Quick Actions
    { id: 'action-new-job', label: 'New Job', description: 'Create a new job in JobTread', icon: Plus, action: () => router.push('/jobs?action=new'), category: 'Quick Actions' },
    { id: 'action-new-estimate', label: 'New AI Estimate', description: 'Generate estimate with AI', icon: Calculator, action: () => router.push('/estimates?action=new'), category: 'Quick Actions' },
    { id: 'action-new-lead', label: 'Add Lead', description: 'Add a new lead', icon: Users, action: () => router.push('/leads?action=new'), category: 'Quick Actions' },
    { id: 'action-new-invoice', label: 'Create Invoice', description: 'Generate a new invoice', icon: FileText, action: () => router.push('/finances?action=invoice'), category: 'Quick Actions' },
    // AI Actions
    { id: 'ai-analyze', label: 'AI Business Analysis', description: 'Get AI insights on your business', icon: Zap, action: () => router.push('/assistant?prompt=analyze'), category: 'AI Actions' },
    { id: 'ai-forecast', label: 'AI Cash Flow Forecast', description: 'Predict cash flow trends', icon: DollarSign, action: () => router.push('/assistant?prompt=forecast'), category: 'AI Actions' },
  ];

  const filtered = commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        toggleCommandPalette();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        toggleCommandPalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filtered, selectedIndex, toggleCommandPalette]);

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20%]">
      <div className="absolute inset-0 bg-dark-950/60 backdrop-blur-sm" onClick={toggleCommandPalette} />

      <div className="relative w-full max-w-md glass-card shadow-2xl shadow-dark-950/80 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-700/50">
          <Search className="w-4 h-4 text-dark-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-dark-100 placeholder:text-dark-500 focus:outline-none"
          />
          <kbd className="text-[10px] text-dark-500 bg-dark-700 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto py-2">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <p className="px-4 py-1 text-[10px] uppercase tracking-wider text-dark-500 font-medium">
                {category}
              </p>
              {items.map((item) => {
                flatIndex++;
                const idx = flatIndex;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.action();
                      toggleCommandPalette();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
                      idx === selectedIndex
                        ? 'bg-boss-500/10 text-boss-400'
                        : 'text-dark-300 hover:bg-dark-700/30'
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.label}</p>
                      <p className="text-xs text-dark-500 truncate">{item.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-dark-500">
              No commands found for &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
