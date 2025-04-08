import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const PRICE_TO_CREDITS: Record<string, number> = {
  'price_1R5enGK9mEToSu4Ymfww3tTb': 10,
  'price_1R5enfK9mEToSu4YHHY743l7': 50,
};

const SUBSCRIPTION_PRICE_IDS: Record<
  string,
  { tier: 'standard' | 'pro'; credits: number | 'unlimited' }
> = {
  'price_1R5ficK9mEToSu4YF0OdylSe': { tier: 'standard', credits: 100 },
  'price_1R5fj5K9mEToSu4YjLTjE1g3': { tier: 'pro', credits: 'unlimited' },
};

// 👇 ici on définit un typage étendu propre
interface InvoiceWithSub extends Stripe.Invoice {
  subscription: string;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return new NextResponse('Missing Stripe signature header', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Erreur signature webhook :', err);
    return new NextResponse('Signature invalide', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
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
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0].price.id;
        const sub = SUBSCRIPTION_PRICE_IDS[priceId];

        if (!sub) break;

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (!user) break;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscription: sub.tier,
            isUnlimited: sub.credits === 'unlimited',
          },
        });

        console.log(`🎉 Abonnement ${sub.tier} activé pour ${user.email}`);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as InvoiceWithSub;
        const customerId = invoice.customer as string;

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (!user) break;

        const subId = invoice.subscription;
        const subscription = await stripe.subscriptions.retrieve(subId);
        const priceId = subscription.items.data[0]?.price.id;

        const sub = SUBSCRIPTION_PRICE_IDS[priceId];

        if (sub && sub.credits !== 'unlimited') {
          await prisma.user.update({
            where: { id: user.id },
            data: { credits: { increment: sub.credits } },
          });

          console.log(`💳 ${sub.credits} crédits ajoutés à ${user.email}`);
        }

        break;
      }

      case 'customer.subscription.deleted': {
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
        break;
      }

      default:
        console.log(`🔔 Événement Stripe ignoré : ${event.type}`);
    }
  } catch (err) {
    console.error('🔥 Erreur de traitement Stripe :', err);
    return new NextResponse('Erreur serveur', { status: 500 });
  }

  return NextResponse.json({ received: true });
}
