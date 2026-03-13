'use client';

import { useState, useEffect, useMemo } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { getParisDateString } from '@/lib/date-utils';

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
  const [settings, setSettings] = useState<Settings>({ hl: 'fr', gl: 'fr' });
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tracking, setTracking] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [newPair, setNewPair] = useState({ keyword: '', url: '' });
  const [multiAddUrl, setMultiAddUrl] = useState('');
  const [multiAddKeywords, setMultiAddKeywords] = useState<string[]>(['']);
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
      if (response.ok) showToast('Paramètres sauvegardés', 'success');
      else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Erreur: ${errorData.error?.message || 'Erreur inconnue'}`, 'error');
      }
    } catch {
      showToast('Erreur lors de la sauvegarde', 'error');
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
      showToast('Veuillez remplir tous les champs', 'error');
      return;
    }
    const url = newPair.url.trim();
    if (!url || url.length < 3) {
      showToast('URL ou domaine invalide', 'error');
      return;
    }
    if (isDuplicatePair(newPair.keyword, url)) {
      showToast('Ce couple (mot-clé / URL) existe déjà.', 'error');
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
        setPairs((prev) => [...(result.items || []), ...prev]);
        setNewPair({ keyword: '', url: '' });
        showToast('Couple ajouté', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Erreur: ${errorData.error?.message || 'Erreur inconnue'}`, 'error');
      }
    } catch {
      showToast("Erreur lors de l'ajout", 'error');
    }
  };

  const addMultiplePairs = async () => {
    const url = multiAddUrl.trim();
    if (!url || url.length < 3) {
      showToast('Saisissez une URL ou un domaine', 'error');
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
      showToast('Aucun nouveau mot-clé à ajouter (vides ou déjà présents)', 'error');
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
        showToast(`${toCreate.length} couple(s) ajouté(s)`, 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Erreur: ${errorData.error?.message || 'Erreur inconnue'}`, 'error');
      }
    } catch {
      showToast("Erreur lors de l'ajout", 'error');
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
        showToast('Couple modifié', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Erreur: ${errorData.error?.message || 'Erreur inconnue'}`, 'error');
      }
    } catch {
      showToast('Erreur lors de la modification', 'error');
    }
  };

  const deletePair = async (pairId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce couple ?')) return;
    try {
      const response = await fetch(`/api/v1/pairs/${pairId}`, { method: 'DELETE' });
      if (response.ok) {
        setPairs((prev) => prev.filter((p) => p.pair_id !== pairId));
        showToast('Couple supprimé', 'success');
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    } catch {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const importCSV = async (file: File) => {
    try {
      setLoading(true);
      const text = await file.text();
      const response = await fetch('/api/v1/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData: text }),
      });
      if (response.ok) {
        const result = await response.json();
        showToast(
          `${result.imported} couples importés${result.failed > 0 ? `, ${result.failed} échoués` : ''}`,
          'success'
        );
        loadData();
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Erreur: ${errorData.error?.message || 'Erreur inconnue'}`, 'error');
      }
    } catch {
      showToast("Erreur lors de l'import", 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteAllPairs = async () => {
    if (!confirm(`Supprimer TOUS les ${pairs.length} couples ? Cette action est irréversible.`)) return;
    if (!confirm('Dernière confirmation : Supprimer tous les couples et leur historique ?')) return;
    try {
      setLoading(true);
      const response = await fetch('/api/v1/pairs/delete-all', { method: 'DELETE' });
      if (response.ok) {
        const result = await response.json();
        showToast(`${result.deleted} couples supprimés`, 'success');
        setPairs([]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Erreur: ${errorData.error?.message || 'Erreur inconnue'}`, 'error');
      }
    } catch {
      showToast("Erreur lors de la suppression", 'error');
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
        const positionText = result.position != null ? `Position: ${result.position}` : 'Non trouvé';
        showToast(`Mesure effectuée - ${positionText}`, 'success');
      } else {
        const errMsg = result.error?.message || '';
        if (isNoSerpKeyError(errMsg)) {
          setShowNoKeyBanner(true);
          showToast('Ajoutez votre clé dans Paramètres pour mesurer.', 'error');
        } else {
          showToast(`Erreur: ${errMsg || 'Erreur inconnue'}`, 'error');
        }
      }
    } catch {
      showToast('Erreur lors de la mesure SerpAPI', 'error');
    } finally {
      setTracking((prev) => {
        const next = new Set(prev);
        next.delete(pairId);
        return next;
      });
    }
  };

  const trackAll = async () => {
    if (!confirm('Mesurer tous les couples ? Cela peut prendre du temps.')) return;
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
        showToast('Mesures effectuées', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error?.message || '';
        if (isNoSerpKeyError(errMsg)) {
          setShowNoKeyBanner(true);
          showToast('Ajoutez votre clé dans Paramètres pour mesurer.', 'error');
        } else {
          showToast(`Erreur: ${errMsg || 'Erreur inconnue'}`, 'error');
        }
      }
    } catch {
      showToast('Erreur lors des mesures SerpAPI', 'error');
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
        showToast(`Erreur export: ${errorData.error?.message || 'Erreur inconnue'}`, 'error');
      }
    } catch {
      showToast(`Erreur lors de l'export`, 'error');
    }
  };

  if (loading && pairs.length === 0) {
    return (
      <div className="container">
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h1>SEO Ranker</h1>
          <p>Suivi de positions Google par couple mot-clé / URL</p>
          <p style={{ marginTop: '0.35rem', fontSize: '0.9rem' }}>
            <Link href="/settings" style={{ color: '#1976d2', fontWeight: 500 }}>
              → Configurer ma clé de recherche (SerpAPI, gratuit)
            </Link>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link href="/settings" className="btn btn-primary" style={{ border: '2px solid #2e7d32', background: '#e8f5e9', color: '#2e7d32' }}>
            Paramètres (clé)
          </Link>
          <button type="button" className="btn btn-secondary" onClick={() => signOut({ callbackUrl: '/' })}>
            Déconnexion
          </button>
        </div>
      </div>

      {(hasSerpApiKey !== true) && (
        <div className="settings-card" style={{ background: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%)', border: '2px solid #4caf50', marginBottom: '1.5rem', padding: '1.5rem', maxWidth: '36rem' }}>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#2e7d32' }}>
            Commencer : configurez votre clé en 2 minutes
          </h2>
          <p style={{ margin: '0 0 1rem', color: '#333', lineHeight: 1.5 }}>
            Pour suivre vos positions Google, l’application a besoin d’une clé fournie <strong>gratuitement</strong> par SerpAPI. Sans elle, les mesures ne peuvent pas fonctionner.
          </p>
          <ol style={{ margin: '0 0 1.25rem', paddingLeft: '1.25rem', color: '#333', lineHeight: 1.7 }}>
            <li>Cliquez sur <strong>« Obtenir ma clé »</strong> (ouverture de SerpAPI dans un nouvel onglet). Créez un compte gratuit si besoin.</li>
            <li>Sur SerpAPI, <strong>copiez votre clé</strong> (API Key).</li>
            <li>Collez-la dans <strong>Paramètres</strong> (bouton ci‑dessous) puis enregistrez.</li>
          </ol>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <a href="https://serpapi.com/manage-api-key" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.6rem 1.2rem' }}>
              Obtenir ma clé (gratuit)
            </a>
            <Link href="/settings" className="btn btn-secondary">
              Aller configurer ma clé →
            </Link>
          </div>
        </div>
      )}

      {hasSerpApiKey !== false && showNoKeyBanner && (
        <div className="settings-card" style={{ background: '#fff3cd', border: '1px solid #ffc107', marginBottom: '1rem', padding: '1rem' }}>
          <p style={{ margin: 0, marginBottom: '0.75rem', fontWeight: 500 }}>
            Pour mesurer les positions, ajoutez votre clé dans Paramètres.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <a href="https://serpapi.com/manage-api-key" target="_blank" rel="noopener noreferrer" className="btn btn-primary">Obtenir ma clé (gratuit)</a>
            <Link href="/settings" className="btn btn-secondary">Aller aux paramètres</Link>
            <button type="button" className="btn btn-secondary" onClick={() => setShowNoKeyBanner(false)}>Fermer</button>
          </div>
        </div>
      )}

      <div className="settings-card">
        <h2>Paramètres de recherche</h2>
        <div className="settings-form">
          <div className="form-group">
            <label>Langue (hl)</label>
            <select value={settings.hl} onChange={(e) => setSettings({ ...settings, hl: e.target.value })}>
              <option value="fr">Français</option>
              <option value="en">Anglais</option>
              <option value="es">Espagnol</option>
              <option value="de">Allemand</option>
              <option value="it">Italien</option>
              <option value="pt">Portugais</option>
              <option value="nl">Néerlandais</option>
              <option value="pl">Polonais</option>
              <option value="ru">Russe</option>
              <option value="ja">Japonais</option>
              <option value="zh">Chinois</option>
              <option value="ar">Arabe</option>
            </select>
          </div>
          <div className="form-group">
            <label>Emplacement (gl)</label>
            <select value={settings.gl} onChange={(e) => setSettings({ ...settings, gl: e.target.value })}>
              <option value="fr">France</option>
              <option value="be">Belgique</option>
              <option value="ch">Suisse</option>
              <option value="ca">Canada</option>
              <option value="us">États-Unis</option>
              <option value="uk">Royaume-Uni</option>
              <option value="de">Allemagne</option>
              <option value="es">Espagne</option>
              <option value="it">Italie</option>
              <option value="pt">Portugal</option>
              <option value="nl">Pays-Bas</option>
              <option value="pl">Pologne</option>
              <option value="ru">Russie</option>
              <option value="jp">Japon</option>
              <option value="cn">Chine</option>
              <option value="au">Australie</option>
              <option value="br">Brésil</option>
              <option value="mx">Mexique</option>
              <option value="in">Inde</option>
              <option value="sg">Singapour</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>
            {saving ? <span className="loading" /> : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div className="pairs-card">
        <div className="pairs-header">
          <h2>Couples Mot-clé / URL ({pairs.length})</h2>
          <div className="pairs-actions">
            <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }} title="CSV : 1re colonne = mots-clés, 2e = URLs (noms des colonnes libres)">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    importCSV(file);
                    e.target.value = '';
                  }
                }}
                style={{ display: 'none' }}
              />
              Import
            </label>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setExportMenuOpen((v) => !v)}>
                Export {exportMenuOpen ? '▾' : '▸'}
              </button>
              {exportMenuOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 2, background: '#fff', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 10, minWidth: 120 }}>
                  <button type="button" style={{ display: 'block', width: '100%', padding: '0.5rem 0.75rem', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => { exportData('csv'); setExportMenuOpen(false); }}>CSV</button>
                  <button type="button" style={{ display: 'block', width: '100%', padding: '0.5rem 0.75rem', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => { exportData('xlsx'); setExportMenuOpen(false); }}>Excel (XLSX)</button>
                </div>
              )}
            </div>
            <button
              className="btn btn-danger"
              onClick={deleteAllPairs}
              disabled={loading || pairs.length === 0}
              style={{ marginLeft: '10px' }}
            >
              Supprimer tout
            </button>
          </div>
        </div>

        <div style={{ padding: '0.75rem 1rem', background: '#f8f9fa', borderRadius: 8, marginBottom: '1rem' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Ajouter plusieurs mots-clés (même URL)</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              value={multiAddUrl}
              onChange={(e) => setMultiAddUrl(e.target.value)}
              placeholder="URL ou domaine (ex: example.com)"
              style={{ minWidth: 180 }}
            />
            {multiAddKeywords.map((kw, i) => (
              <input
                key={i}
                type="text"
                value={kw}
                onChange={(e) => {
                  const next = [...multiAddKeywords];
                  next[i] = e.target.value;
                  setMultiAddKeywords(next);
                }}
                placeholder="Mot-clé"
                style={{ width: 120 }}
              />
            ))}
            <button type="button" className="btn btn-secondary" onClick={() => setMultiAddKeywords((prev) => [...prev, ''])} title="Ajouter un mot-clé">
              +
            </button>
            <button type="button" className="btn btn-primary" onClick={addMultiplePairs}>
              Ajouter tout
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="pairs-table">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>Mot-clé</th>
                <th style={{ width: '25%' }}>URL</th>
                <th style={{ width: '25%' }}>URL trouvée</th>
                <th style={{ width: '8%' }}>Position</th>
                <th style={{ width: '12%' }}>Dernière mesure</th>
                <th style={{ width: '10%' }}>Actions</th>
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
                    placeholder="Nouveau mot-clé"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={newPair.url}
                    onChange={(e) => setNewPair({ ...newPair, url: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && addPair()}
                    placeholder="URL ou domaine (ex: example.com)"
                  />
                </td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-primary" onClick={addPair}>
                    Ajouter
                  </button>
                  <button type="button" className="btn btn-primary" onClick={trackAll} disabled={saving || pairs.length === 0}>
                    Mesurer tout
                  </button>
                </td>
              </tr>
              {pairs.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    <p>Aucun couple ajouté. Commencez par ajouter un mot-clé et une URL.</p>
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
                              🌐 Domaine
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
                      ? new Date(pair.last_checked_at).toLocaleString('fr-FR', {
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
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Évolution par jour (position)</h3>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="pairs-table" style={{ fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th>Mot-clé</th>
                    <th>URL</th>
                    {historyDates.map((d) => (
                      <th key={d} style={{ whiteSpace: 'nowrap' }}>{new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: '2-digit' })}</th>
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

      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
