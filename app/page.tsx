import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ background: '#fafafa', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Nav */}
      <nav style={{ padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1100, margin: '0 auto' }}>
        <span style={{ fontWeight: 700, fontSize: '1.25rem', color: '#111' }}>SEO Ranker</span>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/login" style={{ padding: '0.5rem 1rem', color: '#555', textDecoration: 'none', fontWeight: 500 }}>Connexion</Link>
          <Link href="/signup" className="btn btn-primary" style={{ padding: '0.5rem 1rem', textDecoration: 'none' }}>Créer un compte</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '4rem 2rem 5rem', maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', fontWeight: 700, color: '#111', lineHeight: 1.2, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
          Suivez vos positions Google.<br />Rien d&apos;autre.
        </h1>
        <p style={{ fontSize: '1.15rem', color: '#555', lineHeight: 1.6, marginBottom: '2rem' }}>
          Les plateformes SEO coûtent cher et noient sous les fonctionnalités. Nous ne faisons qu&apos;une chose : suivre le classement de vos mots-clés dans le temps.
        </p>
        <Link href="/signup" className="btn btn-primary" style={{ display: 'inline-block', padding: '0.85rem 1.75rem', fontSize: '1rem', textDecoration: 'none', borderRadius: 6 }}>
          Commencer à suivre mes positions
        </Link>
      </section>

      {/* How it works */}
      <section style={{ padding: '4rem 2rem', background: '#fff', borderTop: '1px solid #eee' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111', textAlign: 'center', marginBottom: '2.5rem' }}>Comment ça marche</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#e8f0fe', color: '#1a73e8', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>1</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#111', marginBottom: '0.5rem' }}>Domaine et mots-clés</h3>
              <p style={{ fontSize: '0.95rem', color: '#555', lineHeight: 1.5 }}>Ajoutez votre domaine (et sous-domaines), puis vos mots-clés — à la main ou en important un fichier Excel/CSV.</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#e8f0fe', color: '#1a73e8', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>2</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#111', marginBottom: '0.5rem' }}>Une clé, puis lancez</h3>
              <p style={{ fontSize: '0.95rem', color: '#555', lineHeight: 1.5 }}>Une clé API gratuite (SerpAPI) suffit. Cliquez sur « Mesurer » et les positions sont enregistrées.</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#e8f0fe', color: '#1a73e8', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>3</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#111', marginBottom: '0.5rem' }}>Évolution dans le temps</h3>
              <p style={{ fontSize: '0.95rem', color: '#555', lineHeight: 1.5 }}>Consultez un tableau par jour et exportez en CSV ou Excel pour suivre l&apos;évolution de vos positions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section style={{ padding: '4rem 2rem', maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111', textAlign: 'center', marginBottom: '2.5rem' }}>Pourquoi un outil dédié</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div style={{ padding: '1.25rem', background: '#fff', borderRadius: 8, border: '1px solid #eee' }}>
            <div style={{ fontWeight: 700, color: '#111', marginBottom: '0.35rem' }}>Simplicité</div>
            <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.5 }}>Une seule mission : le suivi de positions. Pas de tableau de bord à 50 onglets.</p>
          </div>
          <div style={{ padding: '1.25rem', background: '#fff', borderRadius: 8, border: '1px solid #eee' }}>
            <div style={{ fontWeight: 700, color: '#111', marginBottom: '0.35rem' }}>Rapidité</div>
            <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.5 }}>En place en quelques minutes. Pas de formation, pas de démo commerciale.</p>
          </div>
          <div style={{ padding: '1.25rem', background: '#fff', borderRadius: 8, border: '1px solid #eee' }}>
            <div style={{ fontWeight: 700, color: '#111', marginBottom: '0.35rem' }}>L&apos;essentiel</div>
            <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.5 }}>Mots-clés, URLs, positions, dates. Pas de rapports inutiles.</p>
          </div>
          <div style={{ padding: '1.25rem', background: '#fff', borderRadius: 8, border: '1px solid #eee' }}>
            <div style={{ fontWeight: 700, color: '#111', marginBottom: '0.35rem' }}>Tarif maîtrisé</div>
            <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.5 }}>Paiement unique. Pas d&apos;abonnement à quatre chiffres comme les suites SEO complètes.</p>
          </div>
        </div>
      </section>

      {/* Product preview */}
      <section style={{ padding: '4rem 2rem', background: '#fff', borderTop: '1px solid #eee' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111', textAlign: 'center', marginBottom: '2rem' }}>Votre tableau de suivi</h2>
          <div style={{ background: '#f8f9fa', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#fff', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: '#333' }}>Couples Mot-clé / URL</span>
              <span style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', background: '#e8f0fe', color: '#1a73e8', borderRadius: 4 }}>Import</span>
              <span style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', background: '#e8f0fe', color: '#1a73e8', borderRadius: 4 }}>Mesurer tout</span>
              <span style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', background: '#e0e7ff', color: '#4338ca', borderRadius: 4 }}>Export</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>Mot-clé</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>URL</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>Position</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>Dernière mesure</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>mot-clé exemple</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>votredomaine.com</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#059669' }}>3</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>14/03/2026</td>
                </tr>
                <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>autre requête</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>votredomaine.com</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#059669' }}>7</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>14/03/2026</td>
                </tr>
                <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>—</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>—</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>—</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>—</td>
                </tr>
              </tbody>
            </table>
            <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#94a3b8', borderTop: '1px solid #e5e7eb' }}>Évolution par jour disponible • Export CSV / Excel</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '5rem 2rem', textAlign: 'center', background: '#fafafa' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111', marginBottom: '0.75rem' }}>Prêt à suivre vos positions ?</h2>
        <p style={{ color: '#555', marginBottom: '1.5rem' }}>Paiement unique. Votre clé SerpAPI. Aucun abonnement.</p>
        <Link href="/signup" className="btn btn-primary" style={{ display: 'inline-block', padding: '0.85rem 1.75rem', fontSize: '1rem', textDecoration: 'none', borderRadius: 6 }}>
          Commencer à suivre mes positions
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ padding: '2rem', textAlign: 'center', borderTop: '1px solid #eee', background: '#fff', color: '#64748b', fontSize: '0.9rem' }}>
        <Link href="/login" style={{ color: '#64748b', textDecoration: 'none', marginRight: '1rem' }}>Connexion</Link>
        <Link href="/signup" style={{ color: '#1a73e8', textDecoration: 'none' }}>Créer un compte</Link>
      </footer>
    </div>
  );
}
