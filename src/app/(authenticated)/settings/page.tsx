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
  RefreshCw,
  Link,
  Eye,
  EyeOff,
  Webhook,
  Copy,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const SETTINGS_KEY = 'betterboss-settings';

interface AppSettings {
  notifications: Record<string, boolean>;
  defaultMarkup: number;
  taxRate: number;
  confidenceThreshold: string;
  ghlApiKey: string;
  ghlLocationId: string;
  ghlAutoSync: boolean;
}

function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return getDefaultSettings();
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...getDefaultSettings(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return getDefaultSettings();
}

function getDefaultSettings(): AppSettings {
  return {
    notifications: {
      overdueInvoices: true,
      newLeads: true,
      taskReminders: true,
      cashFlowAlerts: true,
      aiInsights: true,
      weeklyReport: false,
    },
    defaultMarkup: 25,
    taxRate: 8.25,
    confidenceThreshold: '90',
    ghlApiKey: '',
    ghlLocationId: '',
    ghlAutoSync: false,
  };
}

function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [settings, setSettings] = useState<AppSettings>(getDefaultSettings);
  const [showGhlKey, setShowGhlKey] = useState(false);
  const [ghlTestStatus, setGhlTestStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [ghlTesting, setGhlTesting] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState<{
    jt: string | null; ghl: string | null;
    config: Record<string, boolean | string | null>;
    missing: string[];
    ready: boolean;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [webhookTestStatus, setWebhookTestStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [webhookTesting, setWebhookTesting] = useState(false);

  useEffect(() => {
    setLastSynced(new Date());
    setSettings(loadSettings());
    // Fetch webhook config + URLs from server
    fetch('/api/webhooks/info')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setWebhookInfo(data); })
      .catch(() => {});
  }, []);

  const connectGhl = async () => {
    if (!settings.ghlApiKey || !settings.ghlLocationId) {
      setGhlTestStatus({ ok: false, message: 'Enter both API Key and Location ID first.' });
      return;
    }
    setGhlTesting(true);
    setGhlTestStatus(null);
    try {
      // Save creds server-side + validate GHL connection in one call
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ghlApiKey: settings.ghlApiKey, ghlLocationId: settings.ghlLocationId }),
      });
      const data = await res.json();
      if (data.ghlConnected) {
        setGhlTestStatus({
          ok: true,
          message: `Connected! ${data.ghlContactCount || 0} contacts in GHL. Credentials saved to server.`,
        });
        // Refresh webhook info now that creds are saved
        const infoRes = await fetch('/api/webhooks/info');
        if (infoRes.ok) {
          const info = await infoRes.json();
          setWebhookInfo(info);
        }
      } else {
        setGhlTestStatus({ ok: false, message: data.ghlError || 'Connection failed' });
      }
    } catch (err) {
      setGhlTestStatus({ ok: false, message: err instanceof Error ? err.message : 'Connection failed' });
    } finally {
      setGhlTesting(false);
    }
  };

  const copyUrl = (url: string, label: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const testWebhook = async (direction: 'jt-to-ghl' | 'ghl-to-jt') => {
    setWebhookTesting(true);
    setWebhookTestStatus(null);
    try {
      const res = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setWebhookTestStatus({ ok: true, message: data.message });
      } else {
        setWebhookTestStatus({ ok: false, message: data.error || data.fix || 'Test failed' });
      }
    } catch (err) {
      setWebhookTestStatus({ ok: false, message: err instanceof Error ? err.message : 'Test failed' });
    } finally {
      setWebhookTesting(false);
    }
  };

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  };

  const notifications = settings.notifications;

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

      {/* GoHighLevel Integration */}
      <div className="glass-card p-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Link className="w-4 h-4 text-accent-400" />
          GoHighLevel (GHL)
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-dark-400 mb-1 block">GHL API Key</label>
            <div className="relative">
              <input
                type={showGhlKey ? 'text' : 'password'}
                value={settings.ghlApiKey}
                onChange={(e) => updateSettings({ ghlApiKey: e.target.value.trim() })}
                placeholder="eyJhbGciOiJSUzI1NiIs..."
                className="input-field text-xs pr-8"
              />
              <button
                type="button"
                onClick={() => setShowGhlKey(!showGhlKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                aria-label={showGhlKey ? 'Hide API key' : 'Show API key'}
              >
                {showGhlKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-dark-400 mb-1 block">GHL Location ID</label>
            <input
              type="text"
              value={settings.ghlLocationId}
              onChange={(e) => updateSettings({ ghlLocationId: e.target.value.trim() })}
              placeholder="loc_abc123..."
              className="input-field text-xs"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-dark-300">Auto-Sync Leads</p>
              <p className="text-[10px] text-dark-500">Mirror new JT contacts to GHL automatically</p>
            </div>
            <button
              onClick={() => updateSettings({ ghlAutoSync: !settings.ghlAutoSync })}
              className={cn(
                'w-9 h-5 rounded-full transition-colors relative',
                settings.ghlAutoSync ? 'bg-boss-500' : 'bg-dark-600'
              )}
              aria-label="Toggle auto-sync"
            >
              <div className={cn(
                'w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all',
                settings.ghlAutoSync ? 'left-[18px]' : 'left-0.5'
              )} />
            </button>
          </div>
          <button
            onClick={connectGhl}
            disabled={ghlTesting || !settings.ghlApiKey || !settings.ghlLocationId}
            className="btn-primary w-full text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', ghlTesting && 'animate-spin')} />
            {ghlTesting ? 'Connecting...' : 'Connect & Save'}
          </button>
          {ghlTestStatus && (
            <div className={cn(
              'text-[10px] px-3 py-2 rounded-lg flex items-center gap-1.5',
              ghlTestStatus.ok
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            )}>
              {ghlTestStatus.ok ? <CheckCircle2 className="w-3 h-3" /> : null}
              {ghlTestStatus.message}
            </div>
          )}
        </div>
      </div>

      {/* Webhook URLs for JT / GHL workflows */}
      <div className="glass-card p-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
          <Webhook className="w-4 h-4 text-boss-400" />
          Workflow Webhooks
        </h2>
        <p className="text-[10px] text-dark-500 mb-3">
          Real-time contact sync between JobTread &amp; GoHighLevel via webhooks.
        </p>

        {/* Config status */}
        {webhookInfo && webhookInfo.missing.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-3">
            <p className="text-[10px] text-amber-400 font-medium flex items-center gap-1 mb-1.5">
              <AlertTriangle className="w-3 h-3" /> Missing Environment Variables
            </p>
            <ul className="text-[10px] text-amber-300/80 space-y-0.5">
              {webhookInfo.missing.map((v) => (
                <li key={v} className="font-mono">{v}</li>
              ))}
            </ul>
            <p className="text-[10px] text-dark-500 mt-1.5">
              Add these in your Vercel dashboard → Settings → Environment Variables, then redeploy.
            </p>
          </div>
        )}

        {webhookInfo?.ready && webhookInfo.jt && webhookInfo.ghl ? (
          <div className="space-y-3">
            {/* Status badge */}
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              All configured — ready to sync
            </div>

            {/* JT → GHL */}
            <div>
              <label className="text-xs text-dark-400 mb-1 block">JT → GHL Webhook URL</label>
              <div className="flex gap-1.5">
                <input type="text" readOnly value={webhookInfo.jt}
                  className="input-field text-[10px] font-mono flex-1" />
                <button onClick={() => copyUrl(webhookInfo.jt!, 'jt')}
                  className="btn-secondary px-2 flex items-center gap-1 text-[10px] flex-shrink-0">
                  {copied === 'jt' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied === 'jt' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[10px] text-dark-600 mt-1">
                JobTread → Workflows → New → Trigger: &quot;Contact Created&quot; → Action: &quot;Send Webhook&quot; → paste above
              </p>
            </div>

            {/* GHL → JT */}
            <div>
              <label className="text-xs text-dark-400 mb-1 block">GHL → JT Webhook URL</label>
              <div className="flex gap-1.5">
                <input type="text" readOnly value={webhookInfo.ghl}
                  className="input-field text-[10px] font-mono flex-1" />
                <button onClick={() => copyUrl(webhookInfo.ghl!, 'ghl')}
                  className="btn-secondary px-2 flex items-center gap-1 text-[10px] flex-shrink-0">
                  {copied === 'ghl' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied === 'ghl' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[10px] text-dark-600 mt-1">
                GHL → Automations → New → Trigger: &quot;Contact Created&quot; → Action: &quot;Webhook&quot; → paste above
              </p>
            </div>

            {/* Test buttons */}
            <div className="flex gap-2">
              <button onClick={() => testWebhook('jt-to-ghl')} disabled={webhookTesting}
                className="btn-secondary flex-1 text-[10px] py-1.5 flex items-center justify-center gap-1 disabled:opacity-50">
                <Play className={cn('w-3 h-3', webhookTesting && 'animate-spin')} />
                Test JT → GHL
              </button>
              <button onClick={() => testWebhook('ghl-to-jt')} disabled={webhookTesting}
                className="btn-secondary flex-1 text-[10px] py-1.5 flex items-center justify-center gap-1 disabled:opacity-50">
                <Play className={cn('w-3 h-3', webhookTesting && 'animate-spin')} />
                Test GHL → JT
              </button>
            </div>

            {webhookTestStatus && (
              <div className={cn(
                'text-[10px] px-3 py-2 rounded-lg flex items-center gap-1.5',
                webhookTestStatus.ok
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              )}>
                {webhookTestStatus.ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {webhookTestStatus.message}
              </div>
            )}
          </div>
        ) : !webhookInfo ? (
          <div className="text-[10px] text-dark-500">Loading webhook config...</div>
        ) : (
          <div className="text-[10px] text-dark-500 bg-dark-800/50 rounded-lg p-3">
            Fix the missing environment variables above to enable webhooks.
          </div>
        )}
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
                onClick={() => updateSettings({ notifications: { ...notifications, [key]: !value } })}
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
            <input type="number" value={settings.defaultMarkup} min={0} max={500}
              onChange={(e) => updateSettings({ defaultMarkup: Number(e.target.value) || 0 })}
              className="input-field text-xs" />
          </div>
          <div>
            <label className="text-xs text-dark-400 mb-1 block">Tax Rate %</label>
            <input type="number" value={settings.taxRate} step={0.01} min={0} max={100}
              onChange={(e) => updateSettings({ taxRate: Number(e.target.value) || 0 })}
              className="input-field text-xs" />
          </div>
          <div>
            <label className="text-xs text-dark-400 mb-1 block">AI Estimate Confidence Threshold</label>
            <select value={settings.confidenceThreshold}
              onChange={(e) => updateSettings({ confidenceThreshold: e.target.value })}
              className="input-field text-xs">
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
