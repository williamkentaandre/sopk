import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    const userId = token?.id as string | undefined;
    if (!userId) {
      return NextResponse.json(
        { error: { code: 401, message: 'Non connecté' } },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });
    if (!user?.emailVerified) {
      return NextResponse.json(
        { error: { code: 403, message: 'Email non vérifié' } },
        { status: 403 }
      );
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId || !secretKey) {
      return NextResponse.json(
        { error: { code: 500, message: 'Stripe non configuré' } },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey);
    const origin = request.headers.get('origin') || request.nextUrl.origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/payment-success`,
      cancel_url: `${origin}/dashboard?cancel=1`,
      client_reference_id: userId,
      metadata: { userId },
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('Stripe create-checkout error:', e);
    return NextResponse.json(
      { error: { code: 500, message: 'Erreur Stripe' } },
      { status: 500 }
    );
  }
}
