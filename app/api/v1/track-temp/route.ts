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
        // Simulate tracking (mock result)
        const mockPosition = Math.floor(Math.random() * 50) + 1;
        const checkedAt = new Date().toISOString();
        
        // Update the pair
        memoryStorage.updatePair(pair.pair_id, {
          last_position: mockPosition,
          last_checked_at: checkedAt,
        });

        results.ok++;
        results.details.push({
          pair_id: pair.pair_id,
          keyword: pair.keyword,
          position: mockPosition,
          checked_at: checkedAt,
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
