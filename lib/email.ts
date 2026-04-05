import { Resend } from 'resend';

/**
 * Resend: `onboarding@resend.dev` only delivers to the email on your Resend account.
 * For real signups, verify your domain in Resend (Dashboard → Domains, add DNS records),
 * then set RESEND_FROM_EMAIL to an address on that domain, e.g.:
 *   RESEND_FROM_EMAIL = "Ranking Force <noreply@yourdomain.com>"
 *
 * After changing the site domain: add the new domain in Resend, wait for DNS verification,
 * update RESEND_FROM_EMAIL and APP_URL / NEXTAUTH_URL on your host (e.g. Vercel).
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Ranking Force <onboarding@resend.dev>';

/**
 * Base URL for links in emails (reset password, welcome). Prefer APP_URL so
 * links always point to your production domain (e.g. https://rankingforce.com).
 * Set APP_URL in Vercel → Environment Variables.
 */
function getBaseUrl(): string {
  const explicit = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

function getResend(): Resend | null {
  if (!RESEND_API_KEY) return null;
  return new Resend(RESEND_API_KEY);
}

export type EmailLocale = 'en' | 'fr';

const welcomeContent: Record<EmailLocale, { subject: string; html: (baseUrl: string) => string }> = {
  en: {
    subject: 'Welcome to Ranking Force',
    html: (baseUrl) => `
      <p>Your account has been created.</p>
      <p>Log in to complete your one-time payment and start tracking your keyword rankings:</p>
      <p><a href="${baseUrl}/login">Log in to Ranking Force</a></p>
      <p>— Ranking Force</p>
    `,
  },
  fr: {
    subject: 'Bienvenue sur Ranking Force',
    html: (baseUrl) => `
      <p>Votre compte a été créé.</p>
      <p>Connectez-vous pour effectuer votre paiement unique et commencer à suivre vos positions :</p>
      <p><a href="${baseUrl}/login">Se connecter à Ranking Force</a></p>
      <p>— Ranking Force</p>
    `,
  },
};

const resetContent: Record<EmailLocale, { subject: string; html: (baseUrl: string, resetUrl: string) => string }> = {
  en: {
    subject: 'Reset your password - Ranking Force',
    html: (baseUrl, resetUrl) => `
      <p>You requested a password reset.</p>
      <p>Click the link below to choose a new password (valid for 1 hour):</p>
      <p><a href="${resetUrl}">Reset my password</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
      <p>— Ranking Force</p>
    `,
  },
  fr: {
    subject: 'Réinitialisation de votre mot de passe - Ranking Force',
    html: (baseUrl, resetUrl) => `
      <p>Vous avez demandé une réinitialisation de mot de passe.</p>
      <p>Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe (valide 1 heure) :</p>
      <p><a href="${resetUrl}">Réinitialiser mon mot de passe</a></p>
      <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
      <p>— Ranking Force</p>
    `,
  },
};

const verifyContent: Record<EmailLocale, { subject: string; html: (verifyUrl: string) => string }> = {
  en: {
    subject: 'Verify your email - Ranking Force',
    html: (verifyUrl) => `
      <p>Confirm your email to secure your account.</p>
      <p><a href="${verifyUrl}">Verify my email</a></p>
      <p>This link is valid for 24 hours.</p>
      <p>— Ranking Force</p>
    `,
  },
  fr: {
    subject: 'Vérifiez votre email - Ranking Force',
    html: (verifyUrl) => `
      <p>Confirmez votre email pour sécuriser votre compte.</p>
      <p><a href="${verifyUrl}">Vérifier mon email</a></p>
      <p>Ce lien est valide 24 heures.</p>
      <p>— Ranking Force</p>
    `,
  },
};

const changeEmailContent: Record<EmailLocale, { subject: string; html: (confirmUrl: string) => string }> = {
  en: {
    subject: 'Confirm your new email - Ranking Force',
    html: (confirmUrl) => `
      <p>You requested to change your email.</p>
      <p><a href="${confirmUrl}">Confirm my new email</a></p>
      <p>This link is valid for 24 hours.</p>
      <p>— Ranking Force</p>
    `,
  },
  fr: {
    subject: 'Confirmez votre nouvel email - Ranking Force',
    html: (confirmUrl) => `
      <p>Vous avez demandé à changer votre email.</p>
      <p><a href="${confirmUrl}">Confirmer mon nouvel email</a></p>
      <p>Ce lien est valide 24 heures.</p>
      <p>— Ranking Force</p>
    `,
  },
};

/**
 * Sends a welcome email after signup. No-op if RESEND_API_KEY is not set.
 */
export async function sendWelcomeEmail(to: string, locale: EmailLocale = 'en'): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.error('[email] RESEND_API_KEY is missing. Welcome email NOT sent.');
    return { ok: true }; // don't block signup
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
    console.error('[email] RESEND_API_KEY is missing. Password reset email NOT sent. Add RESEND_API_KEY in Vercel → Settings → Environment Variables.');
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const content = resetContent[locale];
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: content.subject,
      html: content.html(baseUrl, resetUrl),
    });
    if (error) {
      console.error('[email] Reset send error:', JSON.stringify(error));
      return { ok: false, error: error.message };
    }
    console.log('[email] Password reset email sent to', to, 'id:', data?.id);
    return { ok: true };
  } catch (e) {
    console.error('[email] Reset send exception:', e);
    return { ok: false, error: String(e) };
  }
}

export async function sendEmailVerificationEmail(
  to: string,
  token: string,
  locale: EmailLocale = 'en'
): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.error('[email] RESEND_API_KEY is missing. Email verification NOT sent.');
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }
  const baseUrl = getBaseUrl();
  const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const content = verifyContent[locale];
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: content.subject,
      html: content.html(verifyUrl),
    });
    if (error) {
      console.error('[email] Verify send error:', JSON.stringify(error));
      return { ok: false, error: error.message };
    }
    console.log('[email] Verification email sent to', to, 'id:', data?.id);
    return { ok: true };
  } catch (e) {
    console.error('[email] Verify send exception:', e);
    return { ok: false, error: String(e) };
  }
}

export async function sendEmailChangeConfirmationEmail(
  to: string,
  token: string,
  locale: EmailLocale = 'en'
): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.error('[email] RESEND_API_KEY is missing. Email change confirmation NOT sent.');
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }
  const baseUrl = getBaseUrl();
  const confirmUrl = `${baseUrl}/confirm-email-change?token=${encodeURIComponent(token)}`;
  const content = changeEmailContent[locale];
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: content.subject,
      html: content.html(confirmUrl),
    });
    if (error) {
      console.error('[email] Email change send error:', JSON.stringify(error));
      return { ok: false, error: error.message };
    }
    console.log('[email] Email change confirmation sent to', to, 'id:', data?.id);
    return { ok: true };
  } catch (e) {
    console.error('[email] Email change send exception:', e);
    return { ok: false, error: String(e) };
  }
}
