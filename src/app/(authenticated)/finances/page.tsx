'use client';

import { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Receipt,
  CreditCard,
  FileText,
  Send,
  Zap,
  Calendar,
} from 'lucide-react';
import { cn, formatCurrency, formatPercent } from '@/lib/utils/cn';

// Why this feature exists:
// Cash flow kills more contractors than competition. 82% of construction
// business failures cite cash flow as the primary cause.
// Problem solved: No real-time financial visibility = surprise cash crunches.
// This provides instant cash flow intelligence and AI-powered forecasting.

const financials = {
  monthlyRevenue: 247500,
  monthlyCost: 182400,
  monthlyProfit: 65100,
  profitMargin: 26.3,
  revenueChange: 14.2,
  profitChange: 8.7,

  cashOnHand: 184200,
  receivables: 89400,
  payables: 45600,

  invoicesSent: 12,
  invoicesPaid: 8,
  invoicesOverdue: 2,
  overdueAmount: 18700,

  projectedCashFlow30: 156800,
  burnRate: 6080, // daily
};

const overdueInvoices = [
  { id: 'INV-1047', customer: 'Anderson Builders', amount: 12500, daysOverdue: 15, job: 'Office Complex Phase 2' },
  { id: 'INV-1039', customer: 'Sarah Mitchell', amount: 6200, daysOverdue: 8, job: 'Roof Repair - Residential' },
];

const upcomingPayables = [
  { vendor: 'ABC Supply Co', amount: 18500, dueDate: 'Feb 12', category: 'Materials' },
  { vendor: 'Johnson Subs LLC', amount: 8200, dueDate: 'Feb 14', category: 'Subcontractor' },
  { vendor: 'Waste Management', amount: 2400, dueDate: 'Feb 15', category: 'Disposal' },
  { vendor: 'Equipment Rental Inc', amount: 3800, dueDate: 'Feb 20', category: 'Equipment' },
];

const cashFlowForecast = [
  { period: 'This Week', inflow: 32500, outflow: 24800, net: 7700 },
  { period: 'Next Week', inflow: 18200, outflow: 31500, net: -13300 },
  { period: 'Week 3', inflow: 45000, outflow: 22100, net: 22900 },
  { period: 'Week 4', inflow: 28600, outflow: 19400, net: 9200 },
];

const jobProfitability = [
  { name: 'Henderson Reroof', revenue: 68500, cost: 46200, margin: 32.5 },
  { name: 'Thompson Commercial', revenue: 125000, cost: 93750, margin: 25.0 },
  { name: 'Wilson Bathroom', revenue: 32800, cost: 26800, margin: 18.3 },
  { name: 'Garcia Kitchen', revenue: 47200, cost: 33800, margin: 28.4 },
];

