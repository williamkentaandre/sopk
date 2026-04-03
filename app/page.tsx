'use client';

import Link from 'next/link';
import { useLocale } from '@/app/LocaleContext';

export default function HomePage() {
  const { t } = useLocale();

  const heroTitle = t('landing.hero.title');
  const heroLines = heroTitle.split('\n');

  return (
    <div className="landing-page">
      <nav
        className="nav-with-lang-switcher"
        style={{ padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1100, margin: '0 auto' }}
      >
        <span className="landing-brand">SEO Ranker</span>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/login" className="landing-nav-link">
            {t('landing.nav.login')}
          </Link>
          <Link href="/signup" className="btn btn-primary" style={{ padding: '0.5rem 1rem', textDecoration: 'none' }}>
            {t('landing.nav.signup')}
          </Link>
        </div>
      </nav>

      <section className="landing-section landing-section--transparent" style={{ padding: '4rem 2rem 5rem', maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <h1 className="landing-hero-title">
          {heroLines.map((line, i) => (
            <span key={i}>
              {line}
              {i < heroLines.length - 1 && <br />}
            </span>
          ))}
        </h1>
        <p className="landing-hero-sub">{t('landing.hero.subtitle')}</p>
        <Link href="/signup" className="btn btn-primary" style={{ display: 'inline-block', padding: '0.85rem 1.75rem', fontSize: '1rem', textDecoration: 'none', borderRadius: 8 }}>
          {t('landing.hero.cta')}
        </Link>
      </section>

      <section className="landing-section landing-section--alt">
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', marginBottom: '0.5rem' }}>{t('landing.video.title')}</h2>
          <p style={{ fontSize: '0.95rem', textAlign: 'center', marginBottom: '1.5rem' }}>{t('landing.video.subtitle')}</p>
          <div
            style={{
              position: 'relative',
              width: '100%',
              paddingBottom: '56.25%',
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
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

      <section className="landing-section landing-section--deep">
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', marginBottom: '2.5rem' }}>{t('landing.how.title')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="landing-step-num">1</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>{t('landing.how.step1.title')}</h3>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>{t('landing.how.step1.desc')}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="landing-step-num">2</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>{t('landing.how.step2.title')}</h3>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>{t('landing.how.step2.desc')}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="landing-step-num">3</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>{t('landing.how.step3.title')}</h3>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>{t('landing.how.step3.desc')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--transparent" style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', marginBottom: '2.5rem' }}>{t('landing.benefits.title')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div className="landing-card">
            <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>{t('landing.benefits.speed')}</div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{t('landing.benefits.speed.desc')}</p>
          </div>
          <div className="landing-card">
            <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>{t('landing.benefits.essential')}</div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{t('landing.benefits.essential.desc')}</p>
          </div>
          <div className="landing-card">
            <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>{t('landing.benefits.pricing')}</div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{t('landing.benefits.pricing.desc')}</p>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--alt">
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', marginBottom: '1.5rem' }}>{t('landing.pricing.title')}</h2>
          <div className="landing-card" style={{ padding: '1.5rem 1.75rem' }}>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>{t('landing.pricing.price')}</p>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.55, marginBottom: '0.75rem' }}>{t('landing.pricing.earlyAdopter')}</p>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.55, margin: 0 }}>{t('landing.pricing.limit')}</p>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--deep">
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', marginBottom: '0.5rem' }}>{t('landing.compare.title')}</h2>
          <p style={{ fontSize: '0.95rem', textAlign: 'center', marginBottom: '2rem', maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
            {t('landing.compare.subtitle')}
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.25rem',
              alignItems: 'stretch',
            }}
          >
            <div className="landing-compare-bad" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }} title="Alternatives">
                ⚠️
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <h3>{t('landing.compare.big.title')}</h3>
                <p>{t('landing.compare.big.desc')}</p>
              </div>
              <div className="landing-compare-bad-divider">
                <h3>{t('landing.compare.gsc.title')}</h3>
                <p>{t('landing.compare.gsc.desc')}</p>
              </div>
              <div style={{ paddingTop: '1.25rem', borderTop: '1px solid rgba(248, 113, 113, 0.2)' }}>
                <h3>{t('landing.compare.api.title')}</h3>
                <p>{t('landing.compare.api.desc')}</p>
              </div>
            </div>
            <div className="landing-compare-good" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }} title="Best value">
                ✅
              </div>
              <h3>{t('landing.compare.us.title')}</h3>
              <p>{t('landing.compare.us.desc')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--alt">
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', marginBottom: '2rem' }}>{t('landing.preview.title')}</h2>
          <div className="landing-preview-shell">
            <div className="landing-preview-toolbar">
              <span style={{ fontWeight: 600 }}>{t('landing.preview.table.caption')}</span>
              <span className="landing-preview-badge landing-preview-badge--cyan">{t('landing.preview.import')}</span>
              <span className="landing-preview-badge landing-preview-badge--cyan">{t('landing.preview.measureAll')}</span>
              <span className="landing-preview-badge landing-preview-badge--violet">{t('landing.preview.export')}</span>
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: 420, borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-subtle)' }}>{t('landing.preview.keyword')}</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-subtle)' }}>{t('landing.preview.url')}</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-subtle)' }}>{t('landing.preview.position')}</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-subtle)' }}>{t('landing.preview.lastMeasure')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>{t('landing.preview.exampleKeyword')}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{t('landing.preview.exampleUrl')}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--primary)' }}>3</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>14/03/2026</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>{t('landing.preview.exampleKeyword2')}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{t('landing.preview.exampleUrl')}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--primary)' }}>7</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>14/03/2026</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-subtle)' }}>—</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-subtle)' }}>—</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-subtle)' }}>—</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-subtle)' }}>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-subtle)', borderTop: '1px solid var(--border)' }}>
              {t('landing.preview.footer')}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--deep">
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', marginBottom: '2rem' }}>{t('landing.faq.title')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="landing-card" style={{ padding: '1rem 1.25rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>{t('landing.faq.q1')}</p>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.55, margin: 0 }}>{t('landing.faq.a1')}</p>
            </div>
            <div className="landing-card" style={{ padding: '1rem 1.25rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>{t('landing.faq.q2')}</p>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.55, margin: 0 }}>{t('landing.faq.a2')}</p>
            </div>
            <div className="landing-card" style={{ padding: '1rem 1.25rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>{t('landing.faq.q3')}</p>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.55, margin: 0 }}>{t('landing.faq.a3')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--transparent" style={{ padding: '5rem 2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>{t('landing.cta.title')}</h2>
        <p style={{ marginBottom: '1.5rem' }}>{t('landing.cta.subtitle')}</p>
        <Link href="/signup" className="btn btn-primary" style={{ display: 'inline-block', padding: '0.85rem 1.75rem', fontSize: '1rem', textDecoration: 'none', borderRadius: 8 }}>
          {t('landing.hero.cta')}
        </Link>
      </section>

      <footer className="landing-footer">
        <Link href="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none', marginRight: '1rem' }}>
          {t('landing.footer.login')}
        </Link>
        <Link href="/signup" style={{ color: 'var(--link)', textDecoration: 'none' }}>
          {t('landing.footer.signup')}
        </Link>
      </footer>
    </div>
  );
}
