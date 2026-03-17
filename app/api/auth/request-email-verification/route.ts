import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { z } from 'zod';
import { sendEmailVerificationEmail, type EmailLocale } from '@/lib/email';

const schema = z.object({
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
  const locale: EmailLocale = parsed.success && parsed.data.locale === 'fr' ? 'fr' : 'en';

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ ok: true }); // don't leak
  }
  if (user.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
    },
  });
  sendEmailVerificationEmail(user.email, rawToken, locale).catch((err) =>
    console.error('[request-email-verification] send failed:', err)
  );

  return NextResponse.json({ ok: true });
}

