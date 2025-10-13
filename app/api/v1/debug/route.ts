export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG API CALLED ===');
    
    // Test environment variables
    const envVars = {
      AWS_REGION: process.env.AWS_REGION,
      DYNAMODB_TABLE: process.env.DYNAMODB_TABLE,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET',
    };
    
    console.log('Environment variables:', envVars);
    
    // Test DynamoDB import
    let dynamoStatus = 'UNKNOWN';
    try {
      const { docClient, TABLE_NAME } = await import('@/lib/db');
      console.log('DynamoDB import: SUCCESS');
      console.log('Table name:', TABLE_NAME);
      dynamoStatus = 'IMPORT_SUCCESS';
    } catch (importError) {
      console.log('DynamoDB import: FAILED');
      console.log('Import error:', importError);
      dynamoStatus = 'IMPORT_FAILED';
    }
    
    // Test DynamoDB connection
    let connectionStatus = 'UNKNOWN';
    try {
      const { docClient, TABLE_NAME, KEYS } = await import('@/lib/db');
      const { GetCommand } = await import('@aws-sdk/lib-dynamodb');
      
      const testCommand = new GetCommand({
        TableName: TABLE_NAME,
        Key: KEYS.settings(),
      });
      
      await docClient.send(testCommand);
      console.log('DynamoDB connection: SUCCESS');
      connectionStatus = 'CONNECTION_SUCCESS';
    } catch (connectionError) {
      console.log('DynamoDB connection: FAILED');
      console.log('Connection error:', connectionError);
      connectionStatus = 'CONNECTION_FAILED';
    }
    
    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: envVars,
      dynamoImport: dynamoStatus,
      dynamoConnection: connectionStatus,
    });
    
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      {
        status: 'ERROR',
        error: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
