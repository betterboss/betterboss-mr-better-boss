'use client';

import { useState } from 'react';
import {
  Users, Search, Target, Phone, Mail, Calendar, Star, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useContacts, type JTContact } from '@/lib/hooks/useJobTread';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/DataState';

function getScoreColor(score: number) {
  if (score >= 80) return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
  if (score >= 60) return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
  return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
}

// Simple heuristic lead score based on available data
function computeLeadScore(contact: JTContact): number {
  let score = 50;
  if (contact.email) score += 10;
  if (contact.phone) score += 10;
  if (contact.company) score += 10;
  if (contact.source) score += 5;
  if (contact.notes) score += 5;
  // Recent leads score higher
  if (contact.createdAt) {
    const days = (Date.now() - new Date(contact.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (days < 1) score += 15;
    else if (days < 3) score += 10;
    else if (days < 7) score += 5;
  }
  return Math.min(score, 100);
}

export default function LeadsPage() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'recent'>('score');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const { data: contacts, isLoading, error, refetch } = useContacts();

  if (isLoading) return <LoadingState label="Loading leads from JobTread..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const allContacts = contacts || [];

  // Filter to leads and add scores
  const leadsWithScores = allContacts.map((c) => ({
    ...c,
    score: computeLeadScore(c),
  }));

  const filteredLeads = leadsWithScores
    .filter((l) =>
      !search ||
      `${l.firstName} ${l.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      (l.company || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.email || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score;
      // recent
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

  const hotLeads = leadsWithScores.filter((l) => l.score >= 80).length;
  const activeLead = leadsWithScores.find((l) => l.id === selectedLeadId);

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
      </div>

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
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..." className="input-field pl-8 text-xs py-1.5" />
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
          <div className="grid grid-cols-3 gap-2">
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
