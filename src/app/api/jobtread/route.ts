import { NextRequest, NextResponse } from 'next/server';
import { apiGuard } from '@/lib/api-guard';
import { jobtreadProxyRequestSchema, validateBody } from '@/lib/validate';
import { RATE_LIMITS } from '@/lib/constants';

// Proxy endpoint for JobTread GraphQL API
// Adds authentication and handles CORS for the sidebar client

export async function POST(request: NextRequest) {
  try {
    const { session, error: guardError } = await apiGuard(request, { rateLimit: RATE_LIMITS.api });
    if (guardError) return guardError;

    const body = await request.json();
    const { data: input, error: validationError } = validateBody(jobtreadProxyRequestSchema, body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const apiUrl = process.env.JOBTREAD_API_URL || 'https://api.jobtread.com/graphql';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session!.accessToken}`,
      },
      body: JSON.stringify(input),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('JobTread API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to communicate with JobTread API' },
      { status: 500 }
    );
  }
}
