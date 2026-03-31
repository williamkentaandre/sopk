import {
  extractDomain,
  extractUrlFromDisplayedLink,
  resolveSerpResultDestination,
  sameRegistrableBrand,
} from './url-utils';

export interface SerpApiParams {
  keyword: string;
  hl: string;
  gl: string;
  num?: number;
  start?: number;
  engine?: 'google_light' | 'google';
  device?: 'desktop' | 'mobile' | 'tablet';
  googleDomain?: string;
}

export interface OrganicResult {
  position: number;
  link: string;
  redirect_link?: string;
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
  matchType: 'domain' | 'none';
  serpLink?: string;
  pagesQueried?: number;
  elapsedMs?: number;
}

/** When POST /track includes `"diagnostic": true`, response includes this trace (not stored in DB). */
export interface SerpTrackDiagnosticItem {
  rank: number;
  resolved_url: string | null;
  result_root_domain: string | null;
}

export interface SerpTrackDiagnosticPage {
  start_param: number;
  organic_count: number;
  items: SerpTrackDiagnosticItem[];
}

export interface SerpTrackDiagnostic {
  target_root_domain: string;
  pages: SerpTrackDiagnosticPage[];
}

export interface SerpApiOptions {
  apiKey?: string | null;
  /** If true, collect ordered organic rows per page for API response (debug). */
  diagnostic?: boolean;
  /** SerpAPI: bypass 1h cache (useful when cached response has empty organic_results). */
  noCache?: boolean;
}

export function googleDomainForGl(gl: string): string {
  const g = (gl || 'us').toLowerCase().trim();
  const map: Record<string, string> = {
    fr: 'google.fr',
    de: 'google.de',
    es: 'google.es',
    it: 'google.it',
    nl: 'google.nl',
    be: 'google.be',
    at: 'google.at',
    ch: 'google.ch',
    pt: 'google.pt',
    pl: 'google.pl',
    se: 'google.se',
    no: 'google.no',
    dk: 'google.dk',
    fi: 'google.fi',
    ie: 'google.ie',
    uk: 'google.co.uk',
    gb: 'google.co.uk',
    ca: 'google.ca',
    us: 'google.com',
    mx: 'google.com.mx',
    br: 'google.com.br',
    ar: 'google.com.ar',
    in: 'google.co.in',
    jp: 'google.co.jp',
    kr: 'google.co.kr',
    au: 'google.com.au',
    nz: 'google.co.nz',
    tw: 'google.com.tw',
    hk: 'google.com.hk',
    sg: 'google.com.sg',
    ru: 'google.ru',
    cz: 'google.cz',
    hu: 'google.hu',
    ro: 'google.ro',
    gr: 'google.gr',
    tr: 'google.com.tr',
    ua: 'google.com.ua',
    za: 'google.co.za',
    ae: 'google.ae',
    sa: 'google.com.sa',
    il: 'google.co.il',
    id: 'google.co.id',
    th: 'google.co.th',
    vn: 'google.com.vn',
    ph: 'google.com.ph',
    my: 'google.com.my',
  };
  return map[g] || 'google.com';
}

type SerpOrganicRow = OrganicResult & {
  url?: string;
  displayed_link?: string;
  about_this_result?: { source?: { source_info_link?: string } };
};

function extractOrganicLinkFromSerp(result: SerpOrganicRow): string {
  const row = result as SerpOrganicRow;
  const candidates = [
    row.link,
    row.redirect_link,
    row.url,
    row.about_this_result?.source?.source_info_link,
  ];
  for (const raw of candidates) {
    const resolved = resolveSerpResultDestination(String(raw || '').trim());
    if (resolved) return resolved;
  }
  const fromDisplay = extractUrlFromDisplayedLink(
    String(row.displayed_link || '')
  );
  if (fromDisplay) {
    const resolved = resolveSerpResultDestination(fromDisplay);
    if (resolved) return resolved;
  }
  return '';
}

