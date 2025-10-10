export interface Settings {
  hl: string;
  gl: string;
}

export interface Pair {
  pair_id: string;
  keyword: string;
  url: string;
  raw_url: string;
  created_at: string;
  updated_at: string;
  last_position: number | null;
  last_checked_at: string | null;
}

export interface HistoryEntry {
  checked_at: string;
  hl: string;
  gl: string;
  position: number | null;
  matched_url: string | null;
  match_type: 'exact' | 'domain' | 'none';
  serp_link?: string;
  source: string;
  error?: string;
}

export interface ExportColumn {
  timestamp: string;
  label: string;
}

export interface ExportRow {
  keyword: string;
  url: string;
  positions: Map<string, number | null>;
}

