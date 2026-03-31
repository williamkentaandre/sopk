import { normalizeUrl, extractDomain } from './url-utils';

export interface SerpApiParams {
  keyword: string;
  hl: string;
  gl: string;
  num?: number;
  start?: number;
  engine?: 'google_light' | 'google';
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
  pagesQueried?: number;
  elapsedMs?: number;
}

export interface SerpApiOptions {
  apiKey?: string | null;
}

function normalizeHostname(input: string): string {
  try {
    const withProto =
      input.startsWith('http://') || input.startsWith('https://') ? input : `https://${input}`;
    const u = new URL(withProto);
    return u.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return input
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split(/[/?#]/)[0];
  }
}

function isSameOrSubdomain(host: string, target: string): boolean {
  return host === target || host.endsWith(`.${target}`);
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

  // Use the JSON endpoint to avoid occasional HTML responses.
  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.append('q', params.keyword);
  url.searchParams.append('hl', params.hl);
  url.searchParams.append('gl', params.gl);
  url.searchParams.append('num', String(params.num || 100));
  if (typeof params.start === 'number') {
    url.searchParams.append('start', String(params.start));
  }
  // Use Google Light by default, allow override for fallback strategy.
  url.searchParams.append('engine', params.engine || 'google_light');
  // Include omitted/very similar results when Google provides them.
  url.searchParams.append('filter', '0');
  url.searchParams.append('api_key', apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    signal: controller.signal,
  });
  clearTimeout(timeout);

  const rawText = await response.text();
  if (!response.ok) {
    const snippet = rawText?.slice(0, 220)?.trim();
    throw new Error(`SerpAPI error: ${response.status} ${response.statusText}${snippet ? ` — ${snippet}` : ''}`);
  }

  let data: SerpApiResponse;
  try {
    data = JSON.parse(rawText) as SerpApiResponse;
  } catch {
    const snippet = rawText?.slice(0, 220)?.trim();
    throw new Error(`SerpAPI error: invalid JSON response${snippet ? ` — ${snippet}` : ''}`);
  }

  // SerpAPI can return HTTP 200 with an error payload
  const anyError =
    (typeof data.error === 'string' && data.error) ||
    (typeof data.search_metadata?.error === 'string' && data.search_metadata?.error) ||
    '';
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
  const targetHost = normalizeHostname(targetUrl);
  
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

  // Iterate through organic results from top to bottom.
  // We return the first valid match to preserve ranking order.
  for (const result of organicResults) {
    const normalizedResult = normalizeUrl(result.link);
    const resultDomain = extractDomain(result.link);
    const resultHost = normalizeHostname(result.link);
    
    // If target is just a domain, only do domain matching
    if (isDomainOnly) {
      console.log(`  [Pos ${result.position}] Checking:`, result.link);
      console.log(`    Result Host: "${resultHost}" vs Target Host: "${targetHost}"`);
      
      if (resultHost && targetHost && isSameOrSubdomain(resultHost, targetHost)) {
        console.log('  ✅ Domain match at position', result.position);
        console.log('    Result URL:', result.link);
        console.log('    Result Domain:', resultDomain);
        return {
          position: result.position,
          matchedUrl: result.link,
          matchType: 'domain',
        };
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
      if (
        (resultHost && targetHost && isSameOrSubdomain(resultHost, targetHost)) ||
        (resultDomain && resultDomain === targetDomain)
      ) {
        console.log('  🔗 Domain match at position', result.position);
        console.log('    Result URL:', result.link);
        console.log('    Result Domain:', resultDomain);
        return {
          position: result.position,
          matchedUrl: result.link,
          matchType: 'domain',
        };
      }
    }
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
  // Single call top 100 detection via SerpAPI.
  const MAX_RESULTS = 100;
  let lastSerpLink: string | undefined;
  const pagesQueried = 1;
  const startedAt = Date.now();
  const toAbsolutePosition = (rawPos: number, idx: number) => {
    if (Number.isFinite(rawPos) && rawPos > 0) {
      if (rawPos >= 1 && rawPos <= MAX_RESULTS) return rawPos;
    }
    return idx + 1;
  };
  const serpResponse = await callSerpApi(
    { keyword, hl, gl, num: MAX_RESULTS, start: 0, engine: 'google' },
    options
  );
  lastSerpLink = serpResponse.search_metadata?.id
    ? `https://serpapi.com/searches/${serpResponse.search_metadata.id}`
    : undefined;

  const pageResults = (serpResponse.organic_results || []).slice(0, MAX_RESULTS).map((result, idx) => {
    const relativePos = Number(result.position);
    return {
      ...result,
      position: toAbsolutePosition(relativePos, idx),
    };
  });
  const match = matchUrlInResults(url, pageResults);
  if (match.position != null) {
    return { ...match, serpLink: lastSerpLink, pagesQueried, elapsedMs: Date.now() - startedAt };
  }

  return {
    position: null,
    matchedUrl: null,
    matchType: 'none',
    serpLink: lastSerpLink,
    pagesQueried,
    elapsedMs: Date.now() - startedAt,
  };
}

