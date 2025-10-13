export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DescribeTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { TABLE_NAME } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('=== DYNAMODB TEST ===');
    console.log('TABLE_NAME:', TABLE_NAME);
    console.log('AWS_REGION:', process.env.AWS_REGION);
    console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
    console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');

    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'eu-north-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    // Test 1: List all tables
    console.log('Testing: List tables...');
    const listCommand = new ListTablesCommand({});
    const listResult = await client.send(listCommand);
    console.log('Available tables:', listResult.TableNames);

    // Test 2: Describe our specific table
    console.log('Testing: Describe table...');
    const describeCommand = new DescribeTableCommand({
      TableName: TABLE_NAME,
    });
    const describeResult = await client.send(describeCommand);
    console.log('Table status:', describeResult.Table?.TableStatus);
    console.log('Table ARN:', describeResult.Table?.TableArn);

    return NextResponse.json({
      success: true,
      tableName: TABLE_NAME,
      region: process.env.AWS_REGION || 'eu-north-1',
      availableTables: listResult.TableNames,
      ourTable: {
        exists: !!describeResult.Table,
        status: describeResult.Table?.TableStatus,
        arn: describeResult.Table?.TableArn,
      },
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET',
      }
    });

  } catch (error) {
    console.error('DynamoDB test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: String(error),
        tableName: TABLE_NAME,
        region: process.env.AWS_REGION || 'eu-north-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET',
        }
      },
      { status: 500 }
    );
  }
}
