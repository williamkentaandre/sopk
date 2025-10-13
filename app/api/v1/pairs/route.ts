export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, KEYS } from '@/lib/db';
import { createPairsSchema } from '@/lib/validators';
import { normalizeUrl, isValidUrl } from '@/lib/url-utils';
import { ulid } from 'ulid';

// GET /api/v1/pairs
export async function GET(request: NextRequest) {
  try {
    console.log('=== PAIRS GET DEBUG ===');
    console.log('TABLE_NAME:', TABLE_NAME);
    console.log('AWS_REGION:', process.env.AWS_REGION);
    console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
    console.log('========================');

    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get('q')?.toLowerCase();

    // Query all pairs using GSI
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'ENTITY#PAIR',
      },
      ScanIndexForward: false, // Sort by created_at descending
    });

    console.log('Executing DynamoDB query...');
    const result = await docClient.send(command);
    console.log('Query result:', result);
    
    let items = result.Items || [];

    // Filter by search query if provided
    if (searchQuery) {
      items = items.filter(item => 
        item.keyword?.toLowerCase().includes(searchQuery) ||
        item.url?.toLowerCase().includes(searchQuery)
      );
    }

    // Format response
    const pairs = items.map(item => ({
      pair_id: item.pair_id,
      keyword: item.keyword,
      url: item.raw_url || item.url,
      last_position: item.last_position ?? null,
      last_checked_at: item.last_checked_at ?? null,
    }));

    console.log('Returning pairs:', pairs.length);
    return NextResponse.json({ items: pairs });
  } catch (error) {
    console.error('Error listing pairs:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
    });
    return NextResponse.json(
      {
        error: {
          code: 500,
          message: 'Failed to list pairs',
          details: { 
            error: String(error),
            name: error.name,
            code: error.code,
            tableName: TABLE_NAME,
            region: process.env.AWS_REGION,
          },
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/v1/pairs
export async function POST(request: NextRequest) {
  try {
    console.log('=== PAIRS POST DEBUG ===');
    console.log('TABLE_NAME:', TABLE_NAME);
    console.log('AWS_REGION:', process.env.AWS_REGION);
    console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
    console.log('========================');

    const body = await request.json();
    console.log('Received body:', JSON.stringify(body, null, 2));
    
    // Validate input
    const validationResult = createPairsSchema.safeParse(body);
    if (!validationResult.success) {
      console.log('Validation failed:', validationResult.error.errors);
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

    // Create pairs
    for (const pair of pairs) {
      const pairId = ulid();
      const now = new Date().toISOString();
      const normalized = normalizeUrl(pair.url);

      const item = {
        ...KEYS.pair(pairId),
        ...KEYS.gsi1Pair(now),
        pair_id: pairId,
        keyword: pair.keyword,
        url: normalized,
        raw_url: pair.url,
        created_at: now,
        updated_at: now,
        last_position: null,
        last_checked_at: null,
      };

      const command = new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      });

      await docClient.send(command);

      createdPairs.push({
        pair_id: pairId,
        keyword: pair.keyword,
        url: pair.url,
        last_position: null,
        last_checked_at: null,
      });
    }

    console.log('Successfully created pairs:', createdPairs.length);
    return NextResponse.json(
      { items: createdPairs },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating pairs:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
    });
    return NextResponse.json(
      {
        error: {
          code: 500,
          message: 'Failed to create pairs',
          details: { 
            error: String(error),
            name: error.name,
            code: error.code,
            tableName: TABLE_NAME,
            region: process.env.AWS_REGION,
          },
        },
      },
      { status: 500 }
    );
  }
}