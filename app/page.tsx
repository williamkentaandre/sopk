'use client';

import Link from 'next/link';
import { useLocale } from '@/app/LocaleContext';

export default function HomePage() {
  const { t } = useLocale();

  const heroTitle = t('landing.hero.title');
  const heroLines = heroTitle.split('\n');

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Nav */}
      <nav className="nav-with-lang-switcher" style={{ padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1100, margin: '0 auto' }}>
        <span style={{ fontWeight: 700, fontSize: '1.25rem', color: '#111' }}>SEO Ranker</span>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/login" style={{ padding: '0.5rem 1rem', color: '#555', textDecoration: 'none', fontWeight: 500 }}>{t('landing.nav.login')}</Link>
          <Link href="/signup" className="btn btn-primary" style={{ padding: '0.5rem 1rem', textDecoration: 'none' }}>{t('landing.nav.signup')}</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '4rem 2rem 5rem', maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', fontWeight: 700, color: '#111', lineHeight: 1.2, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
          {heroLines.map((line, i) => (
            <span key={i}>{line}{i < heroLines.length - 1 && <br />}</span>
          ))}
        </h1>
        <p style={{ fontSize: '1.15rem', color: '#555', lineHeight: 1.6, marginBottom: '2rem' }}>
          {t('landing.hero.subtitle')}
        </p>
        <Link href="/signup" className="btn btn-primary" style={{ display: 'inline-block', padding: '0.85rem 1.75rem', fontSize: '1rem', textDecoration: 'none', borderRadius: 6 }}>
          {t('landing.hero.cta')}
        </Link>
      </section>

      {/* Demo video */}
      <section style={{ padding: '4rem 2rem', background: '#fff', borderTop: '1px solid #eee' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111', textAlign: 'center', marginBottom: '0.5rem' }}>{t('landing.video.title')}</h2>
          <p style={{ fontSize: '0.95rem', color: '#555', textAlign: 'center', marginBottom: '1.5rem' }}>{t('landing.video.subtitle')}</p>
          <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
            <iframe
              src="https://www.youtube.com/embed/dQw4w9WgXcQ"
              title="SEO Ranker demo video"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* Vs Google Search Console */}
      <section style={{ padding: '4rem 2rem', background: '#fff', borderTop: '1px solid #eee' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111', textAlign: 'center', marginBottom: '2rem' }}>{t('landing.vsGsc.title')}</h2>
          <p style={{ fontSize: '1.1rem', color: '#111', fontWeight: 600, textAlign: 'center', lineHeight: 1.5, marginBottom: '2.5rem', padding: '1.25rem 1.5rem', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
            {t('landing.vsGsc.punch')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', alignItems: 'start' }}>
            <div style={{ padding: '1.25rem', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.75rem' }}>{t('landing.vsGsc.gsc.title')}</h3>
              <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '0.75rem' }}>{t('landing.vsGsc.gsc.intro')}</p>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem', color: '#555', lineHeight: 1.6 }}>
                <li>{t('landing.vsGsc.gsc.bullet1')}</li>
                <li>{t('landing.vsGsc.gsc.bullet2')}</li>
                <li>{t('landing.vsGsc.gsc.bullet3')}</li>
              </ul>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#991b1b', marginTop: '1rem', marginBottom: 0 }}>➡️ {t('landing.vsGsc.gsc.result')}</p>
            </div>
            <div style={{ padding: '1.25rem', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#166534', marginBottom: '0.75rem' }}>{t('landing.vsGsc.us.title')}</h3>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem', color: '#555', lineHeight: 1.6 }}>
                <li style={{ marginBottom: '0.5rem' }}>{t('landing.vsGsc.us.real')}</li>
                <li style={{ marginBottom: '0.5rem' }}>{t('landing.vsGsc.us.noCookies')}</li>
                <li>{t('landing.vsGsc.us.competitors')}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '4rem 2rem', background: '#fafafa', borderTop: '1px solid #eee' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111', textAlign: 'center', marginBottom: '2.5rem' }}>{t('landing.how.title')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#e8f0fe', color: '#1a73e8', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>1</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#111', marginBottom: '0.5rem' }}>{t('landing.how.step1.title')}</h3>
              <p style={{ fontSize: '0.95rem', color: '#555', lineHeight: 1.5 }}>{t('landing.how.step1.desc')}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#e8f0fe', color: '#1a73e8', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>2</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#111', marginBottom: '0.5rem' }}>{t('landing.how.step2.title')}</h3>
              <p style={{ fontSize: '0.95rem', color: '#555', lineHeight: 1.5 }}>{t('landing.how.step2.desc')}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#e8f0fe', color: '#1a73e8', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>3</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#111', marginBottom: '0.5rem' }}>{t('landing.how.step3.title')}</h3>
              <p style={{ fontSize: '0.95rem', color: '#555', lineHeight: 1.5 }}>{t('landing.how.step3.desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section style={{ padding: '4rem 2rem', maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111', textAlign: 'center', marginBottom: '2.5rem' }}>{t('landing.benefits.title')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div style={{ padding: '1.25rem', background: '#fff', borderRadius: 8, border: '1px solid #eee' }}>
            <div style={{ fontWeight: 700, color: '#111', marginBottom: '0.35rem' }}>{t('landing.benefits.speed')}</div>
            <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.5 }}>{t('landing.benefits.speed.desc')}</p>
          </div>
          <div style={{ padding: '1.25rem', background: '#fff', borderRadius: 8, border: '1px solid #eee' }}>
            <div style={{ fontWeight: 700, color: '#111', marginBottom: '0.35rem' }}>{t('landing.benefits.essential')}</div>
            <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.5 }}>{t('landing.benefits.essential.desc')}</p>
          </div>
          <div style={{ padding: '1.25rem', background: '#fff', borderRadius: 8, border: '1px solid #eee' }}>
            <div style={{ fontWeight: 700, color: '#111', marginBottom: '0.35rem' }}>{t('landing.benefits.pricing')}</div>
            <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.5 }}>{t('landing.benefits.pricing.desc')}</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: '4rem 2rem', background: '#fff', borderTop: '1px solid #eee' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111', textAlign: 'center', marginBottom: '1.5rem' }}>{t('landing.pricing.title')}</h2>
          <div style={{ padding: '1.5rem 1.75rem', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111', marginBottom: '0.75rem' }}>{t('landing.pricing.price')}</p>
            <p style={{ fontSize: '0.95rem', color: '#555', lineHeight: 1.55, marginBottom: '0.75rem' }}>{t('landing.pricing.earlyAdopter')}</p>
            <p style={{ fontSize: '0.95rem', color: '#555', lineHeight: 1.55, margin: 0 }}>{t('landing.pricing.limit')}</p>
          </div>
        </div>
      </section>

      {/* Compare to competitors */}
      <section style={{ padding: '4rem 2rem', background: '#fafafa', borderTop: '1px solid #eee' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111', textAlign: 'center', marginBottom: '0.5rem' }}>{t('landing.compare.title')}</h2>
          <p style={{ fontSize: '0.95rem', color: '#555', textAlign: 'center', marginBottom: '2rem', maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>{t('landing.compare.subtitle')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div style={{ padding: '1.25rem', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }} title="Alternatives">⚠️</div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.5rem' }}>{t('landing.compare.alts.title')}</h3>
              <p style={{ fontSize: '0.875rem', color: '#7f1d1d', lineHeight: 1.5, margin: 0 }}>{t('landing.compare.alts.desc')}</p>
            </div>
            <div style={{ padding: '1.25rem', background: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }} title="Best value">✅</div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#166534', marginBottom: '0.5rem' }}>{t('landing.compare.us.title')}</h3>
              <p style={{ fontSize: '0.875rem', color: '#14532d', lineHeight: 1.55, margin: 0 }}>{t('landing.compare.us.desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Product preview */}
      <section style={{ padding: '4rem 2rem', background: '#fff', borderTop: '1px solid #eee' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111', textAlign: 'center', marginBottom: '2rem' }}>{t('landing.preview.title')}</h2>
          <div style={{ background: '#f8f9fa', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', background: '#fff', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: '#333' }}>{t('landing.preview.table.caption')}</span>
              <span style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', background: '#e8f0fe', color: '#1a73e8', borderRadius: 4 }}>{t('landing.preview.import')}</span>
              <span style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', background: '#e8f0fe', color: '#1a73e8', borderRadius: 4 }}>{t('landing.preview.measureAll')}</span>
              <span style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', background: '#e0e7ff', color: '#4338ca', borderRadius: 4 }}>{t('landing.preview.export')}</span>
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: 420, borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>{t('landing.preview.keyword')}</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>{t('landing.preview.url')}</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>{t('landing.preview.position')}</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>{t('landing.preview.lastMeasure')}</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>{t('landing.preview.exampleKeyword')}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{t('landing.preview.exampleUrl')}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#059669' }}>3</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>14/03/2026</td>
                </tr>
                <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>{t('landing.preview.exampleKeyword2')}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{t('landing.preview.exampleUrl')}</td>
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
            </div>
            <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#94a3b8', borderTop: '1px solid #e5e7eb' }}>{t('landing.preview.footer')}</div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '4rem 2rem', background: '#fafafa', borderTop: '1px solid #eee' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111', textAlign: 'center', marginBottom: '2rem' }}>{t('landing.faq.title')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '1rem 1.25rem', background: '#fff', borderRadius: 8, border: '1px solid #eee' }}>
              <p style={{ fontWeight: 600, color: '#111', marginBottom: '0.5rem', fontSize: '0.95rem' }}>{t('landing.faq.q1')}</p>
              <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.55, margin: 0 }}>{t('landing.faq.a1')}</p>
            </div>
            <div style={{ padding: '1rem 1.25rem', background: '#fff', borderRadius: 8, border: '1px solid #eee' }}>
              <p style={{ fontWeight: 600, color: '#111', marginBottom: '0.5rem', fontSize: '0.95rem' }}>{t('landing.faq.q2')}</p>
              <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.55, margin: 0 }}>{t('landing.faq.a2')}</p>
            </div>
            <div style={{ padding: '1rem 1.25rem', background: '#fff', borderRadius: 8, border: '1px solid #eee' }}>
              <p style={{ fontWeight: 600, color: '#111', marginBottom: '0.5rem', fontSize: '0.95rem' }}>{t('landing.faq.q3')}</p>
              <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.55, margin: 0 }}>{t('landing.faq.a3')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '5rem 2rem', textAlign: 'center', background: '#fafafa' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111', marginBottom: '0.75rem' }}>{t('landing.cta.title')}</h2>
        <p style={{ color: '#555', marginBottom: '1.5rem' }}>{t('landing.cta.subtitle')}</p>
        <Link href="/signup" className="btn btn-primary" style={{ display: 'inline-block', padding: '0.85rem 1.75rem', fontSize: '1rem', textDecoration: 'none', borderRadius: 6 }}>
          {t('landing.hero.cta')}
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ padding: '2rem', textAlign: 'center', borderTop: '1px solid #eee', background: '#fff', color: '#64748b', fontSize: '0.9rem' }}>
        <Link href="/login" style={{ color: '#64748b', textDecoration: 'none', marginRight: '1rem' }}>{t('landing.footer.login')}</Link>
        <Link href="/signup" style={{ color: '#1a73e8', textDecoration: 'none' }}>{t('landing.footer.signup')}</Link>
      </footer>
    </div>
  );
}
