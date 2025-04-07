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

  const [subscription, setSubscription] = useState<'standard' | 'pro' | 'none' | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }

    if (status === 'authenticated') {
      setSubscription((session?.user?.subscription as any) ?? 'none');
      setCredits(session?.user?.credits ?? 0);

      const fetchInvoices = async () => {
        const res = await fetch('/api/stripe/invoices');
        const data = await res.json();
        if (data.invoices) setInvoices(data.invoices);
      };

      fetchInvoices();
    }
  }, [status, session, router, setCredits]);

  const handleUnsubscribe = async () => {
    if (!confirm("Souhaites-tu vraiment annuler ton abonnement ?")) return;

    const res = await fetch('/api/stripe/unsubscribe', {
      method: 'POST',
    });

    const data = await res.json();
    if (data.success) {
      alert("Abonnement annulé !");
      await update(); // ✅ recharge session
      setSubscription('none'); // mise à jour locale
    } else {
      alert("Erreur : " + data.error);
    }
  };

  if (status === 'loading') {
    return <p className="text-center mt-10 text-gray-700 dark:text-gray-300">Chargement...</p>;
  }

  return (
    <main className="min-h-screen bg-gray-100 dark:bg-neutral-900 px-4 py-10">
      <div className="max-w-xl mx-auto p-6 bg-white dark:bg-neutral-800 rounded-xl shadow dark:shadow-md">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Mon compte</h1>

        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
          <p>📧 <strong>Email :</strong> {session?.user?.email}</p>
          <p>💳 <strong>Crédits :</strong> {credits}</p>
          <p>
            🔁 <strong>Abonnement :</strong>{' '}
            {subscription === 'pro'
              ? 'Pro (illimité)'
              : subscription === 'standard'
              ? 'Standard (100 crédits/mois)'
              : 'Aucun'}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => router.push('/buy')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
          >
            Changer de plan / Acheter des crédits
          </button>

          <button
            onClick={() => router.push('/history')}
            className="bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-100 px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-neutral-700 text-sm border border-gray-300 dark:border-gray-600"
          >
            📂 Voir mes résumés
          </button>

          {subscription !== 'none' && (
            <button
              onClick={handleUnsubscribe}
              className="text-sm text-red-600 dark:text-red-400 underline"
            >
              Résilier l’abonnement
            </button>
          )}
        </div>

        {invoices.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              🧾 Historique des paiements
            </h2>
            <ul className="text-sm text-gray-700 dark:text-gray-200 space-y-2">
              {invoices.map((invoice) => (
                <li
                  key={invoice.id}
                  className="flex justify-between items-center border-b border-gray-200 dark:border-gray-600 pb-1"
                >
                  <div>
                    <p>
                      💸 {invoice.amount} {invoice.currency.toUpperCase()} – {invoice.date}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Statut : {invoice.status}
                    </p>
                  </div>
                  {invoice.pdf && (
                    <a
                      href={invoice.pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 text-xs underline"
                    >
                      Voir PDF
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
