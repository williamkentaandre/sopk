/**
 * Normalizes URL for comparison:
 * - Convert to lowercase
 * - Remove protocol (http/https)
 * - Remove www.
 * - Remove trailing slash
 * - Remove tracking params (utm_*)
 * - Remove anchor/hash
 */
const isAbsoluteHttpUrl = (s: string) => /^https?:\/\//i.test(s);

function decodeQueryValue(v: string): string {
  try {
    return decodeURIComponent(v.replace(/\+/g, ' '));
  } catch {
    return v;
  }
}

/** Inner destination should not be another Google SERP (avoid bad unwrapping). */
function isSkippableGoogleInnerDest(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    const h = u.hostname.toLowerCase();
    if (!h.includes('google.')) return false;
    const p = (u.pathname || '').toLowerCase();
    return p.includes('/search') || p === '/' || p === '';
  } catch {
    return false;
  }
}

/**
 * One layer: Google often wraps organic targets as `.../url?url=https%3A%2F%2F...` (param `url`)
 * or `?q=https://...`. Regional hosts (`google.fr`, etc.) use the same pattern.
 */
function unwrapGoogleUrlLayer(trimmed: string): string {
  if (!trimmed) return trimmed;
  try {
    const u = new URL(trimmed.startsWith('//') ? 'https:' + trimmed : trimmed);
    const host = u.hostname.toLowerCase();
    if (!host.includes('google.')) return trimmed;

    const path = (u.pathname || '/').replace(/\/+$/, '') || '/';
    const onUrlPath = path === '/url' || path.endsWith('/url');

    const paramKeysPriority = ['q', 'url', 'adurl', 'u', 'rurl', 'dest', 'target'];

    const tryValue = (raw: string | null): string | null => {
      if (!raw) return null;
      const d = decodeQueryValue(raw);
      if (!isAbsoluteHttpUrl(d)) return null;
      if (isSkippableGoogleInnerDest(d)) return null;
      return d;
    };

    if (onUrlPath) {
      for (const key of paramKeysPriority) {
        const inner = tryValue(u.searchParams.get(key));
        if (inner) return inner;
      }
    }

    for (const key of paramKeysPriority) {
      const inner = tryValue(u.searchParams.get(key));
      if (inner) return inner;
    }

    for (const v of u.searchParams.values()) {
      if (!v || v.length < 14) continue;
      const inner = tryValue(v);
      if (inner) return inner;
    }
  } catch {
    // ignore
  }
  return trimmed;
}

/**
 * Resolves Google's redirect wrapper(s). Chains unwrapping — some SERPs nest redirects.
 */
export function unwrapSerpResultLink(link: string): string {
  let s = (link || '').trim();
  if (!s) return s;
  for (let i = 0; i < 12; i++) {
    const next = unwrapGoogleUrlLayer(s);
    if (next === s) break;
    s = next;
  }
  return s;
}

/**
 * Google/SERP APIs sometimes return protocol-relative organic links (`//www.nike.fr/...`).
 * URL() throws without a scheme — normalize before parsing.
 */
export function resolveSerpResultDestination(raw: string): string {
  let s = (raw || '').trim();
  if (!s) return '';
  if (s.startsWith('//')) s = 'https:' + s;
  for (let i = 0; i < 12; i++) {
    const before = s;
    s = unwrapSerpResultLink(s);
    s = unwrapAmpCacheLink(s);
    if (s === before) break;
  }
  return s;
}

/**
 * AMP cache URLs point at *.cdn.ampproject.org but embed the real site URL in the string.
 */
