import { normalizeUrl, unwrapSerpResultLink } from './url-utils';

export interface SerpApiParams {
  keyword: string;
  hl: string;
  gl: string;
  num?: number;
  start?: number;
  engine?: 'google_light' | 'google';
  /** Prefer desktop SERP; mobile rankings often differ from what users expect */
  device?: 'desktop' | 'mobile' | 'tablet';
  /**
   * SerpAPI defaults to google.com; that SERP differs from google.fr / google.de even with gl set.
   * Must align with where users manually search (e.g. France → google.fr).
   */
  googleDomain?: string;
}

export interface OrganicResult {
  position: number;
  link: string;
  /** Present when link is missing or is a Google redirect; see SerpAPI organic-results docs */
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
  matchType: 'exact' | 'domain' | 'path' | 'none';
  serpLink?: string;
  pagesQueried?: number;
  elapsedMs?: number;
}

export interface SerpApiOptions {
  apiKey?: string | null;
}

/** Maps ISO 3166-1 alpha-2 `gl` to Google host (SerpAPI `google_domain`). Default google.com. */
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

/** Path + query suffix after hostname in normalizeUrl() output (e.g. example.com/foo → /foo). */
function pathAndQueryAfterHost(normalizedNoProto: string): string {
  const i = normalizedNoProto.indexOf('/');
  if (i === -1) return '';
  return normalizedNoProto.slice(i);
}

function isRootOnlyPathSuffix(pathAndQuery: string): boolean {
  if (!pathAndQuery) return true;
  const pathOnly = pathAndQuery.split('?')[0];
  return pathOnly === '' || pathOnly === '/';
}

function stripTrailingSlashPath(p: string): string {
  if (p.length > 1 && p.endsWith('/')) return p.slice(0, -1);
  return p;
}

/**
 * SerpAPI usually sets `link` to the destination URL, but sometimes only `redirect_link`
 * (google.com/url?...) is present. Missing either caused empty `link` and guaranteed "not found".
 */
