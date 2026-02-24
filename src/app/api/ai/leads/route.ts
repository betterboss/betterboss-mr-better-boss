import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { leadScoreRequestSchema, validateBody } from '@/lib/validate';
import { RATE_LIMITS, LEAD_SCORE_SOURCE_WEIGHTS, LEAD_SCORE_HOT_THRESHOLD, LEAD_SCORE_WARM_THRESHOLD } from '@/lib/constants';

// AI Lead Scoring Endpoint
// Multi-factor scoring: source quality, data completeness, recency, project value, engagement signals
// Uses LLM for personalized recommendations when available

interface ScoringFactor {
  name: string;
  impact: 'positive' | 'neutral' | 'negative';
  weight: number;
  description: string;
}

export async function POST(request: NextRequest) {
  try {
    const { error: guardError } = await apiGuard(request, { rateLimit: RATE_LIMITS.ai });
    if (guardError) return guardError;

    const body = await request.json();
    const { data: input, error: validationError } = validateBody(leadScoreRequestSchema, body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { contactData } = input!;
    const score = calculateLeadScore(contactData);

    // If OpenAI is available, enhance with LLM recommendation
    if (process.env.OPENAI_API_KEY) {
      const aiRecommendation = await getAIRecommendation(contactData, score.score, score.factors);
      if (aiRecommendation) {
        score.recommendedAction = aiRecommendation;
        score.aiPowered = true;
      }
    }

    return NextResponse.json(score);
  } catch (error) {
    console.error('AI lead scoring error:', error);
    return NextResponse.json(
      { error: 'Lead scoring failed' },
      { status: 500 }
    );
  }
}

async function getAIRecommendation(
  contactData: Record<string, unknown>,
  score: number,
  factors: ScoringFactor[]
): Promise<string | null> {
  try {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const factorSummary = factors.map((f) => `${f.name}: ${f.impact} (${f.description})`).join('\n');
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a construction sales advisor. Given a lead score and factors, provide a single concise recommended action (1-2 sentences). Be specific and actionable. Focus on construction industry context.',
        },
        {
          role: 'user',
          content: `Lead: ${contactData.firstName || ''} ${contactData.lastName || ''}
Company: ${contactData.company || 'N/A'}
Source: ${contactData.source || 'Unknown'}
Score: ${score}/100
Factors:\n${factorSummary}

What's the best next action for this lead?`,
        },
      ],
      max_tokens: 150,
      temperature: 0.5,
    });

    return response.choices[0]?.message?.content || null;
  } catch {
    return null;
  }
}

function calculateLeadScore(contactData: Record<string, unknown>) {
  let totalWeight = 0;
  const factors: ScoringFactor[] = [];

  // Factor 1: Lead Source Quality (0-30 points)
  const source = ((contactData?.source as string) || '').toLowerCase();
  const sourceScore = LEAD_SCORE_SOURCE_WEIGHTS[source] || LEAD_SCORE_SOURCE_WEIGHTS.default;
  totalWeight += sourceScore;
  factors.push({
    name: 'Lead Source',
    impact: sourceScore >= 20 ? 'positive' : sourceScore >= 10 ? 'neutral' : 'negative',
    weight: sourceScore,
    description: `${(contactData?.source as string) || 'Unknown'} source (${sourceScore >= 20 ? 'high' : sourceScore >= 10 ? 'average' : 'low'} conversion rate)`,
  });

  // Factor 2: Data Completeness (0-20 points)
  let completeness = 0;
  if (contactData?.email) completeness += 5;
  if (contactData?.phone) completeness += 5;
  if (contactData?.company) completeness += 4;
  if (contactData?.firstName && contactData?.lastName) completeness += 3;
  if (contactData?.notes) completeness += 3;
  totalWeight += completeness;
  factors.push({
    name: 'Data Completeness',
    impact: completeness >= 15 ? 'positive' : completeness >= 8 ? 'neutral' : 'negative',
    weight: completeness,
    description: `${completeness}/20 contact fields populated`,
  });

  // Factor 3: Recency (0-20 points)
  let recencyScore = 5; // default for unknown date
  if (contactData?.createdAt) {
    const days = (Date.now() - new Date(contactData.createdAt as string).getTime()) / (1000 * 60 * 60 * 24);
    if (days < 1) recencyScore = 20;
    else if (days < 3) recencyScore = 15;
    else if (days < 7) recencyScore = 10;
    else if (days < 14) recencyScore = 7;
    else if (days < 30) recencyScore = 4;
    else recencyScore = 2;
  }
  totalWeight += recencyScore;
  factors.push({
    name: 'Lead Freshness',
    impact: recencyScore >= 15 ? 'positive' : recencyScore >= 7 ? 'neutral' : 'negative',
    weight: recencyScore,
    description: contactData?.createdAt
      ? `Created ${Math.floor((Date.now() - new Date(contactData.createdAt as string).getTime()) / (1000 * 60 * 60 * 24))} days ago`
      : 'Unknown creation date',
  });

  // Factor 4: Project Value (0-20 points)
  const value = (contactData?.estimatedValue as number) || 0;
  let valueScore = 0;
  if (value > 100000) valueScore = 20;
  else if (value > 50000) valueScore = 15;
  else if (value > 20000) valueScore = 10;
  else if (value > 5000) valueScore = 5;
  else if (value > 0) valueScore = 3;
  totalWeight += valueScore;
  factors.push({
    name: 'Project Value',
    impact: valueScore >= 15 ? 'positive' : valueScore >= 5 ? 'neutral' : 'negative',
    weight: valueScore,
    description: value > 0 ? `$${value.toLocaleString()} estimated project value` : 'No estimated value provided',
  });

  // Factor 5: Engagement Signals (0-10 points)
  let engagementScore = 0;
  if (contactData?.hasResponded) engagementScore += 4;
  if (contactData?.meetingScheduled) engagementScore += 3;
  if (contactData?.estimateRequested) engagementScore += 3;
  totalWeight += engagementScore;
  if (engagementScore > 0) {
    factors.push({
      name: 'Engagement',
      impact: engagementScore >= 7 ? 'positive' : 'neutral',
      weight: engagementScore,
      description: `${engagementScore}/10 engagement signals detected`,
    });
  }

  const totalScore = Math.min(Math.round(totalWeight), 100);

  // Tiered recommendations
  let recommendedAction: string;
  if (totalScore >= LEAD_SCORE_HOT_THRESHOLD) {
    recommendedAction = 'Contact immediately - high-value opportunity. Call within the hour.';
  } else if (totalScore >= LEAD_SCORE_WARM_THRESHOLD) {
    recommendedAction = 'Schedule follow-up within 24 hours. Send personalized proposal.';
  } else if (totalScore >= 40) {
    recommendedAction = 'Add to nurture sequence. Send introductory materials.';
  } else {
    recommendedAction = 'Low priority. Monitor for engagement signals before investing time.';
  }

  return {
    contactId: contactData?.id || 'unknown',
    score: totalScore,
    tier: totalScore >= LEAD_SCORE_HOT_THRESHOLD ? 'hot' : totalScore >= LEAD_SCORE_WARM_THRESHOLD ? 'warm' : 'cold',
    factors,
    recommendedAction,
    estimatedValue: value,
    probability: Math.round((totalScore / 100) * 100) / 100,
    aiPowered: false,
  };
}
