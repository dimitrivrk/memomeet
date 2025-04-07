import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    console.log("❌ Pas de session utilisateur");
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.stripeCustomerId) {
    console.log("⚠️ Utilisateur sans stripeCustomerId");
    return NextResponse.json({ invoices: [] });
  }

  console.log("✅ stripeCustomerId trouvé :", user.stripeCustomerId);

  try {
    const invoices = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      limit: 100,
    });

    console.log("📄 Factures récupérées :", invoices.data.length);

    invoices.data.forEach((invoice) => {
      console.log(`🧾 Facture ${invoice.id} — ${invoice.amount_paid / 100} ${invoice.currency.toUpperCase()} — statut: ${invoice.status}`);
    });

    const simplified = invoices.data.map((invoice) => ({
      id: invoice.id,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      date: new Date(invoice.created * 1000).toLocaleDateString(),
      pdf: invoice.invoice_pdf,
      status: invoice.status,
    }));

    return NextResponse.json({ invoices: simplified });
  } catch (err) {
    console.error("❌ Erreur Stripe lors de la récupération des factures :", err);
    return NextResponse.json({ error: 'Erreur lors de la récupération des factures' }, { status: 500 });
  }
}
