'use client';

import { useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Briefcase, DollarSign, Users, TrendingUp, AlertTriangle,
  Zap, Target, BarChart3, Activity, CheckCircle2, XCircle,
  ChevronRight,
} from 'lucide-react';
import { cn, formatCurrency, formatPercent } from '@/lib/utils/cn';
import { useJobs, useInvoices, useContacts, useTasks } from '@/lib/hooks/useJobTread';
import { LoadingState, ErrorState } from '@/components/ui/DataState';

const LOST_STATUSES = ['CANCELLED'];
const OPEN_STATUSES = ['LEAD', 'ESTIMATE', 'PROPOSAL', 'ON_HOLD'];

export default function DashboardPage() {
  const { data: jobs, isLoading: jobsLoading, error: jobsErr, refetch: refetchJobs } = useJobs();
  const { data: invoices, isLoading: invLoading, error: invErr, refetch: refetchInv } = useInvoices();
  const { data: contacts, isLoading: conLoading, error: conErr, refetch: refetchCon } = useContacts();
  const { data: tasks, isLoading: taskLoading, error: taskErr, refetch: refetchTasks } = useTasks();

  const isLoading = jobsLoading || invLoading || conLoading || taskLoading;
  const firstError = jobsErr || invErr || conErr || taskErr;
  const retryAll = useCallback(() => { refetchJobs(); refetchInv(); refetchCon(); refetchTasks(); }, [refetchJobs, refetchInv, refetchCon, refetchTasks]);

  // Memoize all expensive computations
  const metrics = useMemo(() => {
    const allJobs = jobs || [];
    const jobRev = (j: typeof allJobs[0]) => j.budget?.actualRevenue || j.budget?.estimatedRevenue || 0;
    const jobCost = (j: typeof allJobs[0]) => j.budget?.actualCost || j.budget?.estimatedCost || 0;

    const lostJobs = allJobs.filter((j) => LOST_STATUSES.includes(j.status));
    const openJobs = allJobs.filter((j) => OPEN_STATUSES.includes(j.status));
    const wonJobs = allJobs.filter((j) => !LOST_STATUSES.includes(j.status) && !OPEN_STATUSES.includes(j.status));

    const wonRevenue = wonJobs.reduce((s, j) => s + jobRev(j), 0);
    const openPipeline = openJobs.reduce((s, j) => s + jobRev(j), 0);
    const totalDeals = wonJobs.length + lostJobs.length + openJobs.length;
    const winRate = totalDeals > 0 ? (wonJobs.length / totalDeals) * 100 : 0;

    const activeJobs = allJobs.filter((j) => j.status === 'IN_PROGRESS' || j.status === 'CONTRACT');
    const pipelineRevenue = activeJobs.reduce((s, j) => s + jobRev(j), 0);
    const pipelineCost = activeJobs.reduce((s, j) => s + jobCost(j), 0);
    const pipelineMargin = pipelineRevenue > 0 ? ((pipelineRevenue - pipelineCost) / pipelineRevenue) * 100 : 0;

    const overdueInvs = (invoices || []).filter((i) => {
      if (i.status === 'PAID' || i.status === 'VOID' || !i.dueDate) return false;
      return new Date(i.dueDate) < new Date();
    });
    const outstandingInvs = (invoices || []).filter((i) => i.status !== 'PAID' && i.status !== 'VOID');
    const newLeads = (contacts || []).filter((c) => c.type === 'LEAD');

    const overdueTasks = (tasks || []).filter((t) => {
      if (t.status === 'COMPLETED' || !t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    });
    const pendingTasks = (tasks || []).filter((t) => t.status !== 'COMPLETED');

    const topJobs = [...activeJobs].sort((a, b) => jobRev(b) - jobRev(a)).slice(0, 5);

    const wonPct = totalDeals > 0 ? (wonJobs.length / totalDeals) * 100 : 0;
    const lostPct = totalDeals > 0 ? (lostJobs.length / totalDeals) * 100 : 0;
    const openPct = totalDeals > 0 ? (openJobs.length / totalDeals) * 100 : 0;

    return {
      allJobs, jobRev, jobCost, wonJobs, openJobs, lostJobs,
      wonRevenue, openPipeline, totalDeals, winRate,
      activeJobs, pipelineMargin, overdueInvs, outstandingInvs,
      newLeads, overdueTasks, pendingTasks, topJobs,
      wonPct, lostPct, openPct,
    };
  }, [jobs, invoices, contacts, tasks]);

  if (isLoading) return <LoadingState label="Loading your dashboard from JobTread..." />;
  if (firstError) return <ErrorState message={firstError.message} onRetry={retryAll} />;

  const {
    jobRev, jobCost, wonJobs, openJobs, lostJobs,
    wonRevenue, openPipeline, totalDeals, winRate,
    activeJobs, pipelineMargin, overdueInvs, outstandingInvs,
    newLeads, overdueTasks, pendingTasks, topJobs,
    wonPct, lostPct, openPct,
  } = metrics;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-card p-4 glow-border relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-boss-500/10 rounded-full blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-boss-400" />
              Command Center
            </h1>
            <p className="text-xs text-dark-400 mt-0.5">Live data from JobTread</p>
          </div>
          <div className="flex items-center gap-1">
            <div className="live-indicator" />
            <span className="text-[10px] text-emerald-400 font-medium">LIVE</span>
          </div>
        </div>
      </div>

      {/* Won Revenue + Active Pipeline */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/finances" className="glass-card p-3 hover:border-emerald-500/30 transition-colors">
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] text-dark-400 uppercase tracking-wider">Won Revenue</span>
          </div>
          <p className="text-lg font-bold text-emerald-400">{formatCurrency(wonRevenue)}</p>
        </Link>
        <Link href="/jobs" className="glass-card p-3 hover:border-boss-500/30 transition-colors">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-4 h-4 text-boss-400" />
            <span className="text-[10px] text-dark-400 uppercase tracking-wider">Active Pipeline</span>
          </div>
          <p className="text-lg font-bold text-white">{formatCurrency(openPipeline)}</p>
        </Link>
      </div>

      {/* Deals — Win/Lost/Open with donut-style bar */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-boss-400" />
            Deals
          </h2>
          <span className="text-xs text-dark-400">{totalDeals} total</span>
        </div>

        {/* Stacked bar (donut alternative for sidebar) */}
        <div className="flex h-3 rounded-full overflow-hidden mb-3">
          {wonPct > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${wonPct}%` }} />}
          {lostPct > 0 && <div className="bg-red-500 transition-all" style={{ width: `${lostPct}%` }} />}
          {openPct > 0 && <div className="bg-boss-500 transition-all" style={{ width: `${openPct}%` }} />}
        </div>

        {/* Win rate + breakdown */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-center">
            <p className="text-xl font-bold text-white">{formatPercent(winRate)}</p>
            <p className="text-[10px] text-dark-500">Win Rate</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="flex items-center gap-1 mb-0.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-bold text-emerald-400">{wonJobs.length}</span>
              </div>
              <p className="text-[10px] text-dark-500">Won</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 mb-0.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm font-bold text-red-400">{lostJobs.length}</span>
              </div>
              <p className="text-[10px] text-dark-500">Lost</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 mb-0.5">
                <div className="w-2 h-2 rounded-full bg-boss-500" />
                <span className="text-sm font-bold text-boss-400">{openJobs.length}</span>
              </div>
              <p className="text-[10px] text-dark-500">Open</p>
            </div>
          </div>
        </div>

        {/* Won revenue detail */}
        <div className="flex items-center justify-between text-[10px] text-dark-500 pt-2 border-t border-dark-700/50">
          <span>Won: {formatCurrency(wonRevenue)}</span>
          <span>Pipeline: {formatCurrency(openPipeline)}</span>
        </div>
      </div>

      {/* Quick stats row — clickable drilldowns */}
      <div className="grid grid-cols-4 gap-2">
        <Link href="/jobs" className="glass-card p-3 text-center hover:border-boss-500/30 transition-colors group">
          <span className="text-lg font-bold text-white">{activeJobs.length}</span>
          <p className="text-[10px] text-dark-500 uppercase tracking-wider group-hover:text-boss-400 transition-colors">Active</p>
        </Link>
        <Link href="/finances" className="glass-card p-3 text-center hover:border-boss-500/30 transition-colors group">
          <span className="text-lg font-bold text-white">{formatPercent(pipelineMargin)}</span>
          <p className="text-[10px] text-dark-500 uppercase tracking-wider group-hover:text-boss-400 transition-colors">Margin</p>
        </Link>
        <Link href="/leads" className="glass-card p-3 text-center hover:border-boss-500/30 transition-colors group">
          <span className="text-lg font-bold text-white">{newLeads.length}</span>
          <p className="text-[10px] text-dark-500 uppercase tracking-wider group-hover:text-boss-400 transition-colors">Leads</p>
        </Link>
        <Link href="/finances" className="glass-card p-3 text-center hover:border-boss-500/30 transition-colors group">
          <span className="text-lg font-bold text-white">{outstandingInvs.length}</span>
          <p className="text-[10px] text-dark-500 uppercase tracking-wider group-hover:text-boss-400 transition-colors">Open Inv.</p>
        </Link>
      </div>

      {/* Overdue alerts */}
      {(overdueInvs.length > 0 || overdueTasks.length > 0) && (
        <div className="glass-card p-4 border-amber-500/20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Needs Attention
            </h2>
            <Link href="/finances" className="text-[10px] text-boss-400 hover:text-boss-300 flex items-center gap-0.5">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {overdueInvs.map((inv) => (
              <Link key={inv.id} href="/finances" className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/10 text-xs hover:bg-red-500/10 transition-colors">
                <div>
                  <span className="text-dark-200">Invoice {inv.number || inv.id}</span>
                  <span className="text-dark-500 ml-2">overdue</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-bold">{formatCurrency(inv.total || 0)}</span>
                  <ChevronRight className="w-3 h-3 text-dark-500" />
                </div>
              </Link>
            ))}
            {overdueTasks.slice(0, 3).map((t) => (
              <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-xs">
                <span className="text-dark-200 truncate">{t.title}</span>
                <span className="text-amber-400 text-[10px]">overdue</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Jobs */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-boss-400" />
            Top Jobs by Revenue
          </h2>
          <Link href="/jobs" className="text-[10px] text-boss-400 hover:text-boss-300 flex items-center gap-0.5">
            View All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {topJobs.length === 0 ? (
          <p className="text-xs text-dark-500 py-4 text-center">No active jobs found in JobTread.</p>
        ) : (
          <div className="space-y-3">
            {topJobs.map((job) => {
              const rev = jobRev(job);
              const cost = jobCost(job);
              const margin = rev > 0 ? ((rev - cost) / rev) * 100 : 0;
              return (
                <div key={job.id} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-dark-200 group-hover:text-boss-400 transition-colors truncate">
                      {job.name}
                    </p>
                    <span className="text-xs text-dark-400 font-medium">{formatCurrency(rev)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-dark-500">
                    <span>{job.customer ? `${job.customer.firstName} ${job.customer.lastName}` : ''}</span>
                    <span className={cn(margin >= 25 ? 'text-emerald-400' : margin >= 15 ? 'text-amber-400' : 'text-red-400')}>
                      {formatPercent(margin)} margin
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Tasks */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-boss-400" />
            Pending Tasks ({pendingTasks.length})
          </h2>
          <Link href="/jobs" className="text-[10px] text-boss-400 hover:text-boss-300 flex items-center gap-0.5">
            View All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {pendingTasks.length === 0 ? (
          <p className="text-xs text-dark-500 py-4 text-center">All caught up!</p>
        ) : (
          <div className="space-y-1.5">
            {pendingTasks.slice(0, 8).map((task) => (
              <div key={task.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-700/30 text-xs">
                <span className="text-dark-200 truncate">{task.title}</span>
                {task.dueDate && (
                  <span className={cn(
                    'text-[10px] flex-shrink-0 ml-2',
                    new Date(task.dueDate) < new Date() ? 'text-red-400' : 'text-dark-500'
                  )}>
                    {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
