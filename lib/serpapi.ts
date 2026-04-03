import {
  extractDomain,
  extractUrlFromDisplayedLink,
  resolveSerpResultDestination,
  sameRegistrableBrand,
} from './url-utils';
import { callSerperGoogleSearch } from './serper';
import type { SerperOrganicItem } from './serper';

export interface OrganicResult {
  position: number;
  link: string;
  redirect_link?: string;
  title?: string;
  snippet?: string;
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

/** Serper `page` is 1-based (Google SERP page). `num` is typically 10 per page. */
function mapSerperOrganic(
  items: SerperOrganicItem[],
  page: number
): OrganicResult[] {
  const base = (page - 1) * 10;
  return items.map((item, idx) => ({
    position: item.position ?? base + idx + 1,
    link: item.link || '',
    title: item.title,
    snippet: item.snippet,
  }));
}

const SERPER_MAX_PAGES = 10;
const SERPER_PAGE_SIZE = 10;

/**
 * Serper often returns at most 10 organic rows per request regardless of `num`.
 * We always walk Google pages 1…10 (num=10 each) so matching covers ranks 1–100, not only the first page.
 */
async function fetchSerperOrganicUpTo100(
  keyword: string,
  hl: string,
  gl: string,
  options?: SerpApiOptions
): Promise<{ organic: OrganicResult[]; pagesQueried: number }> {
  let pagesQueried = 0;
  const organic: OrganicResult[] = [];

  for (let page = 1; page <= SERPER_MAX_PAGES; page++) {
    const r = await callSerperGoogleSearch(
      { q: keyword, hl, gl, num: SERPER_PAGE_SIZE, page },
      options
    );
    pagesQueried += 1;
    const batch = mapSerperOrganic(r.organic || [], page);
    if (batch.length === 0) break;
    organic.push(...batch);
    if (organic.length >= SERPER_MAX_PAGES * SERPER_PAGE_SIZE) break;
    if (batch.length < SERPER_PAGE_SIZE) break;
  }

  return { organic: organic.slice(0, 100), pagesQueried };
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
    const resolved = extractOrganicLinkFromSerp(result as SerpOrganicRow);
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
 * Serper-backed: up to 10 HTTP calls (Google pages 1–10, 10 results each) to cover the top 100.
 * Matching uses extractDomain + sameRegistrableBrand.
 */
export async function trackKeyword(
  keyword: string,
  url: string,
  hl: string,
  gl: string,
  options?: SerpApiOptions
): Promise<TrackKeywordResult> {
  const startedAt = Date.now();
  const diagnostic = options?.diagnostic
    ? { target_root_domain: extractDomain(url), pages: [] as SerpTrackDiagnosticPage[] }
    : null;

  const { organic, pagesQueried } = await fetchSerperOrganicUpTo100(
    keyword,
    hl,
    gl,
    options
  );

  if (diagnostic) {
    const pageItems: SerpTrackDiagnosticItem[] = [];
    for (let i = 0; i < organic.length; i++) {
      const r = organic[i] as SerpOrganicRow;
      const rank = r.position ?? i + 1;
      const resolved = extractOrganicLinkFromSerp(r);
      const resultRoot = resolved ? extractDomain(resolved) : '';
      pageItems.push({
        rank,
        resolved_url: resolved || null,
        result_root_domain: resultRoot || null,
      });
    }
    diagnostic.pages.push({
      start_param: 0,
      organic_count: organic.length,
      items: pageItems,
    });
  }

  const match = matchUrlInResults(url, organic);

  return {
    ...match,
    serpLink: undefined,
    pagesQueried,
    elapsedMs: Date.now() - startedAt,
    diagnostic: diagnostic ?? undefined,
  };
}