export default function FinancesPage() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');

  const cashFlowWarning = cashFlowForecast.some((f) => f.net < 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-boss-400" />
            Cash Flow Radar
          </h1>
          <p className="text-xs text-dark-400">
            Financial intelligence & AI forecasting
          </p>
        </div>
        <div className="flex gap-1 bg-dark-800 rounded-lg p-0.5">
          {(['week', 'month', 'quarter'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                'text-[10px] font-medium px-2.5 py-1 rounded-md transition-colors capitalize',
                timeRange === range
                  ? 'bg-boss-500/20 text-boss-400'
                  : 'text-dark-500 hover:text-dark-300'
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Cash Flow Warning */}
      {cashFlowWarning && (
        <div className="glass-card p-3 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-400">Cash Flow Alert</p>
              <p className="text-[10px] text-dark-300 mt-0.5">
                AI detects a potential cash shortfall next week (-{formatCurrency(13300)}).
                Consider accelerating {formatCurrency(18700)} in overdue receivables.
              </p>
            </div>
            <button className="btn-ghost text-[10px] px-2 py-1 flex-shrink-0 text-amber-400">
              Action Plan
            </button>
          </div>
        </div>
      )}

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-3">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="flex items-center gap-0.5 text-[10px] text-emerald-400">
              <ArrowUpRight className="w-3 h-3" />
              {financials.revenueChange}%
            </span>
          </div>
          <p className="text-base font-bold text-white">{formatCurrency(financials.monthlyRevenue)}</p>
          <p className="text-[10px] text-dark-500 uppercase tracking-wider">Revenue</p>
        </div>
        <div className="glass-card p-3">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-4 h-4 text-green-400" />
            <span className="flex items-center gap-0.5 text-[10px] text-emerald-400">
              <ArrowUpRight className="w-3 h-3" />
              {financials.profitChange}%
            </span>
          </div>
          <p className="text-base font-bold text-emerald-400">{formatCurrency(financials.monthlyProfit)}</p>
          <p className="text-[10px] text-dark-500 uppercase tracking-wider">Profit ({formatPercent(financials.profitMargin)})</p>
        </div>
      </div>

      {/* Cash Position */}
      <div className="glass-card p-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-boss-400" />
          Cash Position
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-dark-800/60 rounded-lg">
            <p className="text-sm font-bold text-white">{formatCurrency(financials.cashOnHand)}</p>
            <p className="text-[10px] text-dark-500">Cash on Hand</p>
          </div>
          <div className="text-center p-2 bg-dark-800/60 rounded-lg">
            <p className="text-sm font-bold text-boss-400">{formatCurrency(financials.receivables)}</p>
            <p className="text-[10px] text-dark-500">Receivables</p>
          </div>
          <div className="text-center p-2 bg-dark-800/60 rounded-lg">
            <p className="text-sm font-bold text-red-400">{formatCurrency(financials.payables)}</p>
            <p className="text-[10px] text-dark-500">Payables</p>
          </div>
        </div>
      </div>

      {/* Cash Flow Forecast */}
      <div className="glass-card p-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-accent-400" />
          AI Cash Flow Forecast
        </h2>
        <div className="space-y-2">
          {cashFlowForecast.map((period, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-700/30">
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3 text-dark-500" />
                <span className="text-xs text-dark-300">{period.period}</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-emerald-400 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  {formatCurrency(period.inflow)}
                </span>
                <span className="text-red-400 flex items-center gap-0.5">
                  <ArrowDownRight className="w-3 h-3" />
                  {formatCurrency(period.outflow)}
                </span>
                <span className={cn(
                  'font-bold min-w-[70px] text-right',
                  period.net >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {period.net >= 0 ? '+' : ''}{formatCurrency(period.net)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overdue Invoices */}
      {overdueInvoices.length > 0 && (
        <div className="glass-card p-4 border-red-500/10">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Overdue Invoices
            <span className="badge-danger text-[10px]">{formatCurrency(financials.overdueAmount)}</span>
          </h2>
          <div className="space-y-2">
            {overdueInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                <div>
                  <p className="text-xs font-medium text-dark-200">{inv.customer}</p>
                  <p className="text-[10px] text-dark-500">{inv.id} &middot; {inv.job}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-red-400">{formatCurrency(inv.amount)}</p>
                  <p className="text-[10px] text-red-400/60">{inv.daysOverdue} days overdue</p>
                </div>
              </div>
            ))}
            <button className="btn-secondary w-full text-xs flex items-center justify-center gap-1.5 mt-1">
              <Send className="w-3.5 h-3.5" />
              Send Payment Reminders
            </button>
          </div>
        </div>
      )}

      {/* Job Profitability */}
      <div className="glass-card p-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <PieChart className="w-4 h-4 text-boss-400" />
          Job Profitability
        </h2>
        <div className="space-y-2">
          {jobProfitability.map((job, i) => (
            <div key={i} className="p-2 rounded-lg hover:bg-dark-700/30 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-dark-200 font-medium">{job.name}</p>
                <span className={cn(
                  'text-xs font-bold',
                  job.margin >= 30 ? 'text-emerald-400' : job.margin >= 20 ? 'text-amber-400' : 'text-red-400'
                )}>
                  {formatPercent(job.margin)}
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className={cn(
                    'progress-bar-fill',
                    job.margin >= 30 ? 'bg-emerald-500' : job.margin >= 20 ? 'bg-amber-500' : 'bg-red-500'
                  )}
                  style={{ width: `${job.margin * 3}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1 text-[10px] text-dark-500">
                <span>Rev: {formatCurrency(job.revenue)}</span>
                <span>Cost: {formatCurrency(job.cost)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Payables */}
      <div className="glass-card p-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Receipt className="w-4 h-4 text-boss-400" />
          Upcoming Payables
        </h2>
        <div className="space-y-1.5">
          {upcomingPayables.map((payable, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-700/30">
              <div>
                <p className="text-xs text-dark-200">{payable.vendor}</p>
                <p className="text-[10px] text-dark-500">{payable.category} &middot; Due {payable.dueDate}</p>
              </div>
              <span className="text-xs font-medium text-dark-300">{formatCurrency(payable.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
