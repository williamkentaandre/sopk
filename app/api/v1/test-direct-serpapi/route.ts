export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== DIRECT SERPAPI TEST ===');
    
    const serpApiKey = process.env.SERPAPI_KEY;
    console.log('SERPAPI_KEY:', serpApiKey ? 'SET' : 'NOT SET');
    
    if (!serpApiKey) {
      return NextResponse.json({
        status: 'ERROR',
        message: 'SERPAPI_KEY not configured',
        timestamp: new Date().toISOString(),
      });
    }

    // Direct SerpAPI call
    const searchParams = new URLSearchParams({
      q: 'outscale',
      hl: 'fr',
      gl: 'fr',
      api_key: serpApiKey,
    });

    const serpApiUrl = `https://serpapi.com/search?${searchParams.toString()}`;
    console.log('SerpAPI URL:', serpApiUrl.replace(serpApiKey, 'HIDDEN'));

    const response = await fetch(serpApiUrl);
    const data = await response.json();

    console.log('SerpAPI response status:', response.status);
    console.log('SerpAPI response data:', JSON.stringify(data, null, 2));

    // Look for outscale.com in results
    let outscalePosition = null;
    if (data.organic_results) {
      for (let i = 0; i < data.organic_results.length; i++) {
        const result = data.organic_results[i];
        if (result.link && result.link.includes('outscale.com')) {
          outscalePosition = i + 1;
          break;
        }
      }
    }

    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      serpApiStatus: response.status,
      outscalePosition,
      totalResults: data.organic_results?.length || 0,
      firstResult: data.organic_results?.[0] || null,
    });
    
  } catch (error) {
    console.error('Direct SerpAPI test error:', error);
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
