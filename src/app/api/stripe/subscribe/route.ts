import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY manquant.');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil',
});

const SUBSCRIPTION_PRICE_IDS: Record<string, boolean> = {
  'price_1R5ficK9mEToSu4YF0OdylSe': true, // standard
  'price_1R5fj5K9mEToSu4YjLTjE1g3': true, // pro
};

const domain = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { priceId } = await req.json();

    if (!SUBSCRIPTION_PRICE_IDS[priceId]) {
      return NextResponse.json({ error: 'Abonnement invalide.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
    }

    if (user.subscription && user.subscription !== 'none') {
      return NextResponse.json(
        { error: 'Vous avez déjà un abonnement actif.' },
        { status: 400 }
      );
    }

    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        metadata: {
          userId: session.user.id,
        },
      });

      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId: customer.id },
      });

      stripeCustomerId = customer.id;
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: stripeCustomerId,
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
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error('❌ Erreur Stripe subscription :', err);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l’abonnement.' },
      { status: 500 }
    );
  }
}
