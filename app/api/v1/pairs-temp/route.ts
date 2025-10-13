export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { memoryStorage } from '@/lib/memory-storage';
import { createPairsSchema } from '@/lib/validators';

// GET /api/v1/pairs-temp
export async function GET(request: NextRequest) {
  try {
    const pairs = memoryStorage.getPairs();
    return NextResponse.json({ items: pairs });
  } catch (error) {
    console.error('Error listing pairs:', error);
    return NextResponse.json(
      {
        error: {
          code: 500,
          message: 'Failed to list pairs',
          details: { error: String(error) },
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/v1/pairs-temp
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('=== PAIRS TEMP POST DEBUG ===');
    console.log('Received body:', JSON.stringify(body, null, 2));
    console.log('==============================');
    
    // Validate input
    const validationResult = createPairsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 400,
            message: 'Invalid pairs data',
            details: validationResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { pairs } = validationResult.data;
    const createdPairs = [];

    // Create pairs
    for (const pair of pairs) {
      const createdPair = memoryStorage.createPair(pair.keyword, pair.url);
      createdPairs.push(createdPair);
    }

    console.log('Pairs created successfully:', createdPairs);

    return NextResponse.json(
      { items: createdPairs },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating pairs:', error);
    return NextResponse.json(
      {
        error: {
          code: 500,
          message: 'Failed to create pairs',
          details: { error: String(error) },
        },
      },
      { status: 500 }
    );
  }
}
