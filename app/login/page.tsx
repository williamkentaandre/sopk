'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/app/LocaleContext';

function LoginFallback() {
  const { t } = useLocale();
  return (
    <div className="auth-page">
      <div className="auth-card">
        <p>{t('auth.loading')}</p>
      </div>
    </div>
  );
}

function LoginForm() {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const paymentSuccess = searchParams.get('payment') === 'success';
  const registered = searchParams.get('registered') === '1';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError(t('auth.errorBadCredentials'));
        setLoading(false);
        return;
      }
      window.location.href = callbackUrl;
    } catch {
      setError(t('auth.errorConnection'));
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{t('auth.login')}</h1>
        <p>SEO Ranker - {t('auth.tagline')}</p>
        {paymentSuccess && (
          <div className="auth-success">{t('auth.paymentSuccess')}</div>
        )}
        {registered && (
          <div className="auth-success">{t('auth.registered')}</div>
        )}
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
            <label>{t('auth.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <p style={{ marginTop: '0.25rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
            <Link
              href="/forgot-password"
              style={{
                color: 'var(--primary)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              {t('auth.forgotPassword')}
            </Link>
          </p>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t('auth.submitLoginLoading') : t('auth.submitLogin')}
          </button>
        </form>
        <p className="auth-footer">
          {t('auth.noAccount')} <Link href="/signup">{t('auth.signup')}</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
