import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

// Proxy endpoint for JobTread GraphQL API
// Adds authentication and handles CORS for the sidebar client

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const apiUrl = process.env.JOBTREAD_API_URL || 'https://api.jobtread.com/graphql';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(body),
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
