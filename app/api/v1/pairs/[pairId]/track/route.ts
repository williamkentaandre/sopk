export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { trackSchema } from '@/lib/validators';
import { trackKeyword } from '@/lib/serpapi';
import { simpleStorage } from '@/lib/simple-storage';

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

    // Get the pair
    const pair = simpleStorage.getPair(pairId);
    if (!pair) {
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

    // Track using SerpAPI
    const checkedAt = new Date().toISOString();
    let position = null;
    let error = null;

    try {
      console.log('=== SERPAPI TRACKING ===');
      console.log('Keyword:', pair.keyword);
      console.log('URL:', pair.url);
      console.log('HL:', hl);
      console.log('GL:', gl);
      
      const matchResult = await trackKeyword(
        pair.keyword, 
        pair.url, 
        hl, 
        gl
      );
      
      position = matchResult.position;
      console.log('SerpAPI tracking successful:', { position });
      
    } catch (serpError) {
      console.error('SerpAPI error:', serpError);
      error = String(serpError);
    }

    // Update the pair with new tracking data
    const updatedPair = simpleStorage.updatePair(pairId, {
      last_position: position,
      last_checked_at: checkedAt,
    });

    if (!updatedPair) {
      return NextResponse.json(
        {
          error: {
            code: 500,
            message: 'Failed to update pair',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      pair_id: pairId,
      keyword: pair.keyword,
      url: pair.url,
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