'use client';

import { useLocale } from '@/app/LocaleContext';

type Variant = 'dashboard' | 'settings';

export function SerpApiOnboardingIllustration({ variant = 'dashboard' }: { variant?: Variant }) {
  const { t } = useLocale();
  const title = t('serpapi.title');
  const step1 = t('serpapi.step1');
  const step2 = t('serpapi.step2');
  const step3 = t('serpapi.step3');
  const footer = variant === 'settings' ? t('serpapi.pasteHere') : t('serpapi.pasteInSettings');

  const gradientId = variant === 'settings' ? 'settings-onboard-bg' : 'onboard-bg';

  return (
    <div style={{ flex: '0 0 auto', width: 'min(280px, 100%)' }} aria-hidden>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 280 200"
        fill="none"
        style={{ width: '100%', height: 'auto', borderRadius: 'var(--radius)', display: 'block' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="55%" stopColor="#134e4a" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>
        </defs>
        <rect width="280" height="200" rx="12" fill={`url(#${gradientId})`} stroke="rgba(45, 212, 191, 0.35)" strokeWidth="1" />
        <text x="140" y="28" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="14" fontWeight="600" fill="#e2e8f0">
          {title}
        </text>
        <circle cx="40" cy="55" r="14" fill="#0d9488" />
        <text x="40" y="59" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="14" fontWeight="700" fill="#f8fafc">
          1
        </text>
        <path d="M62 48 L62 62 L98 62 L98 48 Z M62 52 L80 58 L98 52" stroke="#2dd4bf" strokeWidth="2" fill="none" strokeLinecap="round" />
        <text x="115" y="58" fontFamily="system-ui, sans-serif" fontSize="12" fill="#94a3b8">
          {step1}
        </text>
        <circle cx="40" cy="105" r="14" fill="#0d9488" />
        <text x="40" y="109" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="14" fontWeight="700" fill="#f8fafc">
          2
        </text>
        <path d="M68 95 L68 115 L72 115 L72 95 Z M70 95 L70 90 L76 90 L76 95 M64 108 L76 108 M64 112 L76 112" stroke="#2dd4bf" strokeWidth="2" fill="none" strokeLinecap="round" />
        <text x="115" y="108" fontFamily="system-ui, sans-serif" fontSize="12" fill="#94a3b8">
          {step2}
        </text>
        <circle cx="40" cy="155" r="14" fill="#0d9488" />
        <text x="40" y="159" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="14" fontWeight="700" fill="#f8fafc">
          3
        </text>
        <path d="M64 148 L72 148 L76 152 L80 148 L88 148 L88 158 L64 158 Z M70 154 L82 154" stroke="#2dd4bf" strokeWidth="2" fill="none" strokeLinecap="round" />
        <text x="115" y="158" fontFamily="system-ui, sans-serif" fontSize="12" fill="#94a3b8">
          {step3}
        </text>
        <path d="M140 175 L140 188 M135 183 L140 188 L145 183" stroke="#818cf8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="140" y="198" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="11" fill="#64748b">
          {footer}
        </text>
      </svg>
    </div>
  );
}
