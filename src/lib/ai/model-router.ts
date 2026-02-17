// =============================================================================
// Smart AI Model Router
// Routes tasks to the cheapest model that can handle them well.
// When you add real LLM calls, use getModelConfig() to pick the right model.
// =============================================================================

export type AITask =
  | 'lead-score'      // Simple scoring — cheapest model
  | 'chat-simple'     // Quick factual answers — cheap model
  | 'chat-complex'    // Business strategy, multi-step reasoning — expensive model
  | 'estimate'        // Construction estimating — needs accuracy, mid-tier
  | 'summarize';      // Summarize data — cheap model

interface ModelConfig {
  /** Model identifier for the API call */
  model: string;
  /** Provider: openai or anthropic */
  provider: 'openai' | 'anthropic';
  /** Max tokens for this task */
  maxTokens: number;
  /** Temperature (lower = more deterministic) */
  temperature: number;
  /** Approximate cost per 1K tokens (input + output blended) */
  costPer1kTokens: number;
}

const OPENAI_AVAILABLE = Boolean(process.env.OPENAI_API_KEY);
const ANTHROPIC_AVAILABLE = Boolean(process.env.ANTHROPIC_API_KEY);

/**
 * Returns the optimal model config for a given task.
 * Picks the cheapest model that delivers good-enough quality.
 */
export function getModelConfig(task: AITask): ModelConfig {
  // Prefer OpenAI if available (wider model range), fall back to Anthropic
  if (OPENAI_AVAILABLE) {
    return openaiModels[task];
  }
  if (ANTHROPIC_AVAILABLE) {
    return anthropicModels[task];
  }
  // No API key — return a placeholder (endpoints will use template fallbacks)
  return openaiModels[task];
}

const openaiModels: Record<AITask, ModelConfig> = {
  'lead-score': {
    model: 'gpt-4o-mini',
    provider: 'openai',
    maxTokens: 256,
    temperature: 0.1,
    costPer1kTokens: 0.00015, // ~$0.15/1M — nearly free
  },
  'chat-simple': {
    model: 'gpt-4o-mini',
    provider: 'openai',
    maxTokens: 512,
    temperature: 0.3,
    costPer1kTokens: 0.00015,
  },
  'chat-complex': {
    model: 'gpt-4o',
    provider: 'openai',
    maxTokens: 2048,
    temperature: 0.4,
    costPer1kTokens: 0.005, // ~$5/1M
  },
  'estimate': {
    model: 'gpt-4o',
    provider: 'openai',
    maxTokens: 2048,
    temperature: 0.2,
    costPer1kTokens: 0.005,
  },
  'summarize': {
    model: 'gpt-4o-mini',
    provider: 'openai',
    maxTokens: 1024,
    temperature: 0.2,
    costPer1kTokens: 0.00015,
  },
};

const anthropicModels: Record<AITask, ModelConfig> = {
  'lead-score': {
    model: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
    maxTokens: 256,
    temperature: 0.1,
    costPer1kTokens: 0.00025,
  },
  'chat-simple': {
    model: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
    maxTokens: 512,
    temperature: 0.3,
    costPer1kTokens: 0.00025,
  },
  'chat-complex': {
    model: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
    maxTokens: 2048,
    temperature: 0.4,
    costPer1kTokens: 0.003,
  },
  'estimate': {
    model: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
    maxTokens: 2048,
    temperature: 0.2,
    costPer1kTokens: 0.003,
  },
  'summarize': {
    model: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
    maxTokens: 1024,
    temperature: 0.2,
    costPer1kTokens: 0.00025,
  },
};

/**
 * Classify a chat message to determine complexity.
 * Simple = factual lookups, status checks. Complex = strategy, analysis, multi-step.
 */
export function classifyChatComplexity(message: string): 'chat-simple' | 'chat-complex' {
  const lower = message.toLowerCase();
  const complexSignals = [
    'strategy', 'recommend', 'analyze', 'compare', 'should i',
    'what would', 'how can i improve', 'forecast', 'predict',
    'optimize', 'plan', 'evaluate', 'assessment', 'proposal',
  ];
  if (complexSignals.some((s) => lower.includes(s))) return 'chat-complex';
  return 'chat-simple';
}

/**
 * Estimate the cost of an AI call before making it.
 * Useful for budget-aware decisions.
 */
export function estimateCost(task: AITask, estimatedTokens: number): number {
  const config = getModelConfig(task);
  return (estimatedTokens / 1000) * config.costPer1kTokens;
}
