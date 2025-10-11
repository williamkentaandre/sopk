export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, KEYS } from '@/lib/db';
import { settingsSchema } from '@/lib/validators';
import { Settings } from '@/lib/types';

// GET /api/v1/settings
export async function GET(request: NextRequest) {
  try {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: KEYS.settings(),
    });

    const result = await docClient.send(command);

    if (!result.Item) {
      // Return default settings
      return NextResponse.json({
        hl: 'fr',
        gl: 'fr',
      });
    }

    return NextResponse.json({
      hl: result.Item.hl,
      gl: result.Item.gl,
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    return NextResponse.json(
      {
        error: {
          code: 500,
          message: 'Failed to retrieve settings',
          details: { error: String(error) },
        },
      },
      { status: 500 }
    );
  }
}

// PUT /api/v1/settings
export async function PUT(request: NextRequest) {
  try {
    // DEBUG: Test DynamoDB connection first
    console.log('=== SETTINGS PUT DEBUG ===');
    console.log('Testing DynamoDB connection...');
    
    // Test if we can access the table
    const testCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: KEYS.settings(),
    });
    
    try {
      await docClient.send(testCommand);
      console.log('DynamoDB connection test: SUCCESS');
    } catch (testError) {
      console.log('DynamoDB connection test: FAILED');
      console.log('Test error:', (testError as any)?.message);
      console.log('Test error code:', (testError as any)?.code);
    }
    
    const body = await request.json();
    
    // Validate input
    const validationResult = settingsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 400,
            message: 'Invalid settings data',
            details: validationResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { hl, gl } = validationResult.data;

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...KEYS.settings(),
        hl,
        gl,
        updated_at: new Date().toISOString(),
      },
    });

    await docClient.send(command);

    return NextResponse.json({
      hl,
      gl,
    });
  } catch (error) {
    console.error('=== SETTINGS ERROR ===');
    console.error('Error updating settings:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', (error as any)?.message);
    console.error('Error code:', (error as any)?.code);
    console.error('Error name:', (error as any)?.name);
    console.error('Full error:', JSON.stringify(error, null, 2));
    console.error('======================');
    return NextResponse.json(
      {
        error: {
          code: 500,
          message: 'Failed to update settings',
          details: { error: String(error) },
        },
      },
      { status: 500 }
      );
  }
}

