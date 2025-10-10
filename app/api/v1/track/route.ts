export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, KEYS } from '@/lib/db';
import { batchTrackSchema } from '@/lib/validators';
import { trackKeyword } from '@/lib/serpapi';

const MAX_CONCURRENT = 3;

// Helper to run tasks with limited concurrency
async function runWithConcurrency<T, R>(
  items: T[],
  maxConcurrent: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = fn(item).then(result => {
      results.push(result);
      executing.splice(executing.indexOf(promise), 1);
    });

    executing.push(promise);

    if (executing.length >= maxConcurrent) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

// POST /api/v1/track
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // Validate input
    const validationResult = batchTrackSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 400,
            message: 'Invalid batch track parameters',
            details: validationResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { pair_ids, hl: requestHl, gl: requestGl } = validationResult.data;

    // Get hl/gl from settings if not provided
    let hl = requestHl;
    let gl = requestGl;

    if (!hl || !gl) {
      const settingsCommand = new GetCommand({
        TableName: TABLE_NAME,
        Key: KEYS.settings(),
      });

      const settingsResult = await docClient.send(settingsCommand);
      const settings = settingsResult.Item || { hl: 'fr', gl: 'fr' };

      hl = hl || settings.hl || 'fr';
      gl = gl || settings.gl || 'fr';
    }

    // Ensure hl and gl are strings
    const finalHl: string = hl || 'fr';
    const finalGl: string = gl || 'fr';

    // Get pairs to track
    let pairsToTrack: any[] = [];

    if (pair_ids && pair_ids.length > 0) {
      // Track specified pairs
      for (const pairId of pair_ids) {
        const getCommand = new GetCommand({
          TableName: TABLE_NAME,
          Key: KEYS.pair(pairId),
        });

        const result = await docClient.send(getCommand);
        if (result.Item) {
          pairsToTrack.push(result.Item);
        }
      }
    } else {
      // Track all pairs
      const queryCommand = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': 'ENTITY#PAIR',
        },
      });

      const queryResult = await docClient.send(queryCommand);
      pairsToTrack = queryResult.Items || [];
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
            match_type: matchResult.matchType,
            serp_link: matchResult.serpLink,
            source: 'serpapi',
          };

          await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: historyItem,
          }));

          // Update pair metadata
          const updatedPair = {
            ...pair,
            last_position: matchResult.position,
            last_checked_at: checkedAt,
            updated_at: checkedAt,
          };

          await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: updatedPair,
          }));

          return {
            pair_id: pair.pair_id,
            keyword: pair.keyword,
            position: matchResult.position,
            match_type: matchResult.matchType,
            matched_url: matchResult.matchedUrl,
            checked_at: checkedAt,
            success: true,
          };
        } catch (error) {
          console.error(`Error tracking pair ${pair.pair_id}:`, error);

          // Save failed tracking
          const historyItem = {
            ...KEYS.history(pair.pair_id, checkedAt),
            checked_at: checkedAt,
            hl: finalHl,
            gl: finalGl,
            position: null,
            matched_url: null,
            match_type: 'none',
            source: 'serpapi',
            error: String(error),
          };

          await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: historyItem,
          }));

          return {
            pair_id: pair.pair_id,
            keyword: pair.keyword,
            error: String(error),
            checked_at: checkedAt,
            success: false,
          };
        }
      }
    );

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return NextResponse.json({
      summary: {
        requested: pairsToTrack.length,
        ok: successful.length,
        failed: failed.length,
      },
      results: results.map(r => ({
        pair_id: r.pair_id,
        keyword: r.keyword,
        position: r.position ?? null,
        match_type: r.match_type,
        matched_url: r.matched_url,
        checked_at: r.checked_at,
        ...(r.error && { error: r.error }),
      })),
    });
  } catch (error) {
    console.error('Error in batch track:', error);
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

