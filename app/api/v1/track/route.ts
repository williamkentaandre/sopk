export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { trackSchema } from '@/lib/validators';
import { trackKeyword } from '@/lib/serpapi';

const MAX_CONCURRENT = 3;

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    results.push(...(await Promise.all(batch.map(fn))));
  }
  return results;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: { code: 401, message: 'Non connecté' } }, { status: 401 });
  }
  if (!user.serpApiKey) {
    return NextResponse.json(
      { error: { code: 400, message: 'Configurez votre clé SERP API dans Paramètres.' } },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const validationResult = trackSchema.safeParse(body);
  const finalHl = validationResult.success ? validationResult.data.hl || 'fr' : 'fr';
  const finalGl = validationResult.success ? validationResult.data.gl || 'fr' : 'fr';

  const pairsToTrack = await prisma.pair.findMany({
    where: { userId: user.id },
  });

  if (pairsToTrack.length === 0) {
    return NextResponse.json({
      results: [],
      total: 0,
      message: 'No pairs to track',
    });
  }

  const results = await runWithConcurrency(pairsToTrack, MAX_CONCURRENT, async (pair) => {
    const checkedAt = new Date();
    try {
      const matchResult = await trackKeyword(pair.keyword, pair.url, finalHl, finalGl, {
        apiKey: user.serpApiKey!,
      });

      await prisma.pair.update({
        where: { id: pair.id },
        data: {
          lastPosition: matchResult.position,
          lastCheckedAt: checkedAt,
          lastMatchedUrl: matchResult.matchedUrl ?? null,
        },
      });

      if (matchResult.position != null) {
        await prisma.pairHistory.create({
          data: {
            pairId: pair.id,
            checkedAt,
            position: matchResult.position,
            matchedUrl: matchResult.matchedUrl ?? null,
            matchType: matchResult.matchType,
            serpLink: matchResult.serpLink ?? null,
            hl: finalHl,
            gl: finalGl,
          },
        });
      }

      return {
        pair_id: pair.id,
        keyword: pair.keyword,
        url: pair.rawUrl,
        position: matchResult.position,
        checked_at: checkedAt.toISOString(),
        matched_url: matchResult.matchedUrl,
        pages_queried: matchResult.pagesQueried ?? null,
        elapsed_ms: matchResult.elapsedMs ?? null,
        error: null,
      };
    } catch (error) {
      return {
        pair_id: pair.id,
        keyword: pair.keyword,
        url: pair.rawUrl,
        position: null,
        checked_at: checkedAt.toISOString(),
        matched_url: null,
        error: String(error),
      };
    }
  });

  return NextResponse.json({
    results,
    total: results.length,
    successful: results.filter((r) => r.error === null).length,
    failed: results.filter((r) => r.error !== null).length,
  });
}
