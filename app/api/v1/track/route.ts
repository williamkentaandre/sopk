export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, KEYS } from '@/lib/db';
import { trackSchema } from '@/lib/validators';
import { trackKeyword } from '@/lib/serpapi';

const MAX_CONCURRENT = 3; // Limit concurrent SerpAPI calls

// Helper function to run operations with concurrency limit
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  
  return results;
}

// POST /api/v1/track
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // Validate input
    const validationResult = trackSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 400,
            message: 'Invalid tracking data',
            details: validationResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { hl, gl } = validationResult.data;
    const finalHl = hl || 'fr';
    const finalGl = gl || 'fr';

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
    const pairsToTrack = result.Items || [];

    if (pairsToTrack.length === 0) {
      return NextResponse.json({
        results: [],
        total: 0,
        message: 'No pairs to track'
      });
    }

    // Track pairs with limited concurrency
    const results = await runWithConcurrency(
      pairsToTrack,
      MAX_CONCURRENT,
      async (pair) => {
        const checkedAt = new Date().toISOString();
        
        try {
          const matchResult = await trackKeyword(pair.keyword, pair.url, finalHl, finalGl);

          // Save history entry
          const historyItem = {
            ...KEYS.history(pair.pair_id, checkedAt),
            checked_at: checkedAt,
            hl: finalHl,
            gl: finalGl,
            position: matchResult.position,
            matched_url: matchResult.matchedUrl,
          };

          // Update pair with new position
          const updatedPair = {
            ...pair,
            last_position: matchResult.position,
            last_checked_at: checkedAt,
            updated_at: checkedAt,
          };

          // Save both history and updated pair
          await Promise.all([
            docClient.send(new PutCommand({
              TableName: TABLE_NAME,
              Item: historyItem,
            })),
            docClient.send(new PutCommand({
              TableName: TABLE_NAME,
              Item: updatedPair,
            }))
          ]);

          return {
            pair_id: pair.pair_id,
            keyword: pair.keyword,
            url: pair.raw_url || pair.url,
            position: matchResult.position,
            checked_at: checkedAt,
            matched_url: matchResult.matchedUrl,
            error: null,
          };
        } catch (error) {
          console.error(`Error tracking pair ${pair.pair_id}:`, error);
          return {
            pair_id: pair.pair_id,
            keyword: pair.keyword,
            url: pair.raw_url || pair.url,
            position: null,
            checked_at: checkedAt,
            matched_url: null,
            error: String(error),
          };
        }
      }
    );

    return NextResponse.json({
      results,
      total: results.length,
      successful: results.filter(r => r.error === null).length,
      failed: results.filter(r => r.error !== null).length,
    });
  } catch (error) {
    console.error('Error in batch tracking:', error);
    return NextResponse.json(
      {
        error: {
          code: 500,
          message: 'Failed to track pairs',
          details: { error: String(error) },
        },
      },
      { status: 500 }
    );
  }
}