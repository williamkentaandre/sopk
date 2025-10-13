export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { memoryStorage } from '@/lib/memory-storage';

// GET /api/v1/export-simple
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json';
    
    console.log('=== EXPORT SIMPLE DEBUG ===');
    console.log('Format:', format);
    console.log('===========================');

    const pairs = memoryStorage.getPairs();
    const settings = memoryStorage.getSettings();

    // Prepare export data
    const exportData = {
      settings,
      pairs: pairs.map(pair => ({
        keyword: pair.keyword,
        url: pair.url,
        position: pair.last_position,
        last_checked: pair.last_checked_at,
        created_at: pair.created_at,
      })),
      exported_at: new Date().toISOString(),
      total_pairs: pairs.length,
    };

    if (format === 'csv') {
      // Generate CSV content
      const headers = ['Mot-clé', 'URL', 'Position', 'Dernière mesure', 'Créé le'];
      const rows = pairs.map(pair => [
        pair.keyword,
        pair.url,
        pair.last_position || '',
        pair.last_checked_at ? new Date(pair.last_checked_at).toLocaleString('fr-FR') : '',
        new Date(pair.created_at).toLocaleString('fr-FR')
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="seo-export-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // Default: return JSON
    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="seo-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });

  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      {
        error: {
          code: 500,
          message: 'Failed to export data',
          details: { error: String(error) },
        },
      },
      { status: 500 }
    );
  }
}
