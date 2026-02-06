'use client';

import { useState } from 'react';
import {
  Briefcase,
  DollarSign,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Target,
  BarChart3,
  Activity,
} from 'lucide-react';
import { cn, formatCurrency, formatPercent } from '@/lib/utils/cn';

// Demo metrics - in production these come from JobTread API
const metrics = {
  activeJobs: 23,
  totalRevenue: 1847500,
  totalProfit: 412300,
  avgMargin: 22.3,
  outstandingInvoices: 8,
  overdueInvoices: 2,
  leadsThisMonth: 17,
  conversionRate: 41.2,
  upcomingTasks: 34,
  overdueTasks: 5,
  revenueChange: 12.4,
  profitChange: 8.7,
  daysReclaimed: 52,
  estimateSpeed: '3.8 min',
};

const recentActivity = [
  { id: '1', type: 'job', action: 'Job moved to In Progress', detail: 'Johnson Roof Replacement', time: '12m ago', color: 'text-emerald-400' },
  { id: '2', type: 'estimate', action: 'Estimate accepted', detail: 'Garcia Kitchen Remodel - $47,200', time: '34m ago', color: 'text-boss-400' },
  { id: '3', type: 'invoice', action: 'Payment received', detail: '$12,500 from Smith Residence', time: '1h ago', color: 'text-green-400' },
  { id: '4', type: 'lead', action: 'New high-score lead', detail: 'Thompson - Commercial Roofing (Score: 92)', time: '2h ago', color: 'text-accent-400' },
  { id: '5', type: 'task', action: 'Task overdue', detail: 'Material order for Patel project', time: '3h ago', color: 'text-red-400' },
  { id: '6', type: 'ai', action: 'AI Insight', detail: 'Cash flow dip projected in 14 days', time: '4h ago', color: 'text-amber-400' },
];

const topJobs = [
  { name: 'Henderson Full Reroof', value: 68500, progress: 72, status: 'IN_PROGRESS' },
  { name: 'Garcia Kitchen Remodel', value: 47200, progress: 15, status: 'CONTRACT' },
  { name: 'Thompson Commercial', value: 125000, progress: 45, status: 'IN_PROGRESS' },
  { name: 'Wilson Bathroom Suite', value: 32800, progress: 90, status: 'IN_PROGRESS' },
];

const aiInsights = [
  { icon: Target, text: '3 proposals expiring this week - follow up to close $94K', priority: 'high' },
  { icon: DollarSign, text: 'Invoice #1047 is 15 days overdue ($8,200) - send reminder', priority: 'high' },
  { icon: TrendingUp, text: 'Your close rate is up 23% this month - BetterBossOS working', priority: 'positive' },
  { icon: BarChart3, text: 'Material costs trending 4% higher - update cost catalog', priority: 'medium' },
];

