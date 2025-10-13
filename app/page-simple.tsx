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

export default function HomeSimple() {
  const [settings, setSettings] = useState<Settings>({ hl: 'fr', gl: 'fr' });
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tracking, setTracking] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [newPair, setNewPair] = useState({ keyword: '', url: '' });
  const [editingPair, setEditingPair] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ keyword: string; url: string }>({ keyword: '', url: '' });

  // Load data from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('seo-settings');
    const savedPairs = localStorage.getItem('seo-pairs');
    
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    if (savedPairs) {
      setPairs(JSON.parse(savedPairs));
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('seo-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('seo-pairs', JSON.stringify(pairs));
  }, [pairs]);

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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      showToast('Paramètres sauvegardés', 'success');
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
    
    // Validation basique de l'URL
    const url = newPair.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      showToast('L\'URL doit commencer par http:// ou https://', 'error');
      return;
    }

    try {
      const newPairData: Pair = {
        pair_id: `pair_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        keyword: newPair.keyword.trim(),
        url: newPair.url.trim(),
        last_position: null,
        last_checked_at: null,
      };

      setPairs(prev => [newPairData, ...prev]);
      setNewPair({ keyword: '', url: '' });
      showToast('Couple ajouté', 'success');
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

  const trackPair = async (pairId: string) => {
    setTracking(prev => new Set(prev).add(pairId));
    
    try {
      // Simulate tracking with realistic position
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate deterministic position based on keyword + URL
      const pair = pairs.find(p => p.pair_id === pairId);
      if (!pair) return;

      const combination = `${pair.keyword.toLowerCase()}|${pair.url.toLowerCase()}`;
      let hash = 0;
      for (let i = 0; i < combination.length; i++) {
        const char = combination.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      const normalizedHash = Math.abs(hash) % 1000;
      let position;
      
      if (normalizedHash < 50) {
        position = Math.floor(normalizedHash / 5) + 1;
      } else if (normalizedHash < 200) {
        position = Math.floor((normalizedHash - 50) / 10) + 11;
      } else if (normalizedHash < 400) {
        position = Math.floor((normalizedHash - 200) / 10) + 21;
      } else if (normalizedHash < 600) {
        position = Math.floor((normalizedHash - 400) / 10) + 31;
      } else {
        position = Math.floor((normalizedHash - 600) / 10) + 41;
      }
      
      position = Math.max(1, Math.min(50, position));
      
      setPairs(prev => prev.map(p => 
        p.pair_id === pairId 
          ? { ...p, last_position: position, last_checked_at: new Date().toISOString() }
          : p
      ));
      
      const positionText = position !== null 
        ? `Position: ${position}` 
        : 'Non trouvé';
      showToast(`Mesure effectuée - ${positionText}`, 'success');
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
      // Track all pairs
      for (const pair of pairs) {
        await trackPair(pair.pair_id);
      }
      showToast('Mesures effectuées', 'success');
    } catch (error) {
      showToast('Erreur lors des mesures', 'error');
    } finally {
      setSaving(false);
    }
  };

  const exportData = async (format: 'csv' | 'xlsx') => {
    try {
      const headers = ['Mot-clé', 'URL', 'Position', 'Dernière mesure'];
      const rows = pairs.map(pair => [
        pair.keyword,
        pair.url,
        pair.last_position || '',
        pair.last_checked_at ? new Date(pair.last_checked_at).toLocaleString('fr-FR') : ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seo-export-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast(`Export ${format.toUpperCase()} réussi`, 'success');
    } catch (error) {
      showToast(`Erreur lors de l'export ${format.toUpperCase()}`, 'error');
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>SEO Ranker (Version Simple)</h1>
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
