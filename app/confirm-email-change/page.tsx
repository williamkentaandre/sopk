'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/app/LocaleContext';

function ConfirmEmailChangeFallback() {
  const { t } = useLocale();
  return (
    <div className="auth-page">
      <div className="auth-card">
        <p>{t('auth.loading')}</p>
      </div>
    </div>
  );
}

function ConfirmEmailChangeInner() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'ok' | 'error' | 'conflict'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setStatus('error');
        return;
      }
      const res = await fetch('/api/auth/confirm-email-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }).catch(() => null);
      if (cancelled) return;
      if (!res) {
        setStatus('error');
        return;
      }
      if (res.ok) setStatus('ok');
      else if (res.status === 409) setStatus('conflict');
      else setStatus('error');
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{t('settings.email.changeTitle')}</h1>
        {status === 'loading' && <p>{t('auth.loading')}</p>}
        {status === 'ok' && (
          <>
            <div className="auth-success">{t('settings.email.changeSuccess')}</div>
            <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {t('settings.email.changeRelog')}
            </p>
          </>
        )}
        {status === 'conflict' && <div className="auth-error">{t('settings.email.changeConflict')}</div>}
        {status === 'error' && <div className="auth-error">{t('settings.email.changeError')}</div>}
        <p className="auth-footer" style={{ marginTop: '1rem' }}>
          <Link href="/login">{t('auth.login')}</Link>
        </p>
      </div>
    </div>
  );
}

export default function ConfirmEmailChangePage() {
  return (
    <Suspense fallback={<ConfirmEmailChangeFallback />}>
      <ConfirmEmailChangeInner />
    </Suspense>
  );
}

