export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { GetCommand, PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, KEYS } from '@/lib/db';
import { updatePairSchema } from '@/lib/validators';
import { normalizeUrl, isValidUrl } from '@/lib/url-utils';

// GET /api/v1/pairs/:pairId
export async function GET(
  request: NextRequest,
  { params }: { params: { pairId: string } }
) {
  try {
    const { pairId } = params;

    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: KEYS.pair(pairId),
    });

    const result = await docClient.send(command);

    if (!result.Item) {
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

    return NextResponse.json({
      pair_id: result.Item.pair_id,
      keyword: result.Item.keyword,
      url: result.Item.raw_url || result.Item.url,
      last_position: result.Item.last_position ?? null,
      last_checked_at: result.Item.last_checked_at ?? null,
    });
  } catch (error) {
    console.error('Error getting pair:', error);
    return NextResponse.json(
      {
        error: {
          code: 500,
          message: 'Failed to get pair',
          details: { error: String(error) },
        },
      },
      { status: 500 }
    );
  }
}

// PUT /api/v1/pairs/:pairId
export async function PUT(
  request: NextRequest,
  { params }: { params: { pairId: string } }
) {
  try {
    const { pairId } = params;
    const body = await request.json();

    // Validate input
    const validationResult = updatePairSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 400,
            message: 'Invalid update data',
            details: validationResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const updates = validationResult.data;

    // Check if pair exists
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: KEYS.pair(pairId),
    });

    const existingPair = await docClient.send(getCommand);

    if (!existingPair.Item) {
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

    // Prepare updated item
    const updatedItem = { ...existingPair.Item };
    
    if (updates.keyword) {
      updatedItem.keyword = updates.keyword;
    }
    
    if (updates.url) {
      if (!isValidUrl(updates.url)) {
        return NextResponse.json(
          {
            error: {
              code: 400,
              message: 'Invalid URL format',
              details: { url: updates.url },
            },
          },
          { status: 400 }
        );
      }
      updatedItem.url = normalizeUrl(updates.url);
      updatedItem.raw_url = updates.url;
    }

    updatedItem.updated_at = new Date().toISOString();

    // Update pair
    const putCommand = new PutCommand({
      TableName: TABLE_NAME,
      Item: updatedItem,
    });

    await docClient.send(putCommand);

    return NextResponse.json({
      pair_id: updatedItem.pair_id,
      keyword: updatedItem.keyword,
      url: updatedItem.raw_url || updatedItem.url,
      last_position: updatedItem.last_position ?? null,
      last_checked_at: updatedItem.last_checked_at ?? null,
    });
  } catch (error) {
    console.error('Error updating pair:', error);
    return NextResponse.json(
      {
        error: {
          code: 500,
          message: 'Failed to update pair',
          details: { error: String(error) },
        },
      },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/pairs/:pairId
export async function DELETE(
  request: NextRequest,
  { params }: { params: { pairId: string } }
) {
  try {
    const { pairId } = params;
    const searchParams = request.nextUrl.searchParams;
    const purgeHistory = searchParams.get('purge_history') === 'true';

    // Check if pair exists
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: KEYS.pair(pairId),
    });

    const existingPair = await docClient.send(getCommand);

    if (!existingPair.Item) {
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

    // Delete the pair metadata
    const deleteMetaCommand = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: KEYS.pair(pairId),
    });

    await docClient.send(deleteMetaCommand);

    // Optionally purge history
    if (purgeHistory) {
      const queryCommand = new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `PAIR#${pairId}`,
          ':sk': 'HISTO#',
        },
      });

      const historyResult = await docClient.send(queryCommand);

      if (historyResult.Items && historyResult.Items.length > 0) {
        // Delete history items
        for (const item of historyResult.Items) {
          const deleteHistoryCommand = new DeleteCommand({
            TableName: TABLE_NAME,
            Key: {
              PK: item.PK,
              SK: item.SK,
            },
          });
          await docClient.send(deleteHistoryCommand);
        }
      }
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting pair:', error);
    return NextResponse.json(
      {
        error: {
          code: 500,
          message: 'Failed to delete pair',
          details: { error: String(error) },
        },
      },
      { status: 500 }
    );
  }
}

