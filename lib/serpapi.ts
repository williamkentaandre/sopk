import { normalizeUrl, extractDomain, unwrapSerpResultLink } from './url-utils';

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

  // Iterate through organic results from top to bottom.
  // We return the first valid match to preserve ranking order.
  for (const result of organicResults) {
    const rawLink = (result.link || '').trim();
    if (!rawLink) continue;
    const resolvedLink = unwrapSerpResultLink(rawLink);
    const normalizedResult = normalizeUrl(resolvedLink);
    const resultDomain = extractDomain(resolvedLink);
    const resultHost = normalizeHostname(resolvedLink);
    
    // If target is just a domain, only do domain matching
    if (isDomainOnly) {
      if (resultHost && targetHost && isSameOrSubdomain(resultHost, targetHost)) {
        return {
          position: result.position,
          matchedUrl: resolvedLink,
          matchType: 'domain',
        };
      }
    } else {
      // For full URLs, try exact match first
      if (normalizedResult === normalizedTarget) {
        return {
          position: result.position,
          matchedUrl: resolvedLink,
          matchType: 'exact',
        };
      }

      // Then fall back to domain match
      if (
        (resultHost && targetHost && isSameOrSubdomain(resultHost, targetHost)) ||
        (resultDomain && resultDomain === targetDomain)
      ) {
        return {
          position: result.position,
          matchedUrl: resolvedLink,
          matchType: 'domain',
        };
      }
    }
  }

  // No match found
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
  // Paginate top 100 (10 results per page). Sequential fetch keeps page 2+ reliable vs burst parallel calls.
  const MAX_RESULTS = 100;
  const PAGE_SIZE = 10;
  let lastSerpLink: string | undefined;
  const startedAt = Date.now();
  const toAbsolutePosition = (rawPos: number, start: number, idx: number) => {
    if (Number.isFinite(rawPos) && rawPos > 0) {
      // Case A: page-relative rank (1..PAGE_SIZE)
      if (rawPos >= 1 && rawPos <= PAGE_SIZE) return start + rawPos;
      // Case B: already absolute in page window
      if (rawPos >= start + 1 && rawPos <= start + PAGE_SIZE) return rawPos;
      // Case C: absolute rank in top 100
      if (rawPos >= 1 && rawPos <= MAX_RESULTS) return rawPos;
    }
    return start + idx + 1;
  };

  // Strict order: page 1 (start=0), then page 2 (start=10), … up to top 100. One await at a time.
  // No duplicate-page shortcut — it caused false stops when SerpAPI reused similar blocks across offsets.
  let pagesQueried = 0;
  for (let start = 0; start < MAX_RESULTS; start += PAGE_SIZE) {
    const serpResponse = await callSerpApi(
      { keyword, hl, gl, num: PAGE_SIZE, start, engine: 'google' },
      options
    );
    pagesQueried += 1;
    lastSerpLink = serpResponse.search_metadata?.id
      ? `https://serpapi.com/searches/${serpResponse.search_metadata.id}`
      : lastSerpLink;

    const organic = serpResponse.organic_results || [];
    if (organic.length === 0) break;

    const pageResults = organic
      .map((result, idx) => {
        const r = result as OrganicResult & { url?: string };
        const link = String(r.link || r.url || '').trim();
        const relativePos = Number(result.position);
        return {
          ...result,
          link,
          position: toAbsolutePosition(relativePos, start, idx),
        };
      })
      .filter((r) => r.link.length > 0)
      .sort((a, b) => a.position - b.position);
    const match = matchUrlInResults(url, pageResults);
    // JSON.stringify turns NaN into null — reject non-finite positions so we don't "find" then return null.
    if (match.position != null && Number.isFinite(match.position) && match.position >= 1) {
      return { ...match, serpLink: lastSerpLink, pagesQueried, elapsedMs: Date.now() - startedAt };
    }
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

