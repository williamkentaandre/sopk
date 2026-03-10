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
        setMessage({ type: 'success', text: 'Clé SERP API enregistrée.' });
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
    <div className="container">
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h1>Paramètres</h1>
          <p>Gérez votre compte et votre clé SERP API</p>
        </div>
        <Link href="/dashboard" className="btn btn-secondary">
          Retour au dashboard
        </Link>
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

      <div className="settings-card">
        <h2>Clé SERP API</h2>
        <p style={{ marginBottom: '1rem', color: '#666' }}>
          Saisissez votre clé personnelle SerpAPI. Elle est stockée de façon sécurisée et utilisée uniquement pour vos requêtes.
        </p>
        {hasSerpApiKey && !serpApiKey && (
          <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#34a853' }}>
            ✓ Une clé est déjà enregistrée. Entrez une nouvelle valeur pour la remplacer.
          </p>
        )}
        <form onSubmit={handleSaveSerpKey} className="settings-form">
          <div className="form-group" style={{ flex: 1 }}>
            <label>Clé SERP API</label>
            <input
              type="password"
              value={serpApiKey}
              onChange={(e) => setSerpApiKey(e.target.value)}
              placeholder={hasSerpApiKey ? 'Nouvelle clé (laisser vide pour garder l’actuelle)' : 'Votre clé SerpAPI'}
              autoComplete="off"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer la clé'}
          </button>
        </form>
        {message && (
          <p className={message.type === 'success' ? 'auth-success' : 'auth-error'} style={{ marginTop: '1rem' }}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
