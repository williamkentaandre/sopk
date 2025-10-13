export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { memoryStorage } from '@/lib/memory-storage';
import { trackSchema } from '@/lib/validators';

// POST /api/v1/pairs-temp/[pairId]/track
export async function POST(
  request: NextRequest,
  { params }: { params: { pairId: string } }
) {
  try {
    const { pairId } = params;
    const body = await request.json();
    
    console.log('=== TRACK TEMP POST DEBUG ===');
    console.log('Pair ID:', pairId);
    console.log('Received body:', JSON.stringify(body, null, 2));
    console.log('==============================');
    
    // Validate input
    const validationResult = trackSchema.safeParse(body);
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

    // Get the pair from memory storage
    const pairs = memoryStorage.getPairs();
    const pair = pairs.find(p => p.pair_id === pairId);
    
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

    // Simulate tracking (mock result for now)
    const mockPosition = Math.floor(Math.random() * 50) + 1; // Random position 1-50
    const checkedAt = new Date().toISOString();
    
    // Update the pair with new tracking data
    const updatedPair = memoryStorage.updatePair(pairId, {
      last_position: mockPosition,
      last_checked_at: checkedAt,
    });

    console.log('Tracking completed:', {
      pairId,
      position: mockPosition,
      checkedAt,
    });

    return NextResponse.json({
      pair_id: pairId,
      position: mockPosition,
      checked_at: checkedAt,
      hl: validationResult.data.hl || 'fr',
      gl: validationResult.data.gl || 'fr',
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
