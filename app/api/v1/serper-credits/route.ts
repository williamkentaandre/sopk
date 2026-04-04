export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { fetchSerperCredits } from '@/lib/serper';

/**
 * GET — remaining Serper credits when exposed by their read API; otherwise null (UI shows "—").
 * Does not run a paid search.
 */
export async function GET(_request: NextRequest) {
  const user = await getCurrentUser(_request);
  if (!user) {
    return NextResponse.json({ error: { code: 401, message: 'Non connecté' } }, { status: 401 });
  }
  if (!user.serpApiKey) {
    return NextResponse.json({ credits: null, available: false });
  }
  try {
    const credits = await fetchSerperCredits(user.serpApiKey);
    return NextResponse.json(
      {
        credits,
        available: credits != null,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
        },
      }
    );
  } catch (e) {
    console.error('serper-credits:', e);
    return NextResponse.json({ credits: null, available: false });
  }
}
