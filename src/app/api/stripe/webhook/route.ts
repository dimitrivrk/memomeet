import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const PRICE_TO_CREDITS: Record<string, number> = {
  'price_1R5enGK9mEToSu4Ymfww3tTb': 10,
  'price_1R5enfK9mEToSu4YHHY743l7': 50,
};

const SUBSCRIPTION_PRICE_IDS: Record<string, { tier: 'standard' | 'pro'; credits: number | 'unlimited' }> = {
  'price_1R5ficK9mEToSu4YF0OdylSe': { tier: 'standard', credits: 100 },
  'price_1R5fj5K9mEToSu4YjLTjE1g3': { tier: 'pro', credits: 'unlimited' },
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Erreur signature webhook :', err);
    return new NextResponse('Signature invalide', { status: 400 });
  }

  // ✅ Achat de crédits ponctuel
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const priceId = session.metadata?.priceId;

    const credits = PRICE_TO_CREDITS[priceId ?? ''];

    if (userId && credits) {
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: credits } },
      });
      console.log(`✅ ${credits} crédits ajoutés à l'utilisateur ${userId}`);
    }
  }

  // 🎉 Abonnement activé (ne crédite plus ici)
  if (event.type === 'customer.subscription.created') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    const priceId = subscription.items.data[0].price.id;
    const sub = SUBSCRIPTION_PRICE_IDS[priceId];

    if (!sub) return NextResponse.json({ received: true });

    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!user) return NextResponse.json({ received: true });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscription: sub.tier,
        isUnlimited: sub.credits === 'unlimited',
      },
    });

    console.log(`🎉 Abonnement ${sub.tier} activé pour ${user.email}`);
  }

  // 🔁 Paiement mensuel (et 1er crédit à la souscription)
  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = invoice.customer as string;

    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!user) return NextResponse.json({ received: true });

    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const priceId = subscription.items.data[0].price.id;
    const sub = SUBSCRIPTION_PRICE_IDS[priceId];

    if (sub && sub.credits !== 'unlimited') {
      await prisma.user.update({
        where: { id: user.id },
        data: { credits: { increment: sub.credits } },
      });

      console.log(`💳 ${sub.credits} crédits ajoutés à ${user.email}`);
    }
  }

  // ❌ Désabonnement
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    await prisma.user.updateMany({
      where: { stripeCustomerId: customerId },
      data: {
        subscription: 'none',
        isUnlimited: false,
      },
    });

    console.log(`🚫 Abonnement annulé pour ${customerId}`);
  }

  return NextResponse.json({ received: true });
}
