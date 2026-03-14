import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'SEO Ranker <onboarding@resend.dev>';
const FROM_NAME = 'SEO Ranker';

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

function getResend(): Resend | null {
  if (!RESEND_API_KEY) return null;
  return new Resend(RESEND_API_KEY);
}

export type EmailLocale = 'en' | 'fr';

const welcomeContent: Record<EmailLocale, { subject: string; html: (baseUrl: string) => string }> = {
  en: {
    subject: 'Welcome to SEO Ranker',
    html: (baseUrl) => `
      <p>Your account has been created.</p>
      <p>Log in to complete your one-time payment and start tracking your keyword rankings:</p>
      <p><a href="${baseUrl}/login">Log in to SEO Ranker</a></p>
      <p>— SEO Ranker</p>
    `,
  },
  fr: {
    subject: 'Bienvenue sur SEO Ranker',
    html: (baseUrl) => `
      <p>Votre compte a été créé.</p>
      <p>Connectez-vous pour effectuer votre paiement unique et commencer à suivre vos positions :</p>
      <p><a href="${baseUrl}/login">Se connecter à SEO Ranker</a></p>
      <p>— SEO Ranker</p>
    `,
  },
};

const resetContent: Record<EmailLocale, { subject: string; html: (baseUrl: string, resetUrl: string) => string }> = {
  en: {
    subject: 'Reset your password - SEO Ranker',
    html: (baseUrl, resetUrl) => `
      <p>You requested a password reset.</p>
      <p>Click the link below to choose a new password (valid for 1 hour):</p>
      <p><a href="${resetUrl}">Reset my password</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
      <p>— SEO Ranker</p>
    `,
  },
  fr: {
    subject: 'Réinitialisation de votre mot de passe - SEO Ranker',
    html: (baseUrl, resetUrl) => `
      <p>Vous avez demandé une réinitialisation de mot de passe.</p>
      <p>Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe (valide 1 heure) :</p>
      <p><a href="${resetUrl}">Réinitialiser mon mot de passe</a></p>
      <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
      <p>— SEO Ranker</p>
    `,
  },
};

/**
 * Sends a welcome email after signup. No-op if RESEND_API_KEY is not set.
 */
export async function sendWelcomeEmail(to: string, locale: EmailLocale = 'en'): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set, skipping welcome email');
    return { ok: true };
  }
  const baseUrl = getBaseUrl();
  const content = welcomeContent[locale];
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: content.subject,
      html: content.html(baseUrl),
    });
    if (error) {
      console.error('[email] Welcome send error:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.error('[email] Welcome send exception:', e);
    return { ok: false, error: String(e) };
  }
}

/**
 * Sends a password reset email with a link containing the token. No-op if RESEND_API_KEY is not set.
 */
export async function sendPasswordResetEmail(
  to: string,
  token: string,
  locale: EmailLocale = 'en'
): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set, skipping password reset email');
    return { ok: true };
  }
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const content = resetContent[locale];
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: content.subject,
      html: content.html(baseUrl, resetUrl),
    });
    if (error) {
      console.error('[email] Reset send error:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.error('[email] Reset send exception:', e);
    return { ok: false, error: String(e) };
  }
}
