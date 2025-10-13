export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '@/lib/db';
import { exportQuerySchema } from '@/lib/validators';
import { Pair, HistoryEntry } from '@/lib/types';
import { generateCSV, generateXLSX, collectTimestamps } from '@/lib/export-utils';

// GET /api/v1/export
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Validate query parameters
    const queryObject = {
      format: searchParams.get('format') || 'csv',
      pair_ids: searchParams.get('pair_ids') || undefined,
      max_points: searchParams.get('max_points') || '100',
    };

    const validationResult = exportQuerySchema.safeParse(queryObject);
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

    const { format, pair_ids, max_points } = validationResult.data;

    // Get pairs
    const pairsQuery = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'ENTITY#PAIR',
      },
    });

    const pairsResult = await docClient.send(pairsQuery);
    let pairs: Pair[] = (pairsResult.Items || []) as Pair[];

    // Filter by pair_ids if provided
    if (pair_ids && pair_ids.length > 0) {
      pairs = pairs.filter(pair => pair_ids.includes(pair.pair_id));
    }

    // Get history for each pair
    const exportData = [];
    for (const pair of pairs) {
      const historyQuery = new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
        ExpressionAttributeValues: {
          ':pk': `PAIR#${pair.pair_id}`,
          ':sk_prefix': 'HISTO#',
        },
        ScanIndexForward: false, // Sort by timestamp descending
        Limit: max_points || 100,
      });

      const historyResult = await docClient.send(historyQuery);
      const history: HistoryEntry[] = (historyResult.Items || []) as HistoryEntry[];

      // Collect timestamps for this pair
      const timestamps = collectTimestamps([{ history }]);
      
      exportData.push({
        pair,
        history,
        timestamps,
      });
    }

    // Generate export file
    if (format === 'csv') {
      const csvContent = generateCSV({
        pairs: exportData,
        timestamps: exportData.length > 0 ? exportData[0].timestamps : []
      });
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv;charset=utf-8',
          'Content-Disposition': `attachment; filename="seo-export-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    } else if (format === 'xlsx') {
      const buffer = await generateXLSX({
        pairs: exportData,
        timestamps: exportData.length > 0 ? exportData[0].timestamps : []
      });
      return new NextResponse(buffer as any, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="seo-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
        },
      });
    } else {
      return NextResponse.json(
        {
          error: {
            code: 400,
            message: 'Invalid format. Use csv or xlsx',
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