function extractOrganicLinkFromSerp(
  result: OrganicResult & { url?: string }
): string {
  const direct = String(result.link || '').trim();
  if (direct) return unwrapSerpResultLink(direct);
  const redirect = String(result.redirect_link || '').trim();
  if (redirect) return unwrapSerpResultLink(redirect);
  return unwrapSerpResultLink(String(result.url || '').trim());
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
  if (params.device) {
    url.searchParams.append('device', params.device);
  }
  if (params.googleDomain) {
    url.searchParams.append('google_domain', params.googleDomain);
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
  const targetHost = normalizeHostname(targetUrl);
  
  // Check if input is just a domain (no protocol = domain tracking)
  // This handles: "example.com", "www.example.com", "example.com/"
  const trimmedUrl = targetUrl.trim().replace(/\/$/, ''); // Remove trailing slash
  const isDomainOnly = !trimmedUrl.startsWith('http://') && 
                       !trimmedUrl.startsWith('https://');

  // Iterate through organic results from top to bottom.
  // We return the first valid match to preserve ranking order.
  for (const result of organicResults) {
    const resolvedLink = extractOrganicLinkFromSerp(result as OrganicResult & { url?: string });
    if (!resolvedLink) continue;
    const normalizedResult = normalizeUrl(resolvedLink);
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
      // Full URL (https://...): never use "first random page on same domain" — that reported
      // homepage rank when the user tracked /pricing, etc. (felt like hallucinations).
      if (normalizedResult === normalizedTarget) {
        return {
          position: result.position,
          matchedUrl: resolvedLink,
          matchType: 'exact',
        };
      }

      const sameHost =
        resultHost &&
        targetHost &&
        (resultHost === targetHost || isSameOrSubdomain(resultHost, targetHost));
      if (!sameHost) {
        continue;
      }

      const targetTail = pathAndQueryAfterHost(normalizedTarget);
      const resultTail = pathAndQueryAfterHost(normalizedResult);

      // https://site.com or https://site.com/ — intent = "this site"; any URL on host is OK.
      if (isRootOnlyPathSuffix(targetTail)) {
        return {
          position: result.position,
          matchedUrl: resolvedLink,
          matchType: 'domain',
        };
      }

      const targetPath = stripTrailingSlashPath(targetTail.split('?')[0]);
      const resultPath = stripTrailingSlashPath(resultTail.split('?')[0]);

      if (resultPath === targetPath) {
        return {
          position: result.position,
          matchedUrl: resolvedLink,
          matchType: 'exact',
        };
      }

      // SERP shows a deeper URL under the tracked path (e.g. tracked /blog, result /blog/post-1).
      if (targetPath !== '/' && resultPath.startsWith(`${targetPath}/`)) {
        return {
          position: result.position,
          matchedUrl: resolvedLink,
          matchType: 'path',
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

  const toAbsolutePosition = (rawPos: number, start: number, idx: number) => {
    if (Number.isFinite(rawPos) && rawPos > 0) {
      if (rawPos >= 1 && rawPos <= PAGE_SIZE) return start + rawPos;
      if (rawPos >= start + 1 && rawPos <= start + PAGE_SIZE) return rawPos;
      if (rawPos >= 1 && rawPos <= MAX_RESULTS) return rawPos;
    }
    return start + idx + 1;
  };

  const buildPageResults = (organic: OrganicResult[], start: number) =>
    organic
      .map((result, idx) => {
        const r = result as OrganicResult & { url?: string };
        const link = extractOrganicLinkFromSerp(r);
        const relativePos = Number(result.position);
        return {
          ...result,
          link,
          position: toAbsolutePosition(relativePos, start, idx),
        };
      })
      .filter((r) => r.link.length > 0)
      .sort((a, b) => a.position - b.position);

  const tryMatchOrganic = (organic: OrganicResult[], start: number) => {
    const pageResults = buildPageResults(organic, start);
    return matchUrlInResults(url, pageResults);
  };

  const finish = (match: MatchResult): MatchResult & { serpLink?: string; pagesQueried: number; elapsedMs: number } => ({
    ...match,
    serpLink: lastSerpLink,
    pagesQueried,
    elapsedMs: Date.now() - startedAt,
  });

  const isValidMatch = (m: MatchResult) =>
    m.position != null && Number.isFinite(m.position) && m.position >= 1;

  // 1) One request with num=100 on the correct national Google (e.g. google.fr + gl=fr), not default google.com.
  const snapshot = await callSerpApi({ ...baseParams, num: MAX_RESULTS, start: 0 }, options);
  pagesQueried += 1;
  lastSerpLink = snapshot.search_metadata?.id
    ? `https://serpapi.com/searches/${snapshot.search_metadata.id}`
    : lastSerpLink;

  let organic = snapshot.organic_results || [];
  let match = tryMatchOrganic(organic, 0);
  if (isValidMatch(match)) {
    return finish(match);
  }

  // 2) SerpAPI sometimes returns only the first 10 rows even with num=100 — page through 10–90.
  if (organic.length > 0 && organic.length <= PAGE_SIZE) {
    for (let start = PAGE_SIZE; start < MAX_RESULTS; start += PAGE_SIZE) {
      const serpResponse = await callSerpApi({ ...baseParams, num: PAGE_SIZE, start }, options);
      pagesQueried += 1;
      lastSerpLink = serpResponse.search_metadata?.id
        ? `https://serpapi.com/searches/${serpResponse.search_metadata.id}`
        : lastSerpLink;

      const pageOrganic = serpResponse.organic_results || [];
      if (pageOrganic.length === 0) continue;

      match = tryMatchOrganic(pageOrganic, start);
      if (isValidMatch(match)) {
        return finish(match);
      }
    }
    return finish({ position: null, matchedUrl: null, matchType: 'none' });
  }

  // 3) 11–99 organic rows in one snapshot: treat as full SERP for this query (no more pages).
  if (organic.length > PAGE_SIZE && organic.length < MAX_RESULTS) {
    return finish({ position: null, matchedUrl: null, matchType: 'none' });
  }

  // 4) 100 rows, no match — not in top 100.
  if (organic.length >= MAX_RESULTS) {
    return finish({ position: null, matchedUrl: null, matchType: 'none' });
  }

  // 5) Empty first snapshot — fall back to paged search (rare).
  for (let start = 0; start < MAX_RESULTS; start += PAGE_SIZE) {
    const serpResponse = await callSerpApi({ ...baseParams, num: PAGE_SIZE, start }, options);
    pagesQueried += 1;
    lastSerpLink = serpResponse.search_metadata?.id
      ? `https://serpapi.com/searches/${serpResponse.search_metadata.id}`
      : lastSerpLink;

    const pageOrganic = serpResponse.organic_results || [];
    if (pageOrganic.length === 0) {
      if (start === 0) break;
      continue;
    }

    match = tryMatchOrganic(pageOrganic, start);
    if (isValidMatch(match)) {
      return finish(match);
    }
  }

  return finish({ position: null, matchedUrl: null, matchType: 'none' });
}

