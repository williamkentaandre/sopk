export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, KEYS } from '@/lib/db';
import { ulid } from 'ulid';

// POST /api/v1/import
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { csvData } = body;

    if (!csvData || typeof csvData !== 'string') {
      return NextResponse.json(
        {
          error: {
            code: 400,
            message: 'CSV data is required',
          },
        },
        { status: 400 }
      );
    }

    // Parse CSV data
    const lines = csvData.trim().split('\n');
    
    if (lines.length < 2) {
      return NextResponse.json(
        {
          error: {
            code: 400,
            message: 'CSV must contain at least a header row and one data row',
          },
        },
        { status: 400 }
      );
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const keywordIndex = header.findIndex(h => h.toLowerCase().includes('mot') || h.toLowerCase().includes('keyword'));
    const urlIndex = header.findIndex(h => h.toLowerCase().includes('url'));

    if (keywordIndex === -1 || urlIndex === -1) {
      return NextResponse.json(
        {
          error: {
            code: 400,
            message: 'CSV must contain "Mot-clé" (or "keyword") and "URL" columns',
          },
        },
        { status: 400 }
      );
    }

    // Parse data rows
    const pairs = [];
    const errors = [];
    const createdAt = new Date().toISOString();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      // Simple CSV parsing (handles quoted values)
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim()); // Add last value

      const keyword = values[keywordIndex]?.replace(/^"|"$/g, '').trim();
      const url = values[urlIndex]?.replace(/^"|"$/g, '').trim();

      if (!keyword || !url) {
        errors.push({
          line: i + 1,
          error: 'Missing keyword or URL',
          data: { keyword, url },
        });
        continue;
      }

      const pairId = ulid();
      const pair = {
        ...KEYS.pair(pairId),
        ...KEYS.gsi1Pair(createdAt),
        pair_id: pairId,
        keyword,
        url,
        raw_url: url,
        last_position: null,
        last_checked_at: null,
        created_at: createdAt,
        updated_at: createdAt,
      };

      pairs.push(pair);
    }

    // Save all pairs to DynamoDB
    const results = [];
    for (const pair of pairs) {
      try {
        await docClient.send(new PutCommand({
          TableName: TABLE_NAME,
          Item: pair,
        }));
        results.push({
          success: true,
          pair_id: pair.pair_id,
          keyword: pair.keyword,
          url: pair.url,
        });
      } catch (error) {
        results.push({
          success: false,
          keyword: pair.keyword,
          url: pair.url,
          error: String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      imported: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      errors: errors.length > 0 ? errors : undefined,
      results,
    }, { status: 201 });

  } catch (error) {
    console.error('Error importing CSV:', error);
    return NextResponse.json(
      {
        error: {
          code: 500,
          message: 'Failed to import CSV',
          details: String(error),
        },
      },
      { status: 500 }
    );
  }
}
