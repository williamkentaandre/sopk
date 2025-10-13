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

    // Get the pair
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: KEYS.pair(pairId),
    });

    const result = await docClient.send(getCommand);
    if (!result.Item) {
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

    const pair = result.Item;

    // Track using SerpAPI
    const checkedAt = new Date().toISOString();
    let position = null;
    let error = null;

    try {
      console.log('=== SERPAPI TRACKING ===');
      console.log('Keyword:', pair.keyword);
      console.log('URL:', pair.url);
      console.log('HL:', finalHl);
      console.log('GL:', finalGl);
      
      const matchResult = await trackKeyword(
        pair.keyword, 
        pair.url, 
        finalHl, 
        finalGl
      );
      
      position = matchResult.position;
      console.log('SerpAPI tracking successful:', { position });
      
    } catch (serpError) {
      console.error('SerpAPI error:', serpError);
      error = String(serpError);
    }

    // Update the pair with new tracking data
    const updateCommand = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...pair,
        last_position: position,
        last_checked_at: checkedAt,
        updated_at: checkedAt,
      },
    });

    await docClient.send(updateCommand);

    // Save history entry if position was found
    if (position !== null && position !== undefined) {
      const historyCommand = new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...KEYS.history(pairId, checkedAt),
          pair_id: pairId,
          keyword: pair.keyword,
          url: pair.raw_url || pair.url,
          position,
          checked_at: checkedAt,
          hl: hl || 'fr',
          gl: gl || 'fr',
          error: error || null,
          serp_link: matchResult?.serpLink || null,
        },
      });

      await docClient.send(historyCommand);
      console.log('History entry saved:', { pairId, position, checkedAt });
    }

    return NextResponse.json({
      pair_id: pairId,
      keyword: pair.keyword,
      url: pair.raw_url || pair.url,
      position,
      checked_at: checkedAt,
      error,
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