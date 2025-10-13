export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { normalizeUrl, extractDomain } from '@/lib/url-utils';

// GET /api/v1/test-domain-matching?target=outscale.com&result=https://fr.outscale.com/
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const targetUrl = searchParams.get('target') || 'outscale.com';
    const resultUrl = searchParams.get('result') || 'https://fr.outscale.com/';
    
    console.log('=== DOMAIN MATCHING TEST ===');
    
    // Target processing
    const trimmedTarget = targetUrl.trim().replace(/\/$/, '');
    const isDomainOnly = !trimmedTarget.startsWith('http://') && 
                         !trimmedTarget.startsWith('https://');
    const normalizedTarget = normalizeUrl(targetUrl);
    const targetDomain = extractDomain(targetUrl);
    
    console.log('Target URL:', targetUrl);
    console.log('Trimmed:', trimmedTarget);
    console.log('Is Domain Only:', isDomainOnly);
    console.log('Normalized Target:', normalizedTarget);
    console.log('Target Domain:', targetDomain);
    
    // Result processing
    const normalizedResult = normalizeUrl(resultUrl);
    const resultDomain = extractDomain(resultUrl);
    
    console.log('\nResult URL:', resultUrl);
    console.log('Normalized Result:', normalizedResult);
    console.log('Result Domain:', resultDomain);
    
    // Matching
    const exactMatch = normalizedResult === normalizedTarget;
    const domainMatch = resultDomain && resultDomain === targetDomain;
    
    console.log('\nExact Match:', exactMatch);
    console.log('Domain Match:', domainMatch);
    
    return NextResponse.json({
      success: true,
      target: {
        original: targetUrl,
        trimmed: trimmedTarget,
        isDomainOnly,
        normalized: normalizedTarget,
        domain: targetDomain,
      },
      result: {
        original: resultUrl,
        normalized: normalizedResult,
        domain: resultDomain,
      },
      matching: {
        exactMatch,
        domainMatch,
        shouldMatch: isDomainOnly ? domainMatch : (exactMatch || domainMatch),
      },
    });
    
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}

