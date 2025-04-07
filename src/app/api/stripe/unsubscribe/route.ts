import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY manquant.');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.stripeCustomerId) {
      return NextResponse.json({ error: 'Aucun abonnement trouvé.' }, { status: 400 });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ error: 'Aucun abonnement actif.' }, { status: 400 });
    }

    const subscriptionId = subscriptions.data[0].id;

    await stripe.subscriptions.cancel(subscriptionId);

    // 🔄 Optionnel : mettre à jour la BDD immédiatement
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscription: 'none',
        isUnlimited: false,
      },
    });

    console.log(`🚫 Abonnement annulé pour userId ${user.id}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('❌ Erreur lors de la résiliation Stripe :', err);
    return NextResponse.json(
      { error: "Impossible d'annuler l'abonnement. Réessaie plus tard." },
      { status: 500 }
    );
  }
}
