import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

// AI Chat API endpoint
// Processes user messages with context from JobTread data
// and returns intelligent, actionable responses

const SYSTEM_PROMPT = `You are the BetterBoss AI Assistant, an expert construction business intelligence companion.
You have access to the user's JobTread data including jobs, estimates, invoices, leads, tasks, and financial metrics.
You specialize in:
- Construction project management analysis
- Financial forecasting and cash flow optimization
- Lead scoring and sales optimization
- Estimating and pricing strategy
- Operational efficiency recommendations

Always provide specific, actionable advice with data-backed recommendations.
Format responses clearly with headers, bullet points, and tables where appropriate.
Reference specific jobs, contacts, and amounts from the user's data.
Be concise but thorough. Prioritize actionable insights.`;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, context } = await request.json();

    // In production, this would call OpenAI/Anthropic API with the user's
    // JobTread data as context. For now, return a structured response.
    const response = {
      role: 'assistant',
      content: generateAIResponse(message, context),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: 'AI processing failed' },
      { status: 500 }
    );
  }
}

function generateAIResponse(message: string, context?: Record<string, unknown>): string {
  // Placeholder response generation
  // In production, this calls the AI API with SYSTEM_PROMPT and user context
  return `I've analyzed your request based on your JobTread data. Here's what I found:\n\n${message}\n\nWould you like me to dig deeper into any specific area?`;
}
