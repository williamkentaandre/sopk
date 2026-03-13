export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { createPairsSchema } from '@/lib/validators';
import { normalizeUrl, isValidUrl } from '@/lib/url-utils';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: { code: 401, message: 'Non connecté' } }, { status: 401 });
  }

  const searchQuery = request.nextUrl.searchParams.get('q')?.toLowerCase();
  const includeHistory = request.nextUrl.searchParams.get('includeHistory') === '1';
  const pairs = await prisma.pair.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: includeHistory ? { history: { orderBy: { checkedAt: 'asc' } } } : undefined,
  });

  type PairItem = {
    pair_id: string;
    keyword: string;
    url: string;
    last_position: number | null;
    last_checked_at: string | null;
    last_matched_url: string | null;
    history_by_date?: Record<string, number | null>;
  };

  let items: PairItem[] = pairs.map((p) => {
    const base: PairItem = {
      pair_id: p.id,
      keyword: p.keyword,
      url: p.rawUrl,
      last_position: p.lastPosition,
      last_checked_at: p.lastCheckedAt?.toISOString() ?? null,
      last_matched_url: p.lastMatchedUrl,
    };
    if (includeHistory && 'history' in p && Array.isArray(p.history)) {
      const byDay = new Map<string, number | null>();
      for (const h of p.history) {
        const day = h.checkedAt.toISOString().slice(0, 10);
        byDay.set(day, h.position);
      }
      base.history_by_date = Object.fromEntries(byDay);
    }
    return base;
  });

  if (searchQuery) {
    items = items.filter(
      (item) =>
        item.keyword.toLowerCase().includes(searchQuery) ||
        item.url.toLowerCase().includes(searchQuery)
    );
  }

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: { code: 401, message: 'Non connecté' } }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validationResult = createPairsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: { code: 400, message: 'Données invalides', details: validationResult.error.errors } },
        { status: 400 }
      );
    }

    const { pairs: inputPairs } = validationResult.data;
    const createdPairs = [];

    for (const pair of inputPairs) {
      if (!isValidUrl(pair.url)) {
        return NextResponse.json(
          { error: { code: 400, message: 'URL invalide', details: { url: pair.url } } },
          { status: 400 }
        );
      }
      const normalized = normalizeUrl(pair.url);
      const p = await prisma.pair.create({
        data: {
          userId: user.id,
          keyword: pair.keyword.trim(),
          url: normalized,
          rawUrl: pair.url.trim(),
        },
      });
      createdPairs.push({
        pair_id: p.id,
        keyword: p.keyword,
        url: p.rawUrl,
        last_position: p.lastPosition,
        last_checked_at: null,
      });
    }

    return NextResponse.json({ items: createdPairs }, { status: 201 });
  } catch (e) {
    console.error('Create pairs error:', e);
    return NextResponse.json(
      { error: { code: 500, message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
