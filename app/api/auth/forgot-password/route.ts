import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendPasswordResetEmail } from '@/lib/email';

const forgotSchema = z.object({
  email: z.string().email(),
  locale: z.enum(['en', 'fr']).optional(),
});

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = forgotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 400, message: 'Invalid email' } },
        { status: 400 }
      );
    }
    const { email, locale = 'en' } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    // Always return 200 to avoid revealing whether the email exists
    if (!user) {
      return NextResponse.json({ message: 'If an account exists, you will receive an email.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const result = await sendPasswordResetEmail(user.email, rawToken, locale as 'en' | 'fr');
    if (!result.ok) {
      console.error('[forgot-password] Email send failed:', result.error);
      // Still return 200 to avoid leaking info; token remains valid
    }

    return NextResponse.json({
      message: 'If an account exists with this email, you will receive a password reset link.',
    });
  } catch (e) {
    console.error('Forgot password error:', e);
    return NextResponse.json(
      { error: { code: 500, message: 'Server error' } },
      { status: 500 }
    );
  }
}
