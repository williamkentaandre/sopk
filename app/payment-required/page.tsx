'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useLocale } from '@/app/LocaleContext';

export default function PaymentRequiredPage() {
  const { t } = useLocale();
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.authenticated) setEmailVerified(!!data.emailVerified);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (emailVerified === false) {
      router.replace('/check-inbox');
    }
  }, [emailVerified, router]);

  async function goToCheckout() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/create-checkout', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (!res.ok) {
        const msg = data?.error?.message || data?.message || t('payment.required.error');
        setError(msg);
      } else {
        setError(t('payment.required.error'));
      }
    } catch {
      setError(t('auth.errorNetwork'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{t('payment.required.title')}</h1>
        <p>
          {t('payment.required.hello')} {session?.user?.email}. {t('payment.required.desc')}
        </p>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{t('payment.required.backHint')}</p>
        {error && <p className="auth-error" style={{ marginBottom: '1rem' }}>{error}</p>}
        <button
          className="btn btn-primary"
          onClick={goToCheckout}
          disabled={loading}
        >
          {loading ? t('payment.required.redirecting') : t('payment.required.button')}
        </button>
        <p className="auth-footer">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? window.history.back() : router.push('/login'))}
            style={{ background: 'none', border: 'none', color: '#1a73e8', cursor: 'pointer', padding: 0, textDecoration: 'underline', font: 'inherit' }}
          >
            {t('payment.required.back')}
          </button>
        </p>
      </div>
    </div>
  );
}
