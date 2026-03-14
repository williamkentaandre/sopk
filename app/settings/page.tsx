'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [serpApiKey, setSerpApiKey] = useState('');
  const [hasSerpApiKey, setHasSerpApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showReplaceKey, setShowReplaceKey] = useState(false);

  useEffect(() => {
    fetch('/api/v1/settings')
      .then((res) => res.ok && res.json())
      .then((data) => {
        if (data) setHasSerpApiKey(!!data.hasSerpApiKey);
      })
      .catch(() => {});
  }, []);

  const handleSaveSerpKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const settingsRes = await fetch('/api/v1/settings');
      const current = await settingsRes.json().catch(() => ({}));
      const response = await fetch('/api/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hl: current.hl ?? 'fr',
          gl: current.gl ?? 'fr',
          serpApiKey: serpApiKey.trim() || null,
        }),
      });
      if (response.ok) {
        setHasSerpApiKey(!!serpApiKey.trim());
        setSerpApiKey('');
        setShowReplaceKey(false);
        setMessage({ type: 'success', text: 'Clé enregistrée.' });
      } else {
        const err = await response.json().catch(() => ({}));
        setMessage({ type: 'error', text: err.error?.message || 'Erreur' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur réseau' });
    } finally {
      setSaving(false);
    }
  };

  const paid = (session?.user as any)?.stripePaymentStatus === 'paid';

  return (
    <div className="app-shell">
      <div className="container">
        <div className="header">
          <Link href="/dashboard" className="btn btn-secondary">
            ← Retour au dashboard
          </Link>
          <div style={{ flex: 1 }}>
            <h1>Paramètres</h1>
            <p>Gérez votre compte et votre clé de recherche</p>
          </div>
        </div>

        <div className={!hasSerpApiKey ? 'card-onboarding' : 'settings-card'}>
        <h2 style={!hasSerpApiKey ? { color: '#166534' } : undefined}>
          {hasSerpApiKey ? 'Clé de recherche Google' : 'Première étape : votre clé de recherche Google'}
        </h2>
        {!hasSerpApiKey && (
          <p style={{ marginBottom: '0.75rem', color: '#333', lineHeight: 1.5 }}>
            Sans cette clé, l’application ne peut pas mesurer vos positions. SerpAPI la fournit <strong>gratuitement</strong>.
          </p>
        )}
        {!hasSerpApiKey && (
          <ol style={{ margin: '0 0 1rem', paddingLeft: '1.25rem', color: '#555', lineHeight: 1.6, fontSize: '0.95rem' }}>
            <li>Cliquez sur <strong>« Obtenir ma clé »</strong> → SerpAPI s’ouvre. Créez un compte gratuit si besoin.</li>
            <li>Copiez votre clé (API Key) sur SerpAPI.</li>
            <li>Collez-la dans le champ ci‑dessous puis cliquez sur <strong>Enregistrer</strong>.</li>
          </ol>
        )}
        {hasSerpApiKey && !serpApiKey && !showReplaceKey ? (
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            Un compte gratuit sur SerpAPI suffit.{' '}
            <a href="https://serpapi.com/manage-api-key" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '0.25rem' }}>Obtenir ma clé</a>
          </p>
        ) : null}
        {hasSerpApiKey && !serpApiKey && !showReplaceKey ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9rem', color: '#34a853' }}>Clé configurée</span>
            <button type="button" className="btn btn-secondary" onClick={() => setShowReplaceKey(true)}>
              Remplacer
            </button>
          </div>
        ) : (
          <>
            <p style={{ marginBottom: '0.5rem', color: '#666', fontSize: '0.95rem' }}>
              <a href="https://serpapi.com/manage-api-key" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ display: 'inline-block', marginBottom: '0.5rem' }}>Obtenir ma clé</a>
              {hasSerpApiKey && ' — entrez une nouvelle clé pour remplacer.'}
            </p>
            <form onSubmit={handleSaveSerpKey} className="settings-form">
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="serp-api-key" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 500 }}>Collez votre clé SerpAPI ici</label>
                <input
                  id="serp-api-key"
                  type="password"
                  value={serpApiKey}
                  onChange={(e) => setSerpApiKey(e.target.value)}
                  placeholder="Collez votre clé ici"
                  autoComplete="off"
                  style={{ minHeight: '2.5rem', width: '100%', maxWidth: '28rem' }}
                />
              </div>
              <button type="submit" className="btn btn-secondary" disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </form>
          </>
        )}
        {message && (
          <p className={message.type === 'success' ? 'auth-success' : 'auth-error'} style={{ marginTop: '1rem' }}>
            {message.text}
          </p>
        )}
        </div>

        <div className="settings-card">
          <h2>Compte</h2>
          <p>
            <strong>Email :</strong> {session?.user?.email ?? '-'}
          </p>
          <p>
            <strong>Paiement :</strong>{' '}
            <span className={paid ? 'status-badge success' : 'status-badge pending'}>
              {paid ? 'Payé' : 'En attente'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
