'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/app/LocaleContext';

function VerifyEmailFallback() {
  const { t } = useLocale();
  return (
    <div className="auth-page">
      <div className="auth-card">
        <p>{t('auth.loading')}</p>
      </div>
    </div>
  );
}

function VerifyEmailInner() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setStatus('error');
        return;
      }
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }).catch(() => null);
      if (cancelled) return;
      setStatus(res?.ok ? 'ok' : 'error');
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{t('settings.email.verifyTitle')}</h1>
        {status === 'loading' && <p>{t('auth.loading')}</p>}
        {status === 'ok' && <div className="auth-success">{t('settings.email.verifySuccess')}</div>}
        {status === 'error' && <div className="auth-error">{t('settings.email.verifyError')}</div>}
        <p className="auth-footer" style={{ marginTop: '1rem' }}>
          <Link href="/settings">{t('settings.title')}</Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailInner />
    </Suspense>
  );
}

