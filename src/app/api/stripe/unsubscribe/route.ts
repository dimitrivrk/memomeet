import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.stripeCustomerId) {
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

  return NextResponse.json({ success: true });
}
