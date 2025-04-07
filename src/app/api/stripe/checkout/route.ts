import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// 💳 Liste des packs avec leurs price_id Stripe
const PRICE_IDS: Record<number, string> = {
  10: 'price_1R5enGK9mEToSu4Ymfww3tTb', // pack 10 crédits
  50: 'price_1R5enfK9mEToSu4YHHY743l7', // pack 50 crédits
};


export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const body = await req.json();
  const quantity = Number(body.quantity); // 10 ou 50
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
      success_url: 'http://localhost:3000/buy/success',
      cancel_url: 'http://localhost:3000/buy',
      metadata: {
        userId: session.user.id,
        priceId, // ✅ nécessaire pour le webhook
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error('❌ Erreur Stripe :', err);
    return NextResponse.json({ error: 'Erreur Stripe' }, { status: 500 });
  }
}
