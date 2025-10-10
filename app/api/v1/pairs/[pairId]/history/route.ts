export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, KEYS } from '@/lib/db';
import { historyQuerySchema } from '@/lib/validators';

// GET /api/v1/pairs/:pairId/history
export async function GET(
  request: NextRequest,
  { params }: { params: { pairId: string } }
) {
  try {
    const { pairId } = params;
    const searchParams = request.nextUrl.searchParams;

    // Validate query parameters
    const queryObject = {
      limit: searchParams.get('limit'),
      from: searchParams.get('from'),
      to: searchParams.get('to'),
      order: searchParams.get('order'),
    };

    const validationResult = historyQuerySchema.safeParse(queryObject);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 400,
            message: 'Invalid query parameters',
            details: validationResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { limit, from, to, order } = validationResult.data;

    // Check if pair exists
    const getPairCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: KEYS.pair(pairId),
    });

    const pairResult = await docClient.send(getPairCommand);

    if (!pairResult.Item) {
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

    // Build query
    let keyConditionExpression = 'PK = :pk AND begins_with(SK, :sk)';
    const expressionAttributeValues: any = {
      ':pk': `PAIR#${pairId}`,
      ':sk': 'HISTO#',
    };

    // Add date range filters if provided
    if (from && to) {
      keyConditionExpression = 'PK = :pk AND SK BETWEEN :from AND :to';
      expressionAttributeValues[':from'] = `HISTO#${from}`;
      expressionAttributeValues[':to'] = `HISTO#${to}`;
    } else if (from) {
      keyConditionExpression = 'PK = :pk AND SK >= :from';
      expressionAttributeValues[':from'] = `HISTO#${from}`;
    } else if (to) {
      keyConditionExpression = 'PK = :pk AND SK <= :to';
      expressionAttributeValues[':to'] = `HISTO#${to}`;
    }

    const queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ScanIndexForward: order === 'asc',
      Limit: limit,
    });

    const historyResult = await docClient.send(queryCommand);

    const items = (historyResult.Items || []).map(item => ({
      checked_at: item.checked_at,
      hl: item.hl,
      gl: item.gl,
      position: item.position ?? null,
      matched_url: item.matched_url ?? null,
      match_type: item.match_type,
      serp_link: item.serp_link,
      source: item.source,
      ...(item.error && { error: item.error }),
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error getting history:', error);
    return NextResponse.json(
      {
        error: {
          code: 500,
          message: 'Failed to get history',
          details: { error: String(error) },
        },
      },
      { status: 500 }
    );
  }
}

