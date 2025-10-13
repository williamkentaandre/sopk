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

    // Real tracking with SerpAPI
    const checkedAt = new Date().toISOString();
    let position = null;
    let error = null;

    try {
      console.log('=== SERPAPI TRACKING ATTEMPT ===');
      console.log('Keyword:', pair.keyword);
      console.log('URL:', pair.url);
      console.log('HL:', validationResult.data.hl || 'fr');
      console.log('GL:', validationResult.data.gl || 'fr');
      
      // Check if SERPAPI_KEY is configured
      const serpApiKey = process.env.SERPAPI_KEY;
      console.log('SERPAPI_KEY configured:', serpApiKey ? 'YES' : 'NO');
      
      if (!serpApiKey) {
        console.log('SERPAPI_KEY not configured, using deterministic test data');
        
        // Create deterministic position based on keyword + URL combination
        // This ensures the same keyword/URL always gets the same position
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
          // 5% chance - Top 10 positions (very competitive)
          position = Math.floor(normalizedHash / 5) + 1;
        } else if (normalizedHash < 200) {
          // 15% chance - Positions 11-20 (page 2)
          position = Math.floor((normalizedHash - 50) / 10) + 11;
        } else if (normalizedHash < 400) {
          // 20% chance - Positions 21-30 (page 3)
          position = Math.floor((normalizedHash - 200) / 10) + 21;
        } else if (normalizedHash < 600) {
          // 20% chance - Positions 31-40 (page 4)
          position = Math.floor((normalizedHash - 400) / 10) + 31;
        } else {
          // 40% chance - Positions 41-50 (page 5+)
          position = Math.floor((normalizedHash - 600) / 10) + 41;
        }
        
        // Ensure position is within 1-50 range
        position = Math.max(1, Math.min(50, position));
        
        console.log(`Deterministic position for "${pair.keyword}" + "${pair.url}": ${position}`);
        error = 'SERPAPI_KEY not configured - using deterministic test data';
      } else {
        try {
          // Import SerpAPI tracking function
          const { trackKeyword } = await import('@/lib/serpapi');
          
          console.log('Starting real SerpAPI tracking...');
          const matchResult = await trackKeyword(
            pair.keyword, 
            pair.url, 
            validationResult.data.hl || 'fr', 
            validationResult.data.gl || 'fr'
          );
          
          position = matchResult.position;
          console.log('SerpAPI tracking successful:', { position });
          
        } catch (serpError) {
          console.error('SerpAPI error:', serpError);
          error = String(serpError);
          
          // Fallback to mock position if SerpAPI fails
          position = Math.floor(Math.random() * 50) + 1;
          console.log('Using fallback mock position:', position);
        }
      }
      
      console.log('=== TRACKING RESULT ===');
      console.log('Final position:', position);
      console.log('Error:', error);
      console.log('========================');
      
    } catch (generalError) {
      console.error('General tracking error:', generalError);
      error = String(generalError);
      position = Math.floor(Math.random() * 50) + 1;
    }
    
    // Update the pair with new tracking data
    const updatedPair = memoryStorage.updatePair(pairId, {
      last_position: position,
      last_checked_at: checkedAt,
    });

    console.log('Tracking completed:', {
      pairId,
      position,
      checkedAt,
      error,
    });

    return NextResponse.json({
      pair_id: pairId,
      position,
      checked_at: checkedAt,
      hl: validationResult.data.hl || 'fr',
      gl: validationResult.data.gl || 'fr',
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
