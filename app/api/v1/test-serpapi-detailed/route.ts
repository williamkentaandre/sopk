import { NextRequest, NextResponse } from 'next/server';
import { trackKeyword } from '@/lib/serpapi';
import { callSerperGoogleSearch } from '@/lib/serper';
import { normalizeUrl, extractDomain } from '@/lib/url-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('keyword') || 'outscale';
    const url = searchParams.get('url') || 'https://fr.outscale.com/';

    console.log('=== DETAILED SERPER TEST ===');
    console.log('Keyword:', keyword);
    console.log('Target URL:', url);

    const serpResponse = await callSerperGoogleSearch({
      q: keyword,
      hl: 'fr',
      gl: 'fr',
      num: 100,
      page: 1,
    });
    const organicResults = serpResponse.organic || [];

    const matchResult = await trackKeyword(keyword, url, 'fr', 'fr');

    console.log('Match result:', matchResult);

    const normalizedTarget = normalizeUrl(url);
    const targetDomain = extractDomain(url);

    console.log('Normalized target:', normalizedTarget);
    console.log('Target domain:', targetDomain);

    const first10Results = organicResults.slice(0, 10).map((result) => ({
      position: result.position,
      url: result.link,
      normalized: normalizeUrl(result.link),
      domain: extractDomain(result.link),
      title: result.title,
    }));

    const hasKey =
      !!process.env.SERPER_API_KEY || !!process.env.SERPAPI_API_KEY;

    return NextResponse.json({
      success: true,
      keyword,
      targetUrl: url,
      normalizedTarget,
      targetDomain,
      matchResult,
      totalResults: organicResults.length,
      first10Results,
      serpApiKey: hasKey ? 'SET' : 'NOT_SET',
    });
  } catch (error) {
    console.error('Detailed Serper test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: String(error),
        details: {
          name: (error as any)?.name,
          message: (error as any)?.message,
        },
      },
      { status: 500 }
    );
  }
}
