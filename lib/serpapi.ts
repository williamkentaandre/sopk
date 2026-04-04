import {
  extractDomain,
  extractUrlFromDisplayedLink,
  resolveSerpResultDestination,
  isDomain,
  urlsPathCompatibleForTracking,
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

/**
 * Assign ranks in strict SERP order: 1, 2, 3… from the first organic row onward.
 * Page 2 does not always start at 11 (page 1 can have fewer than 10 organics); `startRank` is
 * `organic.length + 1` before appending this batch.
 */
function mapSerperOrganicSequential(
  items: SerperOrganicItem[],
  startRank: number
): OrganicResult[] {
  return items.map((item, idx) => ({
    position: startRank + idx,
    link: item.link || '',
    title: item.title,
    snippet: item.snippet,
  }));
}

const SERPER_MAX_PAGES = 10;
const SERPER_PAGE_SIZE = 10;
/** When Serper honors this in one response, ranks 1…n come from a single SERP snapshot (no cross-request drift). */
const SERPER_SINGLE_SHOT_NUM = 100;
const SERPER_PAGE_DELAY_MS = 220;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Ranks 1–10 always come from `num=10, page=1` (Serper’s real first page). A `num=100` response
 * can disagree with that window and made page‑1 URLs “disappear” from the merged list.
 * When page 1 is full (10 organics) and `num=100` returns more than 10, we append only
 * `organic[10..]` as ranks 11+. Otherwise we paginate `page` 2…10 × num=10.
 */
async function fetchSerperOrganicUpTo100(
  keyword: string,
  hl: string,
  gl: string,
  options?: SerpApiOptions
): Promise<{
  organic: OrganicResult[];
  pagesQueried: number;
  serperCreditsRemaining: number | null;
}> {
  let serperCreditsRemaining: number | null = null;
  let pagesQueried = 0;

  const rPage1 = await callSerperGoogleSearch(
    { q: keyword, hl, gl, num: SERPER_PAGE_SIZE, page: 1 },
    options
  );
  pagesQueried += 1;
  if (rPage1.creditsRemaining != null) {
    serperCreditsRemaining = rPage1.creditsRemaining;
  }

  const topBatch = mapSerperOrganicSequential(rPage1.organic || [], 1);
  if (topBatch.length === 0) {
    return { organic: [], pagesQueried, serperCreditsRemaining };
  }

  const organic: OrganicResult[] = [...topBatch];

  try {
    const rWide = await callSerperGoogleSearch(
      { q: keyword, hl, gl, num: SERPER_SINGLE_SHOT_NUM, page: 1 },
      options
    );
    pagesQueried += 1;
    if (rWide.creditsRemaining != null) {
      serperCreditsRemaining = rWide.creditsRemaining;
    }
    const wideOrganic = rWide.organic || [];
    if (
      topBatch.length === SERPER_PAGE_SIZE &&
      wideOrganic.length > SERPER_PAGE_SIZE
    ) {
      const tail = mapSerperOrganicSequential(
        wideOrganic.slice(SERPER_PAGE_SIZE),
        SERPER_PAGE_SIZE + 1
      );
      organic.push(...tail);
      return {
        organic: organic.slice(0, 100),
        pagesQueried,
        serperCreditsRemaining,
      };
    }
  } catch {
    /* optional wide fetch */
  }

  for (let page = 2; page <= SERPER_MAX_PAGES; page++) {
    await sleep(SERPER_PAGE_DELAY_MS);
    const r = await callSerperGoogleSearch(
      { q: keyword, hl, gl, num: SERPER_PAGE_SIZE, page },
      options
    );
    pagesQueried += 1;
    if (r?.creditsRemaining != null) {
      serperCreditsRemaining = r.creditsRemaining;
    }
    const startRank = organic.length + 1;
    const batch = mapSerperOrganicSequential(r.organic || [], startRank);
    if (batch.length === 0) break;
    if (
      batch[0]?.link &&
      organic[0]?.link &&
      batch[0].link === organic[0].link
    ) {
      break;
    }
    organic.push(...batch);
    if (organic.length >= SERPER_MAX_PAGES * SERPER_PAGE_SIZE) break;
  }

  return {
    organic: organic.slice(0, 100),
    pagesQueried,
    serperCreditsRemaining,
  };
}

/**
 * Domain match on extractDomain() roots (TLD-safe for co.uk, com.au, etc.).
 * For full URLs (not domain-only input), prefer the first organic row whose path matches
 * the target URL, so another page on the same host does not steal the rank.
 */
export function matchUrlInResults(targetUrl: string, organicResults: OrganicResult[]): MatchResult {
  const targetRoot = extractDomain(targetUrl);
  if (!targetRoot) {
    return { position: null, matchedUrl: null, matchType: 'none' };
  }

  const targetIsDomainOnly = isDomain(targetUrl.trim());

  /** Rank is always index in the merged organic list (1…n), never Serper's per-page `position` echo. */
  const rankAt = (i: number) => i + 1;

  if (!targetIsDomainOnly) {
    for (let i = 0; i < organicResults.length; i++) {
      const result = organicResults[i]!;
      const resolved = extractOrganicLinkFromSerp(result as SerpOrganicRow);
      if (!resolved) continue;
      if (extractDomain(resolved) !== targetRoot) continue;
      if (urlsPathCompatibleForTracking(targetUrl, resolved)) {
        return {
          position: rankAt(i),
          matchedUrl: resolved,
          matchType: 'domain',
        };
      }
    }
  }

  for (let i = 0; i < organicResults.length; i++) {
    const result = organicResults[i]!;
    const resolved = extractOrganicLinkFromSerp(result as SerpOrganicRow);
    if (!resolved) continue;
    const resultRoot = extractDomain(resolved);
    if (resultRoot && targetRoot === resultRoot) {
      return {
        position: rankAt(i),
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
  /** When Serper returns credits in search JSON/headers (last page response wins). */
  serperCreditsRemaining?: number | null;
};

/**
 * Serper-backed: top 10 from `num=10` page 1; ranks 11+ from `num=100` tail or paginated pages.
 * Matching: extractDomain (strict TLD).
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

  const { organic, pagesQueried, serperCreditsRemaining } =
    await fetchSerperOrganicUpTo100(keyword, hl, gl, options);

  if (diagnostic) {
    const pageItems: SerpTrackDiagnosticItem[] = [];
    for (let i = 0; i < organic.length; i++) {
      const r = organic[i] as SerpOrganicRow;
      const rank = i + 1;
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
    serperCreditsRemaining,
  };
}
