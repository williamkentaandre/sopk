'use client';

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  type KeyboardEvent,
  type ClipboardEvent,
  type MouseEvent as ReactMouseEvent,
  type DragEvent,
} from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { getParisDateString } from '@/lib/date-utils';
import { formatSearchLocaleLine } from '@/lib/search-locale-labels';
import { useLocale } from '@/app/LocaleContext';
import { SerpApiOnboardingIllustration } from '@/app/components/SerpApiOnboardingIllustration';

/** Survit à un rechargement : permet de proposer « mesurer les derniers ajouts » après un bulk add. */
const LAST_BULK_ADDED_PAIR_IDS_KEY = 'ranking-force-last-bulk-added-pair-ids';

function persistLastBulkAddedPairIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    if (ids.length === 0) sessionStorage.removeItem(LAST_BULK_ADDED_PAIR_IDS_KEY);
    else sessionStorage.setItem(LAST_BULK_ADDED_PAIR_IDS_KEY, JSON.stringify(ids));
  } catch {
    /* quota / navigation privée */
  }
}

interface Settings {
  hl: string;
  gl: string;
}

interface Pair {
  pair_id: string;
  keyword: string;
  url: string;
  last_position: number | null;
  last_checked_at: string | null;
  last_matched_url?: string | null;
  history_by_date?: Record<string, number | null>;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

/** Insert moving ids (in order) immediately before insertBeforeId. */
function reorderIdsDragInsertBefore(
  fullIds: string[],
  movingIds: string[],
  insertBeforeId: string
): string[] | null {
  const moving = new Set(movingIds);
  if (moving.has(insertBeforeId)) return null;
  const rest = fullIds.filter((id) => !moving.has(id));
  const pos = rest.indexOf(insertBeforeId);
  if (pos < 0) return null;
  return [...rest.slice(0, pos), ...movingIds, ...rest.slice(pos)];
}

function reorderIdsDragAppend(fullIds: string[], movingIds: string[]): string[] {
  const moving = new Set(movingIds);
  const rest = fullIds.filter((id) => !moving.has(id));
  return [...rest, ...movingIds];
}

export default function DashboardPage() {
  const { t, locale } = useLocale();
  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-GB';
  const [settings, setSettings] = useState<Settings>({ hl: 'fr', gl: 'fr' });
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tracking, setTracking] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [bulkUrlText, setBulkUrlText] = useState('');
  const [bulkKeywordText, setBulkKeywordText] = useState('');
  const [bulkAddedKeywords, setBulkAddedKeywords] = useState<string[]>([]);
  /** Pair IDs from the last successful bulk add (keywords × URLs), for « measure new only ». */
  const [lastBulkAddedPairIds, setLastBulkAddedPairIds] = useState<string[]>([]);
  /** Confirmed with Enter — shown as reassuring chips */
  const [stagedKeywords, setStagedKeywords] = useState<string[]>([]);
  const [stagedUrls, setStagedUrls] = useState<string[]>([]);
  const tableTopRef = useRef<HTMLDivElement | null>(null);
  const [editingPair, setEditingPair] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ keyword: string; url: string }>({ keyword: '', url: '' });
  const [showNoKeyBanner, setShowNoKeyBanner] = useState(false);
  const [hasSerpApiKey, setHasSerpApiKey] = useState<boolean | null>(null);
  /** Remaining Serper credits when exposed by API (GET or search response); null = unknown */
  const [serperCredits, setSerperCredits] = useState<number | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [searchSettingsDone, setSearchSettingsDone] = useState(false);
  const [searchSettingsAlertVisible, setSearchSettingsAlertVisible] = useState(false);
  const [measureAllProgress, setMeasureAllProgress] = useState<{ done: number; total: number; startedAt: number } | null>(null);
  /** After first bulk add, collapse form so the table stays the focus (user can reopen). */
  const [bulkAddExpanded, setBulkAddExpanded] = useState(true);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  /** Sync guard: React state for `tracking` can lag one frame — double-clicks could otherwise fire two measures and the slower response would overwrite the row. */
  const pairMeasureInFlightRef = useRef<Set<string>>(new Set());
  /** One Serper-backed measure at a time (avoids overlapping /track and state mix-ups). */
  const measureSerialRef = useRef<Promise<unknown>>(Promise.resolve());

  const enqueueSerialMeasure = useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    const run = measureSerialRef.current.then(() => fn());
    measureSerialRef.current = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }, []);
  const [selectedPairIds, setSelectedPairIds] = useState<Set<string>>(() => new Set());
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);
  const dragPayloadRef = useRef<string[] | null>(null);
  const [draggingIds, setDraggingIds] = useState<Set<string> | null>(null);
  const [dragOverPairId, setDragOverPairId] = useState<string | null>(null);
  const [dragOverTail, setDragOverTail] = useState(false);

  const selectablePairIds = useMemo(
    () => pairs.filter((p) => !p.pair_id.startsWith('temp_')).map((p) => p.pair_id),
    [pairs]
  );

  const lastBulkAddedIdSet = useMemo(() => new Set(lastBulkAddedPairIds), [lastBulkAddedPairIds]);
  const lastBulkAddedMeasurableCount = useMemo(
    () =>
      pairs.filter((p) => lastBulkAddedIdSet.has(p.pair_id) && !p.pair_id.startsWith('temp_')).length,
    [pairs, lastBulkAddedIdSet]
  );

  const stripLastBulkAddedIds = useCallback((remove: Set<string>) => {
    setLastBulkAddedPairIds((prev) => {
      const next = prev.filter((id) => !remove.has(id));
      persistLastBulkAddedPairIds(next);
      return next;
    });
  }, []);

  const selectedDeletableCount = useMemo(
    () => selectablePairIds.filter((id) => selectedPairIds.has(id)).length,
    [selectablePairIds, selectedPairIds]
  );

  useEffect(() => {
    const onDragEndWindow = () => {
      dragPayloadRef.current = null;
      setDraggingIds(null);
      setDragOverPairId(null);
      setDragOverTail(false);
    };
    window.addEventListener('dragend', onDragEndWindow);
    return () => window.removeEventListener('dragend', onDragEndWindow);
  }, []);

  useEffect(() => {
    const valid = new Set(pairs.map((p) => p.pair_id));
    setSelectedPairIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (valid.has(id)) next.add(id);
        else changed = true;
      });
      if (!changed && next.size === prev.size) return prev;
      return next;
    });
  }, [pairs]);

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (!el) return;
    if (selectablePairIds.length === 0) {
      el.indeterminate = false;
      return;
    }
    const n = selectedDeletableCount;
    el.indeterminate = n > 0 && n < selectablePairIds.length;
  }, [selectablePairIds.length, selectedDeletableCount]);

  const historyDates = useMemo(() => {
    const set = new Set<string>();
    pairs.forEach((p) => Object.keys(p.history_by_date || {}).forEach((d) => set.add(d)));
    return Array.from(set).sort();
  }, [pairs]);

  const searchLocaleDisplay = useMemo(() => {
    if (!searchSettingsDone) {
      return { configured: false, label: t('dashboard.status.searchLocaleNotSet') };
    }
    return formatSearchLocaleLine(t, settings.hl, settings.gl);
  }, [t, settings.hl, settings.gl, locale, searchSettingsDone]);

  const splitLines = (text: string) =>
    (text || '')
      .split(/\r\n|\n|\r/)
      .map((l) => l.trim())
      .filter(Boolean);

  const bulkKeywordTaRef = useRef<HTMLTextAreaElement | null>(null);
  const bulkUrlTaRef = useRef<HTMLTextAreaElement | null>(null);

  const removeFirstKeywordLineFromText = (text: string, trimmedTarget: string) => {
    const lines = text.split(/\r\n|\n|\r/);
    const idx = lines.findIndex((line) => line.trim() === trimmedTarget);
    if (idx === -1) return text;
    lines.splice(idx, 1);
    return lines.join('\n');
  };

  const removeFirstUrlLineByDomain = (text: string, domain: string) => {
    const lines = text.split(/\r\n|\n|\r/);
    const idx = lines.findIndex(
      (line) => toDomainOnly(line).toLowerCase() === domain.toLowerCase()
    );
    if (idx === -1) return text;
    lines.splice(idx, 1);
    return lines.join('\n');
  };

  const draftUrlDomains = useMemo(() => {
    const stagedLower = new Set(stagedUrls.map((u) => u.toLowerCase()));
    return splitLines(bulkUrlText)
      .map((u) => toDomainOnly(u))
      .filter((u) => u.length >= 3 && !stagedLower.has(u.toLowerCase()));
  }, [bulkUrlText, stagedUrls]);

  const draftKeywordLines = useMemo(() => {
    const stagedLower = new Set(stagedKeywords.map((k) => k.toLowerCase()));
    return splitLines(bulkKeywordText).filter((k) => !stagedLower.has(k.toLowerCase()));
  }, [bulkKeywordText, stagedKeywords]);

  function mergeKeywordsForBulk(): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const k of [...stagedKeywords, ...splitLines(bulkKeywordText)]) {
      const trimmed = k.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
    }
    return out;
  }

  function mergeUrlsForBulk(): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const u of [...stagedUrls, ...splitLines(bulkUrlText).map((x) => toDomainOnly(x))]) {
      if (!u || u.length < 3) continue;
      const key = u.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(u);
    }
    return out;
  }

  const commitKeywordLineAtCursor = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    const el = e.currentTarget;
    const v = el.value;
    const pos = el.selectionStart;
    const lineStart = v.lastIndexOf('\n', pos - 1) + 1;
    let lineEnd = v.indexOf('\n', pos);
    if (lineEnd === -1) lineEnd = v.length;
    const line = v.slice(lineStart, lineEnd).trim();
    if (!line) return;
    e.preventDefault();
    setStagedKeywords((prev) => {
      if (prev.some((k) => k.toLowerCase() === line.toLowerCase())) return prev;
      return [...prev, line];
    });
    const before = v.slice(0, lineStart);
    const after = lineEnd >= v.length ? '' : v.slice(lineEnd + 1);
    const newVal = before + after;
    setBulkKeywordText(newVal);
    const newPos = Math.min(lineStart, newVal.length);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = newPos;
    });
  };

  const commitUrlLineAtCursor = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    const el = e.currentTarget;
    const v = el.value;
    const pos = el.selectionStart;
    const lineStart = v.lastIndexOf('\n', pos - 1) + 1;
    let lineEnd = v.indexOf('\n', pos);
    if (lineEnd === -1) lineEnd = v.length;
    const raw = v.slice(lineStart, lineEnd).trim();
    const dom = toDomainOnly(raw);
    if (dom.length < 3) return;
    e.preventDefault();
    setStagedUrls((prev) => {
      if (prev.some((u) => u.toLowerCase() === dom.toLowerCase())) return prev;
      return [...prev, dom];
    });
    const before = v.slice(0, lineStart);
    const after = lineEnd >= v.length ? '' : v.slice(lineEnd + 1);
    const newVal = before + after;
    setBulkUrlText(newVal);
    const newPos = Math.min(lineStart, newVal.length);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = newPos;
    });
  };

  const removeStagedKeywordAt = (index: number) => {
    setStagedKeywords((prev) => prev.filter((_, i) => i !== index));
  };

  const removeStagedUrlAt = (index: number) => {
    setStagedUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const returnStagedKeywordToDraft = (index: number) => {
    setStagedKeywords((prev) => {
      const kw = prev[index];
      if (kw == null) return prev;
      const next = prev.filter((_, i) => i !== index);
      setBulkKeywordText((text) => (text.trim() ? `${text.trim()}\n${kw}` : kw));
      requestAnimationFrame(() => bulkKeywordTaRef.current?.focus());
      return next;
    });
  };

  const returnStagedUrlToDraft = (index: number) => {
    setStagedUrls((prev) => {
      const u = prev[index];
      if (u == null) return prev;
      const next = prev.filter((_, i) => i !== index);
      setBulkUrlText((text) => (text.trim() ? `${text.trim()}\n${u}` : u));
      requestAnimationFrame(() => bulkUrlTaRef.current?.focus());
      return next;
    });
  };

  const removeDraftKeywordLine = (trimmedLine: string) => {
    setBulkKeywordText((text) => removeFirstKeywordLineFromText(text, trimmedLine));
  };

  const removeDraftUrlLine = (domain: string) => {
    setBulkUrlText((text) => removeFirstUrlLineByDomain(text, domain));
  };

  const pasteKeywordsFromClipboard = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text/plain');
    const pastedLines = splitLines(pasted);
    if (!pasted || pastedLines.length < 2) return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const v = el.value;
    const before = v.slice(0, start);
    const after = v.slice(end);
    setStagedKeywords((prev) => {
      const seen = new Set(prev.map((k) => k.toLowerCase()));
      const next = [...prev];
      for (const line of pastedLines) {
        const key = line.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(line);
      }
      return next;
    });
    const newVal = before + after;
    setBulkKeywordText(newVal);
    const caret = Math.min(start, newVal.length);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = caret;
    });
  };

  const pasteUrlsFromClipboard = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text/plain');
    const pastedLines = splitLines(pasted);
    if (!pasted || pastedLines.length < 2) return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const v = el.value;
    const before = v.slice(0, start);
    const after = v.slice(end);
    const domains = pastedLines
      .map((line) => toDomainOnly(line))
      .filter((d) => d.length >= 3);
    if (domains.length === 0) return;
    setStagedUrls((prev) => {
      const seen = new Set(prev.map((u) => u.toLowerCase()));
      const next = [...prev];
      for (const d of domains) {
        const key = d.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(d);
      }
      return next;
    });
    const newVal = before + after;
    setBulkUrlText(newVal);
    const caret = Math.min(start, newVal.length);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = caret;
    });
  };

  const isNoSerpKeyError = (msg: string) =>
    /clé|serp|paramètres/i.test(msg || '');
  const isQuotaOrRateLimitError = (msg: string) =>
    /429|rate|quota|limit|too many/i.test(msg || '');
  const showActionableError = (errMsg: string) => {
    const msg = errMsg || t('dashboard.toast.unknownError');
    if (isNoSerpKeyError(msg)) {
      setShowNoKeyBanner(true);
      showToast(t('dashboard.toast.addKeyInSettings'), 'error');
      return;
    }
    if (!searchSettingsDone) {
      showSearchSettingsAlert();
      showToast(t('dashboard.toast.completeSearchSettings'), 'error');
      return;
    }
    if (isQuotaOrRateLimitError(msg)) {
      showToast(`${t('dashboard.toast.error')}: quota/rate limit — réessaie dans 1 min`, 'error');
      return;
    }
    showToast(`${t('dashboard.toast.error')}: ${msg}`, 'error');
  };

  /** SERP rank 1…100; anything else → null */
  const normalizeMeasuredRank = (value: unknown): number | null => {
    if (value == null || value === '') return null;
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n) || n < 1) return null;
    return Math.floor(n);
  };

  const displayPosition = (pos: number | null, lastCheckedAt: string | null | undefined) => {
    if (loading) return '';
    const normalized = normalizeMeasuredRank(pos);
    if (normalized != null) return String(normalized);
    if (lastCheckedAt) return t('dashboard.table.positionNotInTop100');
    return '';
  };

  const mergeTrackApiResultIntoState = (
    pairId: string,
    result: {
      pair_id?: string;
      checked_at?: string;
      position?: unknown;
      matched_url?: string | null;
      serper_credits_remaining?: number | null;
    }
  ) => {
    const effectivePairId =
      typeof result.pair_id === 'string' && result.pair_id.trim() ? result.pair_id.trim() : pairId;
    const day = result.checked_at ? getParisDateString(result.checked_at) : null;
    const normalizedPos = normalizeMeasuredRank(result.position);
    if (
      typeof result.serper_credits_remaining === 'number' &&
      Number.isFinite(result.serper_credits_remaining)
    ) {
      setSerperCredits(Math.floor(result.serper_credits_remaining));
    }
    setPairs((prev) =>
      prev.map((p) =>
        p.pair_id === effectivePairId
          ? {
              ...p,
              last_position: normalizedPos,
              last_checked_at: result.checked_at ?? null,
              last_matched_url:
                result.matched_url !== undefined
                  ? result.matched_url ?? null
                  : p.last_matched_url,
              history_by_date: day
                ? { ...(p.history_by_date || {}), [day]: normalizedPos }
                : p.history_by_date,
            }
          : p
      )
    );
  };

  /** Same source as page load: GET balance (no reliance on search/track parsing). */
  const refreshSerperCreditsFromApi = useCallback(async () => {
    try {
      const r = await fetch('/api/v1/serper-credits', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!r.ok) return;
      const cd = await r.json().catch(() => ({}));
      if (typeof cd.credits === 'number' && Number.isFinite(cd.credits)) {
        setSerperCredits(cd.credits);
      }
    } catch {
      /* keep previous */
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('seo-ranker-search-settings-done');
    if (stored === '1') setSearchSettingsDone(true);
  }, []);

  useEffect(() => {
    if (searchSettingsDone || hasSerpApiKey !== true) {
      setSearchSettingsAlertVisible(false);
      return;
    }

    setSearchSettingsAlertVisible(true);
    const timeout = window.setTimeout(() => {
      setSearchSettingsAlertVisible(false);
    }, 7000);

    return () => window.clearTimeout(timeout);
  }, [searchSettingsDone, hasSerpApiKey]);

  const showSearchSettingsAlert = () => {
    if (hasSerpApiKey !== true || searchSettingsDone) return;
    setSearchSettingsAlertVisible(true);
    window.setTimeout(() => {
      setSearchSettingsAlertVisible(false);
    }, 7000);
  };

  useEffect(() => {
    if (!exportMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [exportMenuOpen]);

  const loadData = async () => {
    const ac = new AbortController();
    const tid = window.setTimeout(() => ac.abort(), 32000);
    const fetchInit: RequestInit = {
      signal: ac.signal,
      credentials: 'same-origin',
      cache: 'no-store',
    };
    try {
      const [settingsRes, pairsRes, creditsRes] = await Promise.all([
        fetch('/api/v1/settings', fetchInit),
        fetch('/api/v1/pairs?includeHistory=1', fetchInit),
        fetch('/api/v1/serper-credits', fetchInit),
      ]);
      if (settingsRes.ok && pairsRes.ok) {
        const settingsData = await settingsRes.json();
        const pairsData = await pairsRes.json();
        setSettings({ hl: settingsData.hl ?? 'fr', gl: settingsData.gl ?? 'fr' });
        setHasSerpApiKey(!!settingsData.hasSerpApiKey);
        setSearchSettingsDone(!!(settingsData.hl && settingsData.gl));
        const rawItems = (pairsData.items || []) as Pair[];
        const seenIds = new Set<string>();
        const items = rawItems.filter((p) => {
          if (seenIds.has(p.pair_id)) return false;
          seenIds.add(p.pair_id);
          return true;
        });
        setPairs(items);
        const validPairIds = new Set(items.map((p) => p.pair_id));
        let restoredLastBulk: string[] = [];
        try {
          const raw =
            typeof window !== 'undefined' ? sessionStorage.getItem(LAST_BULK_ADDED_PAIR_IDS_KEY) : null;
          if (raw) {
            const parsed = JSON.parse(raw) as unknown;
            if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
              restoredLastBulk = parsed.filter((id) => validPairIds.has(id));
            }
          }
        } catch {
          /* ignore */
        }
        setLastBulkAddedPairIds(restoredLastBulk);
        persistLastBulkAddedPairIds(restoredLastBulk);
        if (creditsRes.ok) {
          const cd = await creditsRes.json().catch(() => ({}));
          if (typeof cd.credits === 'number' && Number.isFinite(cd.credits)) {
            setSerperCredits(cd.credits);
          } else {
            setSerperCredits(null);
          }
        }
      } else {
        if (settingsRes.status === 401 || pairsRes.status === 401) {
          window.location.href = '/login';
          return;
        }
        setSettings({ hl: 'fr', gl: 'fr' });
        setHasSerpApiKey(null);
        setSearchSettingsDone(false);
        setPairs([]);
        setLastBulkAddedPairIds([]);
        persistLastBulkAddedPairIds([]);
        setSerperCredits(null);
      }
    } catch {
      setSettings({ hl: 'fr', gl: 'fr' });
      setHasSerpApiKey(null);
      setSearchSettingsDone(false);
      setPairs([]);
      setLastBulkAddedPairIds([]);
      persistLastBulkAddedPairIds([]);
      setSerperCredits(null);
    } finally {
      window.clearTimeout(tid);
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const persistPairOrder = async (orderedPersistedIds: string[]) => {
    if (orderedPersistedIds.length === 0) return true;
    try {
      const res = await fetch('/api/v1/pairs/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: orderedPersistedIds }),
        credentials: 'same-origin',
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        showToast(
          `${t('dashboard.toast.error')}: ${err.error?.message || t('dashboard.toast.reorderError')}`,
          'error'
        );
        await loadData();
        return false;
      }
      return true;
    } catch {
      showToast(t('dashboard.toast.reorderError'), 'error');
      await loadData();
      return false;
    }
  };

  const applyDragReorder = async (newIds: string[]) => {
    const map = new Map(pairs.map((p) => [p.pair_id, p]));
    const newPairs = newIds.map((id) => map.get(id)!);
    setPairs(newPairs);
    const persisted = newIds.filter((id) => !id.startsWith('temp_'));
    setReordering(true);
    try {
      await persistPairOrder(persisted);
    } finally {
      setReordering(false);
    }
  };

  const onPairDragStart = (pairId: string, e: DragEvent) => {
    const moving =
      selectedPairIds.has(pairId) && selectedPairIds.size > 0
        ? pairs.filter((p) => selectedPairIds.has(p.pair_id)).map((p) => p.pair_id)
        : [pairId];
    dragPayloadRef.current = moving;
    setDraggingIds(new Set(moving));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', pairId);
  };

  const onPairRowDragOver = (pairId: string, e: DragEvent) => {
    const moving = dragPayloadRef.current;
    if (!moving?.length) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const movingSet = new Set(moving);
    if (!movingSet.has(pairId)) {
      setDragOverPairId(pairId);
      setDragOverTail(false);
    }
  };

  const onPairRowDragLeave = (pairId: string, e: DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverPairId((prev) => (prev === pairId ? null : prev));
    }
  };

  const onPairRowDrop = (insertBeforeId: string, e: DragEvent) => {
    e.preventDefault();
    const moving = dragPayloadRef.current;
    if (!moving?.length) return;
    const fullIds = pairs.map((p) => p.pair_id);
    const newIds = reorderIdsDragInsertBefore(fullIds, moving, insertBeforeId);
    if (!newIds) return;
    void applyDragReorder(newIds);
  };

  const onDropZoneTailDragOver = (e: DragEvent) => {
    if (!dragPayloadRef.current?.length) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTail(true);
    setDragOverPairId(null);
  };

  const onDropZoneTailDragLeave = (e: DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverTail(false);
    }
  };

  const onDropZoneTailDrop = (e: DragEvent) => {
    e.preventDefault();
    const moving = dragPayloadRef.current;
    if (!moving?.length) return;
    const fullIds = pairs.map((p) => p.pair_id);
    const newIds = reorderIdsDragAppend(fullIds, moving);
    void applyDragReorder(newIds);
  };

  const normalizeUrlForCompare = (u: string) => {
    const t = u.trim().toLowerCase();
    if (!t) return '';
    const withoutProtocol = t.replace(/^https?:\/\//, '').replace(/^www\./, '');
    return withoutProtocol.replace(/\/$/, '');
  };

  function toDomainOnly(input: string) {
    const raw = (input || '').trim();
    if (!raw) return '';
    try {
      const withProto = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
      const u = new URL(withProto);
      return u.hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return raw
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .split(/[/?#]/)[0]
        .toLowerCase();
    }
  }

  const isDuplicatePair = (keyword: string, url: string) =>
    pairs.some(
      (p) =>
        p.keyword.trim().toLowerCase() === keyword.trim().toLowerCase() &&
        normalizeUrlForCompare(p.url) === normalizeUrlForCompare(url)
    );

  const getDomainBadgeStyle = (domain: string) => {
    // Stable color per domain (hash -> HSL)
    const d = domain.replace(/^www\./, '').replace(/\/$/, '').toLowerCase();
    let hash = 0;
    for (let i = 0; i < d.length; i++) hash = (hash * 31 + d.charCodeAt(i)) | 0;
    const hue = Math.abs(hash) % 360;
    return {
      background: `hsl(${hue} 85% 94%)`,
      border: `1px solid hsl(${hue} 70% 78%)`,
      color: `hsl(${hue} 45% 28%)`,
    } as const;
  };

  const addBulkPairs = async () => {
    const urls = mergeUrlsForBulk();
    if (urls.length === 0) {
      showToast(t('dashboard.toast.enterUrl'), 'error');
      return;
    }
    const keywords = mergeKeywordsForBulk();
    if (keywords.length === 0) return;

    const seen = new Set<string>();
    const toCreate: { keyword: string; url: string }[] = [];
    for (const kw of keywords) {
      for (const url of urls) {
        const key = `${kw.toLowerCase()}|${normalizeUrlForCompare(url)}`;
        if (seen.has(key) || isDuplicatePair(kw, url)) continue;
        seen.add(key);
        toCreate.push({ keyword: kw, url });
      }
    }
    if (toCreate.length === 0) {
      showToast(t('dashboard.toast.noNewKeywords'), 'error');
      return;
    }

    // Optimistic rows for immediate UI
    const tempPairs: Pair[] = toCreate.map((p) => ({
      pair_id: `temp_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      keyword: p.keyword,
      url: p.url,
      last_position: null,
      last_checked_at: null,
      last_matched_url: null,
    }));
    setPairs((prev) => [...tempPairs, ...prev]);
    setBulkAddedKeywords((prev) => [...toCreate.map((p) => p.keyword), ...prev].slice(0, 50));

    try {
      const response = await fetch('/api/v1/pairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairs: toCreate }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        // rollback optimistic
        const tempIds = new Set(tempPairs.map((p) => p.pair_id));
        setPairs((prev) => prev.filter((p) => !tempIds.has(p.pair_id)));
        setBulkAddedKeywords((prev) => prev.slice(toCreate.length));
        showToast(`${t('dashboard.toast.error')}: ${result?.error?.message || t('dashboard.toast.unknownError')}`, 'error');
        return;
      }

      const createdItems = (result.items || []) as Pair[];
      const newIds = createdItems.map((i) => i.pair_id).filter(Boolean);
      setLastBulkAddedPairIds(newIds);
      persistLastBulkAddedPairIds(newIds);
      // Replace optimistic rows with created rows in the same order (best-effort)
      setPairs((prev) => {
        const tempIds = new Set(tempPairs.map((p) => p.pair_id));
        const rest = prev.filter((p) => !tempIds.has(p.pair_id));
        return [...createdItems, ...rest];
      });
      showToast(`${createdItems.length} ${t('dashboard.toast.pairsAdded')}`, 'success');
      setStagedKeywords([]);
      setStagedUrls([]);
      setBulkKeywordText('');
      setBulkUrlText('');
      setBulkAddedKeywords([]);
      setBulkAddExpanded(false);
      requestAnimationFrame(() => {
        tableTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch {
      const tempIds = new Set(tempPairs.map((p) => p.pair_id));
      setPairs((prev) => prev.filter((p) => !tempIds.has(p.pair_id)));
      setBulkAddedKeywords((prev) => prev.slice(toCreate.length));
      showToast(t('dashboard.toast.addError'), 'error');
    }
  };

  const startEdit = (pair: Pair) => {
    setEditingPair(pair.pair_id);
    setEditValues({ keyword: pair.keyword, url: pair.url });
  };

  const cancelEdit = () => {
    setEditingPair(null);
    setEditValues({ keyword: '', url: '' });
  };

  const saveEdit = async (pairId: string) => {
    try {
      const response = await fetch(`/api/v1/pairs/${pairId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: editValues.keyword, url: editValues.url }),
      });
      if (response.ok) {
        setPairs((prev) =>
          prev.map((p) =>
            p.pair_id === pairId
              ? { ...p, keyword: editValues.keyword, url: editValues.url }
              : p
          )
        );
        setEditingPair(null);
        showToast(t('dashboard.toast.pairUpdated'), 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`${t('dashboard.toast.error')}: ${errorData.error?.message || t('dashboard.toast.unknownError')}`, 'error');
      }
    } catch {
      showToast(t('dashboard.toast.editError'), 'error');
    }
  };

  const togglePairRowSelected = (pairId: string) => {
    if (pairId.startsWith('temp_')) return;
    setSelectedPairIds((prev) => {
      const next = new Set(prev);
      if (next.has(pairId)) next.delete(pairId);
      else next.add(pairId);
      return next;
    });
  };

  const pairTableRowSelectionTarget = (target: EventTarget | null): Element | null => {
    if (!target || !(target instanceof Node)) return null;
    return target instanceof Element ? target : target.parentElement;
  };

  const pairRowClickIgnoresSelection = (target: EventTarget | null) => {
    const el = pairTableRowSelectionTarget(target);
    if (!el?.closest) return true;
    return !!el.closest('a, button, input, textarea, label, [data-pair-drag-handle]');
  };

  const onPairTableRowClick = (pairId: string, e: ReactMouseEvent<HTMLTableRowElement>) => {
    if (pairId.startsWith('temp_')) return;
    if (pairRowClickIgnoresSelection(e.target)) return;
    togglePairRowSelected(pairId);
  };

  const toggleSelectAllSavedRows = () => {
    const allSelected =
      selectablePairIds.length > 0 && selectablePairIds.every((id) => selectedPairIds.has(id));
    setSelectedPairIds(allSelected ? new Set() : new Set(selectablePairIds));
  };

  const deletePair = async (pairId: string) => {
    if (!confirm(t('dashboard.confirm.deletePair'))) return;
    try {
      const response = await fetch(`/api/v1/pairs/${pairId}`, { method: 'DELETE' });
      if (response.ok) {
        setPairs((prev) => prev.filter((p) => p.pair_id !== pairId));
        stripLastBulkAddedIds(new Set([pairId]));
        setSelectedPairIds((prev) => {
          if (!prev.has(pairId)) return prev;
          const next = new Set(prev);
          next.delete(pairId);
          return next;
        });
        showToast(t('dashboard.toast.pairDeleted'), 'success');
      } else {
        showToast(t('dashboard.toast.deleteError'), 'error');
      }
    } catch {
      showToast(t('dashboard.toast.deleteError'), 'error');
    }
  };

  const deleteSelectedPairs = async () => {
    const ids = selectablePairIds.filter((id) => selectedPairIds.has(id));
    if (ids.length === 0) return;
    if (!confirm(t('dashboard.confirm.deleteSelected').replace('{count}', String(ids.length)))) return;
    try {
      setBulkDeleting(true);
      const response = await fetch('/api/v1/pairs/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (response.ok) {
        const data = (await response.json()) as { deleted?: number };
        const deleted = typeof data.deleted === 'number' ? data.deleted : ids.length;
        setPairs((prev) => prev.filter((p) => !ids.includes(p.pair_id)));
        stripLastBulkAddedIds(new Set(ids));
        setSelectedPairIds(new Set());
        showToast(t('dashboard.toast.bulkPairsDeleted').replace('{count}', String(deleted)), 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`${t('dashboard.toast.error')}: ${errorData.error?.message || t('dashboard.toast.unknownError')}`, 'error');
      }
    } catch {
      showToast(t('dashboard.toast.deleteError'), 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const deleteAllPairs = async () => {
    if (!confirm(t('dashboard.confirm.deleteAll'))) return;
    if (!confirm(t('dashboard.confirm.deleteAllConfirm'))) return;
    try {
      setLoading(true);
      const response = await fetch('/api/v1/pairs', {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (response.ok) {
        const result = await response.json();
        showToast(`${result.deleted} ${t('dashboard.toast.pairsDeleted')}`, 'success');
        setPairs([]);
        setSelectedPairIds(new Set());
        setLastBulkAddedPairIds([]);
        persistLastBulkAddedPairIds([]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`${t('dashboard.toast.error')}: ${errorData.error?.message || t('dashboard.toast.unknownError')}`, 'error');
      }
    } catch {
      showToast(t('dashboard.toast.deleteError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const trackLastAddedOnly = async () => {
    if (!searchSettingsDone) {
      showSearchSettingsAlert();
      showToast(t('dashboard.toast.completeSearchSettings'), 'error');
      return;
    }
    const toMeasure = pairs.filter(
      (p) => lastBulkAddedIdSet.has(p.pair_id) && !p.pair_id.startsWith('temp_')
    );
    if (toMeasure.length === 0) {
      showToast(t('dashboard.toast.measureLastAddedNone'), 'error');
      setLastBulkAddedPairIds([]);
      persistLastBulkAddedPairIds([]);
      return;
    }
    if (!confirm(t('dashboard.confirm.measureLastAdded').replace('{count}', String(toMeasure.length)))) return;
    const { failedCount } = await runMeasureSequenceForPairs(toMeasure);
    if (failedCount === 0) {
      setLastBulkAddedPairIds([]);
      persistLastBulkAddedPairIds([]);
    }
  };

  const trackPair = async (pairId: string, keywordHint?: string) => {
    if (!searchSettingsDone) {
      showSearchSettingsAlert();
      showToast(t('dashboard.toast.completeSearchSettings'), 'error');
      return;
    }
    return enqueueSerialMeasure(async () => {
      if (pairMeasureInFlightRef.current.has(pairId)) {
        return;
      }
      pairMeasureInFlightRef.current.add(pairId);
      setTracking((prev) => new Set(prev).add(pairId));
      try {
        const response = await fetch(`/api/v1/pairs/${pairId}/track`, {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hl: settings.hl, gl: settings.gl }),
        });
        const result = await response.json();
        if (response.ok) {
          mergeTrackApiResultIntoState(pairId, result);
          const normalizedPos = normalizeMeasuredRank(result.position);
          const positionText =
            normalizedPos != null
              ? `${t('dashboard.toast.position')}: ${normalizedPos}`
              : t('dashboard.toast.notFound');
          const debugText =
            result.pages_queried != null
              ? ` (${result.pages_queried} pages, ${result.elapsed_ms ?? 0} ms)`
              : '';
          const cr = result.serper_credits_remaining;
          if (!(typeof cr === 'number' && Number.isFinite(cr))) {
            void refreshSerperCreditsFromApi();
          }
          const kwLabel = keywordHint ? `"${keywordHint}" · ` : '';
          showToast(`${t('dashboard.toast.measureDone')} — ${kwLabel}${positionText}${debugText}`, 'success');
        } else {
          showActionableError(result.error?.message || '');
        }
      } catch {
        showToast(t('dashboard.toast.serpError'), 'error');
      } finally {
        pairMeasureInFlightRef.current.delete(pairId);
        setTracking((prev) => {
          const next = new Set(prev);
          next.delete(pairId);
          return next;
        });
      }
    });
  };

  const runMeasureSequenceForPairs = async (rows: Pair[]): Promise<{ failedCount: number }> => {
    const total = rows.length;
    setSaving(true);
    setMeasureAllProgress({ done: 0, total, startedAt: Date.now() });

    let failedCount = 0;
    let shownConfigError = false;

    try {
      for (let i = 0; i < rows.length; i++) {
        const p = rows[i];
        await enqueueSerialMeasure(async () => {
          pairMeasureInFlightRef.current.add(p.pair_id);
          setTracking((prev) => new Set(prev).add(p.pair_id));
          try {
            const response = await fetch(`/api/v1/pairs/${p.pair_id}/track`, {
              method: 'POST',
              cache: 'no-store',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ hl: settings.hl, gl: settings.gl }),
            });
            const result = await response.json();
            if (response.ok) {
              mergeTrackApiResultIntoState(p.pair_id, result);
              const cr = result.serper_credits_remaining;
              if (!(typeof cr === 'number' && Number.isFinite(cr))) {
                void refreshSerperCreditsFromApi();
              }
            } else {
              failedCount++;
              if (
                !shownConfigError &&
                (response.status === 400 || response.status === 401)
              ) {
                shownConfigError = true;
                showActionableError(result.error?.message || '');
              }
            }
          } catch {
            failedCount++;
          } finally {
            pairMeasureInFlightRef.current.delete(p.pair_id);
            setTracking((prev) => {
              const next = new Set(prev);
              next.delete(p.pair_id);
              return next;
            });
            setMeasureAllProgress((prog) =>
              prog
                ? { ...prog, done: Math.min(prog.done + 1, prog.total) }
                : { done: i + 1, total, startedAt: Date.now() }
            );
          }
        });
      }

      if (failedCount > 0) {
        const ok = total - failedCount;
        showToast(
          `${t('dashboard.toast.measurementsDone')} (${ok} OK, ${failedCount} ${t('dashboard.toast.failed')})`,
          'error'
        );
      } else {
        showToast(t('dashboard.toast.measurementsDone'), 'success');
      }
      return { failedCount };
    } finally {
      setSaving(false);
      window.setTimeout(() => setMeasureAllProgress(null), 2500);
    }
  };

  const trackAll = async () => {
    if (!searchSettingsDone) {
      showSearchSettingsAlert();
      showToast(t('dashboard.toast.completeSearchSettings'), 'error');
      return;
    }
    const persistedPairs = pairs.filter((p) => !p.pair_id.startsWith('temp_'));
    if (persistedPairs.length === 0) {
      showToast(t('dashboard.toast.measureAllNoPairs'), 'error');
      return;
    }
    if (persistedPairs.length < pairs.length) {
      showToast(t('dashboard.toast.measureAllWaitForSave'), 'error');
      return;
    }
    if (!confirm(t('dashboard.confirm.measureAll'))) return;
    await runMeasureSequenceForPairs(persistedPairs);
  };

  const trackSelected = async () => {
    if (!searchSettingsDone) {
      showSearchSettingsAlert();
      showToast(t('dashboard.toast.completeSearchSettings'), 'error');
      return;
    }
    const toMeasure = pairs.filter(
      (p) => selectedPairIds.has(p.pair_id) && !p.pair_id.startsWith('temp_')
    );
    if (toMeasure.length === 0) {
      showToast(t('dashboard.toast.measureSelectedNone'), 'error');
      return;
    }
    if (!confirm(t('dashboard.confirm.measureSelected').replace('{count}', String(toMeasure.length)))) return;
    await runMeasureSequenceForPairs(toMeasure);
  };

  const exportData = async (format: 'csv' | 'xlsx') => {
    try {
      const response = await fetch(`/api/v1/export?format=${format}`);
      if (response.ok) {
        if (format === 'csv') {
          const text = await response.text();
          const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `seo-export-${new Date().toISOString().slice(0, 10)}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `seo-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
        // Pas de toast "réussi" : le fichier n'est pas encore enregistré (dialogue "Enregistrer sous")
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`${t('dashboard.toast.exportError')}: ${errorData.error?.message || t('dashboard.toast.unknownError')}`, 'error');
      }
    } catch {
      showToast(t('dashboard.toast.exportError'), 'error');
    }
  };

  if (loading && pairs.length === 0) {
    return (
      <div className="app-shell">
        <div className="container dashboard-initial-load">
          <div className="dashboard-loading-card" role="status" aria-live="polite">
            <span className="loading loading--panel" aria-hidden />
            <p>{t('dashboard.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="container">
        <div className="header dashboard-header-merged">
          <div className="dashboard-header-top">
            <div>
              <h1>{t('dashboard.title')}</h1>
              <p>{t('dashboard.subtitle')}</p>
              {hasSerpApiKey !== true && (
                <p style={{ marginTop: '0.35rem', fontSize: '0.9rem' }}>
                  <Link href="/settings">
                    {t('dashboard.settingsKey')}
                  </Link>
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Link href="/settings" className="btn btn-secondary">
                {t('dashboard.settings')}
              </Link>
              <button type="button" className="btn btn-secondary" onClick={() => signOut({ callbackUrl: '/' })}>
                {t('dashboard.signOut')}
              </button>
            </div>
          </div>
          <div className="dashboard-status-row">
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <Link
                href="/settings"
                className={`status-badge ${hasSerpApiKey === true ? 'success' : 'pending'}`}
                style={{ textDecoration: 'none' }}
              >
                {t('dashboard.status.apiKey')}:{' '}
                {hasSerpApiKey === true ? t('dashboard.status.apiKeyOk') : t('dashboard.status.apiKeyMissing')}
              </Link>
              <Link
                href="/settings"
                className={`status-badge ${searchLocaleDisplay.configured ? 'success' : 'pending'}`}
                style={{ textDecoration: 'none' }}
                title={t('dashboard.status.searchLocaleHint')}
              >
                {t('dashboard.status.languageCountry')}: {searchLocaleDisplay.label}
              </Link>
              {hasSerpApiKey === true && (
                <span className="status-badge surface-credits-pill" title={t('dashboard.serpCreditsHint')}>
                  {t('dashboard.serpCredits')}:{' '}
                  {typeof serperCredits === 'number' ? serperCredits.toLocaleString(dateLocale) : '—'}
                </span>
              )}
            </div>
          </div>
        </div>

      {(hasSerpApiKey !== true) && (
        <div className="onboarding-with-image" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div className="card-onboarding card-onboarding--danger" style={{ flex: '1 1 20rem', maxWidth: '36rem' }}>
            <h2>{t('dashboard.onboarding.title')}</h2>
            <div className="onboarding-danger-text">
            <p style={{ margin: '0 0 1rem', lineHeight: 1.5 }}>
              {t('dashboard.onboarding.desc')}
            </p>
            <ol style={{ margin: '0 0 1.25rem', paddingLeft: '1.25rem', lineHeight: 1.7 }}>
              <li>{t("dashboard.onboarding.step1")}</li>
              <li>{t("dashboard.onboarding.step2")}</li>
              <li>{t("dashboard.onboarding.step3")}</li>
            </ol>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <a href="https://serper.dev/api-keys" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.6rem 1.2rem' }}>
                {t('dashboard.onboarding.getKey')}
              </a>
              <Link href="/settings" className="btn btn-secondary">
                {t('dashboard.onboarding.goSettings')}
              </Link>
            </div>
            </div>
          </div>
          <SerpApiOnboardingIllustration />
        </div>
      )}

      {hasSerpApiKey !== false && showNoKeyBanner && (
        <div className="card-warning">
          <p style={{ margin: 0, marginBottom: '0.75rem', fontWeight: 500 }}>{t('dashboard.warning.title')}</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <a href="https://serper.dev/api-keys" target="_blank" rel="noopener noreferrer" className="btn btn-primary">{t('dashboard.warning.getKey')}</a>
            <Link href="/settings" className="btn btn-secondary">{t('dashboard.warning.goSettings')}</Link>
            <button type="button" className="btn btn-secondary" onClick={() => setShowNoKeyBanner(false)}>{t('dashboard.warning.close')}</button>
          </div>
        </div>
      )}

      {hasSerpApiKey === true && !searchSettingsDone && searchSettingsAlertVisible && (
        <div
          className="settings-card settings-flash-alert--danger"
          style={{
            marginBottom: '1.5rem',
            textAlign: 'center',
            padding: '2rem 1.25rem',
          }}
        >
          <h2 style={{ marginBottom: '0.75rem' }}>{t('dashboard.searchSettings.title')}</h2>
          <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1rem' }}>
            {t('dashboard.searchSettings.missing')}
          </p>
          <p style={{ marginBottom: '0' }}>{t('dashboard.searchSettings.goToSettings')}</p>
        </div>
      )}

      {hasSerpApiKey === true && searchSettingsDone && (
      <div className="pairs-card">
        <div className="pairs-header">
          <h2>{t('dashboard.pairs.title')} ({pairs.length})</h2>
          <div className="pairs-actions">
            <div ref={exportMenuRef} style={{ position: 'relative', display: 'inline-block' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setExportMenuOpen((v) => !v)}>
                {t('dashboard.pairs.export')} {exportMenuOpen ? '▾' : '▸'}
              </button>
              {exportMenuOpen && (
                <div className="dropdown-menu">
                  <button type="button" onClick={() => { exportData('csv'); setExportMenuOpen(false); }}>CSV</button>
                  <button type="button" onClick={() => { exportData('xlsx'); setExportMenuOpen(false); }}>Excel (XLSX)</button>
                </div>
              )}
            </div>
            <button
              className="btn btn-danger"
              onClick={deleteAllPairs}
              disabled={loading || pairs.length === 0}
              style={{ marginLeft: '10px' }}
            >
              {t('dashboard.pairs.deleteAll')}
            </button>
          </div>
        </div>

        {pairs.length > 0 && !bulkAddExpanded ? (
          <div className="multi-add-collapsed">
            <button type="button" className="btn btn-secondary" onClick={() => setBulkAddExpanded(true)}>
              {t('dashboard.pairs.bulkShowForm')}
            </button>
          </div>
        ) : (
        <div className="multi-add-block">
          <div className="multi-add-block-header">
            <div>
              <p className="multi-add-title">{t('dashboard.pairs.multiAdd')}</p>
              <p className="multi-add-lead">{t('dashboard.pairs.multiAddLead')}</p>
            </div>
            {pairs.length > 0 && (
              <button type="button" className="btn-text" onClick={() => setBulkAddExpanded(false)}>
                {t('dashboard.pairs.bulkHideForm')}
              </button>
            )}
          </div>
          <details className="multi-add-details">
            <summary>{t('dashboard.pairs.howItWorks')}</summary>
            <p>{t('dashboard.pairs.multiAddHelper')}</p>
            <p>{t('dashboard.pairs.keywordEnterHint')}</p>
          </details>
          <div className="multi-add-columns">
            <div className="multi-add-col">
              <h3 className="multi-add-section-title">{t('dashboard.pairs.bulkUrlsTitle')}</h3>
              <textarea
                ref={bulkUrlTaRef}
                value={bulkUrlText}
                onChange={(e) => setBulkUrlText(e.target.value)}
                onKeyDown={commitUrlLineAtCursor}
                onPaste={pasteUrlsFromClipboard}
                placeholder={t('dashboard.pairs.placeholderUrls')}
                rows={4}
                style={{ width: '100%', resize: 'vertical', minHeight: '3.25rem' }}
                aria-label={t('dashboard.pairs.bulkUrlsTitle')}
              />
              {(stagedUrls.length > 0 || draftUrlDomains.length > 0) && (
                <div className="multi-add-chip-row" aria-live="polite">
                  {stagedUrls.map((u, idx) => (
                    <span key={`s-${u}-${idx}`} className="multi-add-chip multi-add-chip--staged">
                      <button
                        type="button"
                        className="multi-add-chip-label-btn"
                        onClick={() => returnStagedUrlToDraft(idx)}
                        title={t('dashboard.pairs.chipClickToEdit')}
                      >
                        ✓ {u}
                      </button>
                      <button
                        type="button"
                        className="multi-add-chip-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeStagedUrlAt(idx);
                        }}
                        aria-label={`${t('dashboard.pairs.removeChip')}: ${u}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {draftUrlDomains.map((u, idx) => (
                    <span key={`d-${u}-${idx}`} className="multi-add-chip multi-add-chip--draft">
                      <span>{u}</span>
                      <button
                        type="button"
                        className="multi-add-chip-remove"
                        onClick={() => removeDraftUrlLine(u)}
                        aria-label={`${t('dashboard.pairs.removeDraftLine')}: ${u}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="multi-add-col">
              <h3 className="multi-add-section-title">{t('dashboard.pairs.bulkKeywordsTitle')}</h3>
              <textarea
                ref={bulkKeywordTaRef}
                value={bulkKeywordText}
                onChange={(e) => setBulkKeywordText(e.target.value)}
                onKeyDown={commitKeywordLineAtCursor}
                onPaste={pasteKeywordsFromClipboard}
                placeholder={t('dashboard.pairs.placeholderKeywords')}
                rows={4}
                style={{ width: '100%', resize: 'vertical', minHeight: '3.25rem' }}
                aria-label={t('dashboard.pairs.bulkKeywordsTitle')}
              />
              {(stagedKeywords.length > 0 || draftKeywordLines.length > 0) && (
                <div className="multi-add-chip-row" aria-live="polite">
                  {stagedKeywords.map((k, idx) => (
                    <span key={`sk-${k}-${idx}`} className="multi-add-chip multi-add-chip--staged">
                      <button
                        type="button"
                        className="multi-add-chip-label-btn"
                        onClick={() => returnStagedKeywordToDraft(idx)}
                        title={t('dashboard.pairs.chipClickToEdit')}
                      >
                        ✓ {k}
                      </button>
                      <button
                        type="button"
                        className="multi-add-chip-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeStagedKeywordAt(idx);
                        }}
                        aria-label={`${t('dashboard.pairs.removeChip')}: ${k}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {draftKeywordLines.map((k, idx) => (
                    <span key={`dk-${k}-${idx}`} className="multi-add-chip multi-add-chip--draft">
                      <span>{k}</span>
                      <button
                        type="button"
                        className="multi-add-chip-remove"
                        onClick={() => removeDraftKeywordLine(k)}
                        aria-label={`${t('dashboard.pairs.removeDraftLine')}: ${k}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {bulkAddedKeywords.length > 0 && (
                <div style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {bulkAddedKeywords.slice(0, 6).map((k, idx) => (
                    <div key={`${k}-${idx}`}>• {k}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button type="button" className="btn btn-primary multi-add-submit" onClick={() => addBulkPairs()}>
            {t('dashboard.pairs.addAll')}
          </button>
        </div>
        )}

        <div className="pairs-table-shell" ref={tableTopRef}>
          <div
            className="pairs-table-toolbar"
            role="region"
            aria-label={t('dashboard.table.toolbarAria')}
          >
            <div className="pairs-table-toolbar-main">
              <div className="pairs-table-toolbar-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={trackAll}
                  disabled={
                    saving ||
                    reordering ||
                    pairs.length === 0 ||
                    pairs.some((p) => p.pair_id.startsWith('temp_'))
                  }
                  aria-busy={saving}
                >
                  {t('dashboard.table.measureAll')}
                </button>
                {lastBulkAddedMeasurableCount > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={trackLastAddedOnly}
                    disabled={loading || saving || bulkDeleting || reordering}
                    aria-busy={saving}
                  >
                    {t('dashboard.table.measureLastAdded').replace(
                      '{count}',
                      String(lastBulkAddedMeasurableCount)
                    )}
                  </button>
                )}
                {selectedDeletableCount > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={trackSelected}
                    disabled={loading || saving || bulkDeleting || reordering}
                    aria-busy={saving}
                  >
                    {t('dashboard.table.measureSelected').replace(
                      '{count}',
                      String(selectedDeletableCount)
                    )}
                  </button>
                )}
                {selectedDeletableCount > 0 && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={deleteSelectedPairs}
                    disabled={loading || saving || bulkDeleting || reordering}
                    aria-busy={bulkDeleting}
                  >
                    {t('dashboard.table.deleteSelected').replace('{count}', String(selectedDeletableCount))}
                  </button>
                )}
                {pairs.length > 0 && (
                  <div className="pairs-table-toolbar-hint">{t('dashboard.table.measureAllHint')}</div>
                )}
              </div>
              {measureAllProgress && (
                <div className="measure-all-progress-wrap" aria-live="polite">
                  <span>
                    {t('dashboard.measureInProgress')}{' '}
                    {Math.min(measureAllProgress.done, measureAllProgress.total)}/
                    {measureAllProgress.total}
                  </span>
                  <div className="measure-all-progress-track">
                    <div
                      className="measure-all-progress-fill"
                      style={{
                        width: `${
                          measureAllProgress.total
                            ? Math.round((measureAllProgress.done / measureAllProgress.total) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="table-container">
          <table className="pairs-table">
            <thead>
              <tr>
                <th className="pairs-table-select" scope="col" title={t('dashboard.table.selectColumn')}>
                  <input
                    ref={selectAllCheckboxRef}
                    type="checkbox"
                    className="pairs-table-checkbox"
                    checked={
                      selectablePairIds.length > 0 && selectedDeletableCount === selectablePairIds.length
                    }
                    onChange={toggleSelectAllSavedRows}
                    disabled={selectablePairIds.length === 0}
                    aria-label={t('dashboard.table.selectAllAria')}
                  />
                </th>
                <th className="pairs-table-drag-col" scope="col" title={t('dashboard.table.dragColumn')}>
                  <span className="pairs-table-drag-col-label" aria-hidden>
                    ::
                  </span>
                </th>
                <th style={{ width: '17%' }}>{t('dashboard.table.keyword')}</th>
                <th style={{ width: '20%' }}>{t('dashboard.table.url')}</th>
                <th style={{ width: '20%' }}>{t('dashboard.table.matchedUrl')}</th>
                <th style={{ width: '8%' }}>{t('dashboard.table.position')}</th>
                <th style={{ width: '13%', minWidth: '7rem' }}>{t('dashboard.table.lastMeasure')}</th>
                <th style={{ width: '10%' }}>{t('dashboard.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {pairs.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-state">
                    <p>{t('dashboard.table.empty')}</p>
                  </td>
                </tr>
              )}
              {pairs.map((pair) => (
                <tr
                  key={pair.pair_id}
                  className={[
                    pair.pair_id.startsWith('temp_')
                      ? ''
                      : `pairs-table-row--selectable${selectedPairIds.has(pair.pair_id) ? ' pairs-table-row--selected' : ''}`,
                    draggingIds?.has(pair.pair_id) ? 'pairs-table-row--dragging' : '',
                    dragOverPairId === pair.pair_id ? 'pairs-table-row--drag-over' : '',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined}
                  aria-selected={
                    pair.pair_id.startsWith('temp_') ? undefined : selectedPairIds.has(pair.pair_id)
                  }
                  title={
                    pair.pair_id.startsWith('temp_') ? undefined : t('dashboard.table.rowClickToSelect')
                  }
                  onClick={(e) => onPairTableRowClick(pair.pair_id, e)}
                  onDragOver={(e) => onPairRowDragOver(pair.pair_id, e)}
                  onDragLeave={(e) => onPairRowDragLeave(pair.pair_id, e)}
                  onDrop={(e) => onPairRowDrop(pair.pair_id, e)}
                >
                  <td className="pairs-table-select">
                    <input
                      type="checkbox"
                      className="pairs-table-checkbox"
                      checked={selectedPairIds.has(pair.pair_id)}
                      onChange={() => togglePairRowSelected(pair.pair_id)}
                      disabled={pair.pair_id.startsWith('temp_')}
                      aria-label={t('dashboard.table.selectRowAria')}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="pairs-table-drag-col">
                    <span
                      data-pair-drag-handle
                      className="pairs-table-drag-handle"
                      draggable={editingPair !== pair.pair_id}
                      aria-label={t('dashboard.table.dragHandleAria')}
                      title={t('dashboard.table.dragHandleAria')}
                      onDragStart={(e) => onPairDragStart(pair.pair_id, e)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="pairs-table-drag-grip" aria-hidden>
                        ⋮⋮
                      </span>
                    </span>
                  </td>
                  <td>
                    {editingPair === pair.pair_id ? (
                      <input
                        type="text"
                        value={editValues.keyword}
                        onChange={(e) => setEditValues({ ...editValues, keyword: e.target.value })}
                      />
                    ) : (
                      pair.keyword
                    )}
                  </td>
                  <td>
                    {editingPair === pair.pair_id ? (
                      <input
                        type="text"
                        value={editValues.url}
                        onChange={(e) => setEditValues({ ...editValues, url: e.target.value })}
                        placeholder="URL ou domaine"
                      />
                    ) : (
                      <>
                        {!pair.url.startsWith('http://') && !pair.url.startsWith('https://') ? (
                          <span title={`Tracking de domaine : ${pair.url.replace(/\/$/, '')}`}>
                            <span
                              style={{
                                ...getDomainBadgeStyle(pair.url),
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                marginRight: '4px',
                              }}
                            >
                              🌐 {t('dashboard.table.domain')}
                            </span>
                            <a
                              href={`https://${pair.url.replace(/^www\./, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="table-link"
                            >
                              {pair.url.replace(/\/$/, '')}
                            </a>
                          </span>
                        ) : (
                          <a href={pair.url} target="_blank" rel="noopener noreferrer" className="table-link">
                            {pair.url}
                          </a>
                        )}
                      </>
                    )}
                  </td>
                  <td>
                    {pair.last_matched_url ? (
                      <a
                        href={pair.last_matched_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="table-link table-link--matched"
                        style={{ fontSize: '0.85rem' }}
                      >
                        {pair.last_matched_url.length > 50
                          ? pair.last_matched_url.substring(0, 50) + '...'
                          : pair.last_matched_url}
                      </a>
                    ) : (
                      <span className="table-cell-muted">-</span>
                    )}
                  </td>
                  <td className="pairs-table-cell--rank">
                    {displayPosition(pair.last_position, pair.last_checked_at)}
                  </td>
                  <td>
                    {pair.last_checked_at
                      ? new Date(pair.last_checked_at).toLocaleString(dateLocale, {
                          timeZone: 'Europe/Paris',
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                        onClick={() => trackPair(pair.pair_id, pair.keyword)}
                        disabled={tracking.has(pair.pair_id) || saving || reordering}
                      >
                        {tracking.has(pair.pair_id) ? <span className="loading" /> : '▶'}
                      </button>
                      <button type="button" className="btn btn-danger" onClick={() => deletePair(pair.pair_id)}>
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {draggingIds && draggingIds.size > 0 && pairs.length > 0 && (
                <tr
                  className={`pairs-table-drop-tail ${dragOverTail ? 'pairs-table-drop-tail--active' : ''}`}
                  onDragOver={onDropZoneTailDragOver}
                  onDragLeave={onDropZoneTailDragLeave}
                  onDrop={onDropZoneTailDrop}
                >
                  <td colSpan={8} className="pairs-table-drop-tail-cell">
                    {t('dashboard.table.dropAtEnd')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        {historyDates.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>{t('dashboard.evolution.title')}</h3>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="pairs-table" style={{ fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th>{t('dashboard.table.keyword')}</th>
                    <th>{t('dashboard.table.url')}</th>
                    {historyDates.map((d) => (
                      <th key={d} style={{ whiteSpace: 'nowrap' }}>{new Date(d + 'T12:00:00').toLocaleDateString(dateLocale, { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: '2-digit' })}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pairs.map((pair) => (
                    <tr key={pair.pair_id}>
                      <td>{pair.keyword}</td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{pair.url}</td>
                      {historyDates.map((date) => {
                        const byDate = pair.history_by_date;
                        if (!byDate || !Object.prototype.hasOwnProperty.call(byDate, date)) {
                          return <td key={date}>-</td>;
                        }
                        const n = normalizeMeasuredRank(byDate[date]);
                        if (n != null) return <td key={date}>{n}</td>;
                        return <td key={date}>{t('dashboard.table.positionNotInTop100')}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      )}

      </div>

      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
