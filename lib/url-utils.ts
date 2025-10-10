/**
 * Normalizes URL for comparison:
 * - Convert to lowercase
 * - Remove protocol (http/https)
 * - Remove www.
 * - Remove trailing slash
 * - Remove tracking params (utm_*)
 * - Remove anchor/hash
 */
export function normalizeUrl(url: string): string {
  try {
    // Parse the URL
    let urlObj: URL;
    
    // Handle URLs without protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      urlObj = new URL('https://' + url);
    } else {
      urlObj = new URL(url);
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
    // If parsing fails, just return lowercase version
    return url.toLowerCase();
  }
}

/**
 * Extracts the domain from a URL
 */
export function extractDomain(url: string): string {
  try {
    let urlObj: URL;
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      urlObj = new URL('https://' + url);
    } else {
      urlObj = new URL(url);
    }

    let hostname = urlObj.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }

    return hostname;
  } catch (error) {
    return '';
  }
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

