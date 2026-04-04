/**
 * Serper Google Search API — https://google.serper.dev/search
 * Callers typically set num=10 and page=1…10 to mirror Google pagination (top 100).
 */

export interface SerperGoogleSearchOptions {
  apiKey?: string | null;
}

export function resolveSerpApiKey(options?: SerperGoogleSearchOptions): string {
  const k =
    options?.apiKey ?? process.env.SERPER_API_KEY ?? process.env.SERPAPI_API_KEY;
  if (!k?.trim()) {
    throw new Error('Clé Serper manquante. Configurez-la dans Paramètres.');
  }
  return k.trim();
}

export interface SerperOrganicItem {
  title: string;
  link: string;
  snippet?: string;
  position?: number;
}

export interface SerperSearchResponse {
  organic?: SerperOrganicItem[];
  searchParameters?: {
    q?: string;
    hl?: string;
    gl?: string;
    num?: number;
    page?: number;
  };
  /** Some error payloads use this field */
  message?: string;
  /** Parsed from JSON body or response headers when Serper exposes it */
  creditsRemaining?: number;
}

/** Try to read a credits balance from arbitrary JSON (Serper may change field names). */
export function pickCreditsFromUnknown(v: unknown, depth = 0): number | null {
  if (depth > 5 || v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
    return Math.floor(v);
  }
  if (typeof v !== 'object') return null;
  if (Array.isArray(v)) {
    for (const el of v) {
      const n = pickCreditsFromUnknown(el, depth + 1);
      if (n != null) return n;
    }
    return null;
  }
  const o = v as Record<string, unknown>;
  const preferKeys = [
    'creditsRemaining',
    'credits_remaining',
    'remainingCredits',
    'creditRemaining',
    'credits',
    'balance',
    'remaining',
    'queriesLeft',
    'totalCredits',
  ];
  for (const key of preferKeys) {
    if (key in o && o[key] != null) {
      const n = pickCreditsFromUnknown(o[key], depth + 1);
      if (n != null) return n;
    }
  }
  for (const k of Object.keys(o)) {
    if (/credit|balance|remaining|quota|usage/i.test(k)) {
      const n = pickCreditsFromUnknown(o[k], depth + 1);
      if (n != null) return n;
    }
  }
  return null;
}

/**
 * Credits from POST /search JSON body only at the **root** object.
 * We must not deep-scan the body: nested keys like `usage: 1` or organic `position: 1`
 * were mistaken for the account balance.
 */
export function pickCreditsFromSearchBodyTopLevel(data: unknown): number | null {
  if (data == null || typeof data !== 'object' || Array.isArray(data)) return null;
  const o = data as Record<string, unknown>;
  // Exclude generic `credits` / `remaining` / `balance` — Serper may echo unrelated small numbers.
  const topKeys = [
    'creditsRemaining',
    'credits_remaining',
    'remainingCredits',
    'creditRemaining',
    'queriesLeft',
    'totalCredits',
  ];
  for (const key of topKeys) {
    if (!(key in o) || o[key] == null) continue;
    const v = o[key];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
      return Math.floor(v);
    }
  }
  return null;
}

/**
 * Unambiguous "credits remaining" headers. Do **not** use generic `x-credits` on POST /search:
 * Serper often sends `X-Credits: 1` (per-request cost or similar), which is not the account balance.
 */
export function creditsBalanceFromSearchHeaders(headers: Headers): number | null {
  const names = [
    'x-credits-remaining',
    'x-serper-credits',
    'x-remaining-credits',
    'x-credit-balance',
  ];
  for (const name of names) {
    const raw = headers.get(name);
    if (raw) {
      const n = parseInt(raw, 10);
      if (Number.isFinite(n) && n >= 0) return n;
    }
  }
  return null;
}

function creditsFromHeaders(headers: Headers): number | null {
  const names = [
    'x-credits-remaining',
    'x-serper-credits',
    'x-credits',
    'x-remaining-credits',
    'x-credit-balance',
  ];
  for (const name of names) {
    const raw = headers.get(name);
    if (raw) {
      const n = parseInt(raw, 10);
      if (Number.isFinite(n) && n >= 0) return n;
    }
  }
  return null;
}

/**
 * Best-effort GET (no search charge): some Serper deployments expose balance on a read endpoint.
 */
export async function fetchSerperCredits(apiKey: string): Promise<number | null> {
  const key = apiKey.trim();
  if (!key) return null;
  const urls = [
    'https://google.serper.dev/credits',
    'https://google.serper.dev/account',
    'https://google.serper.dev/balance',
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-KEY': key,
          'User-Agent': 'RankingForce/1.0 (https://rankingforce.com)',
          Accept: 'application/json',
        },
      });
      const text = await res.text();
      const hdr = creditsFromHeaders(res.headers);
      if (hdr != null) return hdr;
      if (!res.ok) continue;
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        continue;
      }
      const n = pickCreditsFromUnknown(data);
      if (n != null) return n;
    } catch {
      /* try next URL */
    }
  }
  return null;
}

async function postSerperSearch(
  body: Record<string, unknown>,
  options?: SerperGoogleSearchOptions
): Promise<SerperSearchResponse> {
  const apiKey = resolveSerpApiKey(options);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
      'User-Agent': 'RankingForce/1.0 (https://rankingforce.com)',
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  const hdrCredits = creditsBalanceFromSearchHeaders(res.headers);
  const rawText = await res.text();
  let data: SerperSearchResponse;
  try {
    data = JSON.parse(rawText) as SerperSearchResponse;
  } catch {
    throw new Error(
      `Serper error: réponse JSON invalide — ${rawText.slice(0, 220)}`
    );
  }

  if (!res.ok) {
    const msg =
      (typeof data.message === 'string' && data.message) ||
      rawText.slice(0, 220);
    throw new Error(`Serper error: ${res.status} — ${msg}`);
  }

  const anyErr = data as SerperSearchResponse & { error?: string; statusCode?: number };
  if (typeof anyErr.error === 'string' && anyErr.error.trim()) {
    throw new Error(`Serper error: ${anyErr.error}`);
  }

  const bodyCredits = pickCreditsFromSearchBodyTopLevel(data);
  const merged = hdrCredits ?? bodyCredits;
  if (merged != null) {
    data.creditsRemaining = merged;
  }

  return data;
}

/**
 * Low-level Serper search call (for settings validation or custom use).
 */
export async function callSerperGoogleSearch(
  params: {
    q: string;
    hl: string;
    gl: string;
    num?: number;
    page?: number;
  },
  options?: SerperGoogleSearchOptions
): Promise<SerperSearchResponse> {
  return postSerperSearch(
    {
      q: params.q,
      hl: params.hl,
      gl: params.gl,
      num: params.num ?? 10,
      page: params.page ?? 1,
    },
    options
  );
}
