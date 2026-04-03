/** Maps hl / gl codes to i18n keys (same options as Settings). */

const HL_TO_I18N: Record<string, string> = {
  fr: 'opt.french',
  en: 'opt.english',
  es: 'opt.spanish',
  de: 'opt.german',
  it: 'opt.italian',
  pt: 'opt.portuguese',
  nl: 'opt.dutch',
  pl: 'opt.polish',
  ru: 'opt.russian',
  ja: 'opt.japanese',
  zh: 'opt.chinese',
  ar: 'opt.arabic',
};

const GL_TO_I18N: Record<string, string> = {
  fr: 'opt.france',
  be: 'opt.belgium',
  ch: 'opt.switzerland',
  ca: 'opt.canada',
  us: 'opt.unitedStates',
  uk: 'opt.unitedKingdom',
  de: 'opt.germany',
  es: 'opt.spain',
  it: 'opt.italy',
  pt: 'opt.portugal',
  nl: 'opt.netherlands',
  pl: 'opt.poland',
  ru: 'opt.russia',
  jp: 'opt.japan',
  cn: 'opt.china',
  au: 'opt.australia',
  br: 'opt.brazil',
  mx: 'opt.mexico',
  in: 'opt.india',
  sg: 'opt.singapore',
};

export function formatSearchLocaleLine(
  t: (key: string) => string,
  hl: string | null | undefined,
  gl: string | null | undefined
): { configured: boolean; label: string } {
  const h = (hl || '').trim().toLowerCase();
  const g = (gl || '').trim().toLowerCase();
  if (!h || !g) {
    return { configured: false, label: t('dashboard.status.searchLocaleNotSet') };
  }
  const lang = HL_TO_I18N[h] ? t(HL_TO_I18N[h]) : h.toUpperCase();
  const country = GL_TO_I18N[g] ? t(GL_TO_I18N[g]) : g.toUpperCase();
  return { configured: true, label: `${lang} · ${country}` };
}
