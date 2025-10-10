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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tracking, setTracking] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [newPair, setNewPair] = useState({ keyword: '', url: '' });
  const [editingPair, setEditingPair] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ keyword: string; url: string }>({ keyword: '', url: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, pairsRes] = await Promise.all([
        fetch('/api/v1/settings'),
        fetch('/api/v1/pairs'),
      ]);

      const settingsData = await settingsRes.json();
      const pairsData = await pairsRes.json();

      setSettings(settingsData);
      setPairs(pairsData.items || []);
    } catch (error) {
      showToast('Erreur lors du chargement des données', 'error');
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
      const res = await fetch('/api/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        showToast('Paramètres sauvegardés', 'success');
      } else {
        showToast('Erreur lors de la sauvegarde', 'error');
      }
    } catch (error) {
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

    try {
      const res = await fetch('/api/v1/pairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairs: [{ keyword: newPair.keyword, url: newPair.url }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPairs(prev => [...data.items, ...prev]);
        setNewPair({ keyword: '', url: '' });
        showToast('Couple ajouté', 'success');
      } else {
        const error = await res.json();
        showToast(error.error?.message || 'Erreur', 'error');
      }
    } catch (error) {
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
      const res = await fetch(`/api/v1/pairs/${pairId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editValues),
      });

      if (res.ok) {
        const data = await res.json();
        setPairs(prev => prev.map(p => p.pair_id === pairId ? data : p));
        setEditingPair(null);
        showToast('Couple modifié', 'success');
      } else {
        showToast('Erreur lors de la modification', 'error');
      }
    } catch (error) {
      showToast('Erreur lors de la modification', 'error');
    }
  };

  const deletePair = async (pairId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce couple ?')) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/pairs/${pairId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setPairs(prev => prev.filter(p => p.pair_id !== pairId));
        showToast('Couple supprimé', 'success');
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    } catch (error) {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const trackPair = async (pairId: string) => {
    setTracking(prev => new Set(prev).add(pairId));
    
    try {
      const res = await fetch(`/api/v1/pairs/${pairId}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hl: settings.hl, gl: settings.gl }),
      });

      if (res.ok) {
        const data = await res.json();
        setPairs(prev => prev.map(p => 
          p.pair_id === pairId 
            ? { ...p, last_position: data.position, last_checked_at: data.checked_at }
            : p
        ));
        
        const positionText = data.position !== null 
          ? `Position: ${data.position}` 
          : 'Non trouvé';
        showToast(`Mesure effectuée - ${positionText}`, 'success');
      } else {
        showToast('Erreur lors de la mesure', 'error');
      }
    } catch (error) {
      showToast('Erreur lors de la mesure', 'error');
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
      const res = await fetch('/api/v1/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hl: settings.hl, gl: settings.gl }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Mesures effectuées: ${data.summary.ok} OK, ${data.summary.failed} erreurs`, 'success');
        loadData();
      } else {
        showToast('Erreur lors des mesures', 'error');
      }
    } catch (error) {
      showToast('Erreur lors des mesures', 'error');
    } finally {
      setSaving(false);
    }
  };

  const exportData = async (format: 'csv' | 'xlsx') => {
    try {
      const res = await fetch(`/api/v1/export?format=${format}`);
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `seo-export.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast('Export réussi', 'success');
      } else {
        showToast('Erreur lors de l\'export', 'error');
      }
    } catch (error) {
      showToast('Erreur lors de l\'export', 'error');
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="loading" style={{ width: '40px', height: '40px', borderWidth: '4px', borderTopColor: '#1a73e8' }}></div>
        </div>
      </div>
    );
  }

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
            <button className="btn btn-secondary" onClick={trackAll} disabled={saving || pairs.length === 0}>
              Mesurer tout
            </button>
            <button className="btn btn-success" onClick={() => exportData('csv')}>
              Export CSV
            </button>
            <button className="btn btn-success" onClick={() => exportData('xlsx')}>
              Export XLSX
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
                    placeholder="https://exemple.com/page"
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
                      />
                    ) : (
                      <a href={pair.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1a73e8' }}>
                        {pair.url}
                      </a>
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

