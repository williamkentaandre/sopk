export const runtime = "nodejs";

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
      format: searchParams.get('format'),
      pair_ids: searchParams.get('pair_ids'),
      max_points: searchParams.get('max_points'),
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

    // Parse pair IDs if provided
    let pairIdsArray: string[] | null = null;
    if (pair_ids) {
      pairIdsArray = pair_ids.split(',').map(id => id.trim()).filter(Boolean);
    }

    // Get pairs
    let pairs: Pair[] = [];

    if (pairIdsArray && pairIdsArray.length > 0) {
      // Get specific pairs
      for (const pairId of pairIdsArray) {
        const queryCommand = new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND SK = :sk',
          ExpressionAttributeValues: {
            ':pk': `PAIR#${pairId}`,
            ':sk': 'META',
          },
        });

        const result = await docClient.send(queryCommand);
        if (result.Items && result.Items.length > 0) {
          pairs.push(result.Items[0] as Pair);
        }
      }
    } else {
      // Get all pairs
      const queryCommand = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': 'ENTITY#PAIR',
        },
      });

      const result = await docClient.send(queryCommand);
      pairs = (result.Items || []) as Pair[];
    }

    // Get history for each pair
    const pairsWithHistory = await Promise.all(
      pairs.map(async (pair) => {
        const historyCommand = new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: {
            ':pk': `PAIR#${pair.pair_id}`,
            ':sk': 'HISTO#',
          },
        });

        const historyResult = await docClient.send(historyCommand);
        const history = (historyResult.Items || []) as HistoryEntry[];

        return { pair, history };
      })
    );

    // Collect unique timestamps (sorted descending, most recent first)
    const maxPointsLimit = max_points || parseInt(process.env.EXPORT_MAX_POINTS || '0', 10) || undefined;
    const timestamps = collectTimestamps(pairsWithHistory, maxPointsLimit);

    // Prepare export data
    const exportData = {
      pairs: pairsWithHistory,
      timestamps,
    };

    // Generate file based on format
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/(\d{8})(\d{4})/, '$1-$2');

    if (format === 'xlsx') {
      const buffer = await generateXLSX(exportData);

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="seo-export-${dateStr}.xlsx"`,
        },
      });
    } else {
      // CSV (default)
      const csv = generateCSV(exportData);

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="seo-export-${dateStr}.csv"`,
        },
      });
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

