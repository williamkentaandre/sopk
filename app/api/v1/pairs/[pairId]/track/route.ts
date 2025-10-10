export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, KEYS } from '@/lib/db';
import { trackSchema } from '@/lib/validators';
import { trackKeyword } from '@/lib/serpapi';

// POST /api/v1/pairs/:pairId/track
export async function POST(
  request: NextRequest,
  { params }: { params: { pairId: string } }
) {
  try {
    const { pairId } = params;
    const body = await request.json().catch(() => ({}));

    // Validate input
    const validationResult = trackSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 400,
            message: 'Invalid track parameters',
            details: validationResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    // Get pair
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: KEYS.pair(pairId),
    });

    const pairResult = await docClient.send(getCommand);

    if (!pairResult.Item) {
      return NextResponse.json(
        {
          error: {
            code: 404,
            message: 'Pair not found',
          },
        },
        { status: 404 }
      );
    }

    const pair = pairResult.Item;

    // Get hl/gl (from request or global settings)
    let hl = validationResult.data.hl;
    let gl = validationResult.data.gl;

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

    // Track keyword
    const checkedAt = new Date().toISOString();
    let matchResult;
    let error = null;

    try {
      matchResult = await trackKeyword(pair.keyword, pair.url, finalHl, finalGl);
    } catch (err) {
      console.error('SerpAPI error:', err);
      error = String(err);
      
      // Save failed tracking
      const historyItem = {
        ...KEYS.history(pairId, checkedAt),
        checked_at: checkedAt,
        hl: finalHl,
        gl: finalGl,
        position: null,
        matched_url: null,
        match_type: 'none',
        source: 'serpapi',
        error,
      };

      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: historyItem,
      }));

      return NextResponse.json(
        {
          error: {
            code: 502,
            message: 'SerpAPI unavailable',
            details: { error },
          },
        },
        { status: 502 }
      );
    }

    // Save history entry
    const historyItem = {
      ...KEYS.history(pairId, checkedAt),
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

    return NextResponse.json({
      pair_id: pairId,
      checked_at: checkedAt,
      hl: finalHl,
      gl: finalGl,
      position: matchResult.position,
      matched_url: matchResult.matchedUrl,
      match_type: matchResult.matchType,
    });
  } catch (error) {
    console.error('Error tracking pair:', error);
    return NextResponse.json(
      {
        error: {
          code: 500,
          message: 'Failed to track pair',
          details: { error: String(error) },
        },
      },
      { status: 500 }
    );
  }
}

