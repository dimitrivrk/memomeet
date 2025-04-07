import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil',
});

const PRICE_IDS: Record<number, string> = {
  10: 'price_1R5enGK9mEToSu4Ymfww3tTb',
  50: 'price_1R5enfK9mEToSu4YHHY743l7',
};

const domain = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || typeof session.user.id !== 'string') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const body = await req.json();
  const quantity = Number(body.quantity);
  const priceId = PRICE_IDS[quantity];

  if (!priceId) {
    return NextResponse.json({ error: 'Pack invalide' }, { status: 400 });
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${domain}/buy/success`,
      cancel_url: `${domain}/buy`,
      metadata: {
        userId: session.user.id,
        priceId,
        pack: quantity,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error('❌ Erreur Stripe :', err);
    return NextResponse.json({ error: 'Erreur Stripe' }, { status: 500 });
  }
}
