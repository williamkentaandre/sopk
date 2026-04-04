/**
 * Maps NextAuth ?error= query codes (after failed OAuth) to i18n keys via callback `t`.
 */
export function nextAuthGoogleErrorMessage(
  code: string | null,
  t: (key: string) => string
): string | null {
  if (!code) return null;
  const misconfig = new Set([
    'OAuthSignin',
    'OAuthCallback',
    'OAuthCreateAccount',
    'Callback',
    'Configuration',
  ]);
  if (misconfig.has(code)) return t('auth.oauthError.misconfig');
  if (code === 'OAuthAccountNotLinked') return t('auth.oauthError.OAuthAccountNotLinked');
  return t('auth.oauthError.default');
}
