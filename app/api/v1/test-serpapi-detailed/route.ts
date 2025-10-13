import { NextRequest, NextResponse } from 'next/server';
import { trackKeyword } from '@/lib/serpapi';
import { normalizeUrl, extractDomain } from '@/lib/url-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('keyword') || 'outscale';
    const url = searchParams.get('url') || 'https://fr.outscale.com/';
    
    console.log('=== DETAILED SERPAPI TEST ===');
    console.log('Keyword:', keyword);
    console.log('Target URL:', url);
    
    // Test SerpAPI call
    const matchResult = await trackKeyword(keyword, url, 'fr', 'fr');
    
    console.log('Match result:', matchResult);
    
    // Test URL normalization
    const normalizedTarget = normalizeUrl(url);
    const targetDomain = extractDomain(url);
    
    console.log('Normalized target:', normalizedTarget);
    console.log('Target domain:', targetDomain);
    
    return NextResponse.json({
      success: true,
      keyword,
      targetUrl: url,
      normalizedTarget,
      targetDomain,
      matchResult,
      serpApiKey: process.env.SERPAPI_API_KEY ? 'SET' : 'NOT_SET',
    });
    
  } catch (error) {
    console.error('Detailed SerpAPI test error:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
      details: {
        name: (error as any)?.name,
        message: (error as any)?.message,
      },
    }, { status: 500 });
  }
}
