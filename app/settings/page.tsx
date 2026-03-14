'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useLocale } from '@/app/LocaleContext';

export default function SettingsPage() {
  const { t } = useLocale();
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
        setMessage({ type: 'success', text: t('settings.key.saved') });
      } else {
        const err = await response.json().catch(() => ({}));
        setMessage({ type: 'error', text: err.error?.message || t('dashboard.toast.error') });
      }
    } catch {
      setMessage({ type: 'error', text: t('auth.errorNetwork') });
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
            {t('settings.back')}
          </Link>
          <div style={{ flex: 1 }}>
            <h1>{t('settings.title')}</h1>
            <p>{t('settings.subtitle')}</p>
          </div>
        </div>

        <div style={!hasSerpApiKey ? { display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1.5rem' } : undefined}>
        <div className={!hasSerpApiKey ? 'card-onboarding' : 'settings-card'} style={!hasSerpApiKey ? { flex: '1 1 20rem', maxWidth: '36rem' } : undefined}>
        <h2 style={!hasSerpApiKey ? { color: '#166534' } : undefined}>
          {hasSerpApiKey ? t('settings.key.title') : t('settings.key.firstTitle')}
        </h2>
        {!hasSerpApiKey && (
          <p style={{ marginBottom: '0.75rem', color: '#333', lineHeight: 1.5 }}>
            {t('settings.key.withoutDesc')}
          </p>
        )}
        {!hasSerpApiKey && (
          <ol style={{ margin: '0 0 1rem', paddingLeft: '1.25rem', color: '#555', lineHeight: 1.6, fontSize: '0.95rem' }}>
            <li>{t("settings.key.step1")}</li>
            <li>{t("settings.key.step2")}</li>
            <li>{t("settings.key.step3")}</li>
          </ol>
        )}
        {hasSerpApiKey && !serpApiKey && !showReplaceKey ? (
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            <a href="https://serpapi.com/manage-api-key" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '0.25rem' }}>{t('settings.key.getKey')}</a>
          </p>
        ) : null}
        {hasSerpApiKey && !serpApiKey && !showReplaceKey ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9rem', color: '#34a853' }}>{t('settings.key.configured')}</span>
            <button type="button" className="btn btn-secondary" onClick={() => setShowReplaceKey(true)}>
              {t('settings.key.replace')}
            </button>
          </div>
        ) : (
          <>
            <p style={{ marginBottom: '0.5rem', color: '#666', fontSize: '0.95rem' }}>
              <a href="https://serpapi.com/manage-api-key" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ display: 'inline-block', marginBottom: '0.5rem' }}>{t('settings.key.getKey')}</a>
            </p>
            <form onSubmit={handleSaveSerpKey} className="settings-form">
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="serp-api-key" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 500 }}>{t('settings.key.label')}</label>
                <input
                  id="serp-api-key"
                  type="password"
                  value={serpApiKey}
                  onChange={(e) => setSerpApiKey(e.target.value)}
                  placeholder={t('settings.key.placeholder')}
                  autoComplete="off"
                  style={{ minHeight: '2.5rem', width: '100%', maxWidth: '28rem' }}
                />
              </div>
              <button type="submit" className="btn btn-secondary" disabled={saving}>
                {saving ? t('settings.key.saving') : t('settings.key.save')}
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
        {!hasSerpApiKey && (
          <div style={{ flex: '0 0 auto', width: 'min(280px, 100%)' }} aria-hidden>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 200" fill="none" style={{ width: '100%', height: 'auto', borderRadius: 'var(--radius)', display: 'block' }}>
              <defs>
                <linearGradient id="settings-onboard-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f0fdf4" />
                  <stop offset="100%" stopColor="#dcfce7" />
                </linearGradient>
              </defs>
              <rect width="280" height="200" rx="12" fill="url(#settings-onboard-bg)" stroke="#bbf7d0" strokeWidth="1" />
              <text x="140" y="28" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="14" fontWeight="600" fill="#166534">SerpAPI — 3 étapes</text>
              <circle cx="40" cy="55" r="14" fill="#166534" />
              <text x="40" y="59" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="14" fontWeight="700" fill="white">1</text>
              <path d="M62 48 L62 62 L98 62 L98 48 Z M62 52 L80 58 L98 52" stroke="#166534" strokeWidth="2" fill="none" strokeLinecap="round" />
              <text x="115" y="58" fontFamily="system-ui, sans-serif" fontSize="12" fill="#374151">Vérifier ton email</text>
              <circle cx="40" cy="105" r="14" fill="#166534" />
              <text x="40" y="109" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="14" fontWeight="700" fill="white">2</text>
              <path d="M68 95 L68 115 L72 115 L72 95 Z M70 95 L70 90 L76 90 L76 95 M64 108 L76 108 M64 112 L76 112" stroke="#166534" strokeWidth="2" fill="none" strokeLinecap="round" />
              <text x="115" y="108" fontFamily="system-ui, sans-serif" fontSize="12" fill="#374151">Vérifier ton téléphone</text>
              <circle cx="40" cy="155" r="14" fill="#166534" />
              <text x="40" y="159" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="14" fontWeight="700" fill="white">3</text>
              <path d="M64 148 L72 148 L76 152 L80 148 L88 148 L88 158 L64 158 Z M70 154 L82 154" stroke="#166534" strokeWidth="2" fill="none" strokeLinecap="round" />
              <text x="115" y="158" fontFamily="system-ui, sans-serif" fontSize="12" fill="#374151">Copier la clé API</text>
              <path d="M140 175 L140 188 M135 183 L140 188 L145 183" stroke="#166534" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <text x="140" y="198" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="11" fill="#64748b">Colle ici</text>
            </svg>
          </div>
        )}
        </div>

        <div className="settings-card">
          <h2>{t('settings.account.title')}</h2>
          <p>
            <strong>{t('settings.account.email')} :</strong> {session?.user?.email ?? '-'}
          </p>
          <p>
            <strong>{t('settings.account.payment')} :</strong>{' '}
            <span className={paid ? 'status-badge success' : 'status-badge pending'}>
              {paid ? t('settings.account.paid') : t('settings.account.pending')}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
