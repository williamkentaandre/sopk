export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

export async function GET(request: NextRequest) {
  try {
    console.log('=== DYNAMODB TEST ===');
    console.log('AWS_REGION:', process.env.AWS_REGION);
    console.log('DYNAMODB_TABLE:', process.env.DYNAMODB_TABLE);
    console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
    console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');

    // Create client with explicit config
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || "eu-north-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const docClient = DynamoDBDocumentClient.from(client);
    const tableName = process.env.DYNAMODB_TABLE || "seo_ranker";

    console.log('Testing table describe...');
    
    // Test 1: Describe table
    const describeCommand = new DescribeTableCommand({ TableName: tableName });
    const describeResult = await client.send(describeCommand);
    console.log('Table exists:', describeResult.Table?.TableName);
    console.log('Table status:', describeResult.Table?.TableStatus);

    // Test 2: Put item
    console.log('Testing put item...');
    const putCommand = new PutCommand({
      TableName: tableName,
      Item: {
        PK: 'TEST#ITEM',
        SK: 'META',
        test: 'value',
        timestamp: new Date().toISOString(),
      },
    });
    await docClient.send(putCommand);
    console.log('Put item successful');

    // Test 3: Get item
    console.log('Testing get item...');
    const getCommand = new GetCommand({
      TableName: tableName,
      Key: {
        PK: 'TEST#ITEM',
        SK: 'META',
      },
    });
    const getResult = await docClient.send(getCommand);
    console.log('Get item successful:', getResult.Item);

    console.log('=== ALL TESTS PASSED ===');

    return NextResponse.json({
      success: true,
      table: describeResult.Table?.TableName,
      status: describeResult.Table?.TableStatus,
      region: process.env.AWS_REGION || "eu-north-1",
      testItem: getResult.Item,
    });

  } catch (error) {
    console.error('=== DYNAMODB TEST ERROR ===');
    console.error('Error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', (error as any)?.message);
    console.error('Error code:', (error as any)?.code);
    console.error('Error name:', (error as any)?.name);
    console.error('Full error:', JSON.stringify(error, null, 2));
    console.error('============================');

    return NextResponse.json({
      success: false,
      error: {
        message: (error as any)?.message,
        code: (error as any)?.code,
        name: (error as any)?.name,
        type: typeof error,
      },
    }, { status: 500 });
  }
}
