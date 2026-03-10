export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { historyQuerySchema } from '@/lib/validators';

export async function GET(
  request: NextRequest,
  { params }: { params: { pairId: string } }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: { code: 401, message: 'Non connecté' } }, { status: 401 });
  }

  const { pairId } = params;
  const pair = await prisma.pair.findFirst({
    where: { id: pairId, userId: user.id },
  });
  if (!pair) {
    return NextResponse.json({ error: { code: 404, message: 'Pair not found' } }, { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const queryObject = {
    limit: searchParams.get('limit') || '50',
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
    order: searchParams.get('order') || 'desc',
  };
  const validationResult = historyQuerySchema.safeParse(queryObject);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: { code: 400, message: 'Paramètres invalides', details: validationResult.error.errors } },
      { status: 400 }
    );
  }

  const { limit, order } = validationResult.data;
  const history = await prisma.pairHistory.findMany({
    where: { pairId },
    orderBy: { checkedAt: order === 'asc' ? 'asc' : 'desc' },
    take: limit,
  });

  const items = history.map((h) => ({
    checked_at: h.checkedAt.toISOString(),
    hl: h.hl ?? undefined,
    gl: h.gl ?? undefined,
    position: h.position ?? null,
    matched_url: h.matchedUrl ?? null,
    match_type: h.matchType ?? undefined,
    serp_link: h.serpLink ?? undefined,
    source: 'track',
    ...(h.error && { error: h.error }),
  }));

  return NextResponse.json({ items });
}
