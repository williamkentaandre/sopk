export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== SERPAPI TEST DEBUG ===');
    
    // Test environment variables
    const serpApiKey = process.env.SERPAPI_KEY;
    console.log('SERPAPI_KEY:', serpApiKey ? 'SET' : 'NOT SET');
    
    if (!serpApiKey) {
      return NextResponse.json({
        status: 'ERROR',
        message: 'SERPAPI_KEY not configured',
        timestamp: new Date().toISOString(),
      });
    }

    // Test SerpAPI import
    let importStatus = 'UNKNOWN';
    let trackKeyword = null;
    
    try {
      const serpapiModule = await import('@/lib/serpapi');
      trackKeyword = serpapiModule.trackKeyword;
      importStatus = 'SUCCESS';
      console.log('SerpAPI import: SUCCESS');
    } catch (importError) {
      importStatus = 'FAILED';
      console.log('SerpAPI import: FAILED');
      console.log('Import error:', importError);
    }

    // Test SerpAPI call
    let testResult = null;
    let testError = null;
    
    if (trackKeyword) {
      try {
        console.log('Testing SerpAPI call...');
        testResult = await trackKeyword('outscale', 'https://fr.outscale.com/', 'fr', 'fr');
        console.log('SerpAPI test: SUCCESS');
        console.log('Test result:', testResult);
      } catch (error) {
        testError = String(error);
        console.log('SerpAPI test: FAILED');
        console.log('Test error:', error);
      }
    }

    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: {
        serpApiKey: serpApiKey ? 'SET' : 'NOT SET',
      },
      import: {
        status: importStatus,
      },
      test: {
        result: testResult,
        error: testError,
      },
    });
    
  } catch (error) {
    console.error('SerpAPI test error:', error);
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
