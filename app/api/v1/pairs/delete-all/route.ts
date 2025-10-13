export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '@/lib/db';

// DELETE /api/v1/pairs/delete-all
export async function DELETE(request: NextRequest) {
  try {
    // Get all pairs
    const queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'ENTITY#PAIR',
      },
    });

    const result = await docClient.send(queryCommand);
    const pairs = result.Items || [];

    // Delete all pairs and their history
    let deletedCount = 0;
    const errors = [];

    for (const pair of pairs) {
      try {
        // Delete the pair metadata
        await docClient.send(new DeleteCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: pair.PK,
            SK: pair.SK,
          },
        }));

        // Query and delete history entries for this pair
        const historyQuery = new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
          ExpressionAttributeValues: {
            ':pk': pair.PK,
            ':sk_prefix': 'HISTO#',
          },
        });

        const historyResult = await docClient.send(historyQuery);
        const historyItems = historyResult.Items || [];

        // Delete each history entry
        for (const historyItem of historyItems) {
          await docClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: {
              PK: historyItem.PK,
              SK: historyItem.SK,
            },
          }));
        }

        deletedCount++;
      } catch (error) {
        errors.push({
          pair_id: pair.pair_id,
          error: String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Error deleting all pairs:', error);
    return NextResponse.json(
      {
        error: {
          code: 500,
          message: 'Failed to delete all pairs',
          details: String(error),
        },
      },
      { status: 500 }
    );
  }
}

