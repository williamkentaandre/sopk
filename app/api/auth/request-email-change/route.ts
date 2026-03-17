import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { z } from 'zod';
import { sendEmailChangeConfirmationEmail, type EmailLocale } from '@/lib/email';

const schema = z.object({
  newEmail: z.string().email(),
  locale: z.enum(['en', 'fr']).optional(),
});

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24h
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: { code: 401, message: 'Unauthorized' } }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 400, message: 'Invalid data' } }, { status: 400 });
  }
  const locale: EmailLocale = parsed.data.locale === 'fr' ? 'fr' : 'en';
  const newEmail = parsed.data.newEmail.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: { code: 401, message: 'Unauthorized' } }, { status: 401 });
  }
  if (!user.emailVerified) {
    return NextResponse.json({ error: { code: 403, message: 'Email not verified' } }, { status: 403 });
  }
  if (newEmail === user.email) {
    return NextResponse.json({ ok: true });
  }
  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing) {
    return NextResponse.json({ error: { code: 409, message: 'Email already in use' } }, { status: 409 });
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  await prisma.emailChangeToken.create({
    data: {
      userId: user.id,
      newEmail,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
    },
  });
  sendEmailChangeConfirmationEmail(newEmail, rawToken, locale).catch((err) =>
    console.error('[request-email-change] send failed:', err)
  );

  return NextResponse.json({ ok: true });
}

