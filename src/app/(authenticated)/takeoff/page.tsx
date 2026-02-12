'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Ruler,
  Upload,
  FileImage,
  Wand2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Check,
  X,
  Send,
  Layers,
  DollarSign,
  ClipboardList,
  ArrowRight,
} from 'lucide-react';
import { cn, formatCurrency, formatNumber } from '@/lib/utils/cn';
import { useJobs } from '@/lib/hooks/useJobTread';
import { LoadingState } from '@/components/ui/DataState';
import type { TakeoffLineItem, BlueprintMeasurement } from '@/types/jobtread';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TakeoffResult {
  projectSummary: {
    projectType: string;
    totalArea: number;
    unit: string;
    roomCount: number;
    stories: number;
    description: string;
  };
  measurements: BlueprintMeasurement[];
  lineItems: TakeoffLineItem[];
  subtotalCost: number;
  subtotalPrice: number;
  tax: number;
  totalPrice: number;
  markup: number;
  confidence: number;
  warnings: string[];
  analyzedAt: string;
}

type Step = 'upload' | 'analyzing' | 'review' | 'push';

const projectTypes = [
  { id: 'residential', label: 'Residential', icon: '🏠' },
  { id: 'commercial', label: 'Commercial', icon: '🏢' },
  { id: 'remodel', label: 'Remodel', icon: '🔨' },
  { id: 'addition', label: 'Addition', icon: '🏗️' },
  { id: 'roofing', label: 'Roofing', icon: '🏠' },
  { id: 'multifamily', label: 'Multi-Family', icon: '🏘️' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BlueprintTakeoffPage() {
  // Upload state
  const [step, setStep] = useState<Step>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [projectType, setProjectType] = useState('residential');
  const [markup, setMarkup] = useState('45');
  const [notes, setNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analysis state
  const [result, setResult] = useState<TakeoffResult | null>(null);
  const [analysisError, setAnalysisError] = useState('');

  // Review state
  const [expandedTrades, setExpandedTrades] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // Push-to-JobTread state
  const [selectedJobId, setSelectedJobId] = useState('');
  const [budgetName, setBudgetName] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);
  const [pushError, setPushError] = useState('');

  // Jobs for the push step
  const { data: jobs } = useJobs();

  // ---------------------------------------------------------------------------
  // File handling
  // ---------------------------------------------------------------------------

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setAnalysisError('Please upload an image file (PNG, JPG, etc.)');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setAnalysisError('File too large — max 20 MB');
      return;
    }
    setAnalysisError('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      // Strip the data:image/...;base64, prefix
      const base64 = dataUrl.split(',')[1];
      setImageData(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  // ---------------------------------------------------------------------------
  // Analysis
  // ---------------------------------------------------------------------------

  const runAnalysis = async () => {
    if (!imageData) return;
    setStep('analyzing');
    setAnalysisError('');
    setResult(null);

    try {
      const res = await fetch('/api/ai/blueprint-takeoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData,
          projectType,
          defaultMarkup: Number(markup) || 45,
          notes,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Analysis failed (${res.status})`);
      }

      const data: TakeoffResult = await res.json();
      setResult(data);

      // Select all items by default
      setSelectedItems(new Set(data.lineItems.map((_, i) => i)));

      // Expand all trade groups by default
      const trades = new Set(data.lineItems.map((i) => i.tradeGroup));
      setExpandedTrades(trades);

      setBudgetName(`Blueprint Takeoff — ${new Date().toLocaleDateString()}`);
      setStep('review');
    } catch (err: unknown) {
      setAnalysisError(err instanceof Error ? err.message : 'Analysis failed');
      setStep('upload');
    }
  };

  // ---------------------------------------------------------------------------
  // Push to JobTread
  // ---------------------------------------------------------------------------

  const pushToJobTread = async () => {
    if (!result || !selectedJobId) return;
    setIsPushing(true);
    setPushError('');
    setPushSuccess(false);

    const items = result.lineItems
      .filter((_, i) => selectedItems.has(i))
      .map((item) => ({
        name: item.name,
        description: item.description,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.unitCost,
        unitPrice: item.unitPrice,
        costCode: item.costCode,
      }));

    try {
      const res = await fetch('/api/jobtread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation CreateBudgetEstimate($jobId: ID!, $input: CreateEstimateInput!) {
            createEstimate(jobId: $jobId, input: $input) {
              id name status subtotal tax total createdAt
              lineItems { id name quantity unitCost unitPrice totalCost totalPrice }
            }
          }`,
          variables: {
            jobId: selectedJobId,
            input: { name: budgetName || 'Blueprint Takeoff', lineItems: items },
          },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Push failed (${res.status})`);
      }

      const apiResult = await res.json();
      if (apiResult.errors?.length) throw new Error(apiResult.errors[0].message);

      setPushSuccess(true);
      setStep('push');
    } catch (err: unknown) {
      setPushError(err instanceof Error ? err.message : 'Failed to push to JobTread');
    } finally {
      setIsPushing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const toggleTrade = (trade: string) => {
    setExpandedTrades((prev) => {
      const next = new Set(prev);
      next.has(trade) ? next.delete(trade) : next.add(trade);
      return next;
    });
  };

  const toggleItem = (idx: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const toggleAllInTrade = (trade: string) => {
    if (!result) return;
    const indices = result.lineItems
      .map((item, i) => (item.tradeGroup === trade ? i : -1))
      .filter((i) => i >= 0);
    const allSelected = indices.every((i) => selectedItems.has(i));
    setSelectedItems((prev) => {
      const next = new Set(prev);
      indices.forEach((i) => (allSelected ? next.delete(i) : next.add(i)));
      return next;
    });
  };

  const getTradeGroups = () => {
    if (!result) return [];
    const map = new Map<string, { items: (TakeoffLineItem & { idx: number })[]; totalCost: number; totalPrice: number }>();
    result.lineItems.forEach((item, idx) => {
      const existing = map.get(item.tradeGroup) || { items: [], totalCost: 0, totalPrice: 0 };
      existing.items.push({ ...item, idx });
      existing.totalCost += item.totalCost;
      existing.totalPrice += item.totalPrice;
      map.set(item.tradeGroup, existing);
    });
    return Array.from(map.entries()).map(([trade, data]) => ({ trade, ...data }));
  };

  const selectedCount = selectedItems.size;
  const selectedTotal = result
    ? result.lineItems.filter((_, i) => selectedItems.has(i)).reduce((s, i) => s + i.totalPrice, 0)
    : 0;
  const selectedCost = result
    ? result.lineItems.filter((_, i) => selectedItems.has(i)).reduce((s, i) => s + i.totalCost, 0)
    : 0;

  const resetAll = () => {
    setStep('upload');
    setImagePreview(null);
    setImageData(null);
    setFileName('');
    setResult(null);
    setAnalysisError('');
    setPushSuccess(false);
    setPushError('');
    setSelectedJobId('');
    setBudgetName('');
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Ruler className="w-5 h-5 text-boss-400" />
            Blueprint Takeoff
          </h1>
          <p className="text-xs text-dark-400">
            Upload plans &rarr; AI scans &rarr; full material takeoff &rarr; push to JobTread
          </p>
        </div>
        {step !== 'upload' && (
          <button onClick={resetAll} className="btn-secondary text-xs px-3 py-1.5">
            New Takeoff
          </button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-1 text-[10px]">
        {(['upload', 'analyzing', 'review', 'push'] as Step[]).map((s, i) => {
          const labels = ['Upload', 'Analyze', 'Review', 'JobTread'];
          const isActive = s === step;
          const isDone =
            (s === 'upload' && ['analyzing', 'review', 'push'].includes(step)) ||
            (s === 'analyzing' && ['review', 'push'].includes(step)) ||
            (s === 'review' && step === 'push');
          return (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && <ArrowRight className="w-3 h-3 text-dark-600" />}
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full',
                  isDone && 'bg-emerald-500/20 text-emerald-400',
                  isActive && !isDone && 'bg-boss-500/20 text-boss-400',
                  !isActive && !isDone && 'bg-dark-800 text-dark-500'
                )}
              >
                {labels[i]}
              </span>
            </div>
          );
        })}
      </div>

      {/* ================================================================ */}
      {/* STEP 1: Upload */}
      {/* ================================================================ */}
      {step === 'upload' && (
        <div className="space-y-4 animate-fade-in">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'glass-card p-6 border-2 border-dashed cursor-pointer transition-all text-center',
              imagePreview
                ? 'border-boss-500/40 bg-boss-500/5'
                : 'border-dark-600/50 hover:border-boss-500/30 hover:bg-dark-800/40'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            {imagePreview ? (
              <div className="space-y-3">
                <img
                  src={imagePreview}
                  alt="Blueprint preview"
                  className="max-h-48 mx-auto rounded-lg border border-dark-700/50"
                />
                <div className="flex items-center justify-center gap-2 text-xs text-boss-400">
                  <FileImage className="w-4 h-4" />
                  <span className="truncate max-w-[200px]">{fileName}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setImagePreview(null);
                      setImageData(null);
                      setFileName('');
                    }}
                    className="text-dark-500 hover:text-red-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 mx-auto text-dark-500" />
                <p className="text-sm text-dark-300">
                  Drop your blueprint or plan here
                </p>
                <p className="text-[10px] text-dark-500">
                  PNG, JPG, or WEBP &bull; Max 20 MB
                </p>
              </div>
            )}
          </div>

          {/* Project Config */}
          <div className="glass-card p-4 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-boss-400" />
              Project Parameters
            </h2>

            {/* Project Type */}
            <div>
              <label className="block text-xs text-dark-400 mb-2">Project Type</label>
              <div className="grid grid-cols-3 gap-2">
                {projectTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setProjectType(type.id)}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg border text-xs transition-all',
                      projectType === type.id
                        ? 'border-boss-500/50 bg-boss-500/10 text-boss-400'
                        : 'border-dark-700/50 text-dark-400 hover:border-dark-600'
                    )}
                  >
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Markup */}
            <div>
              <label className="block text-xs text-dark-400 mb-1.5">Default Markup %</label>
              <input
                type="number"
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
                className="input-field text-xs w-32"
                placeholder="45"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs text-dark-400 mb-1.5">Notes for AI</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field text-xs min-h-[50px] resize-none"
                placeholder="Specific materials, scope details, exclusions..."
              />
            </div>
          </div>

          {/* Error */}
          {analysisError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-xs text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {analysisError}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={runAnalysis}
            disabled={!imageData}
            className={cn(
              'btn-accent w-full flex items-center justify-center gap-2 py-2.5 text-sm',
              !imageData && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Wand2 className="w-4 h-4" />
            Analyze Blueprint &amp; Generate Takeoff
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/* STEP 2: Analyzing */}
      {/* ================================================================ */}
      {step === 'analyzing' && (
        <div className="glass-card p-8 glow-border animate-fade-in">
          <LoadingState label="Analyzing blueprint with AI..." />
          <p className="text-[10px] text-dark-500 text-center mt-2">
            Extracting measurements, materials, and quantities...
          </p>
        </div>
      )}

      {/* ================================================================ */}
      {/* STEP 3: Review */}
      {/* ================================================================ */}
      {step === 'review' && result && (
        <div className="space-y-4 animate-fade-in">
          {/* Summary Card */}
          <div className="glass-card p-4 glow-border space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-accent-400" />
                Takeoff Results
              </h2>
              <span
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full',
                  result.confidence >= 0.8
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : result.confidence >= 0.6
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-red-500/20 text-red-400'
                )}
              >
                {Math.round(result.confidence * 100)}% confidence
              </span>
            </div>

            {/* Project summary */}
            <div className="bg-dark-800/60 rounded-lg p-3 text-xs text-dark-300 space-y-1">
              <p>
                <span className="text-dark-500">Type:</span>{' '}
                {result.projectSummary.projectType}
              </p>
              <p>
                <span className="text-dark-500">Area:</span>{' '}
                {formatNumber(result.projectSummary.totalArea)} {result.projectSummary.unit}
                {result.projectSummary.roomCount > 0 &&
                  ` — ${result.projectSummary.roomCount} rooms`}
                {result.projectSummary.stories > 1 &&
                  `, ${result.projectSummary.stories} stories`}
              </p>
              <p className="text-dark-400">{result.projectSummary.description}</p>
            </div>

            {/* Financials grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 bg-dark-800/60 rounded-lg">
                <p className="text-sm font-bold text-white">{formatCurrency(result.totalPrice)}</p>
                <p className="text-[10px] text-dark-500">Total Price</p>
              </div>
              <div className="text-center p-2 bg-dark-800/60 rounded-lg">
                <p className="text-sm font-bold text-dark-300">{formatCurrency(result.subtotalCost)}</p>
                <p className="text-[10px] text-dark-500">Total Cost</p>
              </div>
              <div className="text-center p-2 bg-dark-800/60 rounded-lg">
                <p className="text-sm font-bold text-emerald-400">
                  {formatCurrency(result.subtotalPrice - result.subtotalCost)}
                </p>
                <p className="text-[10px] text-dark-500">Profit</p>
              </div>
              <div className="text-center p-2 bg-dark-800/60 rounded-lg">
                <p className="text-sm font-bold text-accent-400">{result.markup}%</p>
                <p className="text-[10px] text-dark-500">Markup</p>
              </div>
            </div>

            {/* Measurements */}
            {result.measurements.length > 0 && (
              <div>
                <p className="text-xs font-medium text-dark-300 mb-1.5">Key Measurements</p>
                <div className="flex flex-wrap gap-2">
                  {result.measurements.map((m, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[10px] bg-dark-800/80 px-2 py-1 rounded text-dark-300"
                    >
                      <Ruler className="w-2.5 h-2.5 text-boss-400" />
                      {m.label}: {formatNumber(m.value)} {m.unit}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="space-y-1">
                {result.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 rounded p-1.5"
                  >
                    <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selection summary */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-dark-400">
              <span className="text-boss-400 font-medium">{selectedCount}</span> of{' '}
              {result.lineItems.length} items selected &mdash;{' '}
              <span className="text-white font-medium">{formatCurrency(selectedTotal)}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedItems(new Set(result.lineItems.map((_, i) => i)))}
                className="text-[10px] text-boss-400 hover:underline"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedItems(new Set())}
                className="text-[10px] text-dark-500 hover:underline"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Line Items by Trade Group */}
          <div className="space-y-2">
            {getTradeGroups().map((group) => {
              const isExpanded = expandedTrades.has(group.trade);
              const tradeIndices = group.items.map((i) => i.idx);
              const allSelected = tradeIndices.every((i) => selectedItems.has(i));

              return (
                <div key={group.trade} className="glass-card overflow-hidden">
                  {/* Trade header */}
                  <button
                    onClick={() => toggleTrade(group.trade)}
                    className="w-full flex items-center justify-between p-3 hover:bg-dark-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleAllInTrade(group.trade);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-dark-600 bg-dark-800 text-boss-500 focus:ring-boss-500/50 w-3.5 h-3.5"
                      />
                      <span className="text-xs font-semibold text-white">{group.trade}</span>
                      <span className="text-[10px] text-dark-500">
                        {group.items.length} items
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs font-medium text-dark-200">
                          {formatCurrency(group.totalPrice)}
                        </p>
                        <p className="text-[10px] text-dark-500">
                          Cost: {formatCurrency(group.totalCost)}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-dark-500" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-dark-500" />
                      )}
                    </div>
                  </button>

                  {/* Line items */}
                  {isExpanded && (
                    <div className="border-t border-dark-700/50">
                      {group.items.map((item) => (
                        <div
                          key={item.idx}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 text-xs hover:bg-dark-700/20 transition-colors border-b border-dark-700/30 last:border-0',
                            !selectedItems.has(item.idx) && 'opacity-50'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.idx)}
                            onChange={() => toggleItem(item.idx)}
                            className="rounded border-dark-600 bg-dark-800 text-boss-500 focus:ring-boss-500/50 w-3.5 h-3.5 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-dark-200 truncate">{item.name}</p>
                            <p className="text-[10px] text-dark-500 truncate">
                              {item.description}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0 space-y-0.5">
                            <p className="text-dark-300 font-medium">
                              {formatCurrency(item.totalPrice)}
                            </p>
                            <p className="text-[10px] text-dark-500">
                              {formatNumber(item.quantity)} {item.unit} &times;{' '}
                              {formatCurrency(item.unitPrice)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Push to JobTread Section */}
          <div className="glass-card p-4 glow-border space-y-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-boss-400" />
              Push to JobTread
            </h2>

            <div>
              <label className="block text-xs text-dark-400 mb-1.5">Select Job</label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="input-field text-xs w-full"
              >
                <option value="">Choose a job...</option>
                {jobs?.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.name}
                    {job.number ? ` (#${job.number})` : ''}
                    {job.customer
                      ? ` — ${job.customer.firstName} ${job.customer.lastName}`
                      : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-dark-400 mb-1.5">Budget / Estimate Name</label>
              <input
                type="text"
                value={budgetName}
                onChange={(e) => setBudgetName(e.target.value)}
                className="input-field text-xs w-full"
                placeholder="Blueprint Takeoff — Feb 2026"
              />
            </div>

            <div className="flex items-center justify-between bg-dark-800/60 rounded-lg p-2.5">
              <div className="text-xs">
                <span className="text-dark-500">Pushing</span>{' '}
                <span className="text-boss-400 font-medium">{selectedCount} items</span>
              </div>
              <div className="text-right text-xs">
                <p className="text-dark-300">
                  Cost: <span className="font-medium">{formatCurrency(selectedCost)}</span>
                </p>
                <p className="text-white font-semibold">
                  Price: <span className="text-boss-400">{formatCurrency(selectedTotal)}</span>
                </p>
              </div>
            </div>

            {pushError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {pushError}
              </div>
            )}

            <button
              onClick={pushToJobTread}
              disabled={!selectedJobId || selectedCount === 0 || isPushing}
              className={cn(
                'btn-accent w-full flex items-center justify-center gap-2 py-2.5 text-sm',
                (!selectedJobId || selectedCount === 0 || isPushing) &&
                  'opacity-50 cursor-not-allowed'
              )}
            >
              {isPushing ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Pushing to JobTread...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  Create Budget in JobTread
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* STEP 4: Push Success */}
      {/* ================================================================ */}
      {step === 'push' && pushSuccess && (
        <div className="glass-card p-6 glow-border animate-fade-in text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Check className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Budget Created in JobTread</h2>
            <p className="text-xs text-dark-400 mt-1">
              {selectedCount} line items totaling{' '}
              <span className="text-boss-400">{formatCurrency(selectedTotal)}</span> have been
              pushed to your job.
            </p>
          </div>
          <div className="bg-dark-800/60 rounded-lg p-3 text-left space-y-1 text-xs">
            <p className="text-dark-400">
              Budget: <span className="text-dark-200">{budgetName}</span>
            </p>
            <p className="text-dark-400">
              Total Cost: <span className="text-dark-200">{formatCurrency(selectedCost)}</span>
            </p>
            <p className="text-dark-400">
              Total Price: <span className="text-white font-medium">{formatCurrency(selectedTotal)}</span>
            </p>
            <p className="text-dark-400">
              Profit:{' '}
              <span className="text-emerald-400 font-medium">
                {formatCurrency(selectedTotal - selectedCost)}
              </span>
            </p>
          </div>
          <button onClick={resetAll} className="btn-primary text-xs px-4 py-2">
            Start Another Takeoff
          </button>
        </div>
      )}
    </div>
  );
}
