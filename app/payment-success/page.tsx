'use client';

import { useEffect, useState } from 'react';

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 30; // 1 minute max

export default function PaymentSuccessPage() {
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
        <h1>Paiement reçu</h1>
        {status === 'waiting' && (
          <p>
            Vérification en cours… Reconnectez-vous dans quelques secondes pour accéder à votre espace.
          </p>
        )}
        {status === 'paid' && (
          <p>Accès activé. Redirection vers la page de connexion…</p>
        )}
        {status === 'error' && (
          <p>
            La vérification a pris trop de temps. Vous pouvez vous connecter : si le paiement a bien été enregistré, vous aurez accès au dashboard.
          </p>
        )}
        {status !== 'paid' && (
          <a href="/login?payment=success" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
            Aller à la connexion
          </a>
        )}
      </div>
    </div>
  );
}
