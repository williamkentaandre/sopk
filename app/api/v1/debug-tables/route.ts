import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Listing all DynamoDB tables...');
    
    const client = new DynamoDBClient({
      region: "eu-north-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const command = new ListTablesCommand({});
    const response = await client.send(command);
    
    console.log('📋 Available tables:', response.TableNames);
    
    return NextResponse.json({
      success: true,
      tables: response.TableNames || [],
      count: response.TableNames?.length || 0,
      region: "eu-north-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ? "SET" : "NOT_SET",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? "SET" : "NOT_SET",
      }
    });
    
  } catch (error) {
    console.error('❌ Error listing tables:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
      details: {
        name: (error as any)?.name,
        message: (error as any)?.message,
        code: (error as any)?.code,
      },
      region: "eu-north-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ? "SET" : "NOT_SET",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? "SET" : "NOT_SET",
      }
    }, { status: 500 });
  }
}
