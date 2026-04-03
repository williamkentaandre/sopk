'use client';

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  type KeyboardEvent,
  type ClipboardEvent,
} from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { getParisDateString } from '@/lib/date-utils';
import { formatSearchLocaleLine } from '@/lib/search-locale-labels';
import { useLocale } from '@/app/LocaleContext';
import { SerpApiOnboardingIllustration } from '@/app/components/SerpApiOnboardingIllustration';

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
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  /** Sync guard: React state for `tracking` can lag one frame — double-clicks could otherwise fire two measures and the slower response would overwrite the row. */
  const pairMeasureInFlightRef = useRef<Set<string>>(new Set());

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

  const displayPosition = (pos: number | null) => {
    if (pos == null) return '> 100';
    return String(pos);
  };

  /** Same source as page load: GET balance (no reliance on search/track parsing). */
  const refreshSerperCreditsFromApi = useCallback(async () => {
    try {
      const r = await fetch('/api/v1/serper-credits');
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
    try {
      const [settingsRes, pairsRes, creditsRes] = await Promise.all([
        fetch('/api/v1/settings'),
        fetch('/api/v1/pairs?includeHistory=1'),
        fetch('/api/v1/serper-credits'),
      ]);
      if (settingsRes.ok && pairsRes.ok) {
        const settingsData = await settingsRes.json();
        const pairsData = await pairsRes.json();
        setSettings({ hl: settingsData.hl ?? 'fr', gl: settingsData.gl ?? 'fr' });
        setHasSerpApiKey(!!settingsData.hasSerpApiKey);
        setSearchSettingsDone(!!(settingsData.hl && settingsData.gl));
        setPairs(pairsData.items || []);
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
        setSerperCredits(null);
      }
    } catch {
      setSettings({ hl: 'fr', gl: 'fr' });
      setHasSerpApiKey(null);
      setSearchSettingsDone(false);
      setPairs([]);
      setSerperCredits(null);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
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
        showToast(`${t('dashboard.toast.error')}: ${result?.error?.message || t('dashboard.toast.unknownError')}`, 'error');
        return;
      }

      const createdItems = (result.items || []) as Pair[];
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
    } catch {
      const tempIds = new Set(tempPairs.map((p) => p.pair_id));
      setPairs((prev) => prev.filter((p) => !tempIds.has(p.pair_id)));
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

  const deletePair = async (pairId: string) => {
    if (!confirm(t('dashboard.confirm.deletePair'))) return;
    try {
      const response = await fetch(`/api/v1/pairs/${pairId}`, { method: 'DELETE' });
      if (response.ok) {
        setPairs((prev) => prev.filter((p) => p.pair_id !== pairId));
        showToast(t('dashboard.toast.pairDeleted'), 'success');
      } else {
        showToast(t('dashboard.toast.deleteError'), 'error');
      }
    } catch {
      showToast(t('dashboard.toast.deleteError'), 'error');
    }
  };

  const deleteAllPairs = async () => {
    if (!confirm(t('dashboard.confirm.deleteAll'))) return;
    if (!confirm(t('dashboard.confirm.deleteAllConfirm'))) return;
    try {
      setLoading(true);
      const response = await fetch('/api/v1/pairs/delete-all', { method: 'DELETE' });
      if (response.ok) {
        const result = await response.json();
        showToast(`${result.deleted} ${t('dashboard.toast.pairsDeleted')}`, 'success');
        setPairs([]);
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

  const trackPair = async (pairId: string, keywordHint?: string) => {
    if (!searchSettingsDone) {
      showSearchSettingsAlert();
      showToast(t('dashboard.toast.completeSearchSettings'), 'error');
      return;
    }
    if (pairMeasureInFlightRef.current.has(pairId)) {
      return;
    }
    pairMeasureInFlightRef.current.add(pairId);
    setTracking((prev) => new Set(prev).add(pairId));
    try {
      const response = await fetch(`/api/v1/pairs/${pairId}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hl: settings.hl, gl: settings.gl }),
      });
      const result = await response.json();
      if (response.ok) {
        const day = result.checked_at ? getParisDateString(result.checked_at) : null;
        const pos =
          result.position == null || result.position === ''
            ? null
            : typeof result.position === 'number'
              ? result.position
              : Number(result.position);
        const normalizedPos =
          pos != null && Number.isFinite(pos) && pos >= 1 ? pos : null;
        setPairs((prev) =>
          prev.map((p) =>
            p.pair_id === pairId
              ? {
                  ...p,
                  last_position:
                    normalizedPos != null ? normalizedPos : p.last_position ?? null,
                  last_checked_at: result.checked_at,
                  last_matched_url: result.matched_url ?? p.last_matched_url,
                  history_by_date: day
                    ? { ...(p.history_by_date || {}), [day]: normalizedPos }
                    : p.history_by_date,
                }
              : p
          )
        );
        const positionText =
          normalizedPos != null
            ? `${t('dashboard.toast.position')}: ${normalizedPos}`
            : t('dashboard.toast.notFound');
        const debugText =
          result.pages_queried != null
            ? ` (${result.pages_queried} pages, ${result.elapsed_ms ?? 0} ms)`
            : '';
        void refreshSerperCreditsFromApi();
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
  };

  const trackAll = async () => {
    if (!searchSettingsDone) {
      showSearchSettingsAlert();
      showToast(t('dashboard.toast.completeSearchSettings'), 'error');
      return;
    }
    if (!confirm(t('dashboard.confirm.measureAll'))) return;
    setSaving(true);
    setMeasureAllProgress({ done: 0, total: pairs.length, startedAt: Date.now() });
    try {
      const response = await fetch('/api/v1/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hl: settings.hl, gl: settings.gl }),
      });
      if (response.ok) {
        const result = await response.json();
        const total = Number(result.total || pairs.length || 0);
        setMeasureAllProgress((p) => (p ? { ...p, total, done: total } : { done: total, total, startedAt: Date.now() }));
        const failedCount = Number(result.failed || 0);
        setPairs((prev) =>
          prev.map((pair) => {
            const updated =
              result.results?.find((r: any) => r.pair_id === pair.pair_id) ||
              result.results?.find(
                (r: any) =>
                  r.keyword?.toLowerCase() === pair.keyword.toLowerCase() &&
                  normalizeUrlForCompare(r.url || '') === normalizeUrlForCompare(pair.url || '')
              );
            if (updated) {
              // Keep last known position when the measure failed or API error for this pair.
              if (updated.error) {
                return pair;
              }
              const day = updated.checked_at ? getParisDateString(updated.checked_at) : null;
              return {
                ...pair,
                last_position:
                  updated.position != null ? updated.position : pair.last_position ?? null,
                last_checked_at: updated.checked_at,
                last_matched_url: updated.matched_url ?? pair.last_matched_url ?? null,
                history_by_date: day
                  ? { ...(pair.history_by_date || {}), [day]: updated.position }
                  : pair.history_by_date,
              };
            }
            return pair;
          })
        );
        void refreshSerperCreditsFromApi();
        if (failedCount > 0) {
          showToast(
            `${t('dashboard.toast.measurementsDone')} (${result.successful || 0} OK, ${failedCount} erreurs)`,
            'error'
          );
        } else {
          showToast(t('dashboard.toast.measurementsDone'), 'success');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        showActionableError(errorData.error?.message || '');
      }
    } catch {
      showToast(t('dashboard.toast.serpError'), 'error');
    } finally {
      setSaving(false);
      window.setTimeout(() => setMeasureAllProgress(null), 2500);
    }
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
        <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{t('dashboard.loading')}</p>
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
                <span
                  className="status-badge"
                  style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#334155' }}
                  title={t('dashboard.serpCreditsHint')}
                >
                  {t('dashboard.serpCredits')}:{' '}
                  {typeof serperCredits === 'number' ? serperCredits.toLocaleString(dateLocale) : '—'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {measureAllProgress && (
                <span style={{ color: '#475569', fontSize: '0.9rem' }}>
                  {t('dashboard.measureInProgress')}{' '}
                  {Math.min(measureAllProgress.done, measureAllProgress.total)}/{measureAllProgress.total}
                </span>
              )}
              {measureAllProgress && (
                <div style={{ width: 180, height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${measureAllProgress.total ? Math.round((measureAllProgress.done / measureAllProgress.total) * 100) : 0}%`,
                      height: '100%',
                      background: '#2563eb',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

      {(hasSerpApiKey !== true) && (
        <div className="onboarding-with-image" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div className="card-onboarding" style={{ flex: '1 1 20rem', maxWidth: '36rem', borderColor: '#fecaca', background: '#fef2f2' }}>
            <h2 style={{ color: '#991b1b' }}>{t('dashboard.onboarding.title')}</h2>
            <p style={{ margin: '0 0 1rem', color: '#7f1d1d', lineHeight: 1.5 }}>
              {t('dashboard.onboarding.desc')}
            </p>
            <ol style={{ margin: '0 0 1.25rem', paddingLeft: '1.25rem', color: '#7f1d1d', lineHeight: 1.7 }}>
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
          className="settings-card"
          style={{
            marginBottom: '1.5rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            textAlign: 'center',
            padding: '2rem 1.25rem',
          }}
        >
          <h2 style={{ color: '#991b1b', marginBottom: '0.75rem' }}>{t('dashboard.searchSettings.title')}</h2>
          <p style={{ color: '#7f1d1d', fontWeight: 600, fontSize: '1rem', marginBottom: '1rem' }}>
            {t('dashboard.searchSettings.missing')}
          </p>
          <p style={{ color: '#7f1d1d', marginBottom: '0' }}>{t('dashboard.searchSettings.goToSettings')}</p>
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

        <div className="multi-add-block">
          <p>{t('dashboard.pairs.multiAdd')}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            {t('dashboard.pairs.multiAddHelper')}
          </p>
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
              <p className="multi-add-hint">{t('dashboard.pairs.keywordEnterHint')}</p>
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

        <div ref={tableTopRef} />
        <div className="table-container">
          <table className="pairs-table">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>{t('dashboard.table.keyword')}</th>
                <th style={{ width: '22%' }}>{t('dashboard.table.url')}</th>
                <th style={{ width: '22%' }}>{t('dashboard.table.matchedUrl')}</th>
                <th style={{ width: '8%' }}>{t('dashboard.table.position')}</th>
                <th style={{ width: '13%', minWidth: '7rem' }}>{t('dashboard.table.lastMeasure')}</th>
                <th style={{ width: '10%' }}>{t('dashboard.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} style={{ textAlign: 'right', padding: '0.5rem 0.75rem' }}>
                  <button type="button" className="btn btn-primary" onClick={trackAll} disabled={saving || pairs.length === 0}>
                    {t('dashboard.table.measureAll')}
                  </button>
                </td>
              </tr>
              {pairs.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    <p>{t('dashboard.table.empty')}</p>
                  </td>
                </tr>
              )}
              {pairs.map((pair) => (
                <tr key={pair.pair_id}>
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
                              style={{ color: '#1a73e8' }}
                            >
                              {pair.url.replace(/\/$/, '')}
                            </a>
                          </span>
                        ) : (
                          <a href={pair.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1a73e8' }}>
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
                        style={{ color: '#059669', fontSize: '0.85rem' }}
                      >
                        {pair.last_matched_url.length > 50
                          ? pair.last_matched_url.substring(0, 50) + '...'
                          : pair.last_matched_url}
                      </a>
                    ) : (
                      <span style={{ color: '#999', fontSize: '0.85rem' }}>-</span>
                    )}
                  </td>
                  <td>
                    <strong>{displayPosition(pair.last_position)}</strong>
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
                        disabled={tracking.has(pair.pair_id)}
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
            </tbody>
          </table>
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
                      {historyDates.map((date) => (
                        <td key={date}>{pair.history_by_date?.[date] != null ? pair.history_by_date[date] : '-'}</td>
                      ))}
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
