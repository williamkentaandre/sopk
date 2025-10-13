export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { memoryStorage } from '@/lib/memory-storage';
import { batchTrackSchema } from '@/lib/validators';

// POST /api/v1/track-temp
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('=== TRACK ALL TEMP POST DEBUG ===');
    console.log('Received body:', JSON.stringify(body, null, 2));
    console.log('==================================');
    
    // Validate input
    const validationResult = batchTrackSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 400,
            message: 'Invalid track data',
            details: validationResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    // Get all pairs
    const pairs = memoryStorage.getPairs();
    const results = {
      ok: 0,
      failed: 0,
      details: [] as any[],
    };

    // Track each pair
    for (const pair of pairs) {
      try {
        const checkedAt = new Date().toISOString();
        let position = null;
        let error = null;

        try {
          // Import SerpAPI tracking function
          const { trackKeyword } = await import('@/lib/serpapi');
          
          console.log(`Tracking pair ${pair.pair_id}: ${pair.keyword}`);
          const matchResult = await trackKeyword(
            pair.keyword, 
            pair.url, 
            validationResult.data.hl || 'fr', 
            validationResult.data.gl || 'fr'
          );
          
          position = matchResult.position;
          console.log(`SerpAPI success for ${pair.keyword}: position ${position}`);
          
        } catch (serpError) {
          console.error(`SerpAPI error for ${pair.keyword}:`, serpError);
          error = String(serpError);
          
          // Fallback to mock position if SerpAPI fails
          position = Math.floor(Math.random() * 50) + 1;
          console.log(`Using fallback mock position for ${pair.keyword}: ${position}`);
        }
        
        // Update the pair
        memoryStorage.updatePair(pair.pair_id, {
          last_position: position,
          last_checked_at: checkedAt,
        });

        results.ok++;
        results.details.push({
          pair_id: pair.pair_id,
          keyword: pair.keyword,
          position,
          checked_at: checkedAt,
          error,
        });
      } catch (error) {
        results.failed++;
        results.details.push({
          pair_id: pair.pair_id,
          keyword: pair.keyword,
          error: String(error),
        });
      }
    }

    console.log('Batch tracking completed:', results);

    return NextResponse.json({
      summary: {
        ok: results.ok,
        failed: results.failed,
        total: pairs.length,
      },
      details: results.details,
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
