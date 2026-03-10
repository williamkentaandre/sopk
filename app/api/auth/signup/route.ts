import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

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

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      message: 'Compte créé. Redirigez vers le paiement.',
    });
  } catch (e) {
    console.error('Signup error:', e);
    return NextResponse.json(
      { error: { code: 500, message: 'Erreur serveur' } },
      { status: 500 }
    );
  }
}
