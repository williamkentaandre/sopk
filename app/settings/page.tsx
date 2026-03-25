'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useLocale } from '@/app/LocaleContext';
import { SerpApiOnboardingIllustration } from '@/app/components/SerpApiOnboardingIllustration';

export default function SettingsPage() {
  const { t, locale } = useLocale();
  const { data: session } = useSession();
  const [serpApiKey, setSerpApiKey] = useState('');
  const [hasSerpApiKey, setHasSerpApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showReplaceKey, setShowReplaceKey] = useState(false);
  const [searchSettings, setSearchSettings] = useState<{ hl: string | null; gl: string | null }>({ hl: null, gl: null });
  const [savingSearchSettings, setSavingSearchSettings] = useState(false);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [emailActionLoading, setEmailActionLoading] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

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
        if (data) {
          setHasSerpApiKey(!!data.hasSerpApiKey);
          setSearchSettings({ hl: data.hl || null, gl: data.gl || null });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.authenticated) setEmailVerified(!!data.emailVerified);
      })
      .catch(() => {});
  }, []);

  const requestEmailVerification = async () => {
    setMessage(null);
    setEmailActionLoading(true);
    try {
      const res = await fetch('/api/auth/request-email-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: locale === 'fr' ? 'fr' : 'en' }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: t('settings.email.verificationSent') });
      } else {
        setMessage({ type: 'error', text: t('settings.email.verificationError') });
      }
    } catch {
      setMessage({ type: 'error', text: t('auth.errorNetwork') });
    } finally {
      setEmailActionLoading(false);
    }
  };

  const requestEmailChange = async () => {
    setMessage(null);
    setEmailActionLoading(true);
    try {
      const res = await fetch('/api/auth/request-email-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail: newEmail.trim(), locale: locale === 'fr' ? 'fr' : 'en' }),
      });
      if (res.ok) {
        setNewEmail('');
        setMessage({ type: 'success', text: t('settings.email.changeSent') });
      } else if (res.status === 403) {
        setMessage({ type: 'error', text: t('settings.email.mustVerifyFirst') });
      } else if (res.status === 409) {
        setMessage({ type: 'error', text: t('settings.email.inUse') });
      } else {
        setMessage({ type: 'error', text: t('settings.email.changeError') });
      }
    } catch {
      setMessage({ type: 'error', text: t('auth.errorNetwork') });
    } finally {
      setEmailActionLoading(false);
    }
  };

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
        setLastSavedAt(Date.now());
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

  const handleSaveSearchSettings = async () => {
    setMessage(null);
    setSavingSearchSettings(true);
    try {
      const settingsRes = await fetch('/api/v1/settings');
      const current = await settingsRes.json().catch(() => ({}));
      const response = await fetch('/api/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hl: searchSettings.hl, gl: searchSettings.gl }),
      });
      if (response.ok) {
        const configured = !!searchSettings.hl && !!searchSettings.gl;
        if (typeof window !== 'undefined') {
          if (configured) window.localStorage.setItem('seo-ranker-search-settings-done', '1');
          else window.localStorage.removeItem('seo-ranker-search-settings-done');
        }
        setLastSavedAt(Date.now());
        setMessage({ type: 'success', text: t('dashboard.toast.settingsSaved') });
      } else {
        const err = await response.json().catch(() => ({}));
        setMessage({ type: 'error', text: err.error?.message || t('dashboard.toast.error') });
      }
    } catch {
      setMessage({ type: 'error', text: t('auth.errorNetwork') });
    } finally {
      setSavingSearchSettings(false);
    }
  };

  const handleRemoveSearchSettings = async () => {
    setMessage(null);
    setSavingSearchSettings(true);
    try {
      const settingsRes = await fetch('/api/v1/settings');
      const current = await settingsRes.json().catch(() => ({}));
      const response = await fetch('/api/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hl: null, gl: null, serpApiKey: current.hasSerpApiKey ? current.serpApiKey ?? undefined : null }),
      });
      if (response.ok) {
        if (typeof window !== 'undefined') window.localStorage.removeItem('seo-ranker-search-settings-done');
        setSearchSettings({ hl: null, gl: null });
        setLastSavedAt(Date.now());
        setMessage({ type: 'success', text: t('dashboard.searchSettings.removed') });
      } else {
        const err = await response.json().catch(() => ({}));
        setMessage({ type: 'error', text: err.error?.message || t('dashboard.toast.error') });
      }
    } catch {
      setMessage({ type: 'error', text: t('auth.errorNetwork') });
    } finally {
      setSavingSearchSettings(false);
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
            {lastSavedAt && (
              <p style={{ marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Dernière sauvegarde : {new Date(lastSavedAt).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB')}
              </p>
            )}
          </div>
        </div>

        <div style={!hasSerpApiKey ? { display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1.5rem' } : undefined}>
        <div
          className={!hasSerpApiKey ? 'card-onboarding' : 'settings-card'}
          style={!hasSerpApiKey ? { flex: '1 1 20rem', maxWidth: '36rem', borderColor: '#fecaca', background: '#fef2f2' } : { borderColor: '#86efac', background: '#f0fdf4' }}
        >
        <h2 style={{ color: hasSerpApiKey ? '#166534' : '#991b1b' }}>
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
        <p style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
          <span className={`status-badge ${hasSerpApiKey ? 'success' : 'pending'}`}>
            {hasSerpApiKey ? t('settings.key.configured') : t('settings.key.notConfigured')}
          </span>
        </p>
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

        <div className="settings-card" style={{ borderColor: searchSettings.hl && searchSettings.gl ? '#86efac' : '#fecaca', background: searchSettings.hl && searchSettings.gl ? '#f0fdf4' : '#fef2f2' }}>
          <h2 style={{ color: searchSettings.hl && searchSettings.gl ? '#166534' : '#991b1b' }}>{t('dashboard.searchSettings.title')}</h2>
          <p style={{ color: searchSettings.hl && searchSettings.gl ? '#14532d' : '#7f1d1d', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            {searchSettings.hl && searchSettings.gl ? t('dashboard.searchSettings.current') : t('dashboard.searchSettings.missing')}
          </p>
          <p style={{ marginBottom: '0.75rem' }}>
            <span className={`status-badge ${searchSettings.hl && searchSettings.gl ? 'success' : 'pending'}`}>
              {searchSettings.hl && searchSettings.gl ? `${searchSettings.hl.toUpperCase()} / ${searchSettings.gl.toUpperCase()}` : t('dashboard.searchSettings.none')}
            </span>
          </p>
          <div className="settings-form">
            <div className="form-group">
              <label>{t('dashboard.searchSettings.language')}</label>
              <select
                value={searchSettings.hl ?? ''}
                onChange={(e) => setSearchSettings((s) => ({ ...s, hl: e.target.value || null }))}
              >
                <option value="">{t('dashboard.searchSettings.none')}</option>
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
              <select
                value={searchSettings.gl ?? ''}
                onChange={(e) => setSearchSettings((s) => ({ ...s, gl: e.target.value || null }))}
              >
                <option value="">{t('dashboard.searchSettings.none')}</option>
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
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveSearchSettings}
              disabled={savingSearchSettings}
            >
              {savingSearchSettings ? <span className="loading" /> : t('dashboard.searchSettings.save')}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRemoveSearchSettings}
              disabled={savingSearchSettings || (!searchSettings.hl && !searchSettings.gl)}
            >
              {t('dashboard.searchSettings.remove')}
            </button>
          </div>
        </div>

        <div className="settings-card">
          <h2>{t('settings.account.title')}</h2>
          <p>
            <strong>{t('settings.account.email')} :</strong> {session?.user?.email ?? '-'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.25rem', marginBottom: '0.75rem' }}>
            <span className={emailVerified ? 'status-badge success' : 'status-badge pending'}>
              {emailVerified ? t('settings.email.verified') : t('settings.email.notVerified')}
            </span>
            {!emailVerified && (
              <button type="button" className="btn btn-secondary" onClick={requestEmailVerification} disabled={emailActionLoading}>
                {emailActionLoading ? t('settings.email.sending') : t('settings.email.resend')}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={t('settings.email.newPlaceholder')}
              style={{ minHeight: '2.5rem', width: '100%', maxWidth: '22rem' }}
            />
            <button type="button" className="btn btn-secondary" onClick={requestEmailChange} disabled={emailActionLoading || !newEmail.trim()}>
              {emailActionLoading ? t('settings.email.sending') : t('settings.email.change')}
            </button>
          </div>
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
