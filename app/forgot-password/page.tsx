'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/app/LocaleContext';

export default function ForgotPasswordPage() {
  const { t, locale } = useLocale();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), locale: locale === 'fr' ? 'fr' : 'en' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error?.message || 'Error');
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError(t('auth.errorNetwork'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{t('auth.forgotPasswordTitle')}</h1>
        <p>{t('auth.forgotPasswordDesc')}</p>
        {sent ? (
          <div className="auth-success">{t('auth.forgotPasswordSuccess')}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('auth.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('auth.sending') : t('auth.sendResetLink')}
            </button>
          </form>
        )}
        <p className="auth-footer" style={{ marginTop: '1rem' }}>
          <Link href="/login">{t('auth.backToLogin')}</Link>
        </p>
      </div>
    </div>
  );
}