export function unwrapAmpCacheLink(link: string): string {
  const s = (link || '').trim();
  if (!s) return s;
  let u: URL;
  try {
    u = new URL(s.startsWith('//') ? 'https:' + s : s);
  } catch {
    return s;
  }
  const h = u.hostname.toLowerCase();
  if (!h.endsWith('.cdn.ampproject.org') && h !== 'cdn.ampproject.org') {
    return s;
  }
  let decoded = s;
  try {
    decoded = decodeURIComponent(s);
  } catch {
    /* keep s */
  }
  const re =
    /https?:\/\/(?:www\.)?[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(?:\/[^\s"'<>]*)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(decoded)) !== null) {
    const cand = m[0];
    try {
      const inner = new URL(cand);
      const ih = inner.hostname.toLowerCase();
      if (ih.includes('ampproject.org')) continue;
      if (ih === 'www.google.com' || ih.endsWith('.google.com')) continue;
      return cand;
    } catch {
      continue;
    }
  }
  return s;
}

/**
 * Some SERPs expose `displayed_link` like `https://www.nike.fr › Catégorie` or `nike.fr › ...`.
 */
export function extractUrlFromDisplayedLink(displayed: string): string | null {
  const d = (displayed || '').trim();
  if (!d) return null;
  const withScheme = d.match(/https?:\/\/[^\s›]+/i);
  if (withScheme) return withScheme[0].trim();
  const head = d.split('›')[0].trim().split(/\s+/)[0];
  if (
    /^(?:www\.)?[a-z0-9](?:[a-z0-9-]*\.)+[a-z]{2,}$/i.test(head)
  ) {
    return 'https://' + head.replace(/^www\./i, '');
  }
  return null;
}

export function normalizeUrl(url: string): string {
  try {
    // Clean up the URL first
    let cleanUrl = url.trim();
    
    // Remove trailing slash if no protocol (domain only)
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = cleanUrl.replace(/\/$/, '');
    }
    
    // Parse the URL
    let urlObj: URL;
    
    // Handle URLs without protocol
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      urlObj = new URL('https://' + cleanUrl);
    } else {
      urlObj = new URL(cleanUrl);
    }

    // Get hostname without www.
    let hostname = urlObj.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }

    // Get pathname without trailing slash
    let pathname = urlObj.pathname;
    if (pathname.endsWith('/') && pathname.length > 1) {
      pathname = pathname.slice(0, -1);
    }

    // Remove tracking parameters
    const searchParams = new URLSearchParams(urlObj.search);
    const filteredParams = new URLSearchParams();
    
    for (const [key, value] of searchParams.entries()) {
      if (!key.startsWith('utm_')) {
        filteredParams.append(key, value);
      }
    }

    const queryString = filteredParams.toString();
    const search = queryString ? '?' + queryString : '';

    // Reconstruct normalized URL (without protocol and hash)
    return hostname + pathname + search;
  } catch (error) {
    console.error('normalizeUrl error for URL:', url, error);
    // If parsing fails, just return lowercase version
    return url.toLowerCase();
  }
}

/**
 * Multi-label public suffixes: taking only the last two hostname labels would collapse
 * different sites to the same "root" (e.g. foo.co.uk and bar.co.uk → both "co.uk").
 */
const MULTI_LABEL_PUBLIC_SUFFIXES = new Set([
  'co.uk',
  'gov.uk',
  'ac.uk',
  'ltd.uk',
  'plc.uk',
  'net.uk',
  'org.uk',
  'sch.uk',
  'nhs.uk',
  'com.au',
  'net.au',
  'org.au',
  'edu.au',
  'gov.au',
  'asn.au',
  'co.jp',
  'ne.jp',
  'or.jp',
  'go.jp',
  'ac.jp',
  'ed.jp',
  'co.kr',
  'ne.kr',
  'or.kr',
  're.kr',
  'pe.kr',
  'co.nz',
  'net.nz',
  'org.nz',
  'govt.nz',
  'ac.nz',
  'school.nz',
  'co.za',
  'net.za',
  'org.za',
  'gov.za',
  'ac.za',
  'com.br',
  'net.br',
  'org.br',
  'gov.br',
  'edu.br',
  'com.mx',
  'org.mx',
  'gob.mx',
  'edu.mx',
  'com.ar',
  'com.tr',
  'com.co',
  'co.in',
  'com.cn',
  'com.tw',
  'com.hk',
  'com.sg',
  'co.id',
  'com.my',
  'com.ph',
  'com.vn',
  'com.pl',
  'co.it',
  'gov.it',
  'edu.it',
]);

/**
 * Extracts registrable-style host (subdomains stripped). Uses common multi-part TLD rules
 * so foo.co.uk ≠ bar.co.uk (unlike naive "last two labels" only).
 * Examples:
 * - "https://fr.outscale.com" → "outscale.com"
 * - "https://shop.example.fr" → "example.fr"
 * - "https://www.bbc.co.uk" → "bbc.co.uk"
 */
export function extractDomain(url: string): string {
  try {
    // Clean up the URL first
    let cleanUrl = url.trim();

    // Remove trailing slash if no protocol
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = cleanUrl.replace(/\/$/, '');
    }

    let urlObj: URL;

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      urlObj = new URL('https://' + cleanUrl);
    } else {
      urlObj = new URL(cleanUrl);
    }

    let hostname = urlObj.hostname.toLowerCase();

    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }

    const parts = hostname.split('.');
    if (parts.length < 2) {
      return hostname;
    }

    const last2 = parts.slice(-2).join('.').toLowerCase();
    if (parts.length >= 3 && MULTI_LABEL_PUBLIC_SUFFIXES.has(last2)) {
      return parts.slice(-3).join('.');
    }

    if (parts.length === 2) {
      return hostname;
    }

    return parts.slice(-2).join('.');
  } catch (error) {
    console.error('extractDomain error for URL:', url, error);
    return '';
  }
}

