export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { settingsSchema } from '@/lib/validators';

// Simple in-memory storage for settings
let currentSettings = {
  hl: 'fr',
  gl: 'fr',
  updated_at: new Date().toISOString()
};

// GET /api/v1/settings
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      hl: currentSettings.hl,
      gl: currentSettings.gl,
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

    // Update in-memory settings
    currentSettings = {
      hl,
      gl,
      updated_at: new Date().toISOString()
    };

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

