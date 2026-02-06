'use client';

import { useState } from 'react';
import {
  Calculator,
  Zap,
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  Send,
  DollarSign,
  Layers,
  Wand2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils/cn';

// Why this feature exists:
// BetterBossOS reduces estimate creation from hours to 3.8 minutes.
// This solves the #1 contractor pain point: slow proposals losing deals.
// AI-powered line item generation pulls from your cost catalog and market data.

type ProjectType = 'roofing' | 'remodel' | 'addition' | 'commercial' | 'custom';

const projectTypes: { id: ProjectType; label: string; icon: string }[] = [
  { id: 'roofing', label: 'Roofing', icon: '🏠' },
  { id: 'remodel', label: 'Remodel', icon: '🔨' },
  { id: 'addition', label: 'Addition', icon: '🏗️' },
  { id: 'commercial', label: 'Commercial', icon: '🏢' },
  { id: 'custom', label: 'Custom', icon: '📋' },
];

const recentEstimates = [
  { id: '1', name: 'Henderson Full Reroof', customer: 'Mike Henderson', total: 68500, status: 'ACCEPTED', createdAt: '2 days ago' },
  { id: '2', name: 'Garcia Kitchen Remodel', customer: 'Maria Garcia', total: 47200, status: 'SENT', createdAt: '3 days ago' },
  { id: '3', name: 'Martinez Roof Repair', customer: 'Carlos Martinez', total: 15800, status: 'DRAFT', createdAt: '1 day ago' },
  { id: '4', name: 'Thompson Commercial Roof', customer: 'Thompson Corp', total: 125000, status: 'ACCEPTED', createdAt: '1 week ago' },
];

const aiGeneratedLineItems = [
  { name: 'Tear-off existing shingles', category: 'Labor', qty: 28, unit: 'SQ', unitCost: 45, unitPrice: 72 },
  { name: '30-year architectural shingles', category: 'Materials', qty: 30, unit: 'SQ', unitCost: 95, unitPrice: 145 },
  { name: 'Synthetic underlayment', category: 'Materials', qty: 30, unit: 'SQ', unitCost: 22, unitPrice: 38 },
  { name: 'Drip edge flashing', category: 'Materials', qty: 220, unit: 'LF', unitCost: 1.5, unitPrice: 2.8 },
  { name: 'Ridge vent installation', category: 'Labor', qty: 45, unit: 'LF', unitCost: 8, unitPrice: 14 },
  { name: 'Ice & water shield', category: 'Materials', qty: 200, unit: 'SF', unitCost: 0.85, unitPrice: 1.5 },
  { name: 'Pipe boot replacement (4)', category: 'Materials', qty: 4, unit: 'EA', unitCost: 12, unitPrice: 25 },
  { name: 'Dump trailer & disposal', category: 'Equipment', qty: 1, unit: 'LS', unitCost: 450, unitPrice: 650 },
  { name: 'Install labor - roofing crew', category: 'Labor', qty: 28, unit: 'SQ', unitCost: 65, unitPrice: 110 },
];

export default function EstimatesPage() {
  const [showNewEstimate, setShowNewEstimate] = useState(false);
  const [selectedType, setSelectedType] = useState<ProjectType | null>(null);
  const [sqFootage, setSqFootage] = useState('2800');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerated, setShowGenerated] = useState(false);
  const [expandedEstimate, setExpandedEstimate] = useState<string | null>(null);

  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulate AI generation
    setTimeout(() => {
      setIsGenerating(false);
      setShowGenerated(true);
    }, 2000);
  };

  const totalCost = aiGeneratedLineItems.reduce((sum, item) => sum + item.qty * item.unitCost, 0);
  const totalPrice = aiGeneratedLineItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const margin = ((totalPrice - totalCost) / totalPrice) * 100;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-boss-400" />
            Smart Estimator
          </h1>
          <p className="text-xs text-dark-400">
            AI-powered estimates in under 4 minutes
          </p>
        </div>
        <button
          onClick={() => setShowNewEstimate(!showNewEstimate)}
          className="btn-accent text-xs flex items-center gap-1.5 px-3 py-1.5"
        >
          <Wand2 className="w-3.5 h-3.5" />
          AI Estimate
        </button>
      </div>

      {/* Speed Stat */}
      <div className="glass-card p-3 glow-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-accent-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-white">Your Avg Estimate Time</p>
            <p className="text-[10px] text-dark-400">Powered by BetterBossOS cost catalog</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-accent-400">3.8 min</p>
          <p className="text-[10px] text-dark-500">vs industry avg 3+ hrs</p>
        </div>
      </div>

      {/* New AI Estimate */}
      {showNewEstimate && (
        <div className="glass-card p-4 glow-border animate-fade-in space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-accent-400" />
            Generate AI Estimate
          </h2>

          {/* Project Type */}
          <div>
            <label className="block text-xs text-dark-400 mb-2">Project Type</label>
            <div className="grid grid-cols-5 gap-2">
              {projectTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all',
                    selectedType === type.id
                      ? 'border-boss-500/50 bg-boss-500/10 text-boss-400'
                      : 'border-dark-700/50 text-dark-400 hover:border-dark-600'
                  )}
                >
                  <span className="text-base">{type.icon}</span>
                  <span className="text-[10px]">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Square Footage */}
          <div>
            <label className="block text-xs text-dark-400 mb-1.5">Square Footage</label>
            <input
              type="number"
              value={sqFootage}
              onChange={(e) => setSqFootage(e.target.value)}
              className="input-field text-xs"
              placeholder="e.g., 2800"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-dark-400 mb-1.5">Project Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field text-xs min-h-[60px] resize-none"
              placeholder="Describe the project scope, materials preferred, special requirements..."
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!selectedType || isGenerating}
            className={cn(
              'btn-accent w-full flex items-center justify-center gap-2 py-2.5 text-sm',
              (!selectedType || isGenerating) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                AI Generating Estimate...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate AI Estimate
              </>
            )}
          </button>
        </div>
      )}

      {/* AI Generated Result */}
      {showGenerated && (
        <div className="glass-card p-4 glow-border animate-fade-in space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent-400" />
              AI-Generated Estimate
            </h2>
            <span className="badge-success text-[10px]">92% confidence</span>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-dark-800/60 rounded-lg">
              <p className="text-sm font-bold text-white">{formatCurrency(totalPrice)}</p>
              <p className="text-[10px] text-dark-500">Total Price</p>
            </div>
            <div className="text-center p-2 bg-dark-800/60 rounded-lg">
              <p className="text-sm font-bold text-dark-300">{formatCurrency(totalCost)}</p>
              <p className="text-[10px] text-dark-500">Total Cost</p>
            </div>
            <div className="text-center p-2 bg-dark-800/60 rounded-lg">
              <p className="text-sm font-bold text-emerald-400">{margin.toFixed(1)}%</p>
              <p className="text-[10px] text-dark-500">Margin</p>
            </div>
          </div>

          {/* Market Comparison */}
          <div className="bg-dark-800/40 rounded-lg p-2.5">
            <p className="text-[10px] text-dark-400 mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Market Price Comparison
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-dark-500">Low: {formatCurrency(totalPrice * 0.82)}</span>
              <span className="text-emerald-400 font-medium">Yours: {formatCurrency(totalPrice)}</span>
              <span className="text-dark-500">High: {formatCurrency(totalPrice * 1.15)}</span>
            </div>
            <div className="progress-bar mt-1.5">
              <div className="progress-bar-fill bg-emerald-500" style={{ width: '62%' }} />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <p className="text-xs font-medium text-dark-300 mb-2">{aiGeneratedLineItems.length} Line Items</p>
            <div className="space-y-1">
              {aiGeneratedLineItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-700/30 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="text-dark-200 truncate">{item.name}</p>
                    <p className="text-[10px] text-dark-500">{item.category} &middot; {item.qty} {item.unit}</p>
                  </div>
                  <span className="text-dark-300 font-medium">{formatCurrency(item.qty * item.unitPrice)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button className="btn-primary flex-1 text-xs flex items-center justify-center gap-1.5">
              <Send className="w-3.5 h-3.5" />
              Push to JobTread
            </button>
            <button className="btn-secondary text-xs px-3">
              Edit
            </button>
          </div>
        </div>
      )}

      {/* Recent Estimates */}
      <div className="glass-card p-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-boss-400" />
          Recent Estimates
        </h2>
        <div className="space-y-2">
          {recentEstimates.map((est) => (
            <div
              key={est.id}
              onClick={() => setExpandedEstimate(expandedEstimate === est.id ? null : est.id)}
              className="p-2.5 rounded-lg hover:bg-dark-700/30 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-dark-200 truncate">{est.name}</p>
                  <p className="text-[10px] text-dark-500">{est.customer} &middot; {est.createdAt}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-dark-300">{formatCurrency(est.total)}</span>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full',
                    est.status === 'ACCEPTED' && 'bg-emerald-500/10 text-emerald-400',
                    est.status === 'SENT' && 'bg-boss-500/10 text-boss-400',
                    est.status === 'DRAFT' && 'bg-dark-600/50 text-dark-400',
                  )}>
                    {est.status}
                  </span>
                  {expandedEstimate === est.id ? (
                    <ChevronUp className="w-3 h-3 text-dark-500" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-dark-500" />
                  )}
                </div>
              </div>
              {expandedEstimate === est.id && (
                <div className="mt-2 pt-2 border-t border-dark-700/50 flex gap-2">
                  <button className="btn-ghost text-[10px] px-2 py-1">View in JobTread</button>
                  <button className="btn-ghost text-[10px] px-2 py-1">Duplicate</button>
                  <button className="btn-ghost text-[10px] px-2 py-1">Send</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
