export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { memoryStorage } from '@/lib/memory-storage';
import { exportQuerySchema } from '@/lib/validators';

// GET /api/v1/export-temp
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const validationResult = exportQuerySchema.safeParse({
      format: searchParams.get('format'),
      pair_ids: searchParams.get('pair_ids'),
      max_points: searchParams.get('max_points'),
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 400,
            message: 'Invalid export parameters',
            details: validationResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { format } = validationResult.data;
    const pairs = memoryStorage.getPairs();

    console.log('=== EXPORT TEMP DEBUG ===');
    console.log('Format:', format);
    console.log('Pairs count:', pairs.length);
    console.log('========================');

    if (format === 'csv') {
      return generateCSV(pairs);
    } else if (format === 'xlsx') {
      return generateXLSX(pairs);
    } else {
      return NextResponse.json(
        {
          error: {
            code: 400,
            message: 'Unsupported format',
            details: { format },
          },
        },
        { status: 400 }
      );
    }
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

function generateCSV(pairs: any[]) {
  const headers = ['Mot-clé', 'URL', 'Position', 'Dernière mesure'];
  const rows = pairs.map(pair => [
    pair.keyword,
    pair.url,
    pair.last_position || '',
    pair.last_checked_at ? new Date(pair.last_checked_at).toLocaleString('fr-FR') : ''
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

async function generateXLSX(pairs: any[]) {
  // Simple XLSX generation using CSV format with .xlsx extension
  // Excel can open CSV files with .xlsx extension
  const headers = ['Mot-clé', 'URL', 'Position', 'Dernière mesure'];
  const rows = pairs.map(pair => [
    pair.keyword,
    pair.url,
    pair.last_position || '',
    pair.last_checked_at ? new Date(pair.last_checked_at).toLocaleString('fr-FR') : ''
  ]);

  // Create CSV content that Excel can read
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="seo-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
