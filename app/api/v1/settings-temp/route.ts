export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { memoryStorage } from '@/lib/memory-storage';
import { settingsSchema } from '@/lib/validators';

// GET /api/v1/settings-temp
export async function GET(request: NextRequest) {
  try {
    const settings = memoryStorage.getSettings();
    return NextResponse.json(settings);
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

// PUT /api/v1/settings-temp
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('=== SETTINGS TEMP PUT DEBUG ===');
    console.log('Received body:', JSON.stringify(body, null, 2));
    console.log('===============================');
    
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
    const updatedSettings = memoryStorage.updateSettings({ hl, gl });

    console.log('Settings updated successfully:', updatedSettings);

    return NextResponse.json(updatedSettings);
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
