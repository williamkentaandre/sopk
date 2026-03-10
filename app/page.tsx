import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '480px', textAlign: 'center' }}>
        <h1>SEO Ranker</h1>
        <p style={{ marginBottom: '1.5rem' }}>
          Suivez les positions Google de votre domaine pour vos mots-clés. Paiement unique, votre propre clé SERP API.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link href="/login" className="btn btn-primary" style={{ padding: '0.75rem', textAlign: 'center', textDecoration: 'none' }}>
            Se connecter
          </Link>
          <Link href="/signup" className="btn btn-secondary" style={{ padding: '0.75rem', textAlign: 'center', textDecoration: 'none' }}>
            Créer un compte
          </Link>
        </div>
      </div>
    </div>
  );
}
