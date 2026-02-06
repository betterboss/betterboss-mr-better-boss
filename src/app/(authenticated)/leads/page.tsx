'use client';

import { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Target,
  TrendingUp,
  Phone,
  Mail,
  Calendar,
  Star,
  ArrowUpRight,
  Zap,
  MessageSquare,
  Clock,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils/cn';

// Why this feature exists:
// Better Boss clients see 23% higher close rates with AI lead scoring.
// Problem solved: Contractors waste time on low-quality leads while hot leads go cold.
// AI scores leads based on project value, response time, source quality, and engagement signals.

interface Lead {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  source: string;
  projectType: string;
  estimatedValue: number;
  score: number;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';
  lastContact?: string;
  notes?: string;
  createdAt: string;
  aiRecommendation: string;
}

const demoLeads: Lead[] = [
  {
    id: '1', name: 'Robert Thompson', company: 'Thompson Corp', email: 'robert@thompsoncorp.com',
    phone: '(512) 555-0147', source: 'Google Ads', projectType: 'Commercial Roof',
    estimatedValue: 125000, score: 92, status: 'QUALIFIED', lastContact: '2h ago',
    createdAt: '3 days ago',
    aiRecommendation: 'Schedule on-site estimate within 24hrs. High-value commercial lead with urgent timeline. Decision maker confirmed.',
  },
  {
    id: '2', name: 'Lisa Chen', email: 'lisa.chen@email.com',
    phone: '(214) 555-0293', source: 'Referral', projectType: 'Kitchen Remodel',
    estimatedValue: 55000, score: 87, status: 'NEW', lastContact: undefined,
    createdAt: '1 hour ago',
    aiRecommendation: 'Call within 5 minutes. Referral leads convert 3x higher. She mentioned wanting to start within 2 weeks.',
  },
  {
    id: '3', name: 'David Brown', email: 'david.b@brownhomes.com',
    phone: '(713) 555-0418', source: 'Website Form', projectType: 'Full Reroof',
    estimatedValue: 42000, score: 78, status: 'CONTACTED',
    lastContact: '1 day ago', createdAt: '5 days ago',
    aiRecommendation: 'Follow up with detailed proposal. Engaged with pricing page 3 times. Ready to compare quotes.',
  },
  {
    id: '4', name: 'Jennifer Adams', email: 'jen@email.com',
    phone: '(210) 555-0562', source: 'HomeAdvisor', projectType: 'Bathroom Remodel',
    estimatedValue: 28000, score: 65, status: 'CONTACTED',
    lastContact: '3 days ago', createdAt: '1 week ago',
    aiRecommendation: 'Send case study of similar bathroom project. Budget-conscious but serious. Price sensitivity detected.',
  },
  {
    id: '5', name: 'Mark Wilson', company: 'Wilson Properties', email: 'mark@wilsonprop.com',
    phone: '(512) 555-0891', source: 'Repeat Customer', projectType: 'Multi-unit Roofing',
    estimatedValue: 210000, score: 95, status: 'PROPOSAL',
    lastContact: '6h ago', createdAt: '2 weeks ago',
    aiRecommendation: 'Proposal viewed 4 times. Call to address remaining questions. 89% probability of close.',
  },
  {
    id: '6', name: 'Karen Mitchell', email: 'karen.m@email.com',
    phone: '(817) 555-0334', source: 'Google Organic', projectType: 'Roof Repair',
    estimatedValue: 8500, score: 42, status: 'NEW',
    createdAt: '4 hours ago',
    aiRecommendation: 'Auto-respond with info packet. Low-value repair lead. Route to junior estimator.',
  },
];

const pipelineStats = {
  totalLeads: demoLeads.length,
  totalValue: demoLeads.reduce((sum, l) => sum + l.estimatedValue, 0),
  avgScore: Math.round(demoLeads.reduce((sum, l) => sum + l.score, 0) / demoLeads.length),
  hotLeads: demoLeads.filter((l) => l.score >= 80).length,
  conversionRate: 41.2,
};

function getScoreColor(score: number) {
  if (score >= 80) return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
  if (score >= 60) return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
  return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
}

export default function LeadsPage() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'value' | 'recent'>('score');
  const [selectedLead, setSelectedLead] = useState<string | null>(null);

  const sortedLeads = [...demoLeads]
    .filter((l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.projectType.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score;
      if (sortBy === 'value') return b.estimatedValue - a.estimatedValue;
      return 0;
    });

  const activeLead = demoLeads.find((l) => l.id === selectedLead);

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
            AI-powered lead scoring & follow-up automation
          </p>
        </div>
        <button className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add Lead
        </button>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold text-white">{pipelineStats.hotLeads}</p>
          <p className="text-[10px] text-dark-500 uppercase tracking-wider flex items-center justify-center gap-1">
            <Star className="w-3 h-3 text-accent-400" />
            Hot Leads
          </p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold text-emerald-400">{formatCurrency(pipelineStats.totalValue)}</p>
          <p className="text-[10px] text-dark-500 uppercase tracking-wider">Pipeline Value</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold text-accent-400">{pipelineStats.conversionRate}%</p>
          <p className="text-[10px] text-dark-500 uppercase tracking-wider">Close Rate</p>
        </div>
      </div>

      {/* Search & Sort */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="input-field pl-8 text-xs py-1.5"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="input-field text-xs py-1.5 w-28"
        >
          <option value="score">AI Score</option>
          <option value="value">Value</option>
          <option value="recent">Recent</option>
        </select>
      </div>

      {/* Selected Lead Detail */}
      {activeLead && (
        <div className="glass-card p-4 glow-border animate-fade-in">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-white">{activeLead.name}</p>
              {activeLead.company && <p className="text-xs text-dark-400">{activeLead.company}</p>}
              <p className="text-xs text-dark-500">{activeLead.projectType} &middot; {activeLead.source}</p>
            </div>
            <div className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold',
              getScoreColor(activeLead.score).bg, getScoreColor(activeLead.score).text
            )}>
              <Target className="w-3.5 h-3.5" />
              {activeLead.score}
            </div>
          </div>

          {/* AI Recommendation */}
          <div className="bg-accent-500/5 border border-accent-500/10 rounded-lg p-3 mb-3">
            <p className="text-[10px] text-accent-400 font-medium flex items-center gap-1 mb-1">
              <Zap className="w-3 h-3" />
              AI RECOMMENDATION
            </p>
            <p className="text-xs text-dark-200 leading-relaxed">{activeLead.aiRecommendation}</p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-2">
            <button className="quick-action">
              <Phone className="w-4 h-4 text-boss-400" />
              <span className="text-[10px] text-dark-300">Call</span>
            </button>
            <button className="quick-action">
              <Mail className="w-4 h-4 text-boss-400" />
              <span className="text-[10px] text-dark-300">Email</span>
            </button>
            <button className="quick-action">
              <Calendar className="w-4 h-4 text-boss-400" />
              <span className="text-[10px] text-dark-300">Schedule</span>
            </button>
          </div>
        </div>
      )}

      {/* Lead List */}
      <div className="space-y-2">
        {sortedLeads.map((lead) => {
          const scoreColors = getScoreColor(lead.score);
          return (
            <div
              key={lead.id}
              onClick={() => setSelectedLead(lead.id === selectedLead ? null : lead.id)}
              className={cn(
                'glass-card p-3 cursor-pointer transition-all group',
                selectedLead === lead.id && 'border-boss-500/30'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-dark-100 group-hover:text-boss-400 transition-colors truncate">
                      {lead.name}
                    </p>
                    {lead.score >= 80 && <Star className="w-3 h-3 text-accent-400 flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-dark-500 mt-0.5">
                    <span>{lead.projectType}</span>
                    <span>&middot;</span>
                    <span>{lead.source}</span>
                    <span>&middot;</span>
                    <span>{lead.createdAt}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-dark-300">{formatCurrency(lead.estimatedValue)}</span>
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold',
                    scoreColors.bg, scoreColors.text
                  )}>
                    {lead.score}
                  </div>
                </div>
              </div>

              {lead.lastContact && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-dark-500">
                  <Clock className="w-3 h-3" />
                  Last contact: {lead.lastContact}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
