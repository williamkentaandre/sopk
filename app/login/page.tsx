'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
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
        setError('Email ou mot de passe incorrect');
        setLoading(false);
        return;
      }
      window.location.href = callbackUrl;
    } catch {
      setError('Erreur de connexion');
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Connexion</h1>
        <p>SEO Ranker - Suivi de positions Google</p>
        {paymentSuccess && (
          <div className="auth-success">Paiement réussi. Connectez-vous pour accéder à votre espace.</div>
        )}
        {registered && (
          <div className="auth-success">Compte créé. Connectez-vous puis effectuez le paiement pour activer l&apos;accès.</div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <p className="auth-footer">
          Pas de compte ? <Link href="/signup">S&apos;inscrire</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-page"><div className="auth-card"><p>Chargement...</p></div></div>}>
      <LoginForm />
    </Suspense>
  );
}