export default function DashboardPage() {
  const [timeRange] = useState<'today' | 'week' | 'month' | 'quarter'>('month');

  return (
    <div className="space-y-4">
      {/* Welcome Banner */}
      <div className="glass-card p-4 glow-border relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-boss-500/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-boss-400" />
                Command Center
              </h1>
              <p className="text-xs text-dark-400 mt-0.5">
                AI-powered overview &middot; {timeRange === 'month' ? 'This Month' : timeRange}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <div className="live-indicator" />
              <span className="text-[10px] text-emerald-400 font-medium">LIVE</span>
            </div>
          </div>

          {/* BetterBossOS Stats */}
          <div className="mt-3 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-boss-400">
              <Clock className="w-3 h-3" />
              <span className="font-medium">{metrics.daysReclaimed} days reclaimed/yr</span>
            </div>
            <div className="flex items-center gap-1.5 text-accent-400">
              <Zap className="w-3 h-3" />
              <span className="font-medium">{metrics.estimateSpeed} avg estimate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Active Jobs"
          value={metrics.activeJobs.toString()}
          icon={Briefcase}
          color="text-boss-400"
          bgColor="bg-boss-500/10"
        />
        <MetricCard
          label="Revenue"
          value={formatCurrency(metrics.totalRevenue)}
          icon={DollarSign}
          change={metrics.revenueChange}
          color="text-emerald-400"
          bgColor="bg-emerald-500/10"
        />
        <MetricCard
          label="Profit"
          value={formatCurrency(metrics.totalProfit)}
          icon={TrendingUp}
          change={metrics.profitChange}
          color="text-green-400"
          bgColor="bg-green-500/10"
        />
        <MetricCard
          label="Avg Margin"
          value={formatPercent(metrics.avgMargin)}
          icon={BarChart3}
          color="text-accent-400"
          bgColor="bg-accent-500/10"
        />
      </div>

      {/* Status Row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass-card p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-boss-400" />
            <span className="text-lg font-bold text-white">{metrics.leadsThisMonth}</span>
          </div>
          <p className="text-[10px] text-dark-500 uppercase tracking-wider">New Leads</p>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-lg font-bold text-white">{formatPercent(metrics.conversionRate)}</span>
          </div>
          <p className="text-[10px] text-dark-500 uppercase tracking-wider">Close Rate</p>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-lg font-bold text-white">{metrics.overdueTasks}</span>
          </div>
          <p className="text-[10px] text-dark-500 uppercase tracking-wider">Overdue</p>
        </div>
      </div>

      {/* AI Insights */}
      <div className="glass-card p-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-accent-400" />
          AI Insights
          <span className="badge-warning text-[10px]">4 actions</span>
        </h2>
        <div className="space-y-2">
          {aiInsights.map((insight, i) => {
            const Icon = insight.icon;
            return (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-2.5 p-2.5 rounded-lg text-xs transition-colors cursor-pointer',
                  insight.priority === 'high' && 'bg-red-500/5 hover:bg-red-500/10 border border-red-500/10',
                  insight.priority === 'medium' && 'bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10',
                  insight.priority === 'positive' && 'bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10'
                )}
              >
                <Icon className={cn(
                  'w-3.5 h-3.5 flex-shrink-0 mt-0.5',
                  insight.priority === 'high' && 'text-red-400',
                  insight.priority === 'medium' && 'text-amber-400',
                  insight.priority === 'positive' && 'text-emerald-400'
                )} />
                <p className="text-dark-200 leading-relaxed">{insight.text}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Jobs */}
      <div className="glass-card p-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Briefcase className="w-4 h-4 text-boss-400" />
          Top Jobs
        </h2>
        <div className="space-y-3">
          {topJobs.map((job, i) => (
            <div key={i} className="group cursor-pointer">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-dark-200 group-hover:text-boss-400 transition-colors truncate">
                  {job.name}
                </p>
                <span className="text-xs text-dark-400 font-medium">{formatCurrency(job.value)}</span>
              </div>
              <div className="progress-bar">
                <div
                  className={cn(
                    'progress-bar-fill',
                    job.progress >= 75 ? 'bg-emerald-500' : job.progress >= 40 ? 'bg-boss-500' : 'bg-accent-500'
                  )}
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <p className="text-[10px] text-dark-500 mt-0.5">{job.progress}% complete</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-boss-400" />
          Recent Activity
        </h2>
        <div className="space-y-2">
          {recentActivity.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-dark-700/30 transition-colors cursor-pointer"
            >
              <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', item.color.replace('text-', 'bg-'))} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-dark-200">{item.action}</p>
                <p className="text-[10px] text-dark-500 truncate">{item.detail}</p>
              </div>
              <span className="text-[10px] text-dark-600 flex-shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  change,
  color,
  bgColor,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  change?: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="glass-card p-3 group hover:border-boss-500/20 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', bgColor)}>
          <Icon className={cn('w-3.5 h-3.5', color)} />
        </div>
        {change !== undefined && (
          <div className={cn(
            'flex items-center gap-0.5 text-[10px] font-medium',
            change >= 0 ? 'text-emerald-400' : 'text-red-400'
          )}>
            {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-base font-bold text-white">{value}</p>
      <p className="text-[10px] text-dark-500 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}
