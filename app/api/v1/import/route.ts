export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { normalizeUrl } from '@/lib/url-utils';
import { allocateSortOrdersForNewPairs } from '@/lib/pair-sort-order';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: { code: 401, message: 'Non connecté' } }, { status: 401 });
  }

  const body = await request.json();
  const csvData = body?.csvData;
  if (!csvData || typeof csvData !== 'string') {
    return NextResponse.json(
      { error: { code: 400, message: 'CSV data is required' } },
      { status: 400 }
    );
  }

  const lines = csvData.trim().split('\n');
  if (lines.length < 2) {
    return NextResponse.json(
      { error: { code: 400, message: 'Le CSV doit contenir au moins une ligne d’en-tête et une ligne de données' } },
      { status: 400 }
    );
  }

  // Colonne 1 = mots-clés, colonne 2 = URLs (peu importe le nom des en-têtes)
  const results: { success: boolean; pair_id?: string; keyword?: string; url?: string; error?: string }[] = [];
  const errors: { line: number; error: string; data: object }[] = [];

  const maxNewPairs = Math.max(0, lines.length - 1);
  const sortOrders = await allocateSortOrdersForNewPairs(user.id, maxNewPairs);
  let sortOrderIndex = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else current += char;
    }
    values.push(current.trim());

    const keyword = values[0]?.replace(/^"|"$/g, '').trim();
    const url = values[1]?.replace(/^"|"$/g, '').trim();

    if (!keyword || !url) {
      errors.push({ line: i + 1, error: 'Mot-clé ou URL manquant (il faut 2 colonnes)', data: { keyword: keyword || '', url: url || '' } });
      continue;
    }

    try {
      const p = await prisma.pair.create({
        data: {
          userId: user.id,
          keyword,
          url: normalizeUrl(url),
          rawUrl: url,
          sortOrder: sortOrders[sortOrderIndex]!,
        },
      });
      sortOrderIndex += 1;
      results.push({ success: true, pair_id: p.id, keyword: p.keyword, url: p.rawUrl });
    } catch (e) {
      results.push({ success: false, keyword, url, error: String(e) });
    }
  }

  return NextResponse.json(
    {
      success: true,
      imported: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      errors: errors.length > 0 ? errors : undefined,
      results,
    },
    { status: 201 }
  );
}
