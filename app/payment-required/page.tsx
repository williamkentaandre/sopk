'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function PaymentRequiredPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  async function goToCheckout() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/create-checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Paiement requis</h1>
        <p>
          Bonjour {session?.user?.email}. Pour utiliser SEO Ranker, effectuez un paiement unique.
        </p>
        <button
          className="btn btn-primary"
          onClick={goToCheckout}
          disabled={loading}
        >
          {loading ? 'Redirection...' : 'Payer et accéder à l\'app'}
        </button>
        <p className="auth-footer">
          <Link href="/dashboard">Retour</Link>
        </p>
      </div>
    </div>
  );
}
