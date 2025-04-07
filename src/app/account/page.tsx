'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCredits } from '@/context/CreditContext';

type Invoice = {
  id: string;
  amount: number;
  currency: string;
  date: string;
  pdf: string | null;
  status: string;
};

export default function AccountPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { credits, setCredits } = useCredits();

  const [subscription, setSubscription] = useState<'standard' | 'pro' | 'none'>('none');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      type CustomUser = typeof session.user & {
        subscription?: 'none' | 'standard' | 'pro';
      };
      
      setSubscription(((session?.user as CustomUser)?.subscription) ?? 'none');
      
      setCredits(session?.user?.credits ?? 0);

      const fetchInvoices = async () => {
        try {
          const res = await fetch('/api/stripe/invoices');
          const data = await res.json();
          setInvoices(data.invoices || []);
        } catch (e) {
          console.error('Erreur factures:', e);
        } finally {
          setLoadingInvoices(false);
        }
      };

      fetchInvoices();
    }
  }, [status, session, router, setCredits]);

  const handleUnsubscribe = async () => {
    if (!confirm('Souhaites-tu vraiment annuler ton abonnement ?')) return;
    const res = await fetch('/api/stripe/unsubscribe', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert('Abonnement annulé.');
      await update();
      setSubscription('none');
    } else {
      alert('Erreur : ' + data.error);
    }
  };

  const subscriptionLabel = {
    pro: 'Pro – Illimité',
    standard: 'Standard – 100 crédits / mois',
    none: 'Aucun abonnement actif',
  }[subscription];

  const subscriptionColor = {
    pro: 'bg-green-600',
    standard: 'bg-yellow-500',
    none: 'bg-gray-400',
  }[subscription];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-neutral-900 px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-10">
        <section className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-6">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Mon compte</h1>
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <p>📧 <strong>Email :</strong> {session?.user?.email}</p>
            <p>💳 <strong>Crédits :</strong> {credits}</p>
            <p className="flex items-center gap-2">
              🔁 <strong>Abonnement :</strong>
              <span
                className={`text-white text-xs font-medium px-2 py-1 rounded-full ${subscriptionColor}`}
              >
                {subscriptionLabel}
              </span>
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 text-sm">
            <button
              onClick={() => router.push('/buy')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Changer de plan / Acheter des crédits
            </button>

            <button
              onClick={() => router.push('/history')}
              className="bg-gray-100 dark:bg-neutral-700 text-gray-800 dark:text-white px-4 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-neutral-600 transition"
            >
              📂 Voir mes résumés
            </button>

            {subscription !== 'none' && (
              <button
                onClick={handleUnsubscribe}
                className="text-red-600 dark:text-red-400 underline"
              >
                Résilier l’abonnement
              </button>
            )}
          </div>
        </section>

        <section className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            🧾 Historique des paiements
          </h2>

          {loadingInvoices ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Chargement des factures...</p>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Aucune facture pour le moment.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              {invoices.map((invoice) => (
                <li key={invoice.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p>
                      💸 {invoice.amount} {invoice.currency.toUpperCase()} — {invoice.date}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Statut : {invoice.status}
                    </p>
                  </div>
                  {invoice.pdf ? (
                    <a
                      href={invoice.pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 underline text-xs"
                    >
                      Télécharger PDF
                    </a>
                  ) : (
                    <span className="text-gray-400 text-xs">PDF indisponible</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
