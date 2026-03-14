'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useLocale } from '@/app/LocaleContext';

export default function SignupPage() {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error?.message || t('auth.errorSignup'));
        setLoading(false);
        return;
      }
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (signInResult?.error) {
        setError(t('auth.accountCreatedLogin'));
        setLoading(false);
        return;
      }
      window.location.href = '/dashboard';
    } catch {
      setError(t('auth.errorNetwork'));
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{t('auth.signup')}</h1>
        <p>{t('auth.signupDesc')}</p>
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
          <div className="form-group">
            <label>{t('auth.passwordMin')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t('auth.submitSignupLoading') : t('auth.submitSignup')}
          </button>
        </form>
        <p className="auth-footer">
          {t('auth.hasAccount')} <Link href="/login">{t('auth.submitLogin')}</Link>
        </p>
      </div>
    </div>
  );
}
