'use client';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/app/LocaleContext';

function ResetPasswordForm() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) setError(t('auth.resetErrorInvalid'));
  }, [token, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error?.message || t('auth.resetErrorInvalid'));
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError(t('auth.errorNetwork'));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>{t('auth.resetPasswordTitle')}</h1>
          <p className="auth-error">{t('auth.resetErrorInvalid')}</p>
          <p className="auth-footer" style={{ marginTop: '1rem' }}>
            <Link href="/forgot-password">{t('auth.forgotPassword')}</Link>
          </p>
          <p className="auth-footer">
            <Link href="/login">{t('auth.backToLogin')}</Link>
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>{t('auth.resetPasswordTitle')}</h1>
          <div className="auth-success">{t('auth.resetSuccess')}</div>
          <p className="auth-footer" style={{ marginTop: '1rem' }}>
            <Link
              href="/login"
              className="btn btn-primary"
              style={{ display: 'inline-block', textDecoration: 'none', color: '#fff' }}
            >
              {t('auth.backToLogin')}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{t('auth.resetPasswordTitle')}</h1>
        <p>{t('auth.resetPasswordDesc')}</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('auth.newPassword')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label>{t('auth.confirmPassword')}</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '...' : t('auth.resetButton')}
          </button>
        </form>
        <p className="auth-footer" style={{ marginTop: '1rem' }}>
          <Link href="/login">{t('auth.backToLogin')}</Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="auth-page"><div className="auth-card"><p>Loading...</p></div></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