export async function callSerpApi(
  params: SerpApiParams,
  options?: SerpApiOptions
): Promise<SerpApiResponse> {
  const apiKey = options?.apiKey ?? process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    throw new Error('Clé SERP API manquante. Configurez-la dans Paramètres.');
  }

  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.append('q', params.keyword);
  url.searchParams.append('hl', params.hl);
  url.searchParams.append('gl', params.gl);
  url.searchParams.append('num', String(params.num || 100));
  if (typeof params.start === 'number') {
    url.searchParams.append('start', String(params.start));
  }
  if (params.device) {
    url.searchParams.append('device', params.device);
  }
  if (params.googleDomain) {
    url.searchParams.append('google_domain', params.googleDomain);
  }
  url.searchParams.append('engine', params.engine || 'google_light');
  url.searchParams.append('filter', '0');
  if (options?.noCache) {
    url.searchParams.append('no_cache', 'true');
  }
  url.searchParams.append('api_key', apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
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
 * Domain-only match: same registrable-style root as extractDomain() (subdomains of same site match).
 * organicResults must be in real SERP order; each item's `position` field is the rank to return on match.
 */
export function matchUrlInResults(targetUrl: string, organicResults: OrganicResult[]): MatchResult {
  const targetRoot = extractDomain(targetUrl);
  if (!targetRoot) {
    return { position: null, matchedUrl: null, matchType: 'none' };
  }

  for (const result of organicResults) {
    const resolved = extractOrganicLinkFromSerp(result as OrganicResult & { url?: string });
    if (!resolved) continue;
    const resultRoot = extractDomain(resolved);
    if (resultRoot && sameRegistrableBrand(targetRoot, resultRoot)) {
      return {
        position: result.position,
        matchedUrl: resolved,
        matchType: 'domain',
      };
    }
  }

  return { position: null, matchedUrl: null, matchType: 'none' };
}

export type TrackKeywordResult = MatchResult & {
  serpLink?: string;
  pagesQueried: number;
  elapsedMs: number;
  diagnostic?: SerpTrackDiagnostic;
};

/**
 * Deterministic: sequential SerpAPI pages start=0,10,…90 with num=10 (no parallel calls, no num=100 shortcut).
 * Rank for row i on page start is always start + i + 1 (Google order = API organic_results order).
 * Matching is domain root only (extractDomain).
 */
export async function trackKeyword(
  keyword: string,
  url: string,
  hl: string,
  gl: string,
  options?: SerpApiOptions
): Promise<TrackKeywordResult> {
  const MAX_RESULTS = 100;
  const PAGE_SIZE = 10;
  const googleDomain = googleDomainForGl(gl);
  const baseParams = {
    keyword,
    hl,
    gl,
    engine: 'google' as const,
    device: 'desktop' as const,
    googleDomain,
  };

  let lastSerpLink: string | undefined;
  const startedAt = Date.now();
  let pagesQueried = 0;
  const diagnostic = options?.diagnostic
    ? { target_root_domain: extractDomain(url), pages: [] as SerpTrackDiagnosticPage[] }
    : null;

  const targetRoot = extractDomain(url);

  for (let start = 0; start < MAX_RESULTS; start += PAGE_SIZE) {
    let serpResponse = await callSerpApi(
      { ...baseParams, num: PAGE_SIZE, start },
      options
    );
    if (
      start === 0 &&
      (!serpResponse.organic_results || serpResponse.organic_results.length === 0)
    ) {
      serpResponse = await callSerpApi(
        { ...baseParams, num: PAGE_SIZE, start },
        { ...options, noCache: true }
      );
      pagesQueried += 1;
    }
    pagesQueried += 1;
    lastSerpLink = serpResponse.search_metadata?.id
      ? `https://serpapi.com/searches/${serpResponse.search_metadata.id}`
      : lastSerpLink;

    const organic = serpResponse.organic_results || [];
    if (organic.length === 0) {
      break;
    }

    const pageItems: SerpTrackDiagnosticItem[] = [];
    if (diagnostic) {
      for (let i = 0; i < organic.length; i++) {
        const rank = start + i + 1;
        const r = organic[i] as SerpOrganicRow;
        const resolved = extractOrganicLinkFromSerp(r);
        const resultRoot = resolved ? extractDomain(resolved) : '';
        pageItems.push({
          rank,
          resolved_url: resolved || null,
          result_root_domain: resultRoot || null,
        });
      }
      diagnostic.pages.push({
        start_param: start,
        organic_count: organic.length,
        items: pageItems,
      });
    }

    for (let i = 0; i < organic.length; i++) {
      const rank = start + i + 1;
      const r = organic[i] as SerpOrganicRow;
      const resolved = extractOrganicLinkFromSerp(r);
      const resultRoot = resolved ? extractDomain(resolved) : '';
      if (targetRoot && resultRoot && sameRegistrableBrand(targetRoot, resultRoot)) {
        return {
          position: rank,
          matchedUrl: resolved,
          matchType: 'domain',
          serpLink: lastSerpLink,
          pagesQueried,
          elapsedMs: Date.now() - startedAt,
          diagnostic: diagnostic ?? undefined,
        };
      }
    }
  }

  return {
    position: null,
    matchedUrl: null,
    matchType: 'none',
    serpLink: lastSerpLink,
    pagesQueried,
    elapsedMs: Date.now() - startedAt,
    diagnostic: diagnostic ?? undefined,
  };
}
