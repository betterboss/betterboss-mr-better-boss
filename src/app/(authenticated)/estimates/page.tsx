'use client';

import { useState } from 'react';
import {
  Calculator, Zap, FileText, Wand2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils/cn';
import { useEstimates } from '@/lib/hooks/useJobTread';
import { LoadingState, ErrorState } from '@/components/ui/DataState';

type ProjectType = 'roofing' | 'remodel' | 'addition' | 'commercial' | 'custom';

const projectTypes: { id: ProjectType; label: string; icon: string }[] = [
  { id: 'roofing', label: 'Roofing', icon: '🏠' },
  { id: 'remodel', label: 'Remodel', icon: '🔨' },
  { id: 'addition', label: 'Addition', icon: '🏗️' },
  { id: 'commercial', label: 'Commercial', icon: '🏢' },
  { id: 'custom', label: 'Custom', icon: '📋' },
];

interface GeneratedEstimate {
  lineItems: { name: string; category: string; quantity: number; unit: string; unitCost: number; unitPrice: number; totalPrice: number }[];
  subtotal: number;
  tax: number;
  total: number;
  confidence: number;
}

export default function EstimatesPage() {
  const [showNewEstimate, setShowNewEstimate] = useState(false);
  const [selectedType, setSelectedType] = useState<ProjectType | null>(null);
  const [sqFootage, setSqFootage] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedEstimate | null>(null);
  const [generateError, setGenerateError] = useState('');
  const [expandedEstimate, setExpandedEstimate] = useState<string | null>(null);

  const { data: estimates, isLoading, error, refetch } = useEstimates();

  const handleGenerate = async () => {
    if (!selectedType) return;
    setIsGenerating(true);
    setGenerateError('');
    setGenerated(null);

    try {
      const res = await fetch('/api/ai/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: selectedType,
          squareFootage: sqFootage ? Number(sqFootage) : undefined,
          description,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed (${res.status})`);
      }
      const data = await res.json();
      setGenerated(data);
    } catch (err: unknown) {
      setGenerateError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-boss-400" />
            Smart Estimator
          </h1>
          <p className="text-xs text-dark-400">AI-powered estimates from your cost catalog</p>
        </div>
        <button onClick={() => { setShowNewEstimate(!showNewEstimate); setGenerated(null); }}
          className="btn-accent text-xs flex items-center gap-1.5 px-3 py-1.5">
          <Wand2 className="w-3.5 h-3.5" />AI Estimate
        </button>
      </div>

      {/* New Estimate Form */}
      {showNewEstimate && (
        <div className="glass-card p-4 glow-border animate-fade-in space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-accent-400" />Generate AI Estimate
          </h2>
          <div>
            <label className="block text-xs text-dark-400 mb-2">Project Type</label>
            <div className="grid grid-cols-5 gap-2">
              {projectTypes.map((type) => (
                <button key={type.id} onClick={() => setSelectedType(type.id)}
                  className={cn('flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all',
                    selectedType === type.id ? 'border-boss-500/50 bg-boss-500/10 text-boss-400' : 'border-dark-700/50 text-dark-400 hover:border-dark-600')}>
                  <span className="text-base">{type.icon}</span>
                  <span className="text-[10px]">{type.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1.5">Square Footage</label>
            <input type="number" value={sqFootage} onChange={(e) => setSqFootage(e.target.value)} className="input-field text-xs" placeholder="e.g., 2800" />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1.5">Project Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              className="input-field text-xs min-h-[60px] resize-none" placeholder="Scope, materials, requirements..." />
          </div>
          {generateError && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-xs text-red-400">{generateError}</div>}
          <button onClick={handleGenerate} disabled={!selectedType || isGenerating}
            className={cn('btn-accent w-full flex items-center justify-center gap-2 py-2.5 text-sm', (!selectedType || isGenerating) && 'opacity-50 cursor-not-allowed')}>
            {isGenerating ? (
              <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Generating...</>
            ) : (<><Wand2 className="w-4 h-4" />Generate AI Estimate</>)}
          </button>
        </div>
      )}

      {/* Generated Result */}
      {generated && (
        <div className="glass-card p-4 glow-border animate-fade-in space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-accent-400" />AI-Generated Estimate</h2>
            <span className="badge-success text-[10px]">{Math.round((generated.confidence || 0.9) * 100)}% confidence</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-dark-800/60 rounded-lg">
              <p className="text-sm font-bold text-white">{formatCurrency(generated.total)}</p>
              <p className="text-[10px] text-dark-500">Total</p>
            </div>
            <div className="text-center p-2 bg-dark-800/60 rounded-lg">
              <p className="text-sm font-bold text-dark-300">{formatCurrency(generated.subtotal - (generated.lineItems?.reduce((s, i) => s + i.unitCost * i.quantity, 0) || 0))}</p>
              <p className="text-[10px] text-dark-500">Profit</p>
            </div>
            <div className="text-center p-2 bg-dark-800/60 rounded-lg">
              <p className="text-sm font-bold text-emerald-400">{formatCurrency(generated.tax)}</p>
              <p className="text-[10px] text-dark-500">Tax</p>
            </div>
          </div>
          {generated.lineItems && (
            <div>
              <p className="text-xs font-medium text-dark-300 mb-2">{generated.lineItems.length} Line Items</p>
              <div className="space-y-1">
                {generated.lineItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-700/30 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="text-dark-200 truncate">{item.name}</p>
                      <p className="text-[10px] text-dark-500">{item.category} &middot; {item.quantity} {item.unit}</p>
                    </div>
                    <span className="text-dark-300 font-medium">{formatCurrency(item.totalPrice)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-[10px] text-dark-500 text-center">
            Copy these line items into JobTread to create your estimate.
          </p>
        </div>
      )}

      {/* Recent Estimates from JobTread */}
      <div className="glass-card p-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-boss-400" />
          Estimates from JobTread
        </h2>
        {isLoading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={refetch} /> : (
          !estimates || estimates.length === 0 ? (
            <p className="text-xs text-dark-500 py-4 text-center">No estimates found in your JobTread account.</p>
          ) : (
            <div className="space-y-2">
              {estimates.map((est) => (
                <div key={est.id} onClick={() => setExpandedEstimate(expandedEstimate === est.id ? null : est.id)}
                  className="p-2.5 rounded-lg hover:bg-dark-700/30 cursor-pointer transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-dark-200 truncate">{est.name}</p>
                      <p className="text-[10px] text-dark-500">{est.status} &middot; {est.createdAt ? new Date(est.createdAt).toLocaleDateString() : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-dark-300">{formatCurrency(est.total || 0)}</span>
                      {expandedEstimate === est.id ? <ChevronUp className="w-3 h-3 text-dark-500" /> : <ChevronDown className="w-3 h-3 text-dark-500" />}
                    </div>
                  </div>
                  {expandedEstimate === est.id && est.lineItems && (
                    <div className="mt-2 pt-2 border-t border-dark-700/50 space-y-1">
                      {est.lineItems.map((li, i) => (
                        <div key={i} className="flex items-center justify-between text-[10px]">
                          <span className="text-dark-400 truncate">{li.name}</span>
                          <span className="text-dark-300">{formatCurrency(li.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
