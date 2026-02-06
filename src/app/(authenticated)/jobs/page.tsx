'use client';

import { useState } from 'react';
import {
  Briefcase, Search, Plus, MapPin, DollarSign, ChevronRight, CheckCircle2,
  Clock, AlertTriangle, Pause, XCircle, Filter,
} from 'lucide-react';
import { cn, formatCurrency, formatPercent } from '@/lib/utils/cn';
import { useJobs, type JTJob } from '@/lib/hooks/useJobTread';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/DataState';

type StatusFilter = 'ALL' | 'LEAD' | 'ESTIMATE' | 'CONTRACT' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  LEAD: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ESTIMATE: { icon: DollarSign, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  CONTRACT: { icon: CheckCircle2, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  IN_PROGRESS: { icon: Briefcase, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ON_HOLD: { icon: Pause, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  COMPLETED: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
  CANCELLED: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
};

export default function JobsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const { data: jobs, isLoading, error, refetch } = useJobs();

  if (isLoading) return <LoadingState label="Loading jobs from JobTread..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const allJobs = jobs || [];

  const filteredJobs = allJobs.filter((job) => {
    const matchesSearch = !search ||
      job.name.toLowerCase().includes(search.toLowerCase()) ||
      (job.number || '').toLowerCase().includes(search.toLowerCase()) ||
      `${job.customer?.firstName || ''} ${job.customer?.lastName || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedJob = allJobs.find((j) => j.id === selectedJobId);
  const statusCounts = allJobs.reduce<Record<string, number>>((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {});

  const getMargin = (job: JTJob) => {
    const rev = job.budget?.estimatedRevenue || 0;
    const cost = job.budget?.estimatedCost || 0;
    return rev > 0 ? ((rev - cost) / rev) * 100 : 0;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-boss-400" />
            Job Pulse
          </h1>
          <p className="text-xs text-dark-400">
            {filteredJobs.length} of {allJobs.length} jobs
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs..." className="input-field pl-8 text-xs py-1.5" />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['ALL', 'IN_PROGRESS', 'CONTRACT', 'ESTIMATE', 'ON_HOLD', 'COMPLETED'] as const).map((status) => (
          <button key={status} onClick={() => setStatusFilter(status)}
            className={cn(
              'text-[10px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-colors',
              statusFilter === status
                ? 'bg-boss-500/20 text-boss-400 border border-boss-500/30'
                : 'bg-dark-800 text-dark-400 border border-dark-700/50 hover:text-dark-200'
            )}>
            {status === 'ALL' ? `All (${allJobs.length})` : `${status.replace('_', ' ')}${statusCounts[status] ? ` (${statusCounts[status]})` : ''}`}
          </button>
        ))}
      </div>

      {/* Detail Panel */}
      {selectedJob && (
        <div className="glass-card p-4 glow-border animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-white">{selectedJob.name}</p>
              <p className="text-xs text-dark-400">
                {selectedJob.number} &middot; {selectedJob.customer ? `${selectedJob.customer.firstName} ${selectedJob.customer.lastName}` : ''}
              </p>
            </div>
            <button onClick={() => setSelectedJobId(null)} className="text-dark-500 hover:text-dark-300">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center p-2 bg-dark-800/60 rounded-lg">
              <p className="text-sm font-bold text-white">{formatCurrency(selectedJob.budget?.estimatedRevenue || 0)}</p>
              <p className="text-[10px] text-dark-500">Revenue</p>
            </div>
            <div className="text-center p-2 bg-dark-800/60 rounded-lg">
              <p className="text-sm font-bold text-emerald-400">{formatPercent(getMargin(selectedJob))}</p>
              <p className="text-[10px] text-dark-500">Margin</p>
            </div>
            <div className="text-center p-2 bg-dark-800/60 rounded-lg">
              <p className="text-sm font-bold text-white">{formatCurrency(selectedJob.budget?.outstanding || 0)}</p>
              <p className="text-[10px] text-dark-500">Outstanding</p>
            </div>
          </div>
          {selectedJob.tasks && selectedJob.tasks.length > 0 && (
            <div className="text-[10px] text-dark-500 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              {selectedJob.tasks.filter((t) => t.status === 'COMPLETED').length}/{selectedJob.tasks.length} tasks
            </div>
          )}
        </div>
      )}

      {/* Job List */}
      {filteredJobs.length === 0 ? (
        <EmptyState icon={Briefcase} title="No jobs found" description={search ? 'Try a different search term.' : 'No jobs match the current filters.'} />
      ) : (
        <div className="space-y-2">
          {filteredJobs.map((job) => {
            const config = statusConfig[job.status] || statusConfig.LEAD;
            const StatusIcon = config.icon;
            const margin = getMargin(job);
            const customerName = job.customer ? `${job.customer.firstName} ${job.customer.lastName}` : '';

            return (
              <div key={job.id} onClick={() => setSelectedJobId(job.id === selectedJobId ? null : job.id)}
                className={cn('glass-card p-3 cursor-pointer transition-all group', selectedJobId === job.id && 'border-boss-500/30 glow-border')}>
                <div className="flex items-start justify-between mb-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-dark-100 group-hover:text-boss-400 transition-colors truncate">{job.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-dark-500">
                      {job.number && <span>{job.number}</span>}
                      {customerName && <><span>&middot;</span><span>{customerName}</span></>}
                    </div>
                  </div>
                  <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium', config.bg, config.color)}>
                    <StatusIcon className="w-3 h-3" />{job.status.replace('_', ' ')}
                  </div>
                </div>
                {job.address?.city && (
                  <div className="flex items-center gap-1 text-[10px] text-dark-400 mb-1.5">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{[job.address.street1, job.address.city, job.address.state].filter(Boolean).join(', ')}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="text-dark-300 font-medium">{formatCurrency(job.budget?.estimatedRevenue || 0)}</span>
                    <span className={cn(margin >= 25 ? 'text-emerald-400' : margin >= 15 ? 'text-amber-400' : 'text-red-400')}>
                      {formatPercent(margin)} margin
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-dark-600 group-hover:text-dark-400" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
