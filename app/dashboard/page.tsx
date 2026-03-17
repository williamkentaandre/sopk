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
  const [newPair, setNewPair] = useState({ keyword: '', url: '' });
  const [multiAddUrl, setMultiAddUrl] = useState('');
  const [multiAddKeywords, setMultiAddKeywords] = useState<string[]>(['']);
  const multiKeywordRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [editingPair, setEditingPair] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ keyword: string; url: string }>({ keyword: '', url: '' });
  const [showNoKeyBanner, setShowNoKeyBanner] = useState(false);
  const [hasSerpApiKey, setHasSerpApiKey] = useState<boolean | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const historyDates = useMemo(() => {
    const set = new Set<string>();
    pairs.forEach((p) => Object.keys(p.history_by_date || {}).forEach((d) => set.add(d)));
    return Array.from(set).sort();
  }, [pairs]);

  const isNoSerpKeyError = (msg: string) =>
    /clé|serp|paramètres/i.test(msg || '');

  const measureCreatedPair = async (created: Pair): Promise<Pair> => {
    try {
      const response = await fetch(`/api/v1/pairs/${created.pair_id}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hl: settings.hl, gl: settings.gl }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errMsg = result?.error?.message || '';
        if (isNoSerpKeyError(errMsg)) {
          setShowNoKeyBanner(true);
          showToast(t('dashboard.toast.addKeyInSettings'), 'error');
        } else {
          showToast(`${t('dashboard.toast.error')}: ${errMsg || t('dashboard.toast.unknownError')}`, 'error');
        }
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
      showToast(`${t('dashboard.toast.measureDone')} - ${positionText}`, 'success');
      return updated;
    } catch {
      showToast(t('dashboard.toast.serpError'), 'error');
      return created;
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
        setPairs(pairsData.items || []);
      } else {
        if (settingsRes.status === 401 || pairsRes.status === 401) {
          window.location.href = '/login';
          return;
        }
        setSettings({ hl: 'fr', gl: 'fr' });
        setHasSerpApiKey(null);
        setPairs([]);
      }
    } catch {
      setSettings({ hl: 'fr', gl: 'fr' });
      setHasSerpApiKey(null);
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

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (response.ok) showToast(t('dashboard.toast.settingsSaved'), 'success');
      else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`${t('dashboard.toast.error')}: ${errorData.error?.message || t('dashboard.toast.unknownError')}`, 'error');
      }
    } catch {
      showToast(t('dashboard.toast.saveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const normalizeUrlForCompare = (u: string) => {
    const t = u.trim().toLowerCase();
    if (!t) return '';
    const withoutProtocol = t.replace(/^https?:\/\//, '').replace(/^www\./, '');
    return withoutProtocol.replace(/\/$/, '');
  };

  const isDuplicatePair = (keyword: string, url: string) =>
    pairs.some(
      (p) =>
        p.keyword.trim().toLowerCase() === keyword.trim().toLowerCase() &&
        normalizeUrlForCompare(p.url) === normalizeUrlForCompare(url)
    );

  const addPair = async () => {
    if (!newPair.keyword.trim() || !newPair.url.trim()) {
      showToast(t('dashboard.toast.fillFields'), 'error');
      return;
    }
    const url = newPair.url.trim();
    if (!url || url.length < 3) {
      showToast(t('dashboard.toast.invalidUrl'), 'error');
      return;
    }
    if (isDuplicatePair(newPair.keyword, url)) {
      showToast(t('dashboard.toast.duplicatePair'), 'error');
      return;
    }
    try {
      const response = await fetch('/api/v1/pairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairs: [{ keyword: newPair.keyword.trim(), url }],
        }),
      });
      if (response.ok) {
        const result = await response.json();
        const createdItems = (result.items || []) as Pair[];
        const created = createdItems?.[0];
        if (hasSerpApiKey === true && created?.pair_id) {
          const measured = await measureCreatedPair(created);
          setPairs((prev) => [measured, ...prev]);
        } else {
          setPairs((prev) => [...createdItems, ...prev]);
        }
        setNewPair({ keyword: '', url: '' });
        showToast(t('dashboard.toast.pairAdded'), 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`${t('dashboard.toast.error')}: ${errorData.error?.message || t('dashboard.toast.unknownError')}`, 'error');
      }
    } catch {
      showToast(t('dashboard.toast.addError'), 'error');
    }
  };

  const addMultiplePairs = async () => {
    const url = multiAddUrl.trim();
    if (!url || url.length < 3) {
      showToast(t('dashboard.toast.enterUrl'), 'error');
      return;
    }
    const keywords = multiAddKeywords.map((k) => k.trim()).filter(Boolean);
    const seen = new Set<string>();
    const toCreate: { keyword: string; url: string }[] = [];
    for (const kw of keywords) {
      const key = `${kw.toLowerCase()}|${normalizeUrlForCompare(url)}`;
      if (seen.has(key) || isDuplicatePair(kw, url)) continue;
      seen.add(key);
      toCreate.push({ keyword: kw, url });
    }
    if (toCreate.length === 0) {
      showToast(t('dashboard.toast.noNewKeywords'), 'error');
      return;
    }
    try {
      const response = await fetch('/api/v1/pairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairs: toCreate }),
      });
      if (response.ok) {
        const result = await response.json();
        setPairs((prev) => [...(result.items || []), ...prev]);
        setMultiAddKeywords(['']);
        showToast(`${toCreate.length} ${t('dashboard.toast.pairsAdded')}`, 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`${t('dashboard.toast.error')}: ${errorData.error?.message || t('dashboard.toast.unknownError')}`, 'error');
      }
    } catch {
      showToast(t('dashboard.toast.addError'), 'error');
    }
  };

  const addSingleMultiPair = async (index: number) => {
    const url = multiAddUrl.trim();
    const keyword = (multiAddKeywords[index] || '').trim();
    if (!url || url.length < 3) {
      showToast(t('dashboard.toast.enterUrl'), 'error');
      return;
    }
    if (!keyword) return;
    if (isDuplicatePair(keyword, url)) {
      showToast(t('dashboard.toast.duplicatePair'), 'error');
      return;
    }
    // Optimistic UI: add immediately, measure in background
    const tempId = `temp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const optimistic: Pair = {
      pair_id: tempId,
      keyword,
      url,
      last_position: null,
      last_checked_at: null,
      last_matched_url: null,
    };
    setPairs((prev) => [optimistic, ...prev]);

    setMultiAddKeywords((prev) => {
      const next = [...prev];
      next[index] = '';
      if (index === prev.length - 1) next.push('');
      return next;
    });

    // Focus next field right away
    requestAnimationFrame(() => {
      const nextIndex = Math.min(index + 1, multiKeywordRefs.current.length - 1);
      multiKeywordRefs.current[nextIndex]?.focus();
    });

    try {
      const response = await fetch('/api/v1/pairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairs: [{ keyword, url }] }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPairs((prev) => prev.filter((p) => p.pair_id !== tempId));
        showToast(`${t('dashboard.toast.error')}: ${result?.error?.message || t('dashboard.toast.unknownError')}`, 'error');
        return;
      }

      const created = ((result.items || []) as Pair[])[0];
      if (!created?.pair_id) {
        setPairs((prev) => prev.filter((p) => p.pair_id !== tempId));
        showToast(t('dashboard.toast.unknownError'), 'error');
        return;
      }

      // Replace optimistic row with real row
      setPairs((prev) => prev.map((p) => (p.pair_id === tempId ? created : p)));
      showToast(t('dashboard.toast.pairAdded'), 'success');

      // Measure asynchronously; update in-place when done
      if (hasSerpApiKey === true) {
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
    } catch {
      setPairs((prev) => prev.filter((p) => p.pair_id !== tempId));
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
        showToast(`${t('dashboard.toast.measureDone')} - ${positionText}`, 'success');
      } else {
        const errMsg = result.error?.message || '';
        if (isNoSerpKeyError(errMsg)) {
          setShowNoKeyBanner(true);
          showToast(t('dashboard.toast.addKeyInSettings'), 'error');
        } else {
          showToast(`${t('dashboard.toast.error')}: ${errMsg || t('dashboard.toast.unknownError')}`, 'error');
        }
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
    if (!confirm(t('dashboard.confirm.measureAll'))) return;
    setSaving(true);
    try {
      const response = await fetch('/api/v1/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hl: settings.hl, gl: settings.gl }),
      });
      if (response.ok) {
        const result = await response.json();
        setPairs((prev) =>
          prev.map((pair) => {
            const updated = result.results?.find((r: any) => r.pair_id === pair.pair_id);
            if (updated) {
              const day = updated.checked_at ? getParisDateString(updated.checked_at) : null;
              return {
                ...pair,
                last_position: updated.position,
                last_checked_at: updated.checked_at,
                history_by_date: day
                  ? { ...(pair.history_by_date || {}), [day]: updated.position }
                  : pair.history_by_date,
              };
            }
            return pair;
          })
        );
        showToast(t('dashboard.toast.measurementsDone'), 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error?.message || '';
        if (isNoSerpKeyError(errMsg)) {
          setShowNoKeyBanner(true);
          showToast(t('dashboard.toast.addKeyInSettings'), 'error');
        } else {
          showToast(`${t('dashboard.toast.error')}: ${errMsg || t('dashboard.toast.unknownError')}`, 'error');
        }
      }
    } catch {
      showToast(t('dashboard.toast.serpError'), 'error');
    } finally {
      setSaving(false);
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

      {(hasSerpApiKey !== true) && (
        <div className="onboarding-with-image" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div className="card-onboarding" style={{ flex: '1 1 20rem', maxWidth: '36rem' }}>
            <h2>{t('dashboard.onboarding.title')}</h2>
            <p style={{ margin: '0 0 1rem', color: '#333', lineHeight: 1.5 }}>
              {t('dashboard.onboarding.desc')}
            </p>
            <ol style={{ margin: '0 0 1.25rem', paddingLeft: '1.25rem', color: '#333', lineHeight: 1.7 }}>
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

      <div className="settings-card">
        <h2>{t('dashboard.searchSettings.title')}</h2>
        <div className="settings-form">
          <div className="form-group">
            <label>{t('dashboard.searchSettings.language')}</label>
            <select value={settings.hl} onChange={(e) => setSettings({ ...settings, hl: e.target.value })}>
              <option value="fr">{t('opt.french')}</option>
              <option value="en">{t('opt.english')}</option>
              <option value="es">{t('opt.spanish')}</option>
              <option value="de">{t('opt.german')}</option>
              <option value="it">{t('opt.italian')}</option>
              <option value="pt">{t('opt.portuguese')}</option>
              <option value="nl">{t('opt.dutch')}</option>
              <option value="pl">{t('opt.polish')}</option>
              <option value="ru">{t('opt.russian')}</option>
              <option value="ja">{t('opt.japanese')}</option>
              <option value="zh">{t('opt.chinese')}</option>
              <option value="ar">{t('opt.arabic')}</option>
            </select>
          </div>
          <div className="form-group">
            <label>{t('dashboard.searchSettings.location')}</label>
            <select value={settings.gl} onChange={(e) => setSettings({ ...settings, gl: e.target.value })}>
              <option value="fr">{t('opt.france')}</option>
              <option value="be">{t('opt.belgium')}</option>
              <option value="ch">{t('opt.switzerland')}</option>
              <option value="ca">{t('opt.canada')}</option>
              <option value="us">{t('opt.unitedStates')}</option>
              <option value="uk">{t('opt.unitedKingdom')}</option>
              <option value="de">{t('opt.germany')}</option>
              <option value="es">{t('opt.spain')}</option>
              <option value="it">{t('opt.italy')}</option>
              <option value="pt">{t('opt.portugal')}</option>
              <option value="nl">{t('opt.netherlands')}</option>
              <option value="pl">{t('opt.poland')}</option>
              <option value="ru">{t('opt.russia')}</option>
              <option value="jp">{t('opt.japan')}</option>
              <option value="cn">{t('opt.china')}</option>
              <option value="au">{t('opt.australia')}</option>
              <option value="br">{t('opt.brazil')}</option>
              <option value="mx">{t('opt.mexico')}</option>
              <option value="in">{t('opt.india')}</option>
              <option value="sg">{t('opt.singapore')}</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>
            {saving ? <span className="loading" /> : t('dashboard.searchSettings.save')}
          </button>
        </div>
      </div>

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
            <div style={{ position: 'relative', display: 'inline-block' }}>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              value={multiAddUrl}
              onChange={(e) => setMultiAddUrl(e.target.value)}
              placeholder={t('dashboard.pairs.placeholderUrl')}
              title="URL ou domaine (ex: example.com)"
              style={{ minWidth: 220 }}
            />
            {multiAddKeywords.map((kw, i) => (
              <input
                key={i}
                ref={(el) => {
                  multiKeywordRefs.current[i] = el;
                }}
                type="text"
                value={kw}
                onChange={(e) => {
                  const next = [...multiAddKeywords];
                  next[i] = e.target.value;
                  setMultiAddKeywords(next);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSingleMultiPair(i);
                  }
                }}
                placeholder={t('dashboard.pairs.placeholderKeyword')}
                style={{ width: 120 }}
              />
            ))}
            <button type="button" className="btn btn-secondary" onClick={() => setMultiAddKeywords((prev) => [...prev, ''])} title="+">
              +
            </button>
            <button type="button" className="btn btn-primary" onClick={addMultiplePairs}>
              {t('dashboard.pairs.addAll')}
            </button>
          </div>
        </div>

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
                <td>
                  <input
                    type="text"
                    value={newPair.keyword}
                    onChange={(e) => setNewPair({ ...newPair, keyword: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && addPair()}
                    placeholder={t('dashboard.table.newKeyword')}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={newPair.url}
                    onChange={(e) => setNewPair({ ...newPair, url: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && addPair()}
                    placeholder={t('dashboard.pairs.placeholderUrl')}
                  />
                </td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-primary" onClick={addPair}>
                    {t('dashboard.table.add')}
                  </button>
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
                                background: '#e8f4f8',
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
                    <strong>{pair.last_position != null ? pair.last_position : '-'}</strong>
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
                      {editingPair === pair.pair_id ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                            onClick={() => saveEdit(pair.pair_id)}
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                            onClick={cancelEdit}
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                            onClick={() => trackPair(pair.pair_id)}
                            disabled={tracking.has(pair.pair_id)}
                          >
                            {tracking.has(pair.pair_id) ? <span className="loading" /> : '▶'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                            onClick={() => startEdit(pair)}
                          >
                            ✎
                          </button>
                          <button type="button" className="btn btn-danger" onClick={() => deletePair(pair.pair_id)}>
                            ✕
                          </button>
                        </>
                      )}
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

      </div>

      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
