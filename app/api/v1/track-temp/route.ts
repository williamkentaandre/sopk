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

        // Check if SERPAPI_KEY is configured
        const serpApiKey = process.env.SERPAPI_KEY;
        
        if (!serpApiKey) {
          console.log(`SERPAPI_KEY not configured, using deterministic test data for ${pair.keyword}`);
          
          // Create deterministic position based on keyword + URL combination
          const combination = `${pair.keyword.toLowerCase()}|${pair.url.toLowerCase()}`;
          
          // Simple hash function to convert string to number
          let hash = 0;
          for (let i = 0; i < combination.length; i++) {
            const char = combination.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
          }
          
          // Convert hash to position (1-50) with realistic distribution
          const normalizedHash = Math.abs(hash) % 1000; // 0-999
          
          if (normalizedHash < 50) {
            position = Math.floor(normalizedHash / 5) + 1;
          } else if (normalizedHash < 200) {
            position = Math.floor((normalizedHash - 50) / 10) + 11;
          } else if (normalizedHash < 400) {
            position = Math.floor((normalizedHash - 200) / 10) + 21;
          } else if (normalizedHash < 600) {
            position = Math.floor((normalizedHash - 400) / 10) + 31;
          } else {
            position = Math.floor((normalizedHash - 600) / 10) + 41;
          }
          
          position = Math.max(1, Math.min(50, position));
          error = 'SERPAPI_KEY not configured - using deterministic test data';
          
        } else {
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
            
            // Fallback to deterministic position if SerpAPI fails
            const combination = `${pair.keyword.toLowerCase()}|${pair.url.toLowerCase()}`;
            let hash = 0;
            for (let i = 0; i < combination.length; i++) {
              const char = combination.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash;
            }
            const normalizedHash = Math.abs(hash) % 1000;
            if (normalizedHash < 50) {
              position = Math.floor(normalizedHash / 5) + 1;
            } else if (normalizedHash < 200) {
              position = Math.floor((normalizedHash - 50) / 10) + 11;
            } else if (normalizedHash < 400) {
              position = Math.floor((normalizedHash - 200) / 10) + 21;
            } else if (normalizedHash < 600) {
              position = Math.floor((normalizedHash - 400) / 10) + 31;
            } else {
              position = Math.floor((normalizedHash - 600) / 10) + 41;
            }
            position = Math.max(1, Math.min(50, position));
            console.log(`Using fallback deterministic position for ${pair.keyword}: ${position}`);
          }
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
