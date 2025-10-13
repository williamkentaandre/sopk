export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createPairsSchema } from '@/lib/validators';
import { normalizeUrl, isValidUrl } from '@/lib/url-utils';
import { simpleStorage } from '@/lib/simple-storage';

// GET /api/v1/pairs
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get('q')?.toLowerCase();

    let pairs = simpleStorage.getAllPairs();

    // Filter by search query if provided
    if (searchQuery) {
      pairs = pairs.filter(pair =>
        pair.keyword?.toLowerCase().includes(searchQuery) ||
        pair.url?.toLowerCase().includes(searchQuery)
      );
    }

    // Sort by created_at (newest first)
    pairs.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({
      items: pairs,
      total: pairs.length,
    });
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

// POST /api/v1/pairs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
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

    // Check for duplicates within the request
    const normalizedUrls = new Set<string>();
    for (const pair of pairs) {
      if (!isValidUrl(pair.url)) {
        return NextResponse.json(
          {
            error: {
              code: 400,
              message: 'Invalid URL format',
              details: { url: pair.url },
            },
          },
          { status: 400 }
        );
      }

      const normalized = normalizeUrl(pair.url);
      const key = `${pair.keyword.toLowerCase()}|${normalized}`;
      
      if (normalizedUrls.has(key)) {
        return NextResponse.json(
          {
            error: {
              code: 409,
              message: 'Duplicate pair in request',
              details: { keyword: pair.keyword, url: pair.url },
            },
          },
          { status: 409 }
        );
      }
      normalizedUrls.add(key);
    }

    // Create pairs using simple storage
    const newPairs = pairs.map(pair => ({
      keyword: pair.keyword,
      url: pair.url
    }));

    const addedPairs = simpleStorage.addPairs(newPairs);

    return NextResponse.json(
      { items: addedPairs },
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