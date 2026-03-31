/**
 * Normalizes URL for comparison:
 * - Convert to lowercase
 * - Remove protocol (http/https)
 * - Remove www.
 * - Remove trailing slash
 * - Remove tracking params (utm_*)
 * - Remove anchor/hash
 */
/**
 * Resolves Google's redirect wrapper (organic links often use the google.com/url?q=... form).
 * Without this, domain/URL matching compares "google.com" to the user's site and always fails.
 */
export function unwrapSerpResultLink(link: string): string {
  const trimmed = (link || '').trim();
  if (!trimmed) return trimmed;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.toLowerCase();
    if (!host.includes('google.')) return trimmed;
    const path = u.pathname.replace(/\/$/, '') || '/';
    if (path !== '/url') return trimmed;
    const qRaw = u.searchParams.get('q');
    if (qRaw) {
      let q = qRaw;
      try {
        q = decodeURIComponent(qRaw.replace(/\+/g, ' '));
      } catch {
        /* keep qRaw */
      }
      if (/^https?:\/\//i.test(q)) return q;
    }
    const urlParam = u.searchParams.get('url');
    if (urlParam) {
      try {
        const decoded = decodeURIComponent(urlParam.replace(/\+/g, ' '));
        if (/^https?:\/\//i.test(decoded)) return decoded;
      } catch {
        if (/^https?:\/\//i.test(urlParam)) return urlParam;
      }
    }
  } catch {
    // ignore
  }
  return trimmed;
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
 * Extracts the root domain from a URL (without subdomains)
 * Examples:
 * - "https://fr.outscale.com" → "outscale.com"
 * - "https://blog.outscale.com" → "outscale.com"  
 * - "https://www.google.com" → "google.com"
 * - "outscale.com" → "outscale.com"
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
    
    // Remove www. prefix
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }

    // Extract root domain (remove subdomains)
    // Split by dots and take last 2 parts (domain.tld)
    const parts = hostname.split('.');
    
    // Handle edge cases
    if (parts.length <= 2) {
      // Already a root domain (e.g., "google.com", "localhost")
      return hostname;
    }
    
    // For subdomains (e.g., "fr.outscale.com" → "outscale.com")
    // Take last 2 parts
    const rootDomain = parts.slice(-2).join('.');
    
    return rootDomain;
  } catch (error) {
    console.error('extractDomain error for URL:', url, error);
    return '';
  }
}

/**
 * Same brand site across different TLDs after extractDomain():
 * nike.com matches nike.fr (French SERP often uses the local TLD while users track .com).
 * Both arguments must be two-label roots (name.tld); subdomains should be folded first via extractDomain().
 */
export function sameRegistrableBrand(rootA: string, rootB: string): boolean {
  if (!rootA || !rootB) return false;
  if (rootA === rootB) return true;
  const pa = rootA.split('.');
  const pb = rootB.split('.');
  if (pa.length !== 2 || pb.length !== 2) return false;
  return pa[0] === pb[0] && pa[0] !== '';
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

