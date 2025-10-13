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
    const body = await request.json();
    console.log('=== SETTINGS PUT DEBUG ===');
    console.log('Received body:', JSON.stringify(body, null, 2));
    console.log('Body type:', typeof body);
    console.log('hl value:', body.hl, 'type:', typeof body.hl);
    console.log('gl value:', body.gl, 'type:', typeof body.gl);
    console.log('========================');
    
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
    console.error('Error updating settings:', error);
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

