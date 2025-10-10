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
  };
}

export interface MatchResult {
  position: number | null;
  matchedUrl: string | null;
  matchType: 'exact' | 'domain' | 'none';
  serpLink?: string;
}

/**
 * Calls SerpAPI Google Organic search
 */
export async function callSerpApi(params: SerpApiParams): Promise<SerpApiResponse> {
  const apiKey = process.env.SERPAPI_API_KEY;
  
  if (!apiKey) {
    throw new Error('SERPAPI_API_KEY not configured');
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

  const data = await response.json();
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

  let bestDomainMatch: { position: number; url: string } | null = null;

  // Iterate through organic results
  for (const result of organicResults) {
    const normalizedResult = normalizeUrl(result.link);
    
    // Check for exact match
    if (normalizedResult === normalizedTarget) {
      return {
        position: result.position,
        matchedUrl: result.link,
        matchType: 'exact',
      };
    }

    // Check for domain match
    const resultDomain = extractDomain(result.link);
    if (resultDomain && resultDomain === targetDomain) {
      // Keep track of best (lowest position) domain match
      if (!bestDomainMatch || result.position < bestDomainMatch.position) {
        bestDomainMatch = {
          position: result.position,
          url: result.link,
        };
      }
    }
  }

  // Return best domain match if found
  if (bestDomainMatch) {
    return {
      position: bestDomainMatch.position,
      matchedUrl: bestDomainMatch.url,
      matchType: 'domain',
    };
  }

  // No match found
  return {
    position: null,
    matchedUrl: null,
    matchType: 'none',
  };
}

/**
 * Track a keyword/URL pair using SerpAPI
 */
export async function trackKeyword(
  keyword: string,
  url: string,
  hl: string,
  gl: string
): Promise<MatchResult & { serpLink?: string }> {
  const serpResponse = await callSerpApi({ keyword, hl, gl, num: 100 });
  
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