/**
 * True when normalized `host+path+query` has a real path segment (not only site root).
 */
export function normalizedHasNonRootPath(norm: string): boolean {
  const i = norm.indexOf('/');
  if (i === -1) return false;
  const rest = norm.slice(i + 1);
  return rest.length > 0 && !rest.startsWith('?');
}

/**
 * Same host (per extractDomain) and URL path comparable after normalizeUrl (exact or prefix).
 * Used to prefer the correct organic row when several results share a domain.
 * A homepage organic must not satisfy a deep target URL (otherwise the first SERP row for the
 * domain steals the rank from the real product/category URL).
 */
/** True if the tracking target is a full URL with a real path (not only site root). */
export function trackingTargetUrlHasNonRootPath(targetUrl: string): boolean {
  try {
    const n = normalizeUrl(targetUrl).toLowerCase().replace(/\/+$/, '');
    return normalizedHasNonRootPath(n);
  } catch {
    return false;
  }
}

/**
 * Many shops serve the same category page as `/path` (desktop) and `/mobile/path` (mobile SERP).
 * Only strips a leading `/mobile` segment (not arbitrary `/m/` to avoid breaking paths like `/fr/m/…`).
 */
function stripRetailMobilePathPrefix(pathname: string): string {
  let p = pathname || '/';
  if (!p.startsWith('/')) p = '/' + p;
  const low = p.toLowerCase();
  if (low === '/mobile' || low.startsWith('/mobile/')) {
    p = p.slice('/mobile'.length) || '/';
    if (!p.startsWith('/')) p = '/' + p;
  }
  return p;
}

/** Drop trailing `.php` / `.html` so equivalent CMS URLs still match (e.g. Spartoo desktop vs alternate). */
function pathnameStripTrivialTrailingExt(pathname: string): string {
  let p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/') return p;
  const stripped = p.replace(/\.(php|html?|htm)$/i, '');
  return stripped.length ? stripped : '/';
}

/** Host + pathname only (no query), lowercase — stable for SERP vs user URL after retail normalizations. */
function hostPathKeyForTracking(raw: string): string {
  try {
    let clean = (raw || '').trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    const u = new URL(clean);
    let h = u.hostname.toLowerCase();
    if (h.startsWith('www.')) h = h.slice(4);
    let p = stripRetailMobilePathPrefix(u.pathname);
    if (p.endsWith('/') && p.length > 1) p = p.slice(0, -1);
    p = pathnameStripTrivialTrailingExt(p);
    return (h + p).toLowerCase();
  } catch {
    return '';
  }
}

