import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { processMessage, executeAction, type PendingAction } from '@/lib/jobtread/chatbot';

// =============================================================================
// AI Chat API Endpoint
// Routes user messages through the chatbot engine which fetches live JobTread
// data, classifies intent, and builds rich contextual responses.
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, action, conversationHistory } = body as {
      message?: string;
      action?: PendingAction;
      conversationHistory?: Array<{ role: string; content: string }>;
    };

    // Handle confirmed action execution
    if (action) {
      const result = await executeAction(action, session.accessToken);
      return NextResponse.json({
        role: 'assistant',
        content: result.success
          ? `Done! ${result.message}`
          : `Could not complete that action. ${result.message}`,
        success: result.success,
        data: result.data,
        timestamp: new Date().toISOString(),
      });
    }

    // Handle chat message
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const response = await processMessage({
      message,
      accessToken: session.accessToken,
      conversationHistory,
    });

    return NextResponse.json({
      role: 'assistant',
      content: response.content,
      intent: response.intent,
      confidence: response.confidence,
      actions: response.actions,
      suggestions: response.suggestions,
      data: response.data,
      timestamp: response.timestamp,
    });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process your request. Please try again.' },
      { status: 500 }
    );
  }
}
