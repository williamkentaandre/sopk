'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/app/LocaleContext';

export default function CheckInboxPage() {
  const { t, locale } = useLocale();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const resendVerification = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-email-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: locale === 'fr' ? 'fr' : 'en' }),
      });
      setMessage(res.ok ? t('settings.email.verificationSent') : t('settings.email.verificationError'));
    } catch {
      setMessage(t('auth.errorNetwork'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{t('emailInbox.title')}</h1>
        <p>{t('emailInbox.desc')}</p>
        {message && <p className={message === t('settings.email.verificationSent') ? 'auth-success' : 'auth-error'}>{message}</p>}
        <button type="button" className="btn btn-primary" onClick={resendVerification} disabled={loading}>
          {loading ? t('settings.email.sending') : t('emailInbox.resend')}
        </button>
        <p className="auth-footer" style={{ marginTop: '1rem' }}>
          <Link href="/login">{t('emailInbox.back')}</Link>
        </p>
      </div>
    </div>
  );
}
