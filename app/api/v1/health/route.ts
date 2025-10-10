export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';

// GET /api/v1/health
export async function GET(request: NextRequest) {
  try {
    let serpApiStatus = 'unknown';

    // Check SerpAPI availability
    const apiKey = process.env.SERPAPI_API_KEY;
    
    if (apiKey) {
      try {
        const url = new URL('https://serpapi.com/search');
        url.searchParams.append('q', 'test');
        url.searchParams.append('engine', 'google');
        url.searchParams.append('api_key', apiKey);
        url.searchParams.append('num', '1');

        const response = await fetch(url.toString(), {
          method: 'GET',
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        serpApiStatus = response.ok ? 'reachable' : 'error';
      } catch (error) {
        serpApiStatus = 'unreachable';
      }
    } else {
      serpApiStatus = 'not_configured';
    }

    return NextResponse.json({
      ok: true,
      serpapi: serpApiStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

