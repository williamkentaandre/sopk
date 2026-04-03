/**
 * Serper Google Search API — https://google.serper.dev/search
 * One primary request with num=100; if only 10 rows come back, paginate pages 2–10.
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
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  clearTimeout(timeout);

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
