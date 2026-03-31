export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { trackSchema } from '@/lib/validators';
import { trackKeyword } from '@/lib/serpapi';

export async function POST(
  request: NextRequest,
  { params }: { params: { pairId: string } }
) {
  try {
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

    const { pairId } = params;
    const pair = await prisma.pair.findFirst({
      where: { id: pairId, userId: user.id },
    });
    if (!pair) {
      return NextResponse.json({ error: { code: 404, message: 'Pair not found' } }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const validationResult = trackSchema.safeParse(body);
    const hl = validationResult.success ? validationResult.data.hl || 'fr' : 'fr';
    const gl = validationResult.success ? validationResult.data.gl || 'fr' : 'fr';
    const diagnostic = validationResult.success ? validationResult.data.diagnostic === true : false;

    const checkedAt = new Date();
    let position: number | null = null;
    let error: string | null = null;
    let matchResult: Awaited<ReturnType<typeof trackKeyword>> | null = null;

    try {
      matchResult = await trackKeyword(pair.keyword, pair.rawUrl, hl, gl, {
        apiKey: user.serpApiKey,
        diagnostic,
      });
      position = matchResult.position;
    } catch (e) {
      error = String(e);
    }

    // On API/throw failure: do not touch lastPosition. On success with "not in top 100", keep lastPosition too.
    await prisma.pair.update({
      where: { id: pairId },
      data: {
        ...(error ? {} : position != null ? { lastPosition: position } : {}),
        lastCheckedAt: checkedAt,
        ...(error ? {} : { lastMatchedUrl: matchResult?.matchedUrl ?? null }),
      },
    });

    // Always store the measurement attempt for troubleshooting, even when not found or failing.
    await prisma.pairHistory.create({
      data: {
        pairId,
        checkedAt,
        position,
        matchedUrl: matchResult?.matchedUrl ?? null,
        matchType: matchResult?.matchType ?? null,
        serpLink: matchResult?.serpLink ?? null,
        hl,
        gl,
        error: error ?? null,
      },
    });

    if (error) {
      return NextResponse.json({ error: { code: 502, message: error } }, { status: 502 });
    }

    return NextResponse.json({
      pair_id: pairId,
      keyword: pair.keyword,
      url: pair.rawUrl,
      position,
      matched_url: matchResult?.matchedUrl ?? null,
      checked_at: checkedAt.toISOString(),
      pages_queried: matchResult?.pagesQueried ?? null,
      elapsed_ms: matchResult?.elapsedMs ?? null,
      error,
      ...(diagnostic && matchResult?.diagnostic ? { diagnostic: matchResult.diagnostic } : {}),
    });
  } catch (e) {
    return NextResponse.json(
      { error: { code: 500, message: `Internal error: ${String(e)}` } },
      { status: 500 }
    );
  }
}
