'use client';

import { useState, useEffect } from 'react';

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
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export default function Home() {
  const [settings, setSettings] = useState<Settings>({ hl: 'fr', gl: 'fr' });
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tracking, setTracking] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [newPair, setNewPair] = useState({ keyword: '', url: '' });
  const [editingPair, setEditingPair] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ keyword: string; url: string }>({ keyword: '', url: '' });

  // Load data from APIs on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, pairsRes] = await Promise.all([
        fetch('/api/v1/settings'),
        fetch('/api/v1/pairs'),
      ]);

      if (settingsRes.ok && pairsRes.ok) {
        const settingsData = await settingsRes.json();
        const pairsData = await pairsRes.json();

        setSettings(settingsData);
        setPairs(pairsData.items || []);
      } else {
        // Fallback to default values if APIs fail
        console.log('APIs not available, using default values');
        setSettings({ hl: 'fr', gl: 'fr' });
        setPairs([]);
      }
    } catch (error) {
      console.log('Error loading data, using default values:', error);
      setSettings({ hl: 'fr', gl: 'fr' });
      setPairs([]);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        showToast('Paramètres sauvegardés', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Erreur: ${errorData.error?.message || 'Erreur inconnue'}`, 'error');
      }
    } catch (error) {
      console.error('Settings save error:', error);
      showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addPair = async () => {
    if (!newPair.keyword.trim() || !newPair.url.trim()) {
      showToast('Veuillez remplir tous les champs', 'error');
      return;
    }
    
    // Validation basique de l'URL
    const url = newPair.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      showToast('L\'URL doit commencer par http:// ou https://', 'error');
      return;
    }

    try {
      const response = await fetch('/api/v1/pairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairs: [{
            keyword: newPair.keyword.trim(),
            url: newPair.url.trim()
          }]
        })
      });

      if (response.ok) {
        const result = await response.json();
        setPairs(prev => [...result.items, ...prev]);
        setNewPair({ keyword: '', url: '' });
        showToast('Couple ajouté', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Erreur: ${errorData.error?.message || 'Erreur inconnue'}`, 'error');
      }
    } catch (error) {
      console.error('Add pair error:', error);
      showToast('Erreur lors de l\'ajout', 'error');
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
      setPairs(prev => prev.map(p => 
        p.pair_id === pairId 
          ? { ...p, keyword: editValues.keyword, url: editValues.url }
          : p
      ));
      setEditingPair(null);
      showToast('Couple modifié', 'success');
    } catch (error) {
      showToast('Erreur lors de la modification', 'error');
    }
  };

  const deletePair = async (pairId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce couple ?')) {
      return;
    }

    try {
      setPairs(prev => prev.filter(p => p.pair_id !== pairId));
      showToast('Couple supprimé', 'success');
    } catch (error) {
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
        body: JSON.stringify({ csvData: text })
      });

      if (response.ok) {
        const result = await response.json();
        showToast(`${result.imported} couples importés${result.failed > 0 ? `, ${result.failed} échoués` : ''}`, 'success');
        loadData(); // Reload pairs list
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Erreur: ${errorData.error?.message || 'Erreur inconnue'}`, 'error');
      }
    } catch (error) {
      console.error('Import error:', error);
      showToast('Erreur lors de l\'import', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteAllPairs = async () => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer TOUS les ${pairs.length} couples ?\n\nCette action est irréversible !`)) {
      return;
    }

    if (!confirm('Dernière confirmation : Supprimer tous les couples et leur historique ?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/v1/pairs/delete-all', {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        showToast(`${result.deleted} couples supprimés`, 'success');
        setPairs([]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Erreur: ${errorData.error?.message || 'Erreur inconnue'}`, 'error');
      }
    } catch (error) {
      console.error('Delete all error:', error);
      showToast('Erreur lors de la suppression', 'error');
    } finally {
      setLoading(false);
    }
  };

  const trackPair = async (pairId: string) => {
    setTracking(prev => new Set(prev).add(pairId));
    
    try {
      const pair = pairs.find(p => p.pair_id === pairId);
      if (!pair) return;

      // Use real SerpAPI tracking only
      const response = await fetch(`/api/v1/pairs/${pairId}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hl: settings.hl,
          gl: settings.gl
        })
      });

      if (response.ok) {
        const result = await response.json();
        const position = result.position;
        
        setPairs(prev => prev.map(p => 
          p.pair_id === pairId 
            ? { ...p, last_position: position, last_checked_at: new Date().toISOString() }
            : p
        ));
        
        const positionText = position !== null 
          ? `Position: ${position}` 
          : 'Non trouvé';
        showToast(`Mesure effectuée - ${positionText}`, 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Erreur SerpAPI: ${errorData.error?.message || 'Erreur inconnue'}`, 'error');
      }
    } catch (error) {
      console.error('Tracking error:', error);
      showToast('Erreur lors de la mesure SerpAPI', 'error');
    } finally {
      setTracking(prev => {
        const next = new Set(prev);
        next.delete(pairId);
        return next;
      });
    }
  };

  const trackAll = async () => {
    if (!confirm('Mesurer tous les couples ? Cela peut prendre du temps.')) {
      return;
    }

    setSaving(true);
    try {
      // Use real SerpAPI batch tracking
      const response = await fetch('/api/v1/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hl: settings.hl,
          gl: settings.gl
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Update pairs with new positions
        setPairs(prev => prev.map(pair => {
          const updatedPair = result.results?.find((r: any) => r.pair_id === pair.pair_id);
          if (updatedPair) {
            return {
              ...pair,
              last_position: updatedPair.position,
              last_checked_at: updatedPair.checked_at
            };
          }
          return pair;
        }));
        showToast('Mesures effectuées', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Erreur SerpAPI: ${errorData.error?.message || 'Erreur inconnue'}`, 'error');
      }
    } catch (error) {
      console.error('Batch tracking error:', error);
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
        showToast(`Export ${format.toUpperCase()} réussi`, 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Erreur export: ${errorData.error?.message || 'Erreur inconnue'}`, 'error');
      }
    } catch (error) {
      console.error('Export error:', error);
      showToast(`Erreur lors de l'export ${format.toUpperCase()}`, 'error');
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>SEO Ranker</h1>
        <p>Suivi de positions Google par couple mot-clé / URL</p>
      </div>

      <div className="settings-card">
        <h2>Paramètres globaux</h2>
        <div className="settings-form">
          <div className="form-group">
            <label>Langue (hl)</label>
            <input
              type="text"
              value={settings.hl}
              onChange={(e) => setSettings({ ...settings, hl: e.target.value })}
              placeholder="fr"
            />
          </div>
          <div className="form-group">
            <label>Emplacement (gl)</label>
            <input
              type="text"
              value={settings.gl}
              onChange={(e) => setSettings({ ...settings, gl: e.target.value })}
              placeholder="fr"
            />
          </div>
          <button 
            className="btn btn-primary" 
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? <span className="loading"></span> : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div className="pairs-card">
        <div className="pairs-header">
          <h2>Couples Mot-clé / URL ({pairs.length})</h2>
          <div className="pairs-actions">
            <label className="btn btn-primary" style={{ cursor: 'pointer', margin: 0 }}>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    importCSV(file);
                    e.target.value = ''; // Reset input
                  }
                }}
                style={{ display: 'none' }}
              />
              Import CSV
            </label>
            <button className="btn btn-secondary" onClick={trackAll} disabled={saving || pairs.length === 0}>
              Mesurer tout
            </button>
            <button className="btn btn-success" onClick={() => exportData('csv')}>
              Export CSV
            </button>
            <button className="btn btn-success" onClick={() => exportData('xlsx')}>
              Export XLSX
            </button>
            <button className="btn btn-danger" onClick={deleteAllPairs} disabled={loading || pairs.length === 0} style={{ marginLeft: '10px' }}>
              Supprimer tout
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="pairs-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Mot-clé</th>
                <th style={{ width: '35%' }}>URL</th>
                <th style={{ width: '10%' }}>Position</th>
                <th style={{ width: '15%' }}>Dernière mesure</th>
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
                    placeholder="Nouveau mot-clé"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={newPair.url}
                    onChange={(e) => setNewPair({ ...newPair, url: e.target.value })}
                    placeholder="URL ou domaine (ex: example.com)"
                    title="Entrez une URL complète (https://...) ou juste un domaine (example.com) pour tracker toutes les pages du domaine"
                  />
                </td>
                <td>-</td>
                <td>-</td>
                <td>
                  <button className="btn btn-primary" onClick={addPair}>
                    Ajouter
                  </button>
                </td>
              </tr>
              {pairs.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-state">
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
                        title="Entrez une URL complète ou juste un domaine"
                      />
                    ) : (
                      <>
                        {!pair.url.startsWith('http://') && !pair.url.startsWith('https://') && !pair.url.includes('/') ? (
                          <span title={`Tracking de domaine : toutes les pages de ${pair.url}`}>
                            <span style={{ background: '#e8f4f8', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginRight: '4px' }}>
                              🌐 Domaine
                            </span>
                            <a href={`https://${pair.url}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1a73e8' }}>
                              {pair.url}
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
                    <strong>{pair.last_position !== null ? pair.last_position : '-'}</strong>
                  </td>
                  <td>
                    {pair.last_checked_at 
                      ? new Date(pair.last_checked_at).toLocaleString('fr-FR', { 
                          timeZone: 'Europe/Paris',
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '-'
                    }
                  </td>
                  <td>
                    <div className="action-buttons">
                      {editingPair === pair.pair_id ? (
                        <>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                            onClick={() => saveEdit(pair.pair_id)}
                          >
                            ✓
                          </button>
                          <button 
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
                            className="btn btn-primary"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                            onClick={() => trackPair(pair.pair_id)}
                            disabled={tracking.has(pair.pair_id)}
                          >
                            {tracking.has(pair.pair_id) ? <span className="loading"></span> : '▶'}
                          </button>
                          <button 
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                            onClick={() => startEdit(pair)}
                          >
                            ✎
                          </button>
                          <button 
                            className="btn btn-danger"
                            onClick={() => deletePair(pair.pair_id)}
                          >
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
      </div>

      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}