'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import ExcelJS from 'exceljs';
import { getParisDateString } from '@/lib/date-utils';
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
  const bulkTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const tableTopRef = useRef<HTMLDivElement | null>(null);
  const [editingPair, setEditingPair] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ keyword: string; url: string }>({ keyword: '', url: '' });
  const [showNoKeyBanner, setShowNoKeyBanner] = useState(false);
  const [hasSerpApiKey, setHasSerpApiKey] = useState<boolean | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [searchSettingsDone, setSearchSettingsDone] = useState(false);
  const [searchSettingsAlertVisible, setSearchSettingsAlertVisible] = useState(false);
  const [measureAllProgress, setMeasureAllProgress] = useState<{ done: number; total: number; startedAt: number } | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  const historyDates = useMemo(() => {
    const set = new Set<string>();
    pairs.forEach((p) => Object.keys(p.history_by_date || {}).forEach((d) => set.add(d)));
    return Array.from(set).sort();
  }, [pairs]);

  const splitLines = (text: string) =>
    (text || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

  const keywordPreview = useMemo(() => splitLines(bulkKeywordText), [bulkKeywordText]);
  const urlPreview = useMemo(
    () => splitLines(bulkUrlText).map((u) => toDomainOnly(u)).filter((u) => !!u && u.length >= 3),
    [bulkUrlText]
  );

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

  const measureCreatedPair = async (created: Pair): Promise<Pair> => {
    try {
      const response = await fetch(`/api/v1/pairs/${created.pair_id}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hl: settings.hl, gl: settings.gl }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        showActionableError(result?.error?.message || '');
        return created;
      }
      const day = result.checked_at ? getParisDateString(result.checked_at) : null;
      const updated: Pair = {
        ...created,
        last_position: result.position ?? null,
        last_checked_at: result.checked_at ?? null,
        last_matched_url: result.matched_url ?? created.last_matched_url ?? null,
        history_by_date: day
          ? { ...(created.history_by_date || {}), [day]: result.position ?? null }
          : created.history_by_date,
      };
      const positionText = result.position != null ? `${t('dashboard.toast.position')}: ${result.position}` : t('dashboard.toast.notFound');
      const debugText =
        result.pages_queried != null
          ? ` (${result.pages_queried} pages, ${result.elapsed_ms ?? 0} ms)`
          : '';
      showToast(`${t('dashboard.toast.measureDone')} - ${positionText}${debugText}`, 'success');
      return updated;
    } catch {
      showToast(t('dashboard.toast.serpError'), 'error');
      return created;
    }
  };

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
      const [settingsRes, pairsRes] = await Promise.all([
        fetch('/api/v1/settings'),
        fetch('/api/v1/pairs?includeHistory=1'),
      ]);
      if (settingsRes.ok && pairsRes.ok) {
        const settingsData = await settingsRes.json();
        const pairsData = await pairsRes.json();
        setSettings({ hl: settingsData.hl ?? 'fr', gl: settingsData.gl ?? 'fr' });
        setHasSerpApiKey(!!settingsData.hasSerpApiKey);
        setSearchSettingsDone(!!(settingsData.hl && settingsData.gl));
        setPairs(pairsData.items || []);
      } else {
        if (settingsRes.status === 401 || pairsRes.status === 401) {
          window.location.href = '/login';
          return;
        }
        setSettings({ hl: 'fr', gl: 'fr' });
        setHasSerpApiKey(null);
        setSearchSettingsDone(false);
        setPairs([]);
      }
    } catch {
      setSettings({ hl: 'fr', gl: 'fr' });
      setHasSerpApiKey(null);
      setSearchSettingsDone(false);
      setPairs([]);
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

  const addBulkPairs = async (keywordsRaw: string[], urlsRaw: string[]) => {
    const urls = urlsRaw
      .map((u) => toDomainOnly(u))
      .filter((u) => !!u && u.length >= 3);
    if (urls.length === 0) {
      showToast(t('dashboard.toast.enterUrl'), 'error');
      return;
    }
    const keywords = keywordsRaw.map((k) => k.trim()).filter(Boolean);
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

      if (hasSerpApiKey === true) {
        // measure each created pair in background
        for (const created of createdItems) {
          setTracking((prev) => new Set(prev).add(created.pair_id));
          measureCreatedPair(created)
            .then((measured) => {
              setPairs((prev) => prev.map((p) => (p.pair_id === created.pair_id ? measured : p)));
            })
            .finally(() => {
              setTracking((prev) => {
                const next = new Set(prev);
                next.delete(created.pair_id);
                return next;
              });
            });
        }
      }
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

  const importCSV = async (file: File) => {
    try {
      setLoading(true);
      let csvData: string;
      const isExcel = /\.xlsx?$/i.test(file.name);
      if (isExcel) {
        const buf = await file.arrayBuffer();
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf);
        const sheet = wb.worksheets[0];
        if (!sheet) {
          showToast(t('dashboard.toast.emptyExcel'), 'error');
          setLoading(false);
          return;
        }
        const rows: string[][] = [];
        sheet.eachRow((row) => {
          const values = (row.values as (string | number | undefined)[])?.slice(1) ?? [];
          rows.push(values.map((v) => String(v ?? '').trim()));
        });
        csvData = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      } else {
        csvData = await file.text();
      }
      const response = await fetch('/api/v1/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData }),
      });
      if (response.ok) {
        const result = await response.json();
        showToast(
          `${result.imported} ${t('dashboard.toast.imported')}${result.failed > 0 ? `, ${result.failed} ${t('dashboard.toast.failed')}` : ''}`,
          'success'
        );
        loadData();
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`${t('dashboard.toast.error')}: ${errorData.error?.message || t('dashboard.toast.unknownError')}`, 'error');
      }
    } catch {
      showToast(t('dashboard.toast.importError'), 'error');
    } finally {
      setLoading(false);
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

  const trackPair = async (pairId: string) => {
    if (!searchSettingsDone) {
      showSearchSettingsAlert();
      showToast(t('dashboard.toast.completeSearchSettings'), 'error');
      return;
    }
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
        setPairs((prev) =>
          prev.map((p) =>
            p.pair_id === pairId
              ? {
                  ...p,
                  last_position: result.position,
                  last_checked_at: result.checked_at,
                  last_matched_url: result.matched_url ?? p.last_matched_url,
                  history_by_date: day
                    ? { ...(p.history_by_date || {}), [day]: result.position }
                    : p.history_by_date,
                }
              : p
          )
        );
        const positionText = result.position != null ? `${t('dashboard.toast.position')}: ${result.position}` : t('dashboard.toast.notFound');
        const debugText =
          result.pages_queried != null
            ? ` (${result.pages_queried} pages, ${result.elapsed_ms ?? 0} ms)`
            : '';
        showToast(`${t('dashboard.toast.measureDone')} - ${positionText}${debugText}`, 'success');
      } else {
        showActionableError(result.error?.message || '');
      }
    } catch {
      showToast(t('dashboard.toast.serpError'), 'error');
    } finally {
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
              // Keep last known position when the measure failed for this pair.
              if (updated.error) {
                return pair;
              }
              const day = updated.checked_at ? getParisDateString(updated.checked_at) : null;
              return {
                ...pair,
                last_position: updated.position,
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
        <div className="header">
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

      {/* Status bar */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          background: '#fff',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link
            href="/settings"
            className={`status-badge ${hasSerpApiKey === true ? 'success' : 'pending'}`}
            style={{ textDecoration: 'none' }}
          >
            API Key: {hasSerpApiKey === true ? 'OK' : 'Manquante'}
          </Link>
          <Link
            href="/settings"
            className={`status-badge ${searchSettingsDone ? 'success' : 'pending'}`}
            style={{ textDecoration: 'none' }}
          >
            Langue/Pays: {searchSettingsDone ? 'OK' : 'Manquant'}
          </Link>
          <span className="status-badge" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#334155' }}>
            Top 100
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {measureAllProgress && (
            <span style={{ color: '#475569', fontSize: '0.9rem' }}>
              Mesure en cours… {Math.min(measureAllProgress.done, measureAllProgress.total)}/{measureAllProgress.total}
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
              <a href="https://serpapi.com/manage-api-key" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.6rem 1.2rem' }}>
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
            <a href="https://serpapi.com/manage-api-key" target="_blank" rel="noopener noreferrer" className="btn btn-primary">{t('dashboard.warning.getKey')}</a>
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
            <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }} title="1re colonne = mots-clés, 2e = URLs (noms des colonnes libres)">
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    importCSV(file);
                    e.target.value = '';
                  }
                }}
                style={{ display: 'none' }}
              />
              {t('dashboard.pairs.import')}
            </label>
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
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            {t('dashboard.pairs.multiAddHelper')}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 320px', minWidth: 260 }}>
              <textarea
                value={bulkUrlText}
                onChange={(e) => setBulkUrlText(e.target.value)}
                placeholder={t('dashboard.pairs.placeholderUrls')}
                rows={4}
                style={{ width: '100%', resize: 'vertical', minHeight: '3.25rem' }}
              />
              {urlPreview.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {urlPreview.slice(0, 12).map((u, idx) => (
                    <span key={`${u}-${idx}`} style={{ fontSize: '0.8rem', padding: '0.18rem 0.45rem', borderRadius: 999, border: '1px solid #cbd5e1', background: '#fff' }}>
                      {u}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex: '1 1 320px', minWidth: 260 }}>
              <textarea
                ref={bulkTextareaRef}
                value={bulkKeywordText}
                onChange={(e) => setBulkKeywordText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' || e.shiftKey) return;
                  e.preventDefault();
                  const el = e.currentTarget;
                  const text = el.value || '';
                  const lines = text
                    .split('\n')
                    .map((l) => l.trim())
                    .filter(Boolean);
                  if (lines.length === 0) {
                    setBulkKeywordText(text + '\n');
                    return;
                  }
                  addBulkPairs(lines, splitLines(bulkUrlText));
                  setBulkKeywordText('');
                  requestAnimationFrame(() => {
                    bulkTextareaRef.current?.focus();
                  });
                }}
                placeholder={t('dashboard.pairs.placeholderKeywords')}
                rows={4}
                style={{ width: '100%', resize: 'vertical', minHeight: '3.25rem' }}
              />
              {bulkAddedKeywords.length > 0 && (
                <div style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {bulkAddedKeywords.slice(0, 8).map((k, idx) => (
                    <div key={`${k}-${idx}`}>• {k}</div>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => addBulkPairs(splitLines(bulkKeywordText), splitLines(bulkUrlText))}
            >
              {t('dashboard.pairs.addAll')}
            </button>
          </div>
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
                        onClick={() => trackPair(pair.pair_id)}
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
