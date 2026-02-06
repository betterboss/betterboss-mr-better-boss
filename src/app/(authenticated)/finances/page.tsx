'use client';

import {
  DollarSign, TrendingUp, AlertTriangle, BarChart3,
  PieChart, Receipt, CreditCard, Calendar,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { cn, formatCurrency, formatPercent } from '@/lib/utils/cn';
import { useJobs, useInvoices, type JTJob } from '@/lib/hooks/useJobTread';
import { LoadingState, ErrorState } from '@/components/ui/DataState';

export default function FinancesPage() {
  const { data: jobs, isLoading: jobsLoading, error: jobsErr, refetch: refetchJobs } = useJobs();
  const { data: invoices, isLoading: invLoading, error: invErr } = useInvoices();

  const isLoading = jobsLoading || invLoading;

  if (isLoading) return <LoadingState label="Loading financial data from JobTread..." />;
  if (jobsErr) return <ErrorState message={jobsErr} onRetry={refetchJobs} />;
  if (invErr) return <ErrorState message={invErr} />;

  const allJobs = jobs || [];
  const allInvoices = invoices || [];

  // Compute real metrics from live data
  const totalRevenue = allJobs.reduce((s, j) => s + (j.budget?.estimatedRevenue || 0), 0);
  const totalCost = allJobs.reduce((s, j) => s + (j.budget?.estimatedCost || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const totalInvoiced = allJobs.reduce((s, j) => s + (j.budget?.invoiced || 0), 0);
  const totalPaid = allJobs.reduce((s, j) => s + (j.budget?.paid || 0), 0);
  const totalOutstanding = allJobs.reduce((s, j) => s + (j.budget?.outstanding || 0), 0);

  const overdueInvs = allInvoices.filter((inv) => {
    if (inv.status === 'PAID' || inv.status === 'VOID' || !inv.dueDate) return false;
    return new Date(inv.dueDate) < new Date();
  });
  const overdueTotal = overdueInvs.reduce((s, inv) => s + (inv.total || 0), 0);

  const unpaidInvs = allInvoices.filter((inv) => inv.status !== 'PAID' && inv.status !== 'VOID');
  const paidInvs = allInvoices.filter((inv) => inv.status === 'PAID');

  // Job profitability for active jobs
  const activeJobs = allJobs.filter((j) => j.status === 'IN_PROGRESS' || j.status === 'CONTRACT');
  const jobProfit = activeJobs
    .map((j) => {
      const rev = j.budget?.estimatedRevenue || 0;
      const cost = j.budget?.estimatedCost || 0;
      const margin = rev > 0 ? ((rev - cost) / rev) * 100 : 0;
      return { id: j.id, name: j.name, revenue: rev, cost, margin };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-boss-400" />
            Cash Flow Radar
          </h1>
          <p className="text-xs text-dark-400">Live financial data from JobTread</p>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdueInvs.length > 0 && (
        <div className="glass-card p-3 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-400">Overdue Invoices Alert</p>
              <p className="text-[10px] text-dark-300 mt-0.5">
                {overdueInvs.length} invoice{overdueInvs.length !== 1 ? 's' : ''} overdue totaling {formatCurrency(overdueTotal)}.
                Follow up to maintain cash flow.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-3">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-base font-bold text-white">{formatCurrency(totalRevenue)}</p>
          <p className="text-[10px] text-dark-500 uppercase tracking-wider">Est. Revenue</p>
        </div>
        <div className="glass-card p-3">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-base font-bold text-emerald-400">{formatCurrency(totalProfit)}</p>
          <p className="text-[10px] text-dark-500 uppercase tracking-wider">
            Profit ({formatPercent(profitMargin)})
          </p>
        </div>
      </div>

      {/* Cash Position */}
      <div className="glass-card p-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-boss-400" />
          Invoice Summary
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-dark-800/60 rounded-lg">
            <p className="text-sm font-bold text-white">{formatCurrency(totalInvoiced)}</p>
            <p className="text-[10px] text-dark-500">Invoiced</p>
          </div>
          <div className="text-center p-2 bg-dark-800/60 rounded-lg">
            <p className="text-sm font-bold text-emerald-400">{formatCurrency(totalPaid)}</p>
            <p className="text-[10px] text-dark-500">Collected</p>
          </div>
          <div className="text-center p-2 bg-dark-800/60 rounded-lg">
            <p className="text-sm font-bold text-amber-400">{formatCurrency(totalOutstanding)}</p>
            <p className="text-[10px] text-dark-500">Outstanding</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div className="text-center p-2 bg-dark-800/60 rounded-lg">
            <p className="text-sm font-bold text-white">{allInvoices.length}</p>
            <p className="text-[10px] text-dark-500">Total</p>
          </div>
          <div className="text-center p-2 bg-dark-800/60 rounded-lg">
            <p className="text-sm font-bold text-emerald-400">{paidInvs.length}</p>
            <p className="text-[10px] text-dark-500">Paid</p>
          </div>
          <div className="text-center p-2 bg-dark-800/60 rounded-lg">
            <p className="text-sm font-bold text-red-400">{overdueInvs.length}</p>
            <p className="text-[10px] text-dark-500">Overdue</p>
          </div>
        </div>
      </div>

      {/* Overdue Invoices Detail */}
      {overdueInvs.length > 0 && (
        <div className="glass-card p-4 border-red-500/10">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Overdue Invoices
            <span className="badge-danger text-[10px]">{formatCurrency(overdueTotal)}</span>
          </h2>
          <div className="space-y-2">
            {overdueInvs.map((inv) => {
              const daysOverdue = inv.dueDate
                ? Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24))
                : 0;
              return (
                <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div>
                    <p className="text-xs font-medium text-dark-200">Invoice {inv.number || inv.id}</p>
                    <p className="text-[10px] text-dark-500">
                      Due {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-red-400">{formatCurrency(inv.total || 0)}</p>
                    <p className="text-[10px] text-red-400/60">{daysOverdue} days overdue</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unpaid Invoices */}
      {unpaidInvs.length > 0 && (
        <div className="glass-card p-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <Receipt className="w-4 h-4 text-boss-400" />
            Open Invoices ({unpaidInvs.length})
          </h2>
          <div className="space-y-1.5">
            {unpaidInvs.slice(0, 8).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-700/30">
                <div>
                  <p className="text-xs text-dark-200">Invoice {inv.number || inv.id}</p>
                  <p className="text-[10px] text-dark-500">
                    {inv.status}
                    {inv.dueDate ? ` \u00b7 Due ${new Date(inv.dueDate).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <span className="text-xs font-medium text-dark-300">{formatCurrency(inv.total || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Job Profitability */}
      <div className="glass-card p-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <PieChart className="w-4 h-4 text-boss-400" />
          Job Profitability
        </h2>
        {jobProfit.length === 0 ? (
          <p className="text-xs text-dark-500 py-4 text-center">No active jobs found.</p>
        ) : (
          <div className="space-y-2">
            {jobProfit.map((job) => (
              <div key={job.id} className="p-2 rounded-lg hover:bg-dark-700/30 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-dark-200 font-medium truncate">{job.name}</p>
                  <span className={cn(
                    'text-xs font-bold',
                    job.margin >= 30 ? 'text-emerald-400' : job.margin >= 20 ? 'text-amber-400' : 'text-red-400'
                  )}>
                    {formatPercent(job.margin)}
                  </span>
                </div>
                <div className="progress-bar">
                  <div className={cn(
                    'progress-bar-fill',
                    job.margin >= 30 ? 'bg-emerald-500' : job.margin >= 20 ? 'bg-amber-500' : 'bg-red-500'
                  )} style={{ width: `${Math.min(job.margin * 3, 100)}%` }} />
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-dark-500">
                  <span>Rev: {formatCurrency(job.revenue)}</span>
                  <span>Cost: {formatCurrency(job.cost)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
