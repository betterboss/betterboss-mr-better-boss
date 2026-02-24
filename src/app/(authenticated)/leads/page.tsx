'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Users, Search, Target, Phone, Mail, Calendar, Star, Zap, RefreshCw, Upload, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useContacts, type JTContact } from '@/lib/hooks/useJobTread';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/DataState';
import { useDebounce } from '@/lib/hooks/useDebounce';

const SETTINGS_KEY = 'betterboss-settings';
const GHL_SYNCED_KEY = 'betterboss-ghl-synced';

function getGHLSettings(): { ghlApiKey: string; ghlLocationId: string; ghlAutoSync: boolean } {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ghlApiKey: parsed.ghlApiKey || '',
        ghlLocationId: parsed.ghlLocationId || '',
        ghlAutoSync: parsed.ghlAutoSync || false,
      };
    }
  } catch { /* ignore */ }
  return { ghlApiKey: '', ghlLocationId: '', ghlAutoSync: false };
}

function getSyncedIds(): string[] {
  try {
    const raw = localStorage.getItem(GHL_SYNCED_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveSyncedIds(ids: string[]) {
  try {
    localStorage.setItem(GHL_SYNCED_KEY, JSON.stringify(ids));
  } catch { /* ignore */ }
}

function getScoreColor(score: number) {
  if (score >= 80) return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
  if (score >= 60) return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
  return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
}

function computeLeadScore(contact: JTContact): number {
  let score = 50;
  if (contact.email) score += 10;
  if (contact.phone) score += 10;
  if (contact.company) score += 10;
  if (contact.source) score += 5;
  if (contact.notes) score += 5;
  if (contact.createdAt) {
    const days = (Date.now() - new Date(contact.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (days < 1) score += 15;
    else if (days < 3) score += 10;
    else if (days < 7) score += 5;
  }
  return Math.min(score, 100);
}

export default function LeadsPage() {
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 300);
  const [sortBy, setSortBy] = useState<'score' | 'recent'>('score');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [ghlSyncing, setGhlSyncing] = useState(false);
  const [ghlStatus, setGhlStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const autoSyncRan = useRef(false);

  const { data: contacts, isLoading, error, refetch } = useContacts();

  const ghlConfigured = useCallback(() => {
    const { ghlApiKey, ghlLocationId } = getGHLSettings();
    return Boolean(ghlApiKey && ghlLocationId);
  }, []);

  const syncToGHL = useCallback(async (contactId?: string, isAuto = false) => {
    const { ghlApiKey, ghlLocationId } = getGHLSettings();
    if (!ghlApiKey || !ghlLocationId) {
      if (!isAuto) {
        setGhlStatus({ message: 'Add your GHL API Key and Location ID in Settings first.', type: 'error' });
      }
      return;
    }

    setGhlSyncing(true);
    if (!isAuto) setGhlStatus(null);

    try {
      const syncedIds = getSyncedIds();
      const res = await fetch('/api/ghl/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(contactId ? { contactId } : {}),
          ghlApiKey,
          ghlLocationId,
          mode: isAuto ? 'auto' : 'full',
          syncedIds: isAuto ? syncedIds : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (!isAuto) setGhlStatus({ message: data.error || 'Sync failed', type: 'error' });
      } else {
        // Merge newly synced IDs into our local record
        if (data.syncedIds?.length) {
          const merged = Array.from(new Set([...syncedIds, ...data.syncedIds]));
          saveSyncedIds(merged);
        }
        const total = (data.synced || 0) + (data.pulled || 0);
        if (isAuto && total > 0) {
          const parts: string[] = [];
          if (data.synced > 0) parts.push(`${data.synced} to GHL`);
          if (data.pulled > 0) parts.push(`${data.pulled} from GHL`);
          setGhlStatus({ message: `Auto-synced ${parts.join(', ')}`, type: 'success' });
          if (data.pulled > 0) refetch(); // refresh list to show new GHL contacts
        } else if (!isAuto) {
          setGhlStatus({ message: data.message, type: 'success' });
          if (data.pulled > 0) refetch();
        }
      }
    } catch (err) {
      if (!isAuto) {
        setGhlStatus({ message: err instanceof Error ? err.message : 'Sync failed', type: 'error' });
      }
    } finally {
      setGhlSyncing(false);
    }
  }, [refetch]);

  // Auto-sync: when contacts load and auto-sync is enabled, push new ones to GHL
  useEffect(() => {
    if (!contacts || contacts.length === 0 || autoSyncRan.current) return;
    const { ghlAutoSync } = getGHLSettings();
    if (!ghlAutoSync || !ghlConfigured()) return;

    // Check if there are un-synced contacts
    const syncedIds = new Set(getSyncedIds());
    const unsynced = contacts.filter((c) => !syncedIds.has(c.id));
    if (unsynced.length === 0) return;

    autoSyncRan.current = true;
    syncToGHL(undefined, true);
  }, [contacts, ghlConfigured, syncToGHL]);

  if (isLoading) return <LoadingState label="Loading leads from JobTread..." />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  const allContacts = contacts || [];

  const leadsWithScores = useMemo(
    () => allContacts.map((c) => ({ ...c, score: computeLeadScore(c) })),
    [allContacts]
  );

  const filteredLeads = useMemo(
    () => {
      const lowerSearch = search.toLowerCase();
      return leadsWithScores
        .filter((l) =>
          !search ||
          `${l.firstName} ${l.lastName}`.toLowerCase().includes(lowerSearch) ||
          (l.company || '').toLowerCase().includes(lowerSearch) ||
          (l.email || '').toLowerCase().includes(lowerSearch)
        )
        .sort((a, b) => {
          if (sortBy === 'score') return b.score - a.score;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
    },
    [leadsWithScores, search, sortBy]
  );

  const hotLeads = useMemo(() => leadsWithScores.filter((l) => l.score >= 80).length, [leadsWithScores]);
  const activeLead = useMemo(() => leadsWithScores.find((l) => l.id === selectedLeadId), [leadsWithScores, selectedLeadId]);
  const isGhlConfigured = ghlConfigured();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-boss-400" />
            Lead Autopilot
          </h1>
          <p className="text-xs text-dark-400">
            {filteredLeads.length} of {allContacts.length} contacts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} aria-label="Refresh contacts"
            className="btn-secondary text-[10px] px-2 py-1 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
          </button>
          <button onClick={() => syncToGHL()} disabled={ghlSyncing} aria-label="Sync all contacts to GoHighLevel"
            className={cn(
              'btn-secondary text-[10px] px-2.5 py-1 flex items-center gap-1 disabled:opacity-50',
              isGhlConfigured ? 'text-accent-400 border-accent-500/30' : ''
            )}>
            <Upload className={cn('w-3 h-3', ghlSyncing && 'animate-spin')} />
            {ghlSyncing ? 'Syncing...' : 'Sync GHL'}
          </button>
        </div>
      </div>

      {/* GHL Status */}
      {!isGhlConfigured && (
        <div className="glass-card p-3 text-xs text-dark-400 border-dark-700/50 flex items-center gap-2">
          <Upload className="w-3.5 h-3.5 text-dark-500 flex-shrink-0" />
          <span>GHL sync not configured. <a href="/settings" className="text-boss-400 hover:text-boss-300 underline">Add your API key in Settings</a></span>
        </div>
      )}

      {ghlStatus && (
        <div className={cn(
          'glass-card p-3 text-xs flex items-center justify-between',
          ghlStatus.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : 'border-red-500/20 bg-red-500/5 text-red-400'
        )}>
          <span className="flex items-center gap-1.5">
            {ghlStatus.type === 'success' && <CheckCircle2 className="w-3 h-3" />}
            {ghlStatus.message}
          </span>
          <button onClick={() => setGhlStatus(null)} className="text-dark-500 hover:text-dark-300 ml-2">&times;</button>
        </div>
      )}

      {/* Pipeline Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold text-white">{allContacts.length}</p>
          <p className="text-[10px] text-dark-500 uppercase tracking-wider">
            Total Contacts
          </p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold text-emerald-400">{hotLeads}</p>
          <p className="text-[10px] text-dark-500 uppercase tracking-wider flex items-center justify-center gap-1">
            <Star className="w-3 h-3 text-accent-400" />
            Hot Leads
          </p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold text-accent-400">
            {leadsWithScores.length > 0
              ? Math.round(leadsWithScores.reduce((s, l) => s + l.score, 0) / leadsWithScores.length)
              : 0}
          </p>
          <p className="text-[10px] text-dark-500 uppercase tracking-wider">Avg Score</p>
        </div>
      </div>

      {/* Search & Sort */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
          <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search contacts..." aria-label="Search contacts" className="input-field pl-8 text-xs py-1.5" />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="input-field text-xs py-1.5 w-28">
          <option value="score">AI Score</option>
          <option value="recent">Recent</option>
        </select>
      </div>

      {/* Selected Lead Detail */}
      {activeLead && (
        <div className="glass-card p-4 glow-border animate-fade-in">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-white">{activeLead.firstName} {activeLead.lastName}</p>
              {activeLead.company && <p className="text-xs text-dark-400">{activeLead.company}</p>}
              <p className="text-xs text-dark-500">
                {activeLead.type || 'Contact'}
                {activeLead.source ? ` \u00b7 ${activeLead.source}` : ''}
              </p>
            </div>
            <div className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold',
              getScoreColor(activeLead.score).bg, getScoreColor(activeLead.score).text
            )}>
              <Target className="w-3.5 h-3.5" />
              {activeLead.score}
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-1.5 mb-3">
            {activeLead.email && (
              <div className="flex items-center gap-2 text-xs text-dark-300">
                <Mail className="w-3 h-3 text-dark-500" />
                {activeLead.email}
              </div>
            )}
            {activeLead.phone && (
              <div className="flex items-center gap-2 text-xs text-dark-300">
                <Phone className="w-3 h-3 text-dark-500" />
                {activeLead.phone}
              </div>
            )}
            {activeLead.createdAt && (
              <div className="flex items-center gap-2 text-xs text-dark-300">
                <Calendar className="w-3 h-3 text-dark-500" />
                Added {new Date(activeLead.createdAt).toLocaleDateString()}
              </div>
            )}
          </div>

          {activeLead.notes && (
            <div className="bg-accent-500/5 border border-accent-500/10 rounded-lg p-3 mb-3">
              <p className="text-[10px] text-accent-400 font-medium flex items-center gap-1 mb-1">
                <Zap className="w-3 h-3" /> NOTES
              </p>
              <p className="text-xs text-dark-200 leading-relaxed">{activeLead.notes}</p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            {activeLead.phone && (
              <a href={`tel:${activeLead.phone}`} className="quick-action">
                <Phone className="w-4 h-4 text-boss-400" />
                <span className="text-[10px] text-dark-300">Call</span>
              </a>
            )}
            {activeLead.email && (
              <a href={`mailto:${activeLead.email}`} className="quick-action">
                <Mail className="w-4 h-4 text-boss-400" />
                <span className="text-[10px] text-dark-300">Email</span>
              </a>
            )}
            <button className="quick-action" onClick={() => syncToGHL(activeLead.id)} disabled={ghlSyncing}>
              <Upload className={cn('w-4 h-4 text-boss-400', ghlSyncing && 'animate-spin')} />
              <span className="text-[10px] text-dark-300">Sync GHL</span>
            </button>
            <button className="quick-action">
              <Calendar className="w-4 h-4 text-boss-400" />
              <span className="text-[10px] text-dark-300">Schedule</span>
            </button>
          </div>
        </div>
      )}

      {/* Lead List */}
      {filteredLeads.length === 0 ? (
        <EmptyState icon={Users} title="No contacts found" description={search ? 'Try a different search term.' : 'No contacts in your JobTread account yet.'} />
      ) : (
        <div className="space-y-2">
          {filteredLeads.map((lead) => {
            const scoreColors = getScoreColor(lead.score);
            return (
              <div key={lead.id}
                onClick={() => setSelectedLeadId(lead.id === selectedLeadId ? null : lead.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedLeadId(lead.id === selectedLeadId ? null : lead.id); } }}
                role="button" tabIndex={0}
                className={cn('glass-card p-3 cursor-pointer transition-all group', selectedLeadId === lead.id && 'border-boss-500/30')}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-dark-100 group-hover:text-boss-400 transition-colors truncate">
                        {lead.firstName} {lead.lastName}
                      </p>
                      {lead.score >= 80 && <Star className="w-3 h-3 text-accent-400 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-dark-500 mt-0.5">
                      {lead.company && <span>{lead.company}</span>}
                      {lead.company && lead.source && <span>&middot;</span>}
                      {lead.source && <span>{lead.source}</span>}
                      {lead.createdAt && (
                        <>
                          <span>&middot;</span>
                          <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold',
                    scoreColors.bg, scoreColors.text
                  )}>
                    {lead.score}
                  </div>
                </div>
                {lead.email && (
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-dark-500">
                    <Mail className="w-3 h-3" />
                    {lead.email}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