export function urlsPathCompatibleForTracking(targetUrl: string, resultUrl: string): boolean {
  try {
    const norm = (raw: string) => normalizeUrl(raw).toLowerCase().replace(/\/+$/, '');
    const a = norm(targetUrl);
    const b = norm(resultUrl);
    if (!a || !b) return false;
    if (a === b) return true;
    const pathA = normalizedHasNonRootPath(a);
    const pathB = normalizedHasNonRootPath(b);
    if (pathA && !pathB) return false;
    if (b.startsWith(`${a}/`) || a.startsWith(`${b}/`)) return true;

    const hkA = hostPathKeyForTracking(targetUrl);
    const hkB = hostPathKeyForTracking(resultUrl);
    if (hkA && hkB) {
      if (hkA === hkB) return true;
      const hkPathA = normalizedHasNonRootPath(hkA);
      const hkPathB = normalizedHasNonRootPath(hkB);
      if (hkPathA && !hkPathB) return false;
      if (hkB.startsWith(`${hkA}/`) || hkA.startsWith(`${hkB}/`)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * ISO-ish locale key for retail domain aliasing: prefer `gl`, else first language tag segment of `hl`
 * (e.g. `fr`, `fr-FR` → `fr`) so `nike.com` can match `nike.fr` even when `gl` is missing in the request.
 */
export function retailLocaleKeyFromHlGl(gl: string, hl: string): string {
  const g = (gl || '').trim().toLowerCase();
  if (g) return g.split(/[-_]/)[0]!;
  const h = (hl || '').trim().toLowerCase();
  const m = h.match(/^([a-z]{2})(?:[-_]|$)/);
  return m?.[1] ?? '';
}

/**
 * For domain-only tracking: user entered `brand.com` but the localized SERP lists `brand.fr`
 * (same second-level label, gl-appropriate ccTLD). Does not match the reverse (amazon.fr vs amazon.com).
 */
export function registrableComMatchesLocaleCcTld(
  targetRoot: string,
  resultRoot: string,
  gl: string
): boolean {
  const g = (gl || '').toLowerCase().trim().split(/[-_]/)[0]!;
  if (!g) return false;
  /** Retail ccTLD expected for `gl` (two-label registrables only). */
  const map: Record<string, string> = {
    fr: 'fr',
    de: 'de',
    es: 'es',
    it: 'it',
    pt: 'pt',
    nl: 'nl',
    be: 'be',
    at: 'at',
    ch: 'ch',
    pl: 'pl',
    se: 'se',
    no: 'no',
    dk: 'dk',
    fi: 'fi',
    ie: 'ie',
    uk: 'co.uk',
    gb: 'co.uk',
    us: 'com',
    ca: 'ca',
    mx: 'com.mx',
    br: 'com.br',
    ar: 'com.ar',
    in: 'co.in',
    jp: 'co.jp',
    kr: 'co.kr',
    au: 'com.au',
    nz: 'co.nz',
  };
  const want = map[g];
  if (!want || want === 'com') return false;
  const t = targetRoot.toLowerCase();
  const r = resultRoot.toLowerCase();
  const tp = t.split('.');
  const rp = r.split('.');
  if (tp.length !== 2 || rp.length !== 2) return false;
  if (tp[0] !== rp[0]) return false;
  if (tp[1] !== 'com') return false;
  if (rp[1] !== want) return false;
  return true;
}

/**
 * `brand.com` tracked, localized SERP shows `brand.fr`, `brand.co.uk`, `brand.co.jp`, etc.
 * `localeKey` is from {@link retailLocaleKeyFromHlGl}.
 */
export function retailComTargetMatchesSerpDomain(
  targetRoot: string,
  resultRoot: string,
  localeKey: string
): boolean {
  const k = (localeKey || '').trim().toLowerCase();
  if (!k) return false;
  if (registrableComMatchesLocaleCcTld(targetRoot, resultRoot, k)) return true;

  const t = targetRoot.toLowerCase();
  const r = resultRoot.toLowerCase();
  const m = /^([a-z0-9-]+)\.com$/i.exec(t);
  if (!m) return false;
  const brand = m[1]!;
  if (!brand || brand.includes('.')) return false;

  const multiSuffix: Record<string, string> = {
    gb: '.co.uk',
    uk: '.co.uk',
    au: '.com.au',
    jp: '.co.jp',
    kr: '.co.kr',
    nz: '.co.nz',
    in: '.co.in',
    br: '.com.br',
    mx: '.com.mx',
  };
  const suf = multiSuffix[k];
  return suf ? r === `${brand}${suf}` : false;
}

/**
 * Validates that a URL is well-formed
 */
export function isValidUrl(url: string): boolean {
  try {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      new URL('https://' + url);
    } else {
      new URL(url);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if the input is a domain (not a full URL)
 * Examples: "example.com", "www.google.fr" are domains
 * Examples: "https://example.com/page" is a full URL
 */
export function isDomain(input: string): boolean {
  const trimmed = input.trim();
  
  // If it has a protocol, it's a full URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return false;
  }
  
  // Check if it looks like a domain (no path, no query)
  try {
    const url = new URL('https://' + trimmed);
    // If pathname is just "/" and no search/hash, it's a domain
    return url.pathname === '/' && !url.search && !url.hash;
  } catch {
    return false;
  }
}

/**
 * Converts input to a tracking-ready format
 * If domain: returns normalized domain for domain-level tracking
 * If URL: returns the URL as-is
 */
export function prepareTrackingUrl(input: string): {
  url: string;
  isDomainTracking: boolean;
  displayUrl: string;
} {
  const trimmed = input.trim();
  
  if (isDomain(trimmed)) {
    // It's a domain - normalize it
    let domain = trimmed.toLowerCase();
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }
    return {
      url: domain,
      isDomainTracking: true,
      displayUrl: `[Domaine] ${domain}`,
    };
  } else {
    // It's a full URL
    return {
      url: trimmed,
      isDomainTracking: false,
      displayUrl: trimmed,
    };
  }
}

