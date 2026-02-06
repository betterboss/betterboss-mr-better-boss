'use client';

import { useState } from 'react';
import {
  Briefcase,
  Search,
  Filter,
  Plus,
  MapPin,
  Calendar,
  DollarSign,
  ChevronRight,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Pause,
  XCircle,
} from 'lucide-react';
import { cn, formatCurrency, formatPercent } from '@/lib/utils/cn';

type StatusFilter = 'ALL' | 'LEAD' | 'ESTIMATE' | 'CONTRACT' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';

// Demo data - in production comes from JobTread API
const demoJobs = [
  {
    id: '1', name: 'Henderson Full Reroof', number: 'JOB-1247',
    status: 'IN_PROGRESS' as const, customer: 'Mike Henderson',
    address: '4521 Oak Drive, Austin, TX',
    budget: { estimatedRevenue: 68500, actualCost: 32100, estimatedMargin: 32.1 },
    progress: 72, startDate: '2026-01-15', tasks: { total: 18, completed: 13, overdue: 1 },
  },
  {
    id: '2', name: 'Garcia Kitchen Remodel', number: 'JOB-1248',
    status: 'CONTRACT' as const, customer: 'Maria Garcia',
    address: '8912 Elm Street, Dallas, TX',
    budget: { estimatedRevenue: 47200, actualCost: 0, estimatedMargin: 28.5 },
    progress: 15, startDate: '2026-02-10', tasks: { total: 24, completed: 3, overdue: 0 },
  },
  {
    id: '3', name: 'Thompson Commercial Roof', number: 'JOB-1245',
    status: 'IN_PROGRESS' as const, customer: 'Thompson Corp',
    address: '200 Commerce Blvd, Houston, TX',
    budget: { estimatedRevenue: 125000, actualCost: 45200, estimatedMargin: 25.8 },
    progress: 45, startDate: '2025-12-01', tasks: { total: 42, completed: 19, overdue: 3 },
  },
  {
    id: '4', name: 'Wilson Bathroom Suite', number: 'JOB-1250',
    status: 'IN_PROGRESS' as const, customer: 'James Wilson',
    address: '731 Pine Lane, San Antonio, TX',
    budget: { estimatedRevenue: 32800, actualCost: 24100, estimatedMargin: 18.2 },
    progress: 90, startDate: '2025-11-20', tasks: { total: 12, completed: 11, overdue: 0 },
  },
  {
    id: '5', name: 'Patel Office Renovation', number: 'JOB-1243',
    status: 'ON_HOLD' as const, customer: 'Raj Patel',
    address: '1500 Business Park, Austin, TX',
    budget: { estimatedRevenue: 89000, actualCost: 12500, estimatedMargin: 30.0 },
    progress: 20, startDate: '2025-10-15', tasks: { total: 30, completed: 6, overdue: 2 },
  },
  {
    id: '6', name: 'Martinez Roof Repair', number: 'JOB-1251',
    status: 'ESTIMATE' as const, customer: 'Carlos Martinez',
    address: '2200 Sunset Rd, El Paso, TX',
    budget: { estimatedRevenue: 15800, actualCost: 0, estimatedMargin: 35.0 },
    progress: 0, startDate: '', tasks: { total: 0, completed: 0, overdue: 0 },
  },
  {
    id: '7', name: 'Davis Home Addition', number: 'JOB-1240',
    status: 'COMPLETED' as const, customer: 'Sarah Davis',
    address: '900 Cedar Ave, Fort Worth, TX',
    budget: { estimatedRevenue: 156000, actualCost: 112300, estimatedMargin: 28.0 },
    progress: 100, startDate: '2025-08-01', tasks: { total: 55, completed: 55, overdue: 0 },
  },
];

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

  const filteredJobs = demoJobs.filter((job) => {
    const matchesSearch =
      job.name.toLowerCase().includes(search.toLowerCase()) ||
      job.customer.toLowerCase().includes(search.toLowerCase()) ||
      job.number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedJob = demoJobs.find((j) => j.id === selectedJobId);

  const statusCounts = demoJobs.reduce<Record<string, number>>((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-boss-400" />
            Job Pulse
          </h1>
          <p className="text-xs text-dark-400">
            Real-time job tracking &middot; {filteredJobs.length} jobs
          </p>
        </div>
        <button className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5">
          <Plus className="w-3.5 h-3.5" />
          New Job
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs..."
            className="input-field pl-8 text-xs py-1.5"
          />
        </div>
        <button className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5">
          <Filter className="w-3.5 h-3.5" />
        </button>
        <button className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5">
          <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Status Filter Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {(['ALL', 'IN_PROGRESS', 'CONTRACT', 'ESTIMATE', 'ON_HOLD', 'COMPLETED'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              'text-[10px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-colors',
              statusFilter === status
                ? 'bg-boss-500/20 text-boss-400 border border-boss-500/30'
                : 'bg-dark-800 text-dark-400 border border-dark-700/50 hover:text-dark-200'
            )}
          >
            {status === 'ALL' ? 'All' : status.replace('_', ' ')}
            {status !== 'ALL' && statusCounts[status] ? ` (${statusCounts[status]})` : ''}
          </button>
        ))}
      </div>

      {/* Job Detail Panel */}
      {selectedJob && (
        <div className="glass-card p-4 glow-border animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-white">{selectedJob.name}</p>
              <p className="text-xs text-dark-400">{selectedJob.number} &middot; {selectedJob.customer}</p>
            </div>
            <button onClick={() => setSelectedJobId(null)} className="text-dark-500 hover:text-dark-300">
              <XCircle className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center p-2 bg-dark-800/60 rounded-lg">
              <p className="text-sm font-bold text-white">{formatCurrency(selectedJob.budget.estimatedRevenue)}</p>
              <p className="text-[10px] text-dark-500">Revenue</p>
            </div>
            <div className="text-center p-2 bg-dark-800/60 rounded-lg">
              <p className="text-sm font-bold text-emerald-400">{formatPercent(selectedJob.budget.estimatedMargin)}</p>
              <p className="text-[10px] text-dark-500">Margin</p>
            </div>
            <div className="text-center p-2 bg-dark-800/60 rounded-lg">
              <p className="text-sm font-bold text-white">{selectedJob.progress}%</p>
              <p className="text-[10px] text-dark-500">Complete</p>
            </div>
          </div>

          <div className="progress-bar mb-2">
            <div className="progress-bar-fill bg-boss-500" style={{ width: `${selectedJob.progress}%` }} />
          </div>

          <div className="flex items-center gap-3 text-[10px] text-dark-500">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              {selectedJob.tasks.completed}/{selectedJob.tasks.total} tasks
            </span>
            {selectedJob.tasks.overdue > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <AlertTriangle className="w-3 h-3" />
                {selectedJob.tasks.overdue} overdue
              </span>
            )}
          </div>
        </div>
      )}

      {/* Job List */}
      <div className="space-y-2">
        {filteredJobs.map((job) => {
          const config = statusConfig[job.status];
          const StatusIcon = config?.icon || Briefcase;

          return (
            <div
              key={job.id}
              onClick={() => setSelectedJobId(job.id === selectedJobId ? null : job.id)}
              className={cn(
                'glass-card p-3 cursor-pointer transition-all group',
                selectedJobId === job.id && 'border-boss-500/30 glow-border'
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-dark-100 group-hover:text-boss-400 transition-colors truncate">
                      {job.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-dark-500">
                    <span>{job.number}</span>
                    <span>&middot;</span>
                    <span>{job.customer}</span>
                  </div>
                </div>
                <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium', config?.bg, config?.color)}>
                  <StatusIcon className="w-3 h-3" />
                  {job.status.replace('_', ' ')}
                </div>
              </div>

              <div className="flex items-center gap-3 text-[10px] text-dark-400">
                {job.address && (
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{job.address}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-dark-300 font-medium">{formatCurrency(job.budget.estimatedRevenue)}</span>
                  <span className="text-emerald-400">{formatPercent(job.budget.estimatedMargin)} margin</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-dark-600 group-hover:text-dark-400 transition-colors" />
              </div>

              {job.progress > 0 && (
                <div className="mt-2">
                  <div className="progress-bar">
                    <div
                      className={cn(
                        'progress-bar-fill',
                        job.progress >= 75 ? 'bg-emerald-500' : job.progress >= 40 ? 'bg-boss-500' : 'bg-accent-500'
                      )}
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
