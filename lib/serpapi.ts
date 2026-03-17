import { normalizeUrl, extractDomain } from './url-utils';

export interface SerpApiParams {
  keyword: string;
  hl: string;
  gl: string;
  num?: number;
}

export interface OrganicResult {
  position: number;
  link: string;
  title?: string;
  snippet?: string;
}

export interface SerpApiResponse {
  organic_results?: OrganicResult[];
  search_metadata?: {
    id?: string;
    status?: string;
    error?: string;
  };
  error?: string;
}

export interface MatchResult {
  position: number | null;
  matchedUrl: string | null;
  matchType: 'exact' | 'domain' | 'none';
  serpLink?: string;
}

export interface SerpApiOptions {
  apiKey?: string | null;
}

/**
 * Calls SerpAPI Google Organic search.
 * Uses options.apiKey if provided, otherwise process.env.SERPAPI_API_KEY.
 */
export async function callSerpApi(
  params: SerpApiParams,
  options?: SerpApiOptions
): Promise<SerpApiResponse> {
  const apiKey = options?.apiKey ?? process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    throw new Error('Clé SERP API manquante. Configurez-la dans Paramètres.');
  }

  const url = new URL('https://serpapi.com/search');
  url.searchParams.append('q', params.keyword);
  url.searchParams.append('hl', params.hl);
  url.searchParams.append('gl', params.gl);
  url.searchParams.append('num', String(params.num || 100));
  url.searchParams.append('engine', 'google');
  url.searchParams.append('api_key', apiKey);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`SerpAPI error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as SerpApiResponse;

  // SerpAPI can return HTTP 200 with an error payload
  const anyError =
    (typeof data.error === 'string' && data.error) ||
    (typeof data.search_metadata?.error === 'string' && data.search_metadata?.error) ||
    (typeof data.search_metadata?.status === 'string' && data.search_metadata?.status !== 'Success'
      ? `Search status: ${data.search_metadata?.status}`
      : '');
  if (anyError) {
    throw new Error(`SerpAPI error: ${anyError}`);
  }

  return data;
}

/**
 * Matches target URL against SERP results
 * Returns position, matched URL, and match type
 */
export function matchUrlInResults(
  targetUrl: string,
  organicResults: OrganicResult[]
): MatchResult {
  const normalizedTarget = normalizeUrl(targetUrl);
  const targetDomain = extractDomain(targetUrl);
  
  // Check if input is just a domain (no protocol = domain tracking)
  // This handles: "example.com", "www.example.com", "example.com/"
  const trimmedUrl = targetUrl.trim().replace(/\/$/, ''); // Remove trailing slash
  const isDomainOnly = !trimmedUrl.startsWith('http://') && 
                       !trimmedUrl.startsWith('https://');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 URL MATCHING DEBUG - START');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📌 Target URL:', targetUrl);
  console.log('  📌 Trimmed URL:', trimmedUrl);
  console.log('  📌 Is Domain Only:', isDomainOnly, isDomainOnly ? '✅ (DOMAIN TRACKING)' : '❌ (URL TRACKING)');
  console.log('  📌 Normalized Target:', normalizedTarget);
  console.log('  📌 Target Domain:', targetDomain);
  console.log('  📌 Total Results:', organicResults.length);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let bestDomainMatch: { position: number; url: string } | null = null;

  // Iterate through organic results
  for (const result of organicResults) {
    const normalizedResult = normalizeUrl(result.link);
    const resultDomain = extractDomain(result.link);
    
    // If target is just a domain, only do domain matching
    if (isDomainOnly) {
      console.log(`  [Pos ${result.position}] Checking:`, result.link);
      console.log(`    Result Domain: "${resultDomain}" vs Target Domain: "${targetDomain}"`);
      
      if (resultDomain && resultDomain === targetDomain) {
        // Keep track of best (lowest position) domain match
        if (!bestDomainMatch || result.position < bestDomainMatch.position) {
          console.log('  ✅ Domain match at position', result.position);
          console.log('    Result URL:', result.link);
          console.log('    Result Domain:', resultDomain);
          bestDomainMatch = {
            position: result.position,
            url: result.link,
          };
        }
      }
    } else {
      // For full URLs, try exact match first
      if (normalizedResult === normalizedTarget) {
        console.log('  ✅ EXACT MATCH at position', result.position);
        console.log('    Result URL:', result.link);
        console.log('    Normalized:', normalizedResult);
        return {
          position: result.position,
          matchedUrl: result.link,
          matchType: 'exact',
        };
      }

      // Then fall back to domain match
      if (resultDomain && resultDomain === targetDomain) {
        // Keep track of best (lowest position) domain match
        if (!bestDomainMatch || result.position < bestDomainMatch.position) {
          console.log('  🔗 Domain match at position', result.position);
          console.log('    Result URL:', result.link);
          console.log('    Result Domain:', resultDomain);
          bestDomainMatch = {
            position: result.position,
            url: result.link,
          };
        }
      }
    }
  }

  // Return best domain match if found
  if (bestDomainMatch) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ MATCH FOUND!');
    console.log('  Type:', isDomainOnly ? 'DOMAIN MATCH' : 'DOMAIN FALLBACK');
    console.log('  Position:', bestDomainMatch.position);
    console.log('  Matched URL:', bestDomainMatch.url);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return {
      position: bestDomainMatch.position,
      matchedUrl: bestDomainMatch.url,
      matchType: 'domain',
    };
  }

  // No match found
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('❌ NO MATCH FOUND!');
  console.log('  Target was:', isDomainOnly ? 'DOMAIN' : 'URL');
  console.log('  Target Domain:', targetDomain);
  console.log('  Checked:', organicResults.length, 'results');
  console.log('  Reason: No domain match found in results');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return {
    position: null,
    matchedUrl: null,
    matchType: 'none',
  };
}

/**
 * Track a keyword/URL pair using SerpAPI.
 * Pass options.apiKey for per-user key (SaaS).
 */
export async function trackKeyword(
  keyword: string,
  url: string,
  hl: string,
  gl: string,
  options?: SerpApiOptions
): Promise<MatchResult & { serpLink?: string }> {
  const serpResponse = await callSerpApi({ keyword, hl, gl, num: 100 }, options);
  
  const organicResults = serpResponse.organic_results || [];
  const matchResult = matchUrlInResults(url, organicResults);

  // Add SERP viewer link if available
  const serpLink = serpResponse.search_metadata?.id
    ? `https://serpapi.com/searches/${serpResponse.search_metadata.id}`
    : undefined;

  return {
    ...matchResult,
    serpLink,
  };
}

