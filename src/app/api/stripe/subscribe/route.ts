import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { priceId } = await req.json();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (user?.subscription && user.subscription !== 'none') {
    return NextResponse.json({ error: 'Vous avez déjà un abonnement actif.' }, { status: 400 });
  }

  let stripeCustomerId = user?.stripeCustomerId;

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
    success_url: 'http://localhost:3000/buy/success',
    cancel_url: 'http://localhost:3000/buy',
    metadata: {
      userId: session.user.id,
      priceId,
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
