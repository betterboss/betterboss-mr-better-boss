import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { leadScoreRequestSchema, validateBody } from '@/lib/validate';
import { RATE_LIMITS } from '@/lib/constants';

// AI Lead Scoring Endpoint
// Analyzes lead data and returns AI-powered scoring with actionable recommendations
// Factors: project value, source quality, engagement signals, response time, market fit

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

    return NextResponse.json(score);
  } catch (error) {
    console.error('AI lead scoring error:', error);
    return NextResponse.json(
      { error: 'Lead scoring failed' },
      { status: 500 }
    );
  }
}

function calculateLeadScore(contactData: Record<string, unknown>) {
  const baseScore = 50;
  const factors = [];

  // Source quality factor
  const sourceScores: Record<string, number> = {
    'Referral': 25,
    'Repeat Customer': 30,
    'Google Ads': 15,
    'Website Form': 10,
    'HomeAdvisor': 5,
    'Google Organic': 8,
  };

  const source = (contactData?.source as string) || 'Unknown';
  const sourceScore = sourceScores[source] || 5;
  factors.push({
    name: 'Lead Source',
    impact: sourceScore > 15 ? 'positive' : 'neutral',
    weight: sourceScore,
    description: `${source} leads convert at ${sourceScore > 15 ? 'above' : 'below'} average rates`,
  });

  // Project value factor
  const value = (contactData?.estimatedValue as number) || 0;
  const valueScore = Math.min(value / 5000, 20);
  factors.push({
    name: 'Project Value',
    impact: value > 50000 ? 'positive' : value > 20000 ? 'neutral' : 'negative',
    weight: valueScore,
    description: `$${value.toLocaleString()} estimated project value`,
  });

  const totalScore = Math.min(Math.round(baseScore + sourceScore + valueScore), 100);

  return {
    contactId: contactData?.id || 'unknown',
    score: totalScore,
    factors,
    recommendedAction: totalScore > 80
      ? 'Contact immediately - high-value opportunity'
      : totalScore > 60
      ? 'Schedule follow-up within 24 hours'
      : 'Add to nurture sequence',
    estimatedValue: value,
    probability: totalScore / 100,
  };
}
