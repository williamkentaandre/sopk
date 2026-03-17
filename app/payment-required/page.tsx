'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useLocale } from '@/app/LocaleContext';

export default function PaymentRequiredPage() {
  const { t } = useLocale();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        {error && (
          <p className="auth-error" style={{ marginBottom: '1rem' }}>{error}</p>
        )}
        <button
          className="btn btn-primary"
          onClick={goToCheckout}
          disabled={loading}
        >
          {loading ? t('payment.required.redirecting') : t('payment.required.button')}
        </button>
        <p className="auth-footer">
          <Link href="/dashboard">{t('payment.required.back')}</Link>
        </p>
      </div>
    </div>
  );
}
