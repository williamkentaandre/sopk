'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useLocale } from '@/app/LocaleContext';
import { SerpApiOnboardingIllustration } from '@/app/components/SerpApiOnboardingIllustration';

export default function SettingsPage() {
  const { t } = useLocale();
  const { data: session } = useSession();
  const [serpApiKey, setSerpApiKey] = useState('');
  const [hasSerpApiKey, setHasSerpApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showReplaceKey, setShowReplaceKey] = useState(false);

  const handleRemoveSerpKey = async () => {
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
          serpApiKey: null,
        }),
      });
      if (response.ok) {
        setHasSerpApiKey(false);
        setSerpApiKey('');
        setShowReplaceKey(false);
        setMessage({ type: 'success', text: t('settings.key.removed') });
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
            <button type="button" className="btn btn-secondary" onClick={handleRemoveSerpKey} disabled={saving}>
              {saving ? t('settings.key.removing') : t('settings.key.remove')}
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
        {!hasSerpApiKey && <SerpApiOnboardingIllustration variant="settings" />}
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
