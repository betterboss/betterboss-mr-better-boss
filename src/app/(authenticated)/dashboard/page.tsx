'use client';

import {
  Briefcase, DollarSign, Users, TrendingUp, AlertTriangle,
  Zap, Target, BarChart3, Activity,
} from 'lucide-react';
import { cn, formatCurrency, formatPercent } from '@/lib/utils/cn';
import { useJobs, useInvoices, useContacts, useTasks } from '@/lib/hooks/useJobTread';
import { LoadingState, ErrorState } from '@/components/ui/DataState';

export default function DashboardPage() {
  const { data: jobs, isLoading: jobsLoading, error: jobsErr, refetch: refetchJobs } = useJobs();
  const { data: invoices, isLoading: invLoading } = useInvoices();
  const { data: contacts, isLoading: conLoading } = useContacts();
  const { data: tasks, isLoading: taskLoading } = useTasks();

  const isLoading = jobsLoading || invLoading || conLoading || taskLoading;

  if (isLoading) return <LoadingState label="Loading your dashboard from JobTread..." />;
  if (jobsErr) return <ErrorState message={jobsErr} onRetry={refetchJobs} />;

  // Compute real metrics from live data
  const activeJobs = jobs?.filter((j) => j.status === 'IN_PROGRESS' || j.status === 'CONTRACT') || [];
  const totalRevenue = jobs?.reduce((s, j) => s + (j.budget?.estimatedRevenue || 0), 0) || 0;
  const totalCost = jobs?.reduce((s, j) => s + (j.budget?.estimatedCost || 0), 0) || 0;
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const overdueInvs = invoices?.filter((i) => {
    if (i.status === 'PAID' || !i.dueDate) return false;
    return new Date(i.dueDate) < new Date();
  }) || [];
  const outstandingInvs = invoices?.filter((i) => i.status !== 'PAID' && i.status !== 'VOID') || [];
  const newLeads = contacts?.filter((c) => c.type === 'LEAD') || [];

  const overdueTasks = tasks?.filter((t) => {
    if (t.status === 'COMPLETED' || !t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  }) || [];
  const pendingTasks = tasks?.filter((t) => t.status !== 'COMPLETED') || [];

  // Top jobs by revenue
  const topJobs = [...(jobs || [])]
    .filter((j) => j.status === 'IN_PROGRESS' || j.status === 'CONTRACT')
    .sort((a, b) => (b.budget?.estimatedRevenue || 0) - (a.budget?.estimatedRevenue || 0))
    .slice(0, 5);

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

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Active Jobs" value={activeJobs.length.toString()} icon={Briefcase} color="text-boss-400" bgColor="bg-boss-500/10" />
        <MetricCard label="Total Revenue" value={formatCurrency(totalRevenue)} icon={DollarSign} color="text-emerald-400" bgColor="bg-emerald-500/10" />
        <MetricCard label="Total Profit" value={formatCurrency(totalProfit)} icon={TrendingUp} color="text-green-400" bgColor="bg-green-500/10" />
        <MetricCard label="Avg Margin" value={formatPercent(avgMargin)} icon={BarChart3} color="text-accent-400" bgColor="bg-accent-500/10" />
      </div>

      {/* Status Row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass-card p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-boss-400" />
            <span className="text-lg font-bold text-white">{newLeads.length}</span>
          </div>
          <p className="text-[10px] text-dark-500 uppercase tracking-wider">Leads</p>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-lg font-bold text-white">{outstandingInvs.length}</span>
          </div>
          <p className="text-[10px] text-dark-500 uppercase tracking-wider">Open Invoices</p>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-lg font-bold text-white">{overdueTasks.length}</span>
          </div>
          <p className="text-[10px] text-dark-500 uppercase tracking-wider">Overdue</p>
        </div>
      </div>

      {/* Overdue alerts */}
      {(overdueInvs.length > 0 || overdueTasks.length > 0) && (
        <div className="glass-card p-4 border-amber-500/20">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Needs Attention
          </h2>
          <div className="space-y-2">
            {overdueInvs.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/10 text-xs">
                <div>
                  <span className="text-dark-200">Invoice {inv.number || inv.id}</span>
                  <span className="text-dark-500 ml-2">overdue</span>
                </div>
                <span className="text-red-400 font-bold">{formatCurrency(inv.total || 0)}</span>
              </div>
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
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Briefcase className="w-4 h-4 text-boss-400" />
          Top Jobs by Revenue
        </h2>
        {topJobs.length === 0 ? (
          <p className="text-xs text-dark-500 py-4 text-center">No active jobs found in JobTread.</p>
        ) : (
          <div className="space-y-3">
            {topJobs.map((job) => {
              const rev = job.budget?.estimatedRevenue || 0;
              const cost = job.budget?.estimatedCost || 0;
              const margin = rev > 0 ? ((rev - cost) / rev) * 100 : 0;
              return (
                <div key={job.id} className="group cursor-pointer">
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
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-boss-400" />
          Pending Tasks ({pendingTasks.length})
        </h2>
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

function MetricCard({ label, value, icon: Icon, color, bgColor }: {
  label: string; value: string; icon: React.ElementType; color: string; bgColor: string;
}) {
  return (
    <div className="glass-card p-3">
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center mb-2', bgColor)}>
        <Icon className={cn('w-3.5 h-3.5', color)} />
      </div>
      <p className="text-base font-bold text-white">{value}</p>
      <p className="text-[10px] text-dark-500 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}
