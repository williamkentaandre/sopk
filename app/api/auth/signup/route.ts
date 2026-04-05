import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import crypto from 'crypto';
import { sendEmailVerificationEmail } from '@/lib/email';

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24h
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Au moins 8 caractères'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 400, message: 'Données invalides', details: parsed.error.flatten() } },
        { status: 400 }
      );
    }
    const { email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: { code: 409, message: 'Un compte existe déjà avec cet email' } },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        stripePaymentStatus: 'pending',
      },
    });

    const locale = (body.locale === 'fr' ? 'fr' : 'en') as 'en' | 'fr';

    // Send email verification (token stored hashed)
    const rawToken = crypto.randomBytes(32).toString('hex');
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
      },
    });
    const emailResult = await sendEmailVerificationEmail(user.email, rawToken, locale);
    if (!emailResult.ok) {
      console.error('[signup] Verification email failed:', emailResult.error);
    }

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      message: emailResult.ok ? 'Verification email sent.' : 'Account created; verification email not sent.',
      verificationEmailSent: emailResult.ok,
    });
  } catch (e) {
    console.error('Signup error:', e);
    return NextResponse.json(
      { error: { code: 500, message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
