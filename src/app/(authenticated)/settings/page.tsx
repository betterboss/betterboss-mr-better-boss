'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
  Settings,
  User,
  Key,
  Bell,
  Zap,
  ExternalLink,
  CheckCircle2,
  Globe,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  useEffect(() => {
    setLastSynced(new Date());
  }, []);

  const [notifications, setNotifications] = useState({
    overdueInvoices: true,
    newLeads: true,
    taskReminders: true,
    cashFlowAlerts: true,
    aiInsights: true,
    weeklyReport: false,
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-boss-400" />
          Settings
        </h1>
        <p className="text-xs text-dark-400">
          Configure your BetterBoss Sidebar
        </p>
      </div>

      {/* Account */}
      <div className="glass-card p-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-boss-400" />
          Account
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-dark-200">{session?.user?.name || 'User'}</p>
              <p className="text-[10px] text-dark-500">{session?.user?.email || ''}</p>
            </div>
            <div className="badge-success text-[10px] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Connected
            </div>
          </div>
          {session?.user?.organization && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-dark-400">Organization</p>
              <p className="text-xs text-dark-200">{session.user.organization}</p>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="btn-secondary w-full text-xs flex items-center justify-center gap-1.5 text-red-400 hover:text-red-300"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* JobTread Connection */}
      <div className="glass-card p-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Key className="w-4 h-4 text-boss-400" />
          JobTread Connection
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-dark-200">API Status</p>
              <p className="text-[10px] text-dark-500">
                {lastSynced ? `Last synced: ${lastSynced.toLocaleTimeString()}` : 'Syncing...'}
              </p>
            </div>
            <div className="badge-success text-[10px]">Active</div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-dark-400">API Endpoint</p>
            <p className="text-[10px] text-dark-500 font-mono">api.jobtread.com/graphql</p>
          </div>
          <a
            href="https://app.jobtread.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary w-full text-xs flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open JobTread
          </a>
        </div>
      </div>

      {/* Notifications */}
      <div className="glass-card p-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-boss-400" />
          Notifications
        </h2>
        <div className="space-y-2.5">
          {Object.entries(notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <p className="text-xs text-dark-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
              <button
                onClick={() => setNotifications((prev) => ({ ...prev, [key]: !value }))}
                className={cn(
                  'w-9 h-5 rounded-full transition-colors relative',
                  value ? 'bg-boss-500' : 'bg-dark-600'
                )}
              >
                <div className={cn(
                  'w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all',
                  value ? 'left-[18px]' : 'left-0.5'
                )} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* AI Configuration */}
      <div className="glass-card p-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-accent-400" />
          AI Configuration
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-dark-400 mb-1 block">Default Markup %</label>
            <input type="number" defaultValue={25} className="input-field text-xs" />
          </div>
          <div>
            <label className="text-xs text-dark-400 mb-1 block">Tax Rate %</label>
            <input type="number" defaultValue={8.25} step={0.01} className="input-field text-xs" />
          </div>
          <div>
            <label className="text-xs text-dark-400 mb-1 block">AI Estimate Confidence Threshold</label>
            <select className="input-field text-xs">
              <option value="80">80% (More suggestions)</option>
              <option value="90">90% (Balanced)</option>
              <option value="95">95% (High precision)</option>
            </select>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="glass-card p-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <HelpCircle className="w-4 h-4 text-boss-400" />
          About
        </h2>
        <div className="space-y-2 text-xs text-dark-400">
          <p>BetterBoss Sidebar v1.0.0</p>
          <p>Built by Better Boss &middot; America&apos;s #1 AI Automation for Contractors</p>
          <p>Powered by BetterBossOS&trade;</p>
          <div className="flex gap-2 mt-2">
            <a href="https://better-boss.ai" target="_blank" rel="noopener noreferrer"
               className="text-boss-400 hover:text-boss-300 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              better-boss.ai
            </a>
            <a href="https://mybetterboss.ai" target="_blank" rel="noopener noreferrer"
               className="text-boss-400 hover:text-boss-300 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              Resources
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
