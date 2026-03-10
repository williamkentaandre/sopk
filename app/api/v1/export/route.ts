export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { exportQuerySchema } from '@/lib/validators';
import { generateCSV, generateXLSX, collectTimestamps } from '@/lib/export-utils';
import type { Pair, HistoryEntry } from '@/lib/types';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: { code: 401, message: 'Non connecté' } }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const queryObject = {
    format: searchParams.get('format') || 'csv',
    pair_ids: searchParams.get('pair_ids') || undefined,
    max_points: searchParams.get('max_points') || '100',
  };
  const validationResult = exportQuerySchema.safeParse(queryObject);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: { code: 400, message: 'Paramètres invalides', details: validationResult.error.errors } },
      { status: 400 }
    );
  }

  const { format, pair_ids, max_points } = validationResult.data;
  const pairIdsFilter = pair_ids ? pair_ids.split(',').map((s) => s.trim()).filter(Boolean) : null;

  const pairs = await prisma.pair.findMany({
    where: {
      userId: user.id,
      ...(pairIdsFilter && pairIdsFilter.length > 0 ? { id: { in: pairIdsFilter } } : {}),
    },
    include: {
      history: {
        orderBy: { checkedAt: 'desc' },
        take: max_points,
      },
    },
  });

  const exportData = pairs.map((p) => {
    const pairForExport: Pair = {
      pair_id: p.id,
      keyword: p.keyword,
      url: p.url,
      raw_url: p.rawUrl,
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
      last_position: p.lastPosition,
      last_checked_at: p.lastCheckedAt?.toISOString() ?? null,
      last_matched_url: p.lastMatchedUrl,
    };
    const historyForExport: HistoryEntry[] = p.history.map((h) => ({
      checked_at: h.checkedAt.toISOString(),
      hl: h.hl ?? 'fr',
      gl: h.gl ?? 'fr',
      position: h.position,
      matched_url: h.matchedUrl,
      match_type: (h.matchType as 'exact' | 'domain' | 'none') ?? 'none',
      serp_link: h.serpLink ?? undefined,
      source: 'track',
      ...(h.error && { error: h.error }),
    }));
    return { pair: pairForExport, history: historyForExport };
  });

  const timestamps = exportData.length > 0
    ? collectTimestamps(exportData.map((d) => ({ history: d.history })), max_points)
    : [];
  const dataForUtils = {
    pairs: exportData,
    timestamps,
  };

  if (format === 'csv') {
    const csvContent = generateCSV(dataForUtils);
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="seo-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }
  if (format === 'xlsx') {
    const buffer = await generateXLSX(dataForUtils);
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="seo-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  }
  return NextResponse.json(
    { error: { code: 400, message: 'Format invalide. Utilisez csv ou xlsx' } },
    { status: 400 }
  );
}
