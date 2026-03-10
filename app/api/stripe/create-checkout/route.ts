import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getToken } from 'next-auth/jwt';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId || !process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: { code: 500, message: 'Stripe non configuré' } },
        { status: 500 }
      );
    }

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
