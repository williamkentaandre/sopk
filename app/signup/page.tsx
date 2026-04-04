'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/app/LocaleContext';
import { nextAuthGoogleErrorMessage } from '@/lib/next-auth-oauth-errors';

function SignupFallback() {
  const { t } = useLocale();
  return (
    <div className="auth-page">
      <div className="auth-card">
        <p>{t('auth.loading')}</p>
      </div>
    </div>
  );
}

function SignupForm() {
  const { t, locale } = useLocale();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const oauthErrorBanner = nextAuthGoogleErrorMessage(searchParams.get('error'), t);

  // Pré-remplir l'email : URL (?email=...) ou session (ex. déjà connecté avec Google)
  useEffect(() => {
    const fromUrl = searchParams.get('email');
    const fromSession = session?.user?.email;
    const initial = fromUrl || fromSession || '';
    if (initial) setEmail((prev) => prev || initial);
  }, [searchParams, session?.user?.email]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, locale: locale === 'fr' ? 'fr' : 'en' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error?.message || t('auth.errorSignup'));
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
        <h1>{t('auth.signup')}</h1>
        <p>{t('auth.signupDesc')}</p>
        {oauthErrorBanner && (
          <p className="auth-error" role="alert" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
            {oauthErrorBanner}
          </p>
        )}
        <div style={{ marginBottom: '1.25rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t('auth.loginWithGoogle')}
          </button>
          <p style={{ marginTop: '1rem', marginBottom: 0, textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            — {t('auth.orEmailPassword').toLowerCase()} —
          </p>
        </div>
        {sent ? (
          <div className="auth-success">
            {t('auth.verifyEmail.sent')}
            <p style={{ marginTop: '0.75rem' }}>
              <Link href="/login">{t('auth.backToLogin')}</Link>
            </p>
          </div>
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
        )}
        <p className="auth-footer">
          {t('auth.hasAccount')} <Link href="/login">{t('auth.submitLogin')}</Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupForm />
    </Suspense>
  );
}
