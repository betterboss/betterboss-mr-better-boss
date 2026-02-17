import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

// GET /api/webhooks/info — returns webhook URLs for authenticated users
// so they can copy/paste them into JT and GHL workflow configurations.

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'WEBHOOK_SECRET not configured' }, { status: 503 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || '';

  return NextResponse.json({
    jt: `${baseUrl}/api/webhooks/jobtread?secret=${secret}`,
    ghl: `${baseUrl}/api/webhooks/ghl?secret=${secret}`,
  });
}
