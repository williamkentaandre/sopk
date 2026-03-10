export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { normalizeUrl } from '@/lib/url-utils';

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
      { error: { code: 400, message: 'CSV must contain at least a header row and one data row' } },
      { status: 400 }
    );
  }

  const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const keywordIndex = header.findIndex((h) => h.toLowerCase().includes('mot') || h.toLowerCase().includes('keyword'));
  const urlIndex = header.findIndex((h) => h.toLowerCase().includes('url'));

  if (keywordIndex === -1 || urlIndex === -1) {
    return NextResponse.json(
      { error: { code: 400, message: 'CSV must contain "Mot-clé" (or "keyword") and "URL" columns' } },
      { status: 400 }
    );
  }

  const results: { success: boolean; pair_id?: string; keyword?: string; url?: string; error?: string }[] = [];
  const errors: { line: number; error: string; data: object }[] = [];

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

    const keyword = values[keywordIndex]?.replace(/^"|"$/g, '').trim();
    const url = values[urlIndex]?.replace(/^"|"$/g, '').trim();

    if (!keyword || !url) {
      errors.push({ line: i + 1, error: 'Missing keyword or URL', data: { keyword, url } });
      continue;
    }

    try {
      const p = await prisma.pair.create({
        data: {
          userId: user.id,
          keyword,
          url: normalizeUrl(url),
          rawUrl: url,
        },
      });
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
