'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/app/LocaleContext';

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 30; // 1 minute max

export default function PaymentSuccessPage() {
  const { t } = useLocale();
  const [status, setStatus] = useState<'waiting' | 'paid' | 'error'>('waiting');

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const check = async () => {
      if (cancelled) return;
      try {
        const res = await fetch('/api/user/payment-status');
        const data = await res.json();
        if (cancelled) return;
        if (data.paid) {
          setStatus('paid');
          window.location.href = '/login?payment=success';
          return;
        }
      } catch {
        // ignore
      }
      attempts++;
      if (attempts >= MAX_ATTEMPTS) {
        setStatus('error');
        clearInterval(id);
      }
    };

    const id = setInterval(check, POLL_INTERVAL_MS);
    check();

    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{t('payment.success.title')}</h1>
        {status === 'waiting' && (
          <p>{t('payment.success.waiting')}</p>
        )}
        {status === 'paid' && (
          <p>{t('payment.success.paid')}</p>
        )}
        {status === 'error' && (
          <p>{t('payment.success.error')}</p>
        )}
        {status !== 'paid' && (
          <a href="/login?payment=success" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
            {t('payment.success.goLogin')}
          </a>
        )}
      </div>
    </div>
  );
}